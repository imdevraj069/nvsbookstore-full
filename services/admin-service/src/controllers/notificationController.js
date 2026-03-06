// Notification Controller — Full CRUD with filesystem PDF support

const logger = require('@sarkari/logger');
const { Notification } = require('@sarkari/database').models;
const { generateSlug, getUniqueSlug } = require('../utils/slug');
const { uploadDocument, deleteFile } = require('../storage/imageStorage');
const { invalidateNotifications } = require('../cache/cacheManager');

/**
 * GET /api/admin/notifications
 */
const getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({}).sort({ publishDate: -1 }).lean();
    res.json({ success: true, data: notifications });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/admin/notifications/:id
 */
const getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id).lean();
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    res.json({ success: true, data: notification });
  } catch (error) {
    logger.error('Error fetching notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/admin/notifications
 * Accepts multipart/form-data with optional pdfFile
 */
const createNotification = async (req, res) => {
  try {
    const data = JSON.parse(req.body.data || '{}');

    // Generate unique slug
    const baseSlug = generateSlug(data.title);
    data.slug = await getUniqueSlug(Notification, baseSlug);

    // Handle PDF upload to server storage (documents)
    if (req.files?.pdfFile?.[0]) {
      const file = req.files.pdfFile[0];
      const uploadResult = await uploadDocument(file.originalname, file.buffer, file.mimetype);
      data.pdfFile = {
        key: uploadResult.fileName,
        bucket: 'local-storage',
        fileName: uploadResult.fileName,
        fileSize: file.size,
      };
    }
    // Admin can alternatively paste a Google Drive link via data.pdfUrl

    // Parse tags if string
    if (typeof data.tags === 'string') {
      data.tags = data.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    const notification = await Notification.create(data);

    logger.info(`Notification created: ${notification.title} (${notification.slug})`);
    await invalidateNotifications();
    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    logger.error('Error creating notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PUT /api/admin/notifications/:id
 */
const updateNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const data = JSON.parse(req.body.data || '{}');

    const existing = await Notification.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    // Regenerate slug if title changed
    if (data.title && data.title !== existing.title) {
      const baseSlug = generateSlug(data.title);
      data.slug = await getUniqueSlug(Notification, baseSlug, id);
    }

    // Handle new PDF upload
    if (req.files?.pdfFile?.[0]) {
      // Delete old PDF from server storage
      if (existing.pdfFile?.key) {
        await deleteFile(existing.pdfFile.key, 'document');
      }
      const file = req.files.pdfFile[0];
      const uploadResult = await uploadDocument(file.originalname, file.buffer, file.mimetype);
      data.pdfFile = {
        key: uploadResult.fileName,
        bucket: 'local-storage',
        fileName: uploadResult.fileName,
        fileSize: file.size,
      };
    }

    // Parse tags if needed
    if (typeof data.tags === 'string') {
      data.tags = data.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    const notification = await Notification.findByIdAndUpdate(id, data, { new: true });

    logger.info(`Notification updated: ${notification.title}`);
    await invalidateNotifications();
    res.json({ success: true, data: notification });
  } catch (error) {
    logger.error('Error updating notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/admin/notifications/:id
 */
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    // Clean up server storage files
    if (notification.pdfFile?.key) {
      await deleteFile(notification.pdfFile.key, 'document');
    }

    await Notification.findByIdAndDelete(req.params.id);

    logger.info(`Notification deleted: ${notification.title}`);
    await invalidateNotifications();
    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PATCH /api/admin/notifications/:id/toggle
 * Toggle isVisible, isFeatured
 */
const toggleNotificationField = async (req, res) => {
  try {
    const { id } = req.params;
    const { field } = req.body;
    const allowedFields = ['isVisible', 'isFeatured'];

    if (!allowedFields.includes(field)) {
      return res.status(400).json({ success: false, error: `Invalid toggle field: ${field}` });
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    notification[field] = !notification[field];
    await notification.save();

    logger.info(`Notification ${field} toggled: ${notification.title} → ${notification[field]}`);
    await invalidateNotifications();
    res.json({ success: true, data: notification });
  } catch (error) {
    logger.error('Error toggling notification field:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/admin/notifications/:id/duplicate
 */
const duplicateNotification = async (req, res) => {
  try {
    const original = await Notification.findById(req.params.id).lean();
    if (!original) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    const { _id, slug, createdAt, updatedAt, ...rest } = original;

    const newTitle = `${original.title} (Copy)`;
    const baseSlug = generateSlug(newTitle);
    const uniqueSlug = await getUniqueSlug(Notification, baseSlug);

    const duplicate = await Notification.create({
      ...rest,
      title: newTitle,
      slug: uniqueSlug,
      publishDate: new Date(),
      isFeatured: false,
    });

    logger.info(`Notification duplicated: ${duplicate.title}`);
    await invalidateNotifications();
    res.status(201).json({ success: true, data: duplicate });
  } catch (error) {
    logger.error('Error duplicating notification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllNotifications,
  getNotificationById,
  createNotification,
  updateNotification,
  deleteNotification,
  toggleNotificationField,
  duplicateNotification,
};
