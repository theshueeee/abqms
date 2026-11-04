import assert from "node:assert/strict";
import { test } from "node:test";
import { createToken, hashPassword, hashToken, verifyPassword } from "../src/auth/security";

test("passwords round-trip through Argon2id without storing plaintext", async () => {
  const password = "correct horse battery staple";
  const hash = await hashPassword(password);

  assert.notEqual(hash, password);
  assert.equal(await verifyPassword(hash, password), true);
  assert.equal(await verifyPassword(hash, "incorrect password"), false);
});

test("session tokens are random and stored as one-way hashes", () => {
  const first = createToken();
  const second = createToken();

  assert.notEqual(first, second);
  assert.notEqual(hashToken(first), first);
  assert.notEqual(hashToken(first), hashToken(second));
});
