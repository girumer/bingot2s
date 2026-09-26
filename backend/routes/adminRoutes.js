// routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const verifyAdmin = require("../middleware/verifyAdmin");
const { resetCustomerPassword } = require("../controllers/adminController");

// Route to reset customer password
router.post("/reset-password", verifyAdmin, resetCustomerPassword);

module.exports = router;
