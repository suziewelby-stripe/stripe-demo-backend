const express = require("express");
const cors = require("cors");
const path = require("path");
const webhooksRoutes = require("./routes/webhooks");
const accountsRoutes = require("./routes/accounts");
const paymentsRoutes = require("./routes/payments");
const customersRoutes = require("./routes/customers");
const terminalRoutes = require("./routes/terminal");
const healthController = require("./controllers/health");
const filesController = require("./controllers/files");

const app = express();

// Middleware
app.use(cors());

// Basic health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Webhook endpoint (needs raw body parsing)
app.use(webhooksRoutes);

// JSON parsing for all other routes
app.use(express.json());

// Serve static files from public directory (for success page)
app.use(express.static(path.join(__dirname, "../public")));

// App info endpoint (returns publishable key)
app.get("/api/app_info", healthController.healthCheck);

// File serving endpoint (for Stripe uploaded files)
app.get("/api/file/:fileId", filesController.serveStripeFile);

// Serve the success page
app.get("/success", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/checkout-success.html"));
});

app.get("/terminal-hardware", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/terminal-hardware.html"));
});

// API routes
app.use("/api", accountsRoutes);
app.use("/api", paymentsRoutes);
app.use("/api", customersRoutes);
app.use("/api", terminalRoutes);

module.exports = app;
