const express = require('express');
const { registerUser } = require('../controllers/signupauthController');
const { validateSignupInput } = require('../middleware/signupauthMiddleware'); // <- matches the middleware

const router = express.Router();
console.log('registerUser:', registerUser);
console.log('validateSignupInput:', validateSignupInput);
// Use the middleware correctly
router.post('/register', validateSignupInput, registerUser);

module.exports = router;
