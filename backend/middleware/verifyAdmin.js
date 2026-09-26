// middleware/verifyAdmin.js
const jwt = require("jsonwebtoken");
const BingoBord = require('../Models/BingoBord');// Replace with your actual User model
const secretKey = process.env.JWT_SECRET;

const verifyAdmin = async (req, res, next) => {
    const token = req.cookies.accesstoken; // Assuming you're using cookies

    if (!token) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    try {
        const decoded = jwt.verify(token, secretKey);
        const user = await User.findById(decoded.id);

        if (!user || user.role !== "admin") {
            return res.status(403).json({ message: "Forbidden: You are not an admin" });
        }

        req.admin = user; // Attach admin info to the request
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
};

module.exports = verifyAdmin;
