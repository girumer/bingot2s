// routes/walletRoutes.js
const express = require("express");
const router = express.Router();
const BingoBord = require("../Models/BingoBord");
const verifyToken = require("../middleware/verifyToken");

// Get wallet and coins for a user
// A player may only read their own wallet.
router.get("/:username", verifyToken, async (req, res) => {
  try {
    if (req.params.username !== req.username) return res.status(403).json({ message: "Forbidden" });
    const user = await BingoBord.findOne({ username: req.username });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Include coins in the response
    res.json({ Wallet: user.Wallet, coins: user.coins });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
// Coins → wallet, worked out on the server with the same rule as the bot
// (1 coin = 1 birr). The browser no longer decides the amounts.
router.post("/convertCoins", verifyToken, async (req, res) => {
  try {
    const user = await BingoBord.findOne({ username: req.username }, { coins: 1 });
    if (!user) return res.status(404).json({ message: "User not found" });
    const coins = Math.floor((user.coins || 0) * 100) / 100;
    if (coins < 0.01) return res.status(400).json({ message: "No coins to convert" });
    const updated = await BingoBord.findOneAndUpdate(
      { _id: user._id, coins: { $gte: coins } },
      { $inc: { Wallet: coins, coins: -coins } },
      { new: true }
    );
    if (!updated) return res.status(409).json({ message: "Coin balance changed, try again" });
    res.json({ Wallet: updated.Wallet, coins: updated.coins, converted: coins });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
module.exports = router;
