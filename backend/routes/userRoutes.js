const express = require('express');
const { getUserProfile, updateUserProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { body } = require('express-validator');
const { validate } = require('../middleware/validateMiddleware');

const router = express.Router();

router.use(protect);

const updateProfileValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty')
    .isLength({ max: 50 }).withMessage('Name cannot exceed 50 characters'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

router.route('/profile')
  .get(getUserProfile)
  .put(validate(updateProfileValidation), updateUserProfile);

// Admin only routes
const { getAllUsers, updateUserRole } = require('../controllers/userController');
const { authorize } = require('../middleware/authMiddleware');

router.use(authorize('admin'));

router.route('/')
  .get(getAllUsers);

router.route('/:id/role')
  .put(updateUserRole);

module.exports = router;
