const jwt = require('jsonwebtoken');
const secretkey = process.env.JWT_SECRET;

const verifyUser = async (req, res, next) => {
    const accesstoken = req.headers['authorization']?.split(' ')[1];

    if (!accesstoken) {
        return res.status(401).json({ valid: false, message: 'No token provided' });
    }

    jwt.verify(accesstoken, secretkey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ valid: false, message: 'Invalid or expired token' });
        }
        req.username = decoded.username;
        req.role = decoded.role;
        req.phoneNumber=decoded.phoneNumber;
        next(); // Proceed to the next middleware
    });
};

module.exports = verifyUser;
