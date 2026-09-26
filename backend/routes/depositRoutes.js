const express = require('express');
const router = express.Router();
const checkUserExists = require('../middleware/checkUserExists');
const { depositCheck } = require('../controllers/depositController');

router.post('/depositcheckB', checkUserExists, depositCheck);

module.exports = router;
