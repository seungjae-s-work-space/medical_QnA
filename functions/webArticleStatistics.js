const { createHash } = require('node:crypto');
const { isIP } = require('node:net');
const { HttpsError } = require('firebase-functions/v2/https');

const SECTIONS = ['news', 'encyclopedia', 'male_infertility'];
const DAY = 86400000;
const MAX_BUCKET_ARTICLES = 256;
const MAX_REPORT_DOCUMENTS = 512;
const hash = (value) => createHash('sha256').update(value).digest('hex');
const koreanDate = (time) => new Date(time + 9 * 3600000).toISOString().slice(0, 10);
const emptyCounts = () => Object.fromEntries(SECTIONS.map(section => [section, 0]));

function networkAddress(request) {
  // Trust only the final address appended at the managed Cloud Run boundary,
  // never Express's leftmost forwarded address. Additional proxies share a bucket.
  const forwarded = request?.headers?.['x-forwarded-for'];
  const address = typeof forwarded === 'string' ? forwarded.split(',').at(-1).trim() : request?.socket?.remoteAddress;
  if (!address || !isIP(address)) throw new HttpsError('failed-precondition', '요청 출처를 확인할 수 없습니다.');
  return address.startsWith('::ffff:') && isIP(address.slice(7)) === 4 ? address.slice(7) : address;
}

function createWebArticleStatistics({ db, now = Date.now }) {
  const cache = new Map();
  const metaRef = db.doc('web_view_meta/config');

  async function record(request) {
    const time = now();
    const { section, articleId, eventId, sentAt } = request.data || {};
    if (!SECTIONS.includes(section) || typeof articleId !== 'string' ||
        !/^[^/\u0000-\u001f]{1,150}$/.test(articleId) || ['.', '..'].includes(articleId) ||
        typeof eventId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId) ||
        !Number.isSafeInteger(sentAt) || sentAt > time + 300000 || time - sentAt > DAY) {
      throw new HttpsError('invalid-argument', '올바르지 않은 조회 요청입니다.');
    }
    const ip = networkAddress(request.rawRequest);

    const date = koreanDate(time);
    const articleKey = hash(`${section}/${articleId}`);
    const articleRef = db.doc(`${section}/${articleId}`);
    const eventRef = db.doc(`web_view_events/${eventId.toLowerCase()}`);
    // A day-specific digest is retained only for abuse control, never visitor reporting.
    const limitRef = db.doc(`web_view_limits/${hash(`${date}:${ip}`)}`);

    return db.runTransaction(async (tx) => {
      if (request.auth?.uid) {
        const user = await tx.get(db.doc(`users/${request.auth.uid}`));
        if (user.data()?.role === 'admin') return { recorded: false };
      }
      const previous = await tx.get(eventRef);
      if (previous.exists) {
        if (previous.data().articleKey !== articleKey) {
          throw new HttpsError('invalid-argument', '이미 사용한 조회 요청입니다.');
        }
        return { recorded: false, duplicate: true };
      }
      const limit = (await tx.get(limitRef)).data() || {};
      const windowStart = time - (limit.windowStart || 0) >= 60000 ? time : limit.windowStart;
      const windowCount = windowStart === limit.windowStart ? limit.windowCount : 0;
      if (windowCount >= 60 || (limit.total || 0) >= 2000) {
        throw new HttpsError('resource-exhausted', '조회 요청이 너무 많습니다.');
      }
      const article = await tx.get(articleRef);
      if (!article.exists || article.data().isPublished !== true) {
        throw new HttpsError('not-found', '공개된 게시글을 찾을 수 없습니다.');
      }
      // Keep each map comfortably below 1 MiB. New articles spill into a stable
      // hash-prefix child; existing entries stay in their original bucket.
      let bucket = `${date}_${parseInt(articleKey[0], 16)}`;
      let depth = 1;
      let dailyRef; let daily;
      while (true) {
        dailyRef = db.doc(`web_view_daily/${bucket}`);
        daily = (await tx.get(dailyRef)).data() || { date, articles: {} };
        if (daily.articles[articleKey] || Object.keys(daily.articles).length < MAX_BUCKET_ARTICLES) break;
        if (depth >= articleKey.length) throw new HttpsError('resource-exhausted', '집계 저장 공간을 확인해주세요.');
        bucket += `_${articleKey[depth++]}`;
      }
      const meta = await tx.get(metaRef);
      const count = daily.articles[articleKey]?.views || 0;
      const existingCount = article.data().viewCount;
      tx.update(articleRef, { viewCount: (Number.isFinite(existingCount) ? existingCount : 0) + 1 });
      tx.set(dailyRef, {
        date,
        articles: {
          ...daily.articles,
          [articleKey]: {
            articleId, section, title: String(article.data().title || '제목 없음').slice(0, 200),
            views: count + 1, lastViewedAt: time,
          },
        },
      });
      tx.set(eventRef, { articleKey, expiresAt: new Date(time + 2 * DAY) });
      tx.set(limitRef, {
        windowStart, windowCount: windowCount + 1, total: (limit.total || 0) + 1,
        expiresAt: new Date(time + 2 * DAY),
      });
      if (!meta.exists) tx.set(metaRef, { startedAt: new Date(time).toISOString() });
      return { recorded: true };
    });
  }

  async function report(request) {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', '로그인이 필요합니다.');
    const user = await db.doc(`users/${request.auth.uid}`).get();
    if (user.data()?.role !== 'admin') throw new HttpsError('permission-denied', '관리자만 조회할 수 있습니다.');
    const days = request.data?.days ?? 7;
    if (![7, 30].includes(days)) throw new HttpsError('invalid-argument', '조회 기간은 7일 또는 30일입니다.');
    const time = now();
    const key = `${koreanDate(time)}:${days}`;
    const cached = cache.get(key);
    if (cached && time - cached.time < 60000) return cached.value;
    const meta = await metaRef.get();
    const startedAt = meta.data()?.startedAt || null;
    const startDate = startedAt ? koreanDate(Date.parse(startedAt)) : null;
    const dates = Array.from({ length: days }, (_, i) => koreanDate(time - (days - 1 - i) * DAY));
    const daily = dates.map(date => ({ date, counts: startDate && date >= startDate ? emptyCounts() : null }));
    const byDate = new Map(daily.map(row => [row.date, row]));
    const snapshots = startedAt ? (await db.collection('web_view_daily')
      .where('date', '>=', dates[0]).where('date', '<=', dates.at(-1))
      .limit(MAX_REPORT_DOCUMENTS + 1).get()).docs : [];
    if (snapshots.length > MAX_REPORT_DOCUMENTS) {
      throw new HttpsError('resource-exhausted', '통계량이 많습니다. 조회 기간을 줄여주세요.');
    }
    const articles = new Map();
    for (const snapshot of snapshots) {
      if (!snapshot.exists) continue;
      const data = snapshot.data();
      const row = byDate.get(data.date);
      for (const [articleKey, article] of Object.entries(data.articles || {})) {
        if (!row?.counts || !SECTIONS.includes(article.section)) continue;
        row.counts[article.section] += article.views;
        const previous = articles.get(articleKey);
        articles.set(articleKey, {
          ...(previous && previous.lastViewedAt > article.lastViewedAt ? previous : article),
          views: (previous?.views || 0) + article.views,
        });
      }
    }
    const ranked = [...articles.values()].sort((a, b) => b.views - a.views ||
      `${a.section}/${a.articleId}`.localeCompare(`${b.section}/${b.articleId}`));
    const topArticles = Object.fromEntries(['all', ...SECTIONS].map(section => [section,
      ranked.filter(item => section === 'all' || item.section === section).slice(0, 20)
        .map(({ lastViewedAt, ...article }) => article),
    ]));
    const value = { startedAt, generatedAt: new Date(time).toISOString(), days, daily, topArticles };
    // Keep at most the two ranges; never cache authorization decisions.
    for (const [oldKey, entry] of cache) if (time - entry.time >= 60000) cache.delete(oldKey);
    cache.set(key, { time, value });
    return value;
  }
  return { record, report };
}

module.exports = { createWebArticleStatistics, koreanDate };
