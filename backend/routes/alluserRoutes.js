// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { verifyAdmin } = require('../middleware/adminMiddleware');
const { getAllUsers } = require('../controllers/getAllUsers');

router.get('/dashboards', verifyAdmin, getAllUsers); // admins only

module.exports = router;
