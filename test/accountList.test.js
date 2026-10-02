const assert = require("assert");
const {
  accountSummary,
  listConnectedAccounts,
  mapWithConcurrency,
} = require("../src/services/accountService");

function detailedAccount(status) {
  return {
    configuration: {
      merchant: {
        capabilities: {
          card_payments: { status },
        },
      },
    },
  };
}

assert.deepStrictEqual(
  accountSummary(
    {
      id: "acct_named",
      display_name: "Newest Shop",
      created: "2026-10-01T12:00:00.000Z",
    },
    detailedAccount("active")
  ),
  {
    id: "acct_named",
    displayName: "Newest Shop",
    created: "2026-10-01T12:00:00.000Z",
    cardPaymentsStatus: "active",
    canTakeCardPayments: true,
  }
);

assert.strictEqual(
  accountSummary(
    { id: "acct_fallback", created: "2026-09-30T12:00:00.000Z" },
    detailedAccount("restricted")
  ).displayName,
  "acct_fallback"
);

assert.strictEqual(
  accountSummary(
    { id: "acct_restricted", created: "2026-09-30T12:00:00.000Z" },
    detailedAccount("restricted")
  ).canTakeCardPayments,
  false
);

assert.deepStrictEqual(
  accountSummary(
    { id: "acct_unknown", created: "2026-09-30T12:00:00.000Z" },
    null
  ),
  {
    id: "acct_unknown",
    displayName: "acct_unknown",
    created: "2026-09-30T12:00:00.000Z",
    cardPaymentsStatus: "unknown",
    canTakeCardPayments: null,
  }
);

async function run() {
  const listCalls = [];
  const retrieveCalls = [];
  const accounts = Array.from({ length: 27 }, (_, index) => ({
    id: `acct_${index}`,
    display_name: `Account ${index}`,
    created: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
  }));

  const stripeClient = {
    v2: {
      core: {
        accounts: {
          list(params) {
            listCalls.push(params);
            return {
              async autoPagingToArray(options) {
                assert.deepStrictEqual(options, { limit: 25 });
                // The Stripe list endpoint returns newest accounts first.
                return accounts.slice().reverse().slice(0, options.limit);
              },
            };
          },
          async retrieve(id, params) {
            retrieveCalls.push({ id, params });
            if (id === "acct_13") {
              throw new Error("temporary failure");
            }
            return detailedAccount(id === "acct_26" ? "active" : "pending");
          },
        },
      },
    },
  };

  const summaries = await listConnectedAccounts(stripeClient);
  assert.deepStrictEqual(listCalls, [
    {
      applied_configurations: ["merchant"],
      closed: false,
      limit: 20,
    },
  ]);
  assert.strictEqual(summaries.length, 25);
  assert.strictEqual(summaries[0].id, "acct_26");
  assert.strictEqual(summaries[0].canTakeCardPayments, true);
  assert.strictEqual(summaries[summaries.length - 1].id, "acct_2");
  assert.strictEqual(retrieveCalls.length, 25);
  assert.deepStrictEqual(retrieveCalls[0].params, {
    include: ["configuration.merchant"],
  });
  const failedSummary = summaries.find((summary) => summary.id === "acct_13");
  assert.strictEqual(failedSummary.cardPaymentsStatus, "unknown");
  assert.strictEqual(failedSummary.canTakeCardPayments, null);

  let activeWorkers = 0;
  let maxActiveWorkers = 0;
  await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (value) => {
    activeWorkers += 1;
    maxActiveWorkers = Math.max(maxActiveWorkers, activeWorkers);
    await new Promise((resolve) => setTimeout(resolve, 1));
    activeWorkers -= 1;
    return value;
  });
  assert.strictEqual(maxActiveWorkers, 2);

  console.log("accountList tests passed");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
