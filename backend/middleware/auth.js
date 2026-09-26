const bcrypt = require('bcryptjs');

const hashPassword = async (req, res, next) => {
  const { password } = req.body;
  if (password) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10); // Hash with salt rounds
      req.body.password = hashedPassword;  // Replace plain password with hashed one
      next();
    } catch (err) {
      return res.status(500).json({ error: 'Error hashing password' });
    }
  } else {
    next();
  }
};
