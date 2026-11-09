const BingoBord = require('../Models/BingoBord');

const registerUser = async (req, res) => {
  const { username, phoneNumber, role, amount } = req.body;

  try {
    // Check if user already exists
    const existingUser = await BingoBord.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Save user
    const newUser = new BingoBord({
      username,
      phoneNumber,
     
    });

    await newUser.save();

    // Send response with user data
    res.status(201).json({
      message: "User registered successfully",
      user: {
        username: newUser.username,
        phoneNumber: newUser.phoneNumber,
        
      }
    });
  } catch (error) {
    console.error("Error during user registration:", error);
    res.status(500).json({ message: "Registration failed" });
  }
};

module.exports = { registerUser };
