const express = require("express");
const bcrypt = require("bcryptjs");
const BingoBord = require("../Models/BingoBord");

const { verifyAdmin } = require("../middleware/adminMiddleware");

const router = express.Router();

// Register admin
// Only a logged-in admin may create another admin.
router.post("/register-admin", verifyAdmin, async (req, res) => {
  try {
    const { username, phoneNumber, password } = req.body;

    if (!username || !phoneNumber || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existing = await BingoBord.findOne({ phoneNumber });
    if (existing) {
      return res.status(400).json({ error: "Admin already exists" });
    }

    const admin = new BingoBord({
      username,
      phoneNumber,
      password,
      role: "admin",
      Wallet: 0,
    });

    await admin.save();
    res.json({ message: "Admin registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
