import test from "node:test";
import assert from "node:assert";
import { validateUsername } from "./validations.ts";

test("Username Validation", async (t) => {
  await t.test("Valid Usernames", () => {
    assert.strictEqual(validateUsername("ali"), true);
    assert.strictEqual(validateUsername("ahmed2345"), true);
    assert.strictEqual(validateUsername("amir2"), true);
    assert.strictEqual(validateUsername("AValidUser123"), true);
    assert.strictEqual(validateUsername("1234567890123456"), true); // Max length
  });

  await t.test("Invalid Usernames - Contains space", () => {
    assert.strictEqual(validateUsername("a li"), false);
    assert.strictEqual(validateUsername(" ali"), false);
    assert.strictEqual(validateUsername("ali "), false);
  });

  await t.test("Invalid Usernames - Contains symbols", () => {
    assert.strictEqual(validateUsername("ahmed*"), false);
    assert.strictEqual(validateUsername("am@1"), false);
    assert.strictEqual(validateUsername("user_name"), false);
    assert.strictEqual(validateUsername("user-name"), false);
    assert.strictEqual(validateUsername("user.name"), false);
    assert.strictEqual(validateUsername("user!name"), false);
  });

  await t.test("Invalid Usernames - Length requirements", () => {
    assert.strictEqual(validateUsername(""), false, "Should not be empty");
    assert.strictEqual(validateUsername("ab"), false, "Too short (< 3)");
    assert.strictEqual(validateUsername("12345678901234567"), false, "Too long (> 16)");
  });
});
