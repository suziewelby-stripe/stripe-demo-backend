const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Initialize Stripe with your secret key
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-08-26.dahlia",
});

module.exports = stripe;
