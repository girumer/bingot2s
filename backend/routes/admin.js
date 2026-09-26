const express = require('express');
const router = express.Router();
const { adminLogin, getAllUsers,broadcastToAllCustomers,getTransactions,registerUser, deleteUser } = require('../controllers/adminController');
const { verifyAdmin } = require('../middleware/adminMiddleware'); // optional middleware

// Admin login
router.post('/login', adminLogin);
router.get('/login', (req, res) => {
  res.send('Admin login endpoint works. Use POST to login.');
});
router.post('/register-user', verifyAdmin, registerUser);
router.post('/brodcast',verifyAdmin,broadcastToAllCustomers);
router.delete('/delete-user/:userId', verifyAdmin, deleteUser);
// Protected admin routes
router.get('/users', verifyAdmin, getAllUsers);
router.get('/transactions', verifyAdmin, getTransactions);

module.exports = router;
