const { convert } = require("html-to-text");
const { FieldPath } = require("firebase-admin/firestore");
const { HttpsError } = require("firebase-functions/v2/https");

const SECTIONS = ["news", "encyclopedia", "male_infertility"];
const PAGE_SIZE = 30;
const MAX_RETRIES = 5;

function normalizeSearchText(value) {
  return String(value || "").normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
}

function timestamp(value) {
  if (typeof value?.toMillis === "function") return value.toMillis();
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toSearchEntry(id, data) {
  const text = convert(String(data.content || ""), {
    wordwrap: false,
    limits: { maxInputLength: Infinity },
    selectors: [
      { selector: "img", format: "skip" },
      { selector: "script", format: "skip" },
      { selector: "style", format: "skip" },
      { selector: "a", options: { ignoreHref: true } },
    ],
  });
  return {
    id,
    title: String(data.title || ""),
    text: normalizeSearchText(text),
    isPublished: data.isPublished === true,
    createdAt: timestamp(data.createdAt),
  };
}

function isSearchChange(before, after) {
  if (!before || !after) return Boolean(before || after);
  return before.title !== after.title || before.content !== after.content ||
    before.isPublished !== after.isPublished || timestamp(before.createdAt) !== timestamp(after.createdAt);
}

function validateSection(section) {
  if (!SECTIONS.includes(section)) throw new HttpsError("invalid-argument", "검색할 게시판이 올바르지 않습니다.");
}

function createArticleSearch({ db, bucket }) {
  const cache = new Map();
  const indexFile = (section) => bucket.file(`_article_search/v1/${section}.json`);

  async function readCatalog(section) {
    const file = indexFile(section);
    let metadata;
    try {
      [metadata] = await file.getMetadata();
    } catch (error) {
      if (Number(error.code) === 404) return null;
      throw error;
    }
    const cached = cache.get(section);
    if (cached?.generation === metadata.generation) return cached;
    const [bytes] = await file.download();
    const catalog = JSON.parse(bytes.toString("utf8"));
    if (catalog.version !== 1 || catalog.section !== section || !catalog.entries) {
      throw new HttpsError("failed-precondition", "검색 데이터 확인이 필요합니다.");
    }
    const result = { generation: metadata.generation, catalog };
    cache.set(section, result);
    return result;
  }

  async function writeCatalog(section, catalog, generation) {
    await indexFile(section).save(Buffer.from(JSON.stringify(catalog)), {
      resumable: false,
      gzip: true,
      metadata: { contentType: "application/json", cacheControl: "private, no-store" },
      preconditionOpts: { ifGenerationMatch: generation },
    });
    cache.delete(section);
  }

  async function bootstrap(section, { rebuild = false } = {}) {
    validateSection(section);
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const current = await readCatalog(section);
      if (current && !rebuild) return { section, count: Object.keys(current.catalog.entries).length, created: false };
      const entries = Object.create(null);
      let cursor;
      do {
        let query = db.collection(section).orderBy(FieldPath.documentId())
          .select("title", "content", "isPublished", "createdAt").limit(200);
        if (cursor) query = query.startAfter(cursor);
        const snapshot = await query.get();
        for (const doc of snapshot.docs) entries[doc.id] = toSearchEntry(doc.id, doc.data());
        cursor = snapshot.docs.length === 200 ? snapshot.docs[snapshot.docs.length - 1] : null;
      } while (cursor);
      try {
        await writeCatalog(section, { version: 1, section, entries }, current?.generation || 0);
        return { section, count: Object.keys(entries).length, created: true };
      } catch (error) {
        if (Number(error.code) !== 412 || attempt === MAX_RETRIES - 1) throw error;
      }
    }
  }

  async function sync(section, id, before, after) {
    validateSection(section);
    if (!isSearchChange(before, after)) return;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      let current = await readCatalog(section);
      if (!current) {
        await bootstrap(section);
        current = await readCatalog(section);
      }
      // Events may arrive out of order. Always index the current source document.
      const snapshot = await db.collection(section).doc(id).get();
      const entries = { ...current.catalog.entries };
      if (snapshot.exists) entries[id] = toSearchEntry(id, snapshot.data());
      else delete entries[id];
      // Even matching values must advance the generation to fence older in-flight events.
      try {
        await writeCatalog(section, { ...current.catalog, entries }, current.generation);
        return;
      } catch (error) {
        if (Number(error.code) !== 412 || attempt === MAX_RETRIES - 1) throw error;
      }
    }
  }

  async function search(request) {
    const { section, query: rawQuery, page = 0, includeDrafts = false } = request.data || {};
    validateSection(section);
    if (typeof rawQuery !== "string" || rawQuery.length > 200 || typeof includeDrafts !== "boolean" ||
        !Number.isSafeInteger(page) || page < 0 || page > 100000) {
      throw new HttpsError("invalid-argument", "검색 조건을 확인해주세요.");
    }
    const query = normalizeSearchText(rawQuery);
    if (!query) throw new HttpsError("invalid-argument", "검색어를 입력해주세요.");
    if (includeDrafts) {
      const user = request.auth?.uid ? await db.collection("users").doc(request.auth.uid).get() : null;
      if (!user?.exists || user.data()?.role !== "admin") {
        throw new HttpsError("permission-denied", "관리자 권한이 필요합니다.");
      }
    }
    const current = await readCatalog(section);
    if (!current) throw new HttpsError("failed-precondition", "전체 검색 데이터를 준비 중입니다. 잠시 후 다시 시도해주세요.");
    const matches = Object.values(current.catalog.entries)
      .filter(entry => (includeDrafts || entry.isPublished) &&
        (normalizeSearchText(entry.title).includes(query) || entry.text.includes(query)))
      .sort((left, right) => right.createdAt - left.createdAt || left.id.localeCompare(right.id));
    const actualPage = Math.min(page, Math.max(0, Math.ceil(matches.length / PAGE_SIZE) - 1));
    const candidates = matches.slice(actualPage * PAGE_SIZE, (actualPage + 1) * PAGE_SIZE);
    let items = [];
    if (candidates.length) {
      // Do not expose titles after unpublishing/deletion while a trigger is pending.
      const snapshots = await db.getAll(...candidates.map(entry => db.collection(section).doc(entry.id)),
        { fieldMask: ["title", "isPublished"] });
      items = snapshots.filter(doc => doc.exists && (includeDrafts || doc.data().isPublished === true))
        .map(doc => ({ id: doc.id, title: String(doc.data().title || ""), isPublished: doc.data().isPublished === true }));
    }
    return { items, total: matches.length, page: actualPage, pageSize: PAGE_SIZE };
  }

  return { bootstrap, sync, search };
}

module.exports = { SECTIONS, PAGE_SIZE, normalizeSearchText, toSearchEntry, isSearchChange, createArticleSearch };
