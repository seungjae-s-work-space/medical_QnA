const fs = require("fs");
const path = require("path");

describe("admin auth claims", () => {
  test("cloud functions can mint admin claims from Firestore user roles", () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");

    expect(source).toMatch(/onDocumentWritten/);
    expect(source).toMatch(/onCall/);
    expect(source).toMatch(/HttpsError/);
    expect(source).toMatch(/getAuth/);
    expect(source).toMatch(/syncAuthClaimsForUser/);
    expect(source).toMatch(/setCustomUserClaims/);
    expect(source).toMatch(/exports\.syncUserRoleClaims/);
    expect(source).toMatch(/exports\.ensureAdminAuthClaim/);
    expect(source).toMatch(/users\/\{userId\}/);
    expect(source).toMatch(/role !== "admin"/);
  });
});
