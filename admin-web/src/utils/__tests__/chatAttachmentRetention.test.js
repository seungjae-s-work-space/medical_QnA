import {
  CHAT_ATTACHMENT_RETENTION_DAYS,
  isChatAttachmentExpired,
} from '../chatAttachmentRetention';

describe('chatAttachmentRetention', () => {
  const now = new Date('2026-07-01T00:00:00.000Z');

  it('uses a 180 day retention window', () => {
    expect(CHAT_ATTACHMENT_RETENTION_DAYS).toBe(180);
  });

  it('expires attachments for old chat messages', () => {
    expect(isChatAttachmentExpired(new Date('2026-01-01T00:00:00.000Z'), now)).toBe(true);
    expect(isChatAttachmentExpired(new Date('2026-06-01T00:00:00.000Z'), now)).toBe(false);
  });

  it('accepts Firestore timestamp-like values', () => {
    const timestamp = {
      toDate: () => new Date('2026-01-01T00:00:00.000Z'),
    };

    expect(isChatAttachmentExpired(timestamp, now)).toBe(true);
  });
});
