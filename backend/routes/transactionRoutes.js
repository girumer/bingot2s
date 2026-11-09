const express = require("express");
const router = express.Router();
const BingoBord = require("../Models/BingoBord");
const Transaction = require('../Models/Transaction');
const Counter=require('../Models/CounterSchema');
// Deposit


// Withdraw

// Withdraw route
// Withdraw route
router.post("/withdraw", async (req, res) => {
  // 🔐 1. API Key Check – only the bot can call this endpoint
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.INTERNAL_API_SECRET) {
    return res.status(401).json({ message: "Unauthorized – invalid API key" });
  }

  const { username, amount, phoneNumber, type } = req.body;

  try {
    // 2. Input Validation
    if (!username || !amount || !phoneNumber || !type) {
      return res.status(400).json({ message: "Username, amount, phoneNumber, and type are all required." });
    }
    if (!["telebirr", "cbebirr"].includes(type)) {
      return res.status(400).json({ message: `Valid type (telebirr or cbebirr) is required.` });
    }
    
    const user = await BingoBord.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.Wallet < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // 3. Generate a unique withdrawal ID
    const counter = await Counter.findOneAndUpdate(
      { _id: "withdrawalId" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    if (!counter) {
      throw new Error("Failed to generate a unique withdrawal ID.");
    }
    const withdrawalId = counter.seq;

    // 4. Create and save the transaction record
    const newTx = new Transaction({
      transactionNumber: `WD${withdrawalId}`,
      phoneNumber,
      method: "withdrawal",
      type,
      amount,
      status: "pending",
      rawMessage: `Withdrawal via ${type}`,
    });
    await newTx.save();

    // 5. Deduct from user's wallet
    user.Wallet -= amount;
    await user.save();

    res.json({
      message: `Withdrawal successful with id ${withdrawalId}`,
      wallet: user.Wallet,
      withdrawalId
    });

  } catch (err) {
    console.error("General server error in withdrawal process:", err);
    res.status(500).json({ message: "Server error occurred. Please contact support." });
  }
});

// Get transaction history
router.get("/history/:username", async (req, res) => {
  try {
    const user = await BingoBord.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user.transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error " });
  }
});
// Get all users' transactions (for admin dashboard)
router.get("/all", async (req, res) => {
  try {
    const users = await BingoBord.find({}, "username transactions");
    const allTransactions = users.map(u => ({
      username: u.username,
      transactions: u.transactions
    }));
    res.json(allTransactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
// Get paginated list of users (Admin only)
router.get("/admin-api/users", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalUsers = await BingoBord.countDocuments();
    const users = await BingoBord.find()
      .skip(skip)
      .limit(limit)
      .select("username phoneNumber Wallet"); // only send safe fields

    res.json({
      users,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      currentPage: page,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
