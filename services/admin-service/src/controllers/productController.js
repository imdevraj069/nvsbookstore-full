// Product Controller — Full CRUD with MinIO uploads

const logger = require('@sarkari/logger');
const { Product } = require('@sarkari/database').models;
const { generateSlug, getUniqueSlug } = require('../utils/slug');
const { uploadFile, deleteFile, BUCKETS } = require('../storage/minioClient');

/**
 * GET /api/admin/products
 */
const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: products });
  } catch (error) {
    logger.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/admin/products/:id
 */
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    logger.error('Error fetching product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/admin/products
 * Accepts multipart/form-data with optional thumbnail, images[], digitalFile
 */
const createProduct = async (req, res) => {
  try {
    const data = JSON.parse(req.body.data || '{}');

    // Generate unique slug
    const baseSlug = generateSlug(data.title);
    data.slug = await getUniqueSlug(Product, baseSlug);

    // Handle thumbnail upload
    if (req.files?.thumbnail?.[0]) {
      const file = req.files.thumbnail[0];
      const result = await uploadFile(
        BUCKETS.PRODUCTS,
        file.originalname,
        file.buffer,
        file.size,
        file.mimetype
      );
      data.thumbnail = {
        url: result.url,
        key: result.key,
        bucket: result.bucket,
        mimeType: result.mimeType,
      };
    }

    // Handle gallery images upload
    if (req.files?.images?.length > 0) {
      data.images = [];
      for (let i = 0; i < req.files.images.length; i++) {
        const file = req.files.images[i];
        const result = await uploadFile(
          BUCKETS.PRODUCTS,
          file.originalname,
          file.buffer,
          file.size,
          file.mimetype
        );
        data.images.push({
          url: result.url,
          key: result.key,
          bucket: result.bucket,
          mimeType: result.mimeType,
          sortOrder: i,
        });
      }
    }

    // Handle digital file upload (PDF or any file)
    if (req.files?.digitalFile?.[0]) {
      const file = req.files.digitalFile[0];
      const result = await uploadFile(
        BUCKETS.DIGITAL,
        file.originalname,
        file.buffer,
        file.size,
        file.mimetype
      );
      data.digitalFile = {
        key: result.key,
        bucket: result.bucket,
        fileName: file.originalname,
        fileSize: result.fileSize,
      };
    }

    // Parse tags if string
    if (typeof data.tags === 'string') {
      data.tags = data.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    // Parse formats if string
    if (typeof data.formats === 'string') {
      data.formats = data.formats.split(',').map((f) => f.trim()).filter(Boolean);
    }

    // Parse language if string
    if (typeof data.language === 'string') {
      data.language = data.language.split(',').map((l) => l.trim()).filter(Boolean);
    }

    const product = await Product.create(data);

    logger.info(`Product created: ${product.title} (${product.slug})`);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    logger.error('Error creating product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PUT /api/admin/products/:id
 */
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const data = JSON.parse(req.body.data || '{}');

    const existing = await Product.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Regenerate slug if title changed
    if (data.title && data.title !== existing.title) {
      const baseSlug = generateSlug(data.title);
      data.slug = await getUniqueSlug(Product, baseSlug, id);
    }

    // Handle new thumbnail
    if (req.files?.thumbnail?.[0]) {
      // Delete old thumbnail from MinIO
      if (existing.thumbnail?.key) {
        await deleteFile(existing.thumbnail.bucket, existing.thumbnail.key);
      }
      const file = req.files.thumbnail[0];
      const result = await uploadFile(
        BUCKETS.PRODUCTS,
        file.originalname,
        file.buffer,
        file.size,
        file.mimetype
      );
      data.thumbnail = {
        url: result.url,
        key: result.key,
        bucket: result.bucket,
        mimeType: result.mimeType,
      };
    }

    // Handle new gallery images (replaces all)
    if (req.files?.images?.length > 0) {
      // Delete old images
      for (const img of existing.images || []) {
        if (img.key) await deleteFile(img.bucket, img.key);
      }
      data.images = [];
      for (let i = 0; i < req.files.images.length; i++) {
        const file = req.files.images[i];
        const result = await uploadFile(
          BUCKETS.PRODUCTS,
          file.originalname,
          file.buffer,
          file.size,
          file.mimetype
        );
        data.images.push({
          url: result.url,
          key: result.key,
          bucket: result.bucket,
          mimeType: result.mimeType,
          sortOrder: i,
        });
      }
    }

    // Handle new digital file
    if (req.files?.digitalFile?.[0]) {
      if (existing.digitalFile?.key) {
        await deleteFile(existing.digitalFile.bucket, existing.digitalFile.key);
      }
      const file = req.files.digitalFile[0];
      const result = await uploadFile(
        BUCKETS.DIGITAL,
        file.originalname,
        file.buffer,
        file.size,
        file.mimetype
      );
      data.digitalFile = {
        key: result.key,
        bucket: result.bucket,
        fileName: file.originalname,
        fileSize: result.fileSize,
      };
    }

    // Parse arrays if needed
    if (typeof data.tags === 'string') {
      data.tags = data.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }
    if (typeof data.formats === 'string') {
      data.formats = data.formats.split(',').map((f) => f.trim()).filter(Boolean);
    }
    if (typeof data.language === 'string') {
      data.language = data.language.split(',').map((l) => l.trim()).filter(Boolean);
    }

    const product = await Product.findByIdAndUpdate(id, data, { new: true });

    logger.info(`Product updated: ${product.title}`);
    res.json({ success: true, data: product });
  } catch (error) {
    logger.error('Error updating product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/admin/products/:id
 */
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    // Clean up MinIO files
    if (product.thumbnail?.key) {
      await deleteFile(product.thumbnail.bucket, product.thumbnail.key);
    }
    for (const img of product.images || []) {
      if (img.key) await deleteFile(img.bucket, img.key);
    }
    if (product.digitalFile?.key) {
      await deleteFile(product.digitalFile.bucket, product.digitalFile.key);
    }

    await Product.findByIdAndDelete(req.params.id);

    logger.info(`Product deleted: ${product.title}`);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    logger.error('Error deleting product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PATCH /api/admin/products/:id/toggle
 * Toggle boolean fields: isVisible, isFeatured, isEditorPick, isPrintable
 */
const toggleProductField = async (req, res) => {
  try {
    const { id } = req.params;
    const { field } = req.body;
    const allowedFields = ['isVisible', 'isFeatured', 'isEditorPick', 'isPrintable'];

    if (!allowedFields.includes(field)) {
      return res.status(400).json({ success: false, error: `Invalid toggle field: ${field}` });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    product[field] = !product[field];
    await product.save();

    logger.info(`Product ${field} toggled: ${product.title} → ${product[field]}`);
    res.json({ success: true, data: product });
  } catch (error) {
    logger.error('Error toggling product field:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductField,
};
