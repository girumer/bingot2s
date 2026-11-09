const express = require("express");
const router = express.Router();
const transactionController = require("../controllers/transactionController");
const { verifyAdmin } = require("../middleware/adminMiddleware");

// Only the bot (with the secret key) may claim deposits.
const botKey = (req, res, next) => {
  const key = process.env.INTERNAL_API_SECRET;
  if (key && req.headers["x-api-key"] === key) return next();
  return res.status(401).json({ error: "Unauthorized" });
};

// parse SMS (existing)
router.post("/parseytytyttransaction", transactionController.parseTransaction);

// manual deposit approval
router.post("/deposit", botKey, transactionController.depositAmount);
router.get("/pending-transactions", verifyAdmin, transactionController.getPendingTransactions);
module.exports = router;
