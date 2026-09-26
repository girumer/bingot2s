const jwt = require('jsonwebtoken');
const { secretkey } = process.env;

const generateJWT = (user) => {
  return jwt.sign({ username: user.username ,role:user.role,phoneNumber:user.phoneNumber}, secretkey, { expiresIn: '1d' });
};
