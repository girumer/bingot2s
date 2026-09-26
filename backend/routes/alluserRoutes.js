// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const verifyUser = require('../middleware/verifyUser');
const { getAllUsers } = require('../controllers/getAllUsers');

router.get('/dashboards', verifyUser, getAllUsers);

module.exports = router;
