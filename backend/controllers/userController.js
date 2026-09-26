const BingoBord = require('../Models/BingoBord');

const getUserHistory = async (req, res) => {
  const { username } = req.body;

  try {
    const user = await BingoBord.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user.gameHistory || []);
  } catch (e) {
    console.error('Error fetching user history:', e);
    res.status(500).json({ message: 'Error fetching history' });
  }
};

module.exports = { getUserHistory };
