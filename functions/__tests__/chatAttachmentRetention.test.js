const {
  CHAT_ATTACHMENT_RETENTION_DAYS,
  cleanupExpiredChatAttachmentObjects,
  isStorageObjectExpired,
} = require("../chatAttachmentRetention");

describe("chat attachment retention", () => {
  const now = new Date("2026-07-01T00:00:00.000Z");

  function file(name, timeCreated) {
    return {
      name,
      metadata: { timeCreated },
      delete: jest.fn().mockResolvedValue(undefined),
    };
  }

  test("uses a 180 day retention window", () => {
    expect(CHAT_ATTACHMENT_RETENTION_DAYS).toBe(180);
  });

  test("detects storage objects older than the retention window", () => {
    expect(
      isStorageObjectExpired(
        { timeCreated: "2026-01-01T00:00:00.000Z" },
        now,
      ),
    ).toBe(true);
    expect(
      isStorageObjectExpired(
        { timeCreated: "2026-06-01T00:00:00.000Z" },
        now,
      ),
    ).toBe(false);
  });

  test("deletes only expired chat attachment objects", async () => {
    const expiredImage = file(
      "chat_images/old-image.jpg",
      "2026-01-01T00:00:00.000Z",
    );
    const recentImage = file(
      "chat_images/recent-image.jpg",
      "2026-06-01T00:00:00.000Z",
    );
    const expiredFile = file(
      "chat_files/old-result.pdf",
      "2026-01-01T00:00:00.000Z",
    );
    const nonChatImage = file(
      "encyclopedia_images/old-entry.jpg",
      "2026-01-01T00:00:00.000Z",
    );
    const files = [expiredImage, recentImage, expiredFile, nonChatImage];
    const bucket = {
      getFiles: jest.fn(async ({ prefix }) => [
        files.filter((item) => item.name.startsWith(prefix)),
      ]),
    };

    const result = await cleanupExpiredChatAttachmentObjects({ bucket, now });

    expect(result.deleted).toBe(2);
    expect(result.scanned).toBe(3);
    expect(expiredImage.delete).toHaveBeenCalledTimes(1);
    expect(expiredFile.delete).toHaveBeenCalledTimes(1);
    expect(recentImage.delete).not.toHaveBeenCalled();
    expect(nonChatImage.delete).not.toHaveBeenCalled();
  });
});
