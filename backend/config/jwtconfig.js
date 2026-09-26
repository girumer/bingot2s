require('dotenv').config();
const crypto = require('crypto');

// Use the JWT_SECRET from the environment, or fallback to a randomly generated key if not set
const secretkey = process.env.JWT_SECRET;

const refreshKey=process.env.JWT_PRIVATE
  // Should print the value of JWT_PRIVATE

module.exports = { secretkey,refreshKey };
