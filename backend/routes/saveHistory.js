const express = require("express");
const router = express.Router();
const BingoBord = require("../Models/BingoBord");

router.post("/api/saveHistory", async (req, res) => {
  // Step 1: Correctly destructure all required fields from the request body.
  const { username, gameId, roomId, stake, outcome } = req.body;

  // Step 2: Perform a single, complete validation check.
  // This ensures all required fields are present.
  if (!username || !gameId || !roomId || !stake || !outcome) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const user = await BingoBord.findOne({ username });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Step 3: Push the new object, including gameId, to the array.
    user.gameHistory.push({
      gameId, // This is now a valid variable from req.body
      roomId,
      stake,
      outcome,
      timestamp: new Date(),
    });

    if (outcome === "win") user.Wallet += stake;
    if (outcome === "loss") user.Wallet -= stake;

    await user.save();

    res.json({ success: true, gameHistory: user.gameHistory, Wallet: user.Wallet });
  } catch (err) {
    console.error("Failed to save game history:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;