const jwt = require('jsonwebtoken');
const BingoBord = require('../Models/BingoBord');
const { secretkey, refreshKey } = require("../config/jwtconfig");

const loginUser = async (req, res) => {
  const { username, phoneNumber } = req.body;

  // FIX 1: accept plain text only (blocks the "any username" database trick)
  if (typeof username !== 'string' || typeof phoneNumber !== 'string' ||
      !username.trim() || !phoneNumber.trim()) {
    return res.json({ message: "User does not exist" });
  }

  try {
    const existingUser = await BingoBord.findOne({
      username: username.trim(),
      phoneNumber: phoneNumber.trim(),
    });

    if (!existingUser) {
      return res.json({ message: "User does not exist" });
    }

    // FIX 2: admins must use the admin login with their password
    if (existingUser.role === 'admin') {
      return res.json({ message: "User does not exist" });
    }

    if (existingUser.Wallet < 0) {
      return res.json({ message: "Insufficient balance" });
    }

    // FIX 3: this route only ever gives a player token
    const role = 'client';
    const accessToken = jwt.sign(
      { username: existingUser.username, role, phoneNumber: existingUser.phoneNumber },
      secretkey,
      { expiresIn: '1d' }
    );
    const refreshToken = jwt.sign({ username: existingUser.username }, refreshKey, { expiresIn: '30d' });

    res.cookie('accesstoken', accessToken, {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: false,
      secure: false,
      sameSite: 'strict',
    });

    res.json({
      message: 'Login successful',
      token: accessToken,
      client: true,
      phoneNumber: existingUser.phoneNumber,
    });

  } catch (e) {
    console.error('Login error:', e);
    res.json({ message: "Error during login" });
  }
};

module.exports = { loginUser };
