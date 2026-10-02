const assert = require("assert");
const { deriveAccountStatus } = require("../src/utils/accountStatus");

function v2Account(cardStatus, payoutStatus, entries = []) {
  return {
    object: "v2.core.account",
    configuration: {
      merchant: {
        capabilities: {
          card_payments: { status: cardStatus, status_details: [] },
          stripe_balance: {
            payouts: { status: payoutStatus, status_details: [] },
          },
        },
      },
    },
    requirements: { entries },
  };
}

function requirement(deadlineStatus, awaitingActionFrom = "user") {
  return {
    description: `test.${deadlineStatus}`,
    awaiting_action_from: awaitingActionFrom,
    minimum_deadline: { status: deadlineStatus },
  };
}

assert.strictEqual(
  deriveAccountStatus(v2Account("pending", "pending")).status,
  "Pending",
  "capabilities still activating after onboarding should be Pending"
);

assert.strictEqual(
  deriveAccountStatus(v2Account("active", "active")).status,
  "Enabled",
  "active capabilities with no requirements should be Enabled"
);

assert.strictEqual(
  deriveAccountStatus(
    v2Account("restricted", "restricted", [requirement("past_due")])
  ).status,
  "Restricted",
  "past-due requirements should remain Restricted"
);

assert.strictEqual(
  deriveAccountStatus(
    v2Account("restricted", "active", [requirement("currently_due")])
  ).status,
  "Restricted Soon",
  "currently-due requirements with payouts active should remain Restricted Soon"
);

assert.strictEqual(
  deriveAccountStatus(v2Account("pending", "restricted")).status,
  "Restricted",
  "a restricted capability must not be hidden by another pending capability"
);

assert.strictEqual(
  deriveAccountStatus(
    v2Account("pending", "pending", [requirement("eventually_due")])
  ).status,
  "Restricted",
  "the empty-requirements pending rule must not swallow eventual requirements"
);

console.log("accountStatus tests passed");
