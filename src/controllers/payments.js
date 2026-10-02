const stripe = require("../config/stripe");

// Base URL for redirects - defaults to localhost for development
const BASE_URL =
  process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

/**
 * Middleware to validate customer exists if provided
 */
async function validateCustomer(req, res, next) {
  try {
    const { customer, account_id } = req.body;

    if (customer && customer.id) {
      console.log(
        `Validating customer: ${customer.id} for account: ${account_id}`
      );

      try {
        const stripeCustomer = await stripe.customers.retrieve(customer.id, {
          stripeAccount: account_id,
        });

        console.log(
          `Customer validation successful: ${stripeCustomer.id} (${stripeCustomer.name})`
        );
        // Store validated customer in request for use in payment intent creation
        req.validatedCustomer = stripeCustomer;
      } catch (error) {
        console.error(
          `Customer validation failed for ${customer.id}:`,
          error.message
        );
        return res.status(400).json({
          error: `Customer ${customer.id} not found`,
          details: error.message,
        });
      }
    } else {
      console.log(
        "No customer provided - payment intent will be created without customer"
      );
      req.validatedCustomer = null;
    }

    next();
  } catch (error) {
    console.error("Customer validation middleware error:", error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Create connection token for Terminal SDK
 */
async function createConnectionToken(req, res) {
  try {
    const { account_id } = req.body;

    if (!account_id) {
      return res.status(400).json({ error: "account_id is required" });
    }

    const connectionToken = await stripe.terminal.connectionTokens.create(
      {},
      { stripeAccount: account_id }
    );

    res.json({ secret: connectionToken.secret });
  } catch (error) {
    console.error("Error creating connection token:", error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Create payment intent with optional customer attachment
 */
async function createPaymentIntent(req, res) {
  try {
    const {
      amount,
      currency = "gbp",
      account_id,
      payment_method_types = ["card_present"],
      capture_method = "automatic",
    } = req.body;

    if (!account_id) {
      return res.status(400).json({ error: "account_id is required" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid amount is required" });
    }

    // Build payment intent data
    const paymentIntentData = {
      amount,
      currency,
      payment_method_types,
      capture_method,
    };

    // Add customer if validated (from middleware)
    if (req.validatedCustomer) {
      paymentIntentData.customer = req.validatedCustomer.id;
      console.log(
        `Creating payment intent for customer: ${req.validatedCustomer.id} (${req.validatedCustomer.name})`
      );
    } else {
      console.log("Creating payment intent without customer");
    }

    const paymentIntent = await stripe.paymentIntents.create(
      paymentIntentData,
      { stripeAccount: account_id }
    );

    console.log(
      `Payment intent created: ${paymentIntent.id} for £${amount / 100}`
    );

    res.json({
      clientSecret: paymentIntent.client_secret,
      customer: req.validatedCustomer || null,
      paymentIntent: {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Get locations for Terminal SDK
 */
async function getLocations(req, res) {
  try {
    const { account_id } = req.query;

    if (!account_id) {
      return res.status(400).json({ error: "account_id is required" });
    }

    const locations = await stripe.terminal.locations.list(
      {},
      { stripeAccount: account_id }
    );

    res.json({ locations: locations.data });
  } catch (error) {
    console.error("Error fetching locations:", error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Create payment link for failed in-person payments
 */
async function createPaymentLink(req, res) {
  try {
    const {
      amount,
      currency = "gbp",
      account_id,
      description = "Payment",
    } = req.body;

    if (!account_id) {
      return res.status(400).json({ error: "account_id is required" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid amount is required" });
    }

    console.log(
      `Creating payment link for £${amount / 100} on account: ${account_id}`
    );

    // Create a product first (required for payment links)
    const product = await stripe.products.create(
      {
        name: description,
      },
      { stripeAccount: account_id }
    );

    // Create a price for the product
    const price = await stripe.prices.create(
      {
        unit_amount: amount,
        currency: currency,
        product: product.id,
      },
      { stripeAccount: account_id }
    );

    // Build payment link data
    const paymentLinkData = {
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
    };

    // Create the payment link
    const paymentLink = await stripe.paymentLinks.create(paymentLinkData, {
      stripeAccount: account_id,
    });

    console.log(
      `Payment link created: ${paymentLink.id} - URL: ${paymentLink.url}`
    );

    res.json({
      url: paymentLink.url,
      id: paymentLink.id,
      amount: amount,
      currency: currency,
      description: description,
    });
  } catch (error) {
    console.error("Error creating payment link:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));

    // Ensure we always return JSON
    res.status(500).json({
      error: error.message || "Failed to create payment link",
      details: error.type || "unknown_error",
    });
  }
}

/**
 * Create checkout session for alternative payment flow
 */
async function createCheckoutSession(req, res) {
  try {
    const {
      amount,
      currency = "gbp",
      account_id,
      customer,
      description = "Payment",
    } = req.body;

    if (!account_id) {
      return res.status(400).json({ error: "account_id is required" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid amount is required" });
    }

    // Fetch the actual business name from the Stripe Connect account
    let businessName = "Your Business";
    try {
      const account = await stripe.v2.core.accounts.retrieve(account_id);

      businessName =
        account.business_profile?.name ||
        account.settings?.dashboard?.display_name ||
        account.display_name ||
        "Your Business";

      console.log(
        `Retrieved business name: "${businessName}" for account: ${account_id}`
      );
    } catch (error) {
      console.warn(
        `Could not retrieve account details for ${account_id}:`,
        error.message
      );
    }

    console.log(
      `Creating checkout session for £${amount / 100} on account: ${account_id}`
    );

    // Build checkout session data
    const sessionData = {
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: description,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}&account_id=${account_id}`,
      cancel_url: `${BASE_URL}/cancel`,
      metadata: {
        business_name: businessName,
        account_id: account_id,
      },
    };

    // Add customer if provided
    if (customer && customer.id) {
      try {
        // Validate customer exists
        const stripeCustomer = await stripe.customers.retrieve(customer.id, {
          stripeAccount: account_id,
        });
        sessionData.customer = stripeCustomer.id;
        console.log(
          `Checkout session will be associated with customer: ${stripeCustomer.name}`
        );
      } catch (error) {
        console.warn(
          `Customer ${customer.id} not found, creating checkout session without customer`
        );
      }
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create(sessionData, {
      stripeAccount: account_id,
    });

    console.log(
      `Checkout session created: ${session.id} - URL: ${session.url}`
    );

    res.json({
      url: session.url,
      id: session.id,
      amount: amount,
      currency: currency,
      description: description,
      customer: customer || null,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    console.error("Error details:", JSON.stringify(error, null, 2));

    res.status(500).json({
      error: error.message || "Failed to create checkout session",
      details: error.type || "unknown_error",
    });
  }
}

/**
 * Retrieve checkout session details
 */
async function getCheckoutSession(req, res) {
  try {
    const { sessionId } = req.params;
    const { account_id } = req.query;

    if (!account_id) {
      console.error("Missing account_id in query parameters");
      return res.status(400).json({ error: "account_id is required" });
    }

    console.log(
      `Retrieving checkout session: ${sessionId} for account: ${account_id}`
    );

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items", "customer", "payment_intent"],
      stripeAccount: account_id,
    });

    // Extract the data we need for the success page
    const responseData = {
      customer_details: session.customer_details,
      amount_total: session.amount_total,
      currency: session.currency,
      metadata: session.metadata,
      line_items: session.line_items,
      payment_status: session.payment_status,
      business_name: session.metadata?.business_name || null,
      customer_email:
        session.customer_details?.email || session.customer?.email,
    };

    console.log(
      `Checkout session retrieved: ${sessionId} - Status: ${session.payment_status}`
    );

    res.json(responseData);
  } catch (error) {
    console.error("Error retrieving checkout session:", error);
    res.status(400).json({
      error: "Unable to retrieve session data",
      message: error.message,
    });
  }
}

module.exports = {
  createConnectionToken,
  createPaymentIntent,
  createPaymentLink,
  createCheckoutSession,
  getCheckoutSession,
  getLocations,
  validateCustomer, // Export middleware
};
