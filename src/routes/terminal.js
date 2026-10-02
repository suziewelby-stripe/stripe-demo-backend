const express = require("express");
const terminalController = require("../controllers/terminal");

const router = express.Router();

router.get("/terminal/readers", terminalController.listReaders);
router.get("/terminal/locations", terminalController.listLocations);
router.post("/terminal/locations/ensure", terminalController.ensureLocation);
router.post("/terminal/readers/register", terminalController.registerReader);
router.post(
  "/terminal/hardware-account-session",
  terminalController.createHardwareAccountSession
);

module.exports = router;
