const express = require("express");
const router = express.Router();
const accountsController = require("../controllers/accounts");

// Account-related routes
router.get("/profiles", accountsController.getProfiles);
router.get("/generate_profiles", accountsController.generateProfiles);
router.get("/accounts", accountsController.getConnectedAccounts);
router.post("/accounts", accountsController.createAccount);
router.post("/create_test_data", accountsController.createTestData);
router.get("/accounts/:accountId/status", accountsController.getAccountStatus);

// Account session for embedded components (iOS app endpoint)
router.post("/account_session", accountsController.createAccountSession);

module.exports = router;
