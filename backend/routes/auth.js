const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const BingoBord = require('../Models/BingoBord'); // adjust path
const { secretkey } = require('../config/jwtconfig'); // your JWT secret

// First-time admin registration
router.post('/register-first-admin', async (req, res) => {
  try {
    const adminCount = await BingoBord.countDocuments({ role: 'admin' });
    if (adminCount > 0) {
      return res.status(403).json({ message: 'Admin already exists' });
    }

    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = new BingoBord({
      username,
      password: hashedPassword,
      role: 'admin',
      Wallet: 0,
      coins: 0
    });

    await admin.save();
    res.json({ message: 'First admin created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin login
router.post('/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await BingoBord.findOne({ username, role: 'admin' });
    if (!admin) return res.json({ message: 'Admin not found' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.json({ message: 'Wrong password' });

    // Generate token
    const token = jwt.sign({ username, role: 'admin' }, secretkey, { expiresIn: '1d' });
    res.json({ message: 'Login successful', token });
  } catch (err) {
    console.error(err);
    res.json({ message: 'Login error' });
  }
});

module.exports = router;
