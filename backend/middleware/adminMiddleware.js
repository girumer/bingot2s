const jwt = require('jsonwebtoken');
const { secretkey } = require('../config/jwtconfig');

exports.verifyAdmin = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Bearer token
  if (!token) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, secretkey);
    if (decoded.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
