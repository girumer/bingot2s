// routes/walletRoutes.js
const express = require("express");
const router = express.Router();
const BingoBord = require("../Models/BingoBord");

// Get wallet and coins for a user
router.get("/:username", async (req, res) => {
  try {
    const user = await BingoBord.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Include coins in the response
    res.json({ Wallet: user.Wallet, coins: user.coins });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
router.post("/convertCoins", async (req, res) => {
  const { username, walletIncrement, remainingCoins } = req.body;
  try {
    const user = await BingoBord.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.Wallet += walletIncrement;
    user.coins = remainingCoins;
    await user.save();

    res.json({ Wallet: user.Wallet, coins: user.coins });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;
