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
    const user = await BingoBord.findOne({ username: req.username });

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.Wallet < stake) return res.status(400).json({ message: "Insufficient balance with this place" });

    user.Wallet -= stake;
    await user.save();

    res.status(200).json({ message: "Deposit deducted", Wallet: user.Wallet });
  } catch (err) {
    console.error("Error deducting deposit:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
