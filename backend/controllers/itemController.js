const Item = require('../models/Item');

// @desc    Create new item
// @route   POST /api/items
// @access  Private
exports.createItem = async (req, res, next) => {
  try {
    const { title, description, status, priority } = req.body;

    const item = await Item.create({
      title,
      description,
      status,
      priority,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all items (paginated, filtered)
// @route   GET /api/items?status=&priority=&search=&page=&limit=
// @access  Private
exports.getItems = async (req, res, next) => {
  try {
    const query = {};

    // Non-admin users only see their own items
    if (req.user.role !== 'admin') {
      query.createdBy = req.user._id;
    }

    if (req.query.status) query.status = req.query.status;
    if (req.query.priority) query.priority = req.query.priority;
    if (req.query.search) {
      query.title = { $regex: req.query.search, $options: 'i' };
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Item.find(query)
        .populate('createdBy', 'name email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Item.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: items.length,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single item
// @route   GET /api/items/:id
// @access  Private
exports.getItemById = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id).populate('createdBy', 'name email');

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    if (item.createdBy._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to access this item' });
    }

    res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

// @desc    Update item
// @route   PUT /api/items/:id
// @access  Private
exports.updateItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    if (item.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this item' });
    }

    // Only allow updating permitted fields — never createdBy
    const { title, description, status, priority } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;

    const updated = await Item.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete item
// @route   DELETE /api/items/:id
// @access  Private
exports.deleteItem = async (req, res, next) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    if (item.createdBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this item' });
    }

    await item.deleteOne();

    res.status(200).json({ success: true, message: 'Item deleted successfully', data: {} });
  } catch (error) {
    next(error);
  }
};
