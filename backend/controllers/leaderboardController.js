const BingoBord = require("../Models/BingoBord");


exports.getTopUsers = async (req, res) => {
  try {
    const topUsers = await BingoBord.find()
      .sort({ coins: -1 }) // highest coins first
      .limit(5)
      .select("username coins");

    res.json(topUsers);
  } catch (error) {
    console.error("Error fetching top users:", error);
    res.status(500).json({ error: "Server error" });
  }
};
