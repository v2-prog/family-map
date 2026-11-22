/* Run from the repository root: node --test */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validate } from "../tools/validate.mjs";

test("data and code pass validation", () => {
  const { errors } = validate(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
  assert.deepEqual(errors, []);
});
