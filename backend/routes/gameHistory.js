const express = require("express");
const router = express.Router();
const BingoBord = require("../Models/BingoBord"); // adjust path
const verifyToken = require("../middleware/verifyToken"); // your JWT auth

// Fetch game history for the logged-in user
router.post("/getHistory", verifyToken, async (req, res) => {
  try {
    const username = req.username; // set by verifyToken

    const userDoc = await BingoBord.findOne({ username });
    if (!userDoc) return res.status(404).json({ error: "User not found" });

    res.status(200).json({ gameHistory: userDoc.gameHistory });
  } catch (err) {
    console.error("Error fetching game history:", err);
    res.status(500).json({ error: "Failed to fetch game history" });
  }
});

module.exports = router;
