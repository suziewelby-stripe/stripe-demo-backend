const stripe = require("../config/stripe");
const {
  NAMES,
  CARD_TOKENS,
  DISPUTE_TOKEN,
  BYPASS_BALANCE_TOKEN,
  TOP_UP_AMOUNT,
  PAYOUT_AMOUNTS,
  randomPrice,
  randomSelection,
} = require("../config/constants");
const { marketForAccount } = require("../config/markets");

/**
 * Create test customers for an account
 */
async function createTestCustomers(accountId) {
  const customerPromises = NAMES.map((name) =>
    stripe.customers.create(
      {
        name: `${name.firstName} ${name.lastName}`,
        email: `${name.firstName.toLowerCase()}@${name.lastName.toLowerCase()}.co.uk`,
      },
      { stripeAccount: accountId }
    )
  );

  const customers = await Promise.all(customerPromises);
  return customers.map((c) => c.id);
}

/**
 * Create test payments for an account
 */
async function createTestPayments(accountId, customerIds, currency = "gbp") {
  const paymentPromises = [];

  for (let i = 0; i < 15; i++) {
    const customerId = randomSelection(customerIds);
    const amount = randomPrice();
    const cardToken = randomSelection(CARD_TOKENS);

    paymentPromises.push(
      stripe.paymentIntents.create(
        {
          amount,
          currency,
          customer: customerId,
          payment_method: cardToken,
          confirm: true,
          return_url: "https://example.com/return",
        },
        { stripeAccount: accountId }
      )
    );
  }

  // Create 5 dispute payments
  for (let i = 0; i < 5; i++) {
    const disputePayment = stripe.paymentIntents.create(
      {
        amount: randomPrice(),
        currency,
        customer: randomSelection(customerIds),
        payment_method: DISPUTE_TOKEN,
        confirm: true,
        return_url: "https://example.com/return",
      },
      { stripeAccount: accountId }
    );

    paymentPromises.push(disputePayment);
  }

  const bypassBalancePayment = stripe.paymentIntents.create(
    {
      amount: TOP_UP_AMOUNT,
      currency,
      customer: randomSelection(customerIds),
      payment_method: BYPASS_BALANCE_TOKEN,
      confirm: true,
      return_url: "https://example.com/return",
    },
    { stripeAccount: accountId }
  );

  paymentPromises.push(bypassBalancePayment);
  await Promise.all(paymentPromises);
}

/**
 * Create test payouts for an account
 */
async function createTestPayouts(accountId, currency = "gbp") {
  let retries = 0;
  const maxRetries = 10;

  while (retries < maxRetries) {
    try {
      const balance = await stripe.balance.retrieve({
        stripeAccount: accountId,
      });

      if (balance.available[0].amount > 0) {
        const payoutPromises = PAYOUT_AMOUNTS.map((amount) =>
          stripe.payouts.create(
            {
              amount,
              currency,
            },
            { stripeAccount: accountId }
          )
        );

        await Promise.all(payoutPromises);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      retries++;
    } catch (error) {
      console.error("Error creating payouts:", error.message);
      return;
    }
  }

  console.info("Balance not available for payouts after max retries");
}

/**
 * Create all test data for an account
 */
async function createAllTestData(accountId) {
  const account = await stripe.v2.core.accounts.retrieve(accountId, {
    include: ["identity", "defaults"],
  });
  const { currency } = marketForAccount(account);
  const customerIds = await createTestCustomers(accountId);
  await createTestPayments(accountId, customerIds, currency);
  await createTestPayouts(accountId, currency);
}

module.exports = {
  createAllTestData,
};
