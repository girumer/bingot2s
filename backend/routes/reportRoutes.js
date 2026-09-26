const express = require('express');
const router = express.Router();
const checkPlayerExist = require('../middleware/checkPlayerExist');
const reportController = require('../controllers/reportController');

router.get('/getReportData', checkPlayerExist, reportController); // Fetch report data

module.exports = router;
