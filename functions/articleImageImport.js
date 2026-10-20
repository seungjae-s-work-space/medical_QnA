const { createHash, randomUUID } = require("node:crypto");
const { HttpsError } = require("firebase-functions/v2/https");
const {
  createRemoteArticleImageDownloader, normalizeSourceUrl, RemoteImageError, LIMITS, CONTENT_TYPES,
} = require("./remoteArticleImage");

const SECTIONS = ["news", "encyclopedia", "male_infertility"];
const VERSION = "1";
const TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
class InvalidStoredImage extends Error {}

function createArticleImageImporter({ db, bucket, download = createRemoteArticleImageDownloader() }) {
  function resultFor(path, token, reused) {
    return {
      url: `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/` +
        `${encodeURIComponent(path)}?alt=media&token=${encodeURIComponent(token)}`,
      reused,
    };
  }

  async function cachedImage(file, path, sourceSha256) {
    let metadata;
    try {
      [metadata] = await file.getMetadata();
    } catch (error) {
      if (Number(error.code) === 404) return null;
      throw error;
    }
    const custom = metadata?.metadata;
    const token = custom?.firebaseStorageDownloadTokens;
    const size = Number(metadata?.size);
    if (custom?.articleImageImportVersion !== VERSION || custom?.sourceSha256 !== sourceSha256 ||
        typeof token !== "string" || !TOKEN_PATTERN.test(token) ||
        !Object.values(CONTENT_TYPES).includes(metadata.contentType) ||
        !Number.isSafeInteger(size) || size < 1 || size > LIMITS.maxBytes) {
      throw new InvalidStoredImage();
    }
    return resultFor(path, token, true);
  }

  async function importImage(request) {
    // Authorization must precede even cache access or URL validation.
    const uid = request?.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign in to import images.");
    let user;
    try {
      user = await db.collection("users").doc(uid).get();
    } catch {
      throw new HttpsError("internal", "Administrator authorization could not be checked.");
    }
    if (!user.exists || user.data()?.role !== "admin") {
      throw new HttpsError("permission-denied", "Administrator permission is required.");
    }
    const { section, sourceUrl } = request.data || {};
    if (!SECTIONS.includes(section)) {
      throw new HttpsError("invalid-argument", "The image section is not supported.");
    }
    try {
      const normalized = normalizeSourceUrl(sourceUrl);
      const sourceSha256 = createHash("sha256").update(normalized).digest("hex");
      const path = `${section}_images/imported-${sourceSha256}`;
      const file = bucket.file(path);
      const existing = await cachedImage(file, path, sourceSha256);
      if (existing) return existing;
      const { bytes, contentType } = await download(normalized);
      if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > LIMITS.maxBytes ||
          !Object.values(CONTENT_TYPES).includes(contentType)) {
        throw new Error("Image validation failed.");
      }
      const token = randomUUID();
      try {
        await file.save(bytes, {
          resumable: false,
          preconditionOpts: { ifGenerationMatch: 0 },
          metadata: {
            contentType,
            metadata: {
              articleImageImportVersion: VERSION,
              sourceSha256,
              firebaseStorageDownloadTokens: token,
            },
          },
        });
      } catch {
        // A competing create or a lost save acknowledgement may have committed.
        // Never delete or mutate the shared object or its download token.
        const committed = await cachedImage(file, path, sourceSha256);
        if (committed) return committed;
        throw new Error("The image could not be stored.");
      }
      return resultFor(path, token, false);
    } catch (error) {
      if (error instanceof RemoteImageError) {
        const safe = new RemoteImageError(error.code);
        throw new HttpsError(safe.code, safe.message);
      }
      if (error instanceof InvalidStoredImage) {
        throw new HttpsError("failed-precondition", "The stored image needs administrator review.");
      }
      throw new HttpsError("internal", "The image could not be imported. Please retry.");
    }
  }

  return { importImage };
}

module.exports = { createArticleImageImporter };
