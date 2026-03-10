// Blog Controller — Admin Service
// Handles blog CRUD (create, update, delete) and image upload
// Writers with blog access OR admins can create/edit blogs

const logger = require('@sarkari/logger');
const { Blog, BlogAccess } = require('@sarkari/database').models;

/**
 * POST /api/blogs — Create a new blog
 * Requires auth + (blog access with canWrite OR admin role)
 */
const createBlog = async (req, res) => {
  try {
    const user = req.user; // from requireAuth middleware

    // Check if user has blog writing access (unless admin)
    if (user.role !== 'admin') {
      const blogAccess = await BlogAccess.findOne({
        userId: user.id,
        status: 'accepted',
        canWrite: true,
      });

      if (!blogAccess) {
        return res.status(403).json({ success: false, error: 'Not authorized to create blogs' });
      }
    }

    const {
      title, slug, authorName, coverImage, headerImage,
      content, tags, category, metaTitle, metaDescription, isPublished,
    } = req.body;

    if (!title || !slug || !content) {
      return res.status(400).json({ success: false, error: 'Title, slug, and content are required' });
    }

    const blog = new Blog({
      title,
      slug,
      author: user.id,
      authorName: authorName || user.name,
      coverImage,
      headerImage,
      content,
      tags: tags || [],
      category,
      metaTitle,
      metaDescription,
      isPublished: isPublished || false,
      publishedAt: isPublished ? new Date() : null,
    });

    await blog.save();

    logger.info(`Blog created: "${title}" by ${user.name}`);
    res.status(201).json({ success: true, data: blog });
  } catch (error) {
    logger.error('Blog create error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/blogs/:slug — Get blog by slug (includes drafts for author/admin)
 * Requires auth
 */
const getBlog = async (req, res) => {
  try {
    const { slug } = req.params;
    const user = req.user;

    const blog = await Blog.findOne({
      $or: [{ slug }, { _id: slug.match(/^[0-9a-fA-F]{24}$/) ? slug : null }],
    }).populate('author', 'name email _id');

    if (!blog) {
      return res.status(404).json({ success: false, error: 'Blog not found' });
    }

    // Only author or admin can see unpublished blogs
    if (!blog.isPublished) {
      if (blog.author._id.toString() !== user.id && user.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Not authorized to view this blog' });
      }
    }

    res.json({ success: true, data: blog });
  } catch (error) {
    logger.error('Blog get error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/blogs/my — Get current user's blogs (for blog dashboard)
 * Requires auth
 */
const getMyBlogs = async (req, res) => {
  try {
    const user = req.user;

    const blogs = await Blog.find({ author: user.id })
      .select('-content')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: blogs });
  } catch (error) {
    logger.error('My blogs error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PUT /api/blogs/:slug — Update a blog
 * Requires auth + (author OR admin)
 */
const updateBlog = async (req, res) => {
  try {
    const { slug } = req.params;
    const user = req.user;

    const blog = await Blog.findOne({
      $or: [{ slug }, { _id: slug.match(/^[0-9a-fA-F]{24}$/) ? slug : null }],
    });

    if (!blog) {
      return res.status(404).json({ success: false, error: 'Blog not found' });
    }

    // Only author or admin can update
    if (blog.author.toString() !== user.id && user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized to update this blog' });
    }

    const {
      title, slug: newSlug, authorName, coverImage, headerImage,
      content, tags, category, metaTitle, metaDescription, isPublished,
    } = req.body;

    if (title) blog.title = title;
    if (newSlug) blog.slug = newSlug;
    if (authorName) blog.authorName = authorName;
    if (coverImage) blog.coverImage = coverImage;
    if (headerImage) blog.headerImage = headerImage;
    if (content) blog.content = content;
    if (tags) blog.tags = tags;
    if (category) blog.category = category;
    if (metaTitle) blog.metaTitle = metaTitle;
    if (metaDescription) blog.metaDescription = metaDescription;

    if (isPublished !== undefined && isPublished !== blog.isPublished) {
      blog.isPublished = isPublished;
      if (isPublished) {
        blog.publishedAt = new Date();
      }
    }

    await blog.save();

    logger.info(`Blog updated: "${blog.title}" by ${user.name}`);
    res.json({ success: true, data: blog });
  } catch (error) {
    logger.error('Blog update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/blogs/:slug — Delete a blog
 * Requires auth + (author OR admin)
 */
const deleteBlog = async (req, res) => {
  try {
    const { slug } = req.params;
    const user = req.user;

    const blog = await Blog.findOne({
      $or: [{ slug }, { _id: slug.match(/^[0-9a-fA-F]{24}$/) ? slug : null }],
    });

    if (!blog) {
      return res.status(404).json({ success: false, error: 'Blog not found' });
    }

    if (blog.author.toString() !== user.id && user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this blog' });
    }

    await Blog.deleteOne({ _id: blog._id });

    logger.info(`Blog deleted: "${blog.title}" by ${user.name}`);
    res.json({ success: true, message: 'Blog deleted' });
  } catch (error) {
    logger.error('Blog delete error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/blogs/upload-image — Upload a blog image
 * Stores to ~/storage/images, returns the serving URL
 * Requires auth
 */
const uploadBlogImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file provided' });
    }

    const { uploadImage } = require('../storage/imageStorage');
    const fileName = `blog-${req.file.originalname}`;
    const result = await uploadImage(fileName, req.file.buffer, req.file.mimetype);

    logger.info(`Blog image uploaded: ${result.fileName}`);
    res.json({
      success: true,
      data: {
        url: result.path,
        key: result.fileName,
        bucket: 'blog-images',
      },
    });
  } catch (error) {
    logger.error('Blog image upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  createBlog,
  getBlog,
  getMyBlogs,
  updateBlog,
  deleteBlog,
  uploadBlogImage,
};
