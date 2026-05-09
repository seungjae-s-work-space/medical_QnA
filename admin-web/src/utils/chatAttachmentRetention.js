export const CHAT_ATTACHMENT_RETENTION_DAYS = 180;
export const CHAT_ATTACHMENT_RETENTION_MS =
  CHAT_ATTACHMENT_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();

  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function isChatAttachmentExpired(createdAt, now = new Date()) {
  const createdDate = toDate(createdAt);
  if (!createdDate) return false;

  return now.getTime() - createdDate.getTime() >= CHAT_ATTACHMENT_RETENTION_MS;
}
