// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../middleware/adminMiddleware');
const { getAllUsers } = require('../controllers/getAllUsers');

// Every user's record: admins only (was open to any logged-in player).
router.get('/dashboards', verifyAdmin, getAllUsers);

module.exports = router;
