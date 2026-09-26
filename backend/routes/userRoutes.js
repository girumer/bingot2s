const express = require('express');
const { getUserHistory } = require('../controllers/userController');

const router = express.Router();

router.post('/getHistory',  getUserHistory);

module.exports = router;
