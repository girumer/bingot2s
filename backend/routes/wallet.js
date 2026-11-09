// backend/routes/wallet.js
const express = require("express");
const router = express.Router();
const BingoBord = require("../Models/BingoBord");
const verifyToken = require("../middleware/verifyToken");

// Deduct deposit based on room selection
router.post("/deductDeposit", verifyToken, async (req, res) => {
  try {
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ message: "Room ID is required" });

    const stake = Number(roomId); // stake mirrors room ID
    if (!Number.isFinite(stake) || stake <= 0) return res.status(400).json({ message: "Invalid room" });
    const user = await BingoBord.findOneAndUpdate(
      { username: req.username, Wallet: { $gte: stake } },
      { $inc: { Wallet: -stake } },
      { new: true }
    );
    if (!user) {
      const exists = await BingoBord.exists({ username: req.username });
      return res.status(exists ? 400 : 404).json({ message: exists ? "Insufficient balance with this place" : "User not found" });
    }

    res.status(200).json({ message: "Deposit deducted", Wallet: user.Wallet });
  } catch (err) {
    console.error("Error deducting deposit:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
