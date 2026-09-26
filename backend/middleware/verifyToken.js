const jwt = require('jsonwebtoken');
require('dotenv').config();

const secretkey = process.env.JWT_SECRET;

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1] || req.cookies.accesstoken;

  if (!token) return res.status(401).json({ message: "No token provided" });

  jwt.verify(token, secretkey, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });

    req.username = decoded.username;
    req.role = decoded.role;
    req.phoneNumber=decoded.phoneNumber;
    next();
  });
}

module.exports = verifyToken;
