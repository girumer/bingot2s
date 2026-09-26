const BingoBord = require("../Models/BingoBord");

exports.addGameHistory = async (req, res) => {
  try {
    const { user, gameId, stake, result, roomId, cartelas } = req.body;

    if (!user || !roomId) {
      return res.status(400).json({ error: "User and roomId are required" });
    }

    // Find user and push new game history
    const updatedUser = await BingoBord.findOneAndUpdate(
      { username: user },
      {
        $push: {
          gameHistory: {
            gameId,
            roomId: Number(roomId),
            stake: Number(stake),
            outcome: result,
            cartelas,
            timestamp: new Date()
          }
        }
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
