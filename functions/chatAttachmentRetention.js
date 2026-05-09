const CHAT_ATTACHMENT_RETENTION_DAYS = 180;
const CHAT_ATTACHMENT_RETENTION_MS =
  CHAT_ATTACHMENT_RETENTION_DAYS * 24 * 60 * 60 * 1000;

const CHAT_ATTACHMENT_STORAGE_PREFIXES = [
  "chat_images/",
  "chat_videos/",
  "chat_files/",
];

function isStorageObjectExpired(metadata, now = new Date()) {
  const timeCreated = metadata?.timeCreated;
  if (!timeCreated) return false;

  const createdAtMs = new Date(timeCreated).getTime();
  if (!Number.isFinite(createdAtMs)) return false;

  return now.getTime() - createdAtMs >= CHAT_ATTACHMENT_RETENTION_MS;
}

async function deleteFileIfExpired(file, now, logger = console) {
  if (!isStorageObjectExpired(file.metadata, now)) {
    return false;
  }

  try {
    await file.delete({ ignoreNotFound: true });
    return true;
  } catch (error) {
    if (
      error?.code === 404 ||
      String(error?.message ?? "").includes("No such object")
    ) {
      return false;
    }

    logger.error?.("Failed to delete expired chat attachment", {
      path: file.name,
      error,
    });
    throw error;
  }
}

async function cleanupExpiredChatAttachmentObjects({
  bucket,
  now = new Date(),
  logger = console,
} = {}) {
  if (!bucket) {
    throw new Error("bucket is required");
  }

  let scanned = 0;
  let deleted = 0;

  for (const prefix of CHAT_ATTACHMENT_STORAGE_PREFIXES) {
    const [files] = await bucket.getFiles({ prefix });
    scanned += files.length;

    for (const file of files) {
      if (await deleteFileIfExpired(file, now, logger)) {
        deleted += 1;
      }
    }
  }

  return { scanned, deleted };
}

module.exports = {
  CHAT_ATTACHMENT_RETENTION_DAYS,
  CHAT_ATTACHMENT_STORAGE_PREFIXES,
  cleanupExpiredChatAttachmentObjects,
  isStorageObjectExpired,
};
