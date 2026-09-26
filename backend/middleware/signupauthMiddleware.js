const validateSignupInput = (req, res, next) => {
  const { username, phoneNumber } = req.body;

  if (!username || !phoneNumber === undefined) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (phoneNumber.length < 9 || phoneNumber.length > 15) {
    return res.status(400).json({ message: "Phone number must be between 9 and 15 digits" });
  }

 
console.log("Signup body in validator:", req.body);
  next();
};
module.exports = { validateSignupInput };