const express = require('express');
const {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
} = require('../controllers/itemController');
const { protect } = require('../middleware/authMiddleware');
const { body } = require('express-validator');
const { validate } = require('../middleware/validateMiddleware');

const router = express.Router();

router.use(protect);

const createValidation = [
  body('title').trim().notEmpty().withMessage('Title is required')
    .isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),
  body('description').trim().notEmpty().withMessage('Description is required')
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('status').optional().isIn(['pending', 'in-progress', 'completed'])
    .withMessage('Status must be pending, in-progress, or completed'),
  body('priority').optional().isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
];

const updateValidation = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty')
    .isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),
  body('description').optional().trim().notEmpty().withMessage('Description cannot be empty')
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  body('status').optional().isIn(['pending', 'in-progress', 'completed'])
    .withMessage('Status must be pending, in-progress, or completed'),
  body('priority').optional().isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high'),
];

router.route('/')
  .post(validate(createValidation), createItem)
  .get(getItems);

router.route('/:id')
  .get(getItemById)
  .put(validate(updateValidation), updateItem)
  .delete(deleteItem);

module.exports = router;
