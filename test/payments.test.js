const assert = require("assert");
const { normalizePaymentDescription } = require("../src/controllers/payments");

assert.strictEqual(normalizePaymentDescription(undefined), null);
assert.strictEqual(normalizePaymentDescription(null), null);
assert.strictEqual(normalizePaymentDescription(""), null);
assert.strictEqual(normalizePaymentDescription("   \n"), null);
assert.strictEqual(
  normalizePaymentDescription("  Counter order 42  "),
  "Counter order 42"
);
assert.throws(
  () => normalizePaymentDescription({ value: "invalid" }),
  (error) => error.statusCode === 400 && error.message === "description must be a string"
);

console.log("payments tests passed");
