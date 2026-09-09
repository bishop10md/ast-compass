import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const read = (path) => fs.readFileSync(path, "utf8");

test("professional contact channels are centralized and routed by purpose", () => {
  const contacts = read("src/config/contactChannels.ts");
  for (const address of [
    "mduah@astcompass.com",
    "info@astcompass.com",
    "support@astcompass.com",
    "review@astcompass.com",
    "research@astcompass.com",
  ]) assert.match(contacts, new RegExp(address.replace(".", "\\.")));

  const app = read("src/App.tsx");
  const feedback = read("src/features/Feedback.tsx");
  const trust = read("src/features/TrustPage.tsx");
  const legal = read("src/features/LegalPages.tsx");

  assert.match(app, /contactHref\("general"\)/);
  assert.match(app, /contactHref\("support"\)/);
  assert.match(app, /contactHref\("owner"\)/);
  assert.match(app, /channels=\{\["research", "review"\]\}/);
  assert.match(feedback, /channels=\{\["review", "support"\]\}/);
  assert.match(trust, /channels=\{\["review", "support"\]\}/);
  assert.match(legal, /contactHref\("support"\)/);
  assert.match(legal, /contactHref\("general"\)/);
  assert.match(legal, /section\.title\.endsWith\("Contact"\)/);
});

test("security contact remains both email- and web-accessible", () => {
  const security = read("public/.well-known/security.txt");
  assert.match(security, /Contact: mailto:support@astcompass\.com/);
  assert.match(security, /Contact: https:\/\/astcompass\.com\/feedback/);
});
