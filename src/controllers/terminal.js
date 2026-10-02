const terminalService = require("../services/terminalService");

function requireAccountId(req, res) {
  const accountId =
    (req.query && req.query.account_id) || (req.body && req.body.account_id);
  if (!accountId) {
    res.status(400).json({ success: false, error: "account_id is required" });
    return null;
  }
  return accountId;
}

async function listReaders(req, res) {
  const accountId = requireAccountId(req, res);
  if (!accountId) return;
  try {
    const readers = await terminalService.listReaders(accountId);
    res.json({ success: true, readers });
  } catch (error) {
    console.error("Error listing Terminal readers:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function listLocations(req, res) {
  const accountId = requireAccountId(req, res);
  if (!accountId) return;
  try {
    const locations = await terminalService.listLocationSummaries(accountId);
    res.json({ success: true, locations });
  } catch (error) {
    console.error("Error listing Terminal locations:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function ensureLocation(req, res) {
  const accountId = requireAccountId(req, res);
  if (!accountId) return;
  try {
    const location = await terminalService.ensureLocation(accountId);
    res.json({ success: true, location });
  } catch (error) {
    const status = error.code === "location_address_required" ? 422 : 500;
    console.error("Error ensuring Terminal location:", error);
    res.status(status).json({
      success: false,
      error: error.message,
      code: error.code || "terminal_location_error",
    });
  }
}

async function registerReader(req, res) {
  const accountId = requireAccountId(req, res);
  if (!accountId) return;
  const { location_id: locationId, label, registration_code: registrationCode } =
    req.body;
  if (!locationId || !label || !registrationCode) {
    return res.status(400).json({
      success: false,
      error: "location_id, label, and registration_code are required",
    });
  }

  try {
    const reader = await terminalService.registerReader({
      accountId,
      locationId,
      label,
      registrationCode,
    });
    res.json({ success: true, reader });
  } catch (error) {
    const status = error.code === "invalid_registration_code" ? 400 : 500;
    console.error("Error registering Terminal reader:", error);
    res.status(status).json({
      success: false,
      error: error.message,
      code: error.code || "terminal_registration_error",
    });
  }
}

async function createHardwareAccountSession(req, res) {
  const accountId = requireAccountId(req, res);
  if (!accountId) return;
  try {
    const session = await terminalService.createHardwareAccountSession(accountId);
    res.json({ clientSecret: session.client_secret });
  } catch (error) {
    console.error("Error creating Terminal hardware account session:", error);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  listReaders,
  listLocations,
  ensureLocation,
  registerReader,
  createHardwareAccountSession,
};
