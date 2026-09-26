const { body, validationResult } = require('express-validator');

const validateRegistration = [
  body('username').isLength({ min: 3 }).trim().escape(),
  body('phoneNumber') // check phoneNumber instead of password
    .isLength({ min: 9, max: 15 })
    .withMessage('Phone number must be between 9 and 15 digits')
    .matches(/^\d+$/)
    .withMessage('Phone number must contain only digits'),
  body('role').notEmpty().withMessage('Role is required'),
];

const validateLogin = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('phoneNumber').trim().notEmpty().withMessage('Phone number is required'),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = { validateRegistration, validateLogin, handleValidationErrors };
