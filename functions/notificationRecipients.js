const INVALID_REGISTRATION_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);

function readDocData(doc) {
  if (!doc) return {};
  if (typeof doc.data === "function") return doc.data() || {};
  return doc.data || {};
}

function hasUsableToken(token) {
  return typeof token === "string" && token.trim().length > 0;
}

function buildRecipientTokenEntries({
  deviceDocs = [],
  legacyToken,
  legacyRef,
  allowLegacyToken = true,
} = {}) {
  const seen = new Set();
  const entries = [];

  for (const doc of deviceDocs) {
    const data = readDocData(doc);
    const token = data.fcmToken;
    if (!hasUsableToken(token) || seen.has(token)) continue;

    seen.add(token);
    entries.push({
      token,
      ref: doc.ref,
      deviceId: doc.id || data.deviceId || null,
      source: "device",
    });
  }

  if (entries.length === 0 && allowLegacyToken && hasUsableToken(legacyToken)) {
    entries.push({
      token: legacyToken,
      ref: legacyRef,
      deviceId: null,
      source: "legacy",
    });
  }

  return entries;
}

function dedupeTokenEntries(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    if (!hasUsableToken(entry.token) || seen.has(entry.token)) return false;
    seen.add(entry.token);
    return true;
  });
}

function isInvalidRegistrationTokenError(error) {
  const code = error?.code || error?.errorInfo?.code;
  return INVALID_REGISTRATION_TOKEN_CODES.has(code);
}

module.exports = {
  buildRecipientTokenEntries,
  dedupeTokenEntries,
  isInvalidRegistrationTokenError,
};
