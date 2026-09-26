const BingoBord = require('../Models/BingoBord');

const checkPlayerExist = async (req, res, next) => {
  const { user } = req.query;  // Access user from query params, not body

  if (!user) {
    return res.status(400).json({ message: 'User parameter is required' });
  }

  try {
    const player = await BingoBord.findOne({ username: user });

    if (!player) {
      return res.status(404).json({ message: 'Player not found' });
    }

    req.player = player;  // Attach player data to the request
    next(); // Continue to the next middleware or controller
  } catch (error) {
    console.error('Error checking player existence:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = checkPlayerExist;
