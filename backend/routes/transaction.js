const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transactionController");
const { verifyAdmin } = require("../middleware/adminMiddleware");

// parse SMS (existing)
router.post("/parseytytyttransaction", transactionController.parseTransaction);

// manual deposit approval
router.post("/deposit", transactionController.depositAmount);
router.get("/pending-transactions", verifyAdmin, transactionController.getPendingTransactions);
module.exports = router;
