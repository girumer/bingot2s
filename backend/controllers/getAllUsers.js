// controllers/getAllUsers.js
const BingoBord = require("../Models/BingoBord");

// --- Add game history for a user ---
exports.addGameHistory = async (req, res) => {
  try {
    const { user, roomId, stake, result } = req.body;

    const updatedUser = await BingoBord.findOneAndUpdate(
      { username: user },                     
      {
        $push: {
          gameHistory: {
            roomId: Number(roomId),
            stake: Number(stake),
            outcome: result, // "win" or "loss"
          },
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "Game history added", data: updatedUser.gameHistory });
  } catch (err) {
    console.error("Failed to save game history:", err);
    res.status(500).json({ error: "Failed to save game history" });
  }
};

// --- Get all users (admin purpose) ---
exports.getAllUsers = async (req, res) => {
  try {
    const users = await BingoBord.find().select('-password'); // hide passwords
    res.status(200).json(users);
  } catch (err) {
    console.error("Failed to fetch users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};
