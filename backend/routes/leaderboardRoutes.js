const express = require("express");
const router = express.Router();
const leaderboardController = require("../controllers/leaderboardController");

// GET /api/leaderboard/top
router.get("/leaderboard/top", leaderboardController.getTopUsers);

module.exports = router;
