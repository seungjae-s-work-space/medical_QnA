const fs = require("fs");
const path = require("path");

describe("subscription removal", () => {
  test("cloud functions no longer define subscription triggers or categories", () => {
    const source = fs.readFileSync(path.join(__dirname, "..", "index.js"), "utf8");

    expect(source).not.toMatch(/subscriptions\/\{/);
    expect(source).not.toMatch(/sendSubscription/);
    expect(source).not.toMatch(/checkSubscription/);
    expect(source).not.toMatch(/notificationSubscription/);
    expect(source).not.toMatch(/channelId:\s*"subscription"/);
  });
});
