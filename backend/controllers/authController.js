const jwt = require('jsonwebtoken');
const BingoBord = require('../Models/BingoBord');
const { secretkey, refreshKey } = require("../config/jwtconfig");

const loginUser = async (req, res) => {
  const { username, phoneNumber } = req.body; // use phoneNumber now

  try {
    // Find user by username and phoneNumber
    const existingUser = await BingoBord.findOne({ username, phoneNumber });

    if (!existingUser) {
      return res.json({ message: "User does not exist" });
    }

    if (existingUser.Wallet < 0) {
      return res.json({ message: "Insufficient balance" });
    }

    const role = existingUser.role;
    const accessToken = jwt.sign({ username, role,phoneNumber }, secretkey, { expiresIn: '1d' });
    const refreshToken = jwt.sign({ username }, refreshKey, { expiresIn: '30d' });

    res.cookie('accesstoken', accessToken, {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: false,
      secure: false,
      sameSite: 'strict',
    });

    res.json({
      message: 'Login successful',
      token: accessToken,
      client: role === 'client',
      phoneNumber:phoneNumber,
    });

  } catch (e) {
    console.error('Login error:', e);
    res.json({ message: "Error during login" });
  }
};

module.exports = { loginUser };
