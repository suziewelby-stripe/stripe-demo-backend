/**
 * Health check endpoint that also returns publishable key and branding info
 */
async function healthCheck(req, res) {
  try {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey) {
      return res.status(500).json({
        error: "Stripe publishable key not configured",
      });
    }

    if (!process.env.STRIPE_ACCOUNT_ID) {
      return res.json({ publishableKey });
    }

    const stripe = require("../config/stripe");
    let logoUrl = null;
    let iconUrl = null;

    try {
      const account = await stripe.accounts.retrieve(
        process.env.STRIPE_ACCOUNT_ID
      );

      const logoFileId = account.settings?.branding?.logo;
      const iconFileId = account.settings?.branding?.icon;
      const primaryColor = account.settings?.branding?.primary_color;
      const secondaryColor = account.settings?.branding?.secondary_color;

      if (logoFileId) {
        logoUrl = `${req.protocol}://${req.get("host")}/api/file/${logoFileId}`;
      }

      if (iconFileId) {
        iconUrl = `${req.protocol}://${req.get("host")}/api/file/${iconFileId}`;
      }

      const response = {
        publishableKey: publishableKey,
      };

      if (logoUrl) {
        response.logoUrl = logoUrl;
      }
      if (iconUrl) {
        response.iconUrl = iconUrl;
      }
      if (primaryColor) {
        response.primaryColor = primaryColor;
      }
      if (secondaryColor) {
        response.secondaryColor = secondaryColor;
      }

      res.json(response);
    } catch (brandingError) {
      console.warn("Could not fetch branding info:", brandingError.message);
      res.json({
        publishableKey: publishableKey,
      });
    }
  } catch (error) {
    console.error("Failed to get app info:", error.message);
    res.status(500).json({
      error: "Internal server error",
    });
  }
}

module.exports = {
  healthCheck,
};
