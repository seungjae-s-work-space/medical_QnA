const {
  buildRecipientTokenEntries,
  isInvalidRegistrationTokenError,
} = require("../notificationRecipients");

describe("notification recipient helpers", () => {
  test("prefers active device documents over legacy user token and deduplicates tokens", () => {
    const entries = buildRecipientTokenEntries({
      deviceDocs: [
        {
          id: "device-a",
          ref: "device-ref-a",
          data: () => ({ fcmToken: "token-1", userId: "user-a" }),
        },
        {
          id: "device-b",
          ref: "device-ref-b",
          data: () => ({ fcmToken: "token-1", userId: "user-a" }),
        },
      ],
      legacyToken: "legacy-token",
      legacyRef: "legacy-ref",
    });

    expect(entries).toEqual([
      {
        token: "token-1",
        ref: "device-ref-a",
        deviceId: "device-a",
        source: "device",
      },
    ]);
  });

  test("uses legacy user token only when no active device documents exist", () => {
    const entries = buildRecipientTokenEntries({
      deviceDocs: [],
      legacyToken: "legacy-token",
      legacyRef: "legacy-ref",
    });

    expect(entries).toEqual([
      {
        token: "legacy-token",
        ref: "legacy-ref",
        deviceId: null,
        source: "legacy",
      },
    ]);
  });

  test("skips legacy user token when another device already owns that token", () => {
    const entries = buildRecipientTokenEntries({
      deviceDocs: [],
      legacyToken: "legacy-token",
      legacyRef: "legacy-ref",
      allowLegacyToken: false,
    });

    expect(entries).toEqual([]);
  });

  test("identifies FCM errors that should remove a stored token", () => {
    expect(
      isInvalidRegistrationTokenError({
        code: "messaging/registration-token-not-registered",
      })
    ).toBe(true);

    expect(
      isInvalidRegistrationTokenError({
        errorInfo: { code: "messaging/invalid-registration-token" },
      })
    ).toBe(true);

    expect(isInvalidRegistrationTokenError({ code: "messaging/internal-error" }))
      .toBe(false);
  });
});
