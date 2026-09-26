const BingoBord = require('../Models/BingoBord');

const checkUserExists = async (req, res, next) => {
    const { username } = req.body;
  
    try {
        const user = await BingoBord.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        req.user = user;  // Attach the user to the request for the controller to access
        next(); // Move to the next middleware or the controller
    } catch (error) {
        console.error("Error checking user:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

module.exports = checkUserExists;

