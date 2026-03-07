// Migration Controller — Notifications + Products
// Migrates both notifications and products from old Atlas DB to new local DB

const mongoose = require('mongoose');
const logger = require('@sarkari/logger');

const OLD_URI = process.env.OLD_MONGODB_URI || '';
const NEW_URI = process.env.MONGO_URI || '';

const generateSlug = (text) => {
  if (!text) return '';
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '');
};

// ── Transform functions ──

function transformNotification(n) {
  const tags = [];
  if (n.category?.slug) tags.push(n.category.slug);
  else if (n.category?.name) tags.push(generateSlug(n.category.name));
  for (const t of n.tags || []) {
    const slug = generateSlug(t);
    if (slug) tags.push(slug);
  }
  const uniqueTags = [...new Set(tags)];

  return {
    _id: n._id,
    title: n.title || '',
    slug: n.slug || generateSlug(n.title || ''),
    description: n.description || '',
    content: n.content || '',
    tags: uniqueTags,
    publishDate: n.date || n.publishDate || n.createdAt || new Date(),
    lastDate: n.lastDate || null,
    department: n.department || '',
    location: n.location || '',
    applyUrl: n.applyUrl || '',
    websiteUrl: n.websiteUrl || '',
    loginUrl: n.loginUrl || '',
    resultUrl: n.resultUrl || '',
    admitCardUrl: n.admitCardUrl || '',
    pdfFile: { key: '', bucket: 'notifications', fileName: '', fileSize: 0 },
    pdfUrl: n.pdfUrl || '',
    isFeatured: n.isfeatured || n.isFeatured || false,
    isVisible: n.isVisible !== false,
    isTemplate: false,
    priority: 'normal',
    createdAt: n.createdAt || n.date || new Date(),
    updatedAt: n.updatedAt || new Date(),
  };
}

function transformProduct(p) {
  // Build tags from old category + old tags array
  const tags = [];
  if (p.category?.slug) tags.push(p.category.slug);
  else if (p.category?.name) tags.push(generateSlug(p.category.name));
  for (const t of p.tags || []) {
    const slug = generateSlug(t);
    if (slug) tags.push(slug);
  }
  const uniqueTags = [...new Set(tags)];

  // Map formats
  const formats = [];
  if (p.isDigital) formats.push('digital');
  if (!p.isDigital || formats.length === 0) formats.push('physical');

  // Map thumbnail — old schema uses `image` (URL string)
  let thumbnail = null;
  if (p.image) {
    thumbnail = {
      url: p.image,
      key: '',
      bucket: 'products',
      mimeType: '',
      altText: p.title || '',
      sortOrder: 0,
    };
  }

  // Map additional images
  const images = (p.images || []).map((img, idx) => {
    if (typeof img === 'string') {
      return { url: img, key: '', bucket: 'products', mimeType: '', altText: '', sortOrder: idx };
    }
    return { url: img.url || '', key: img.key || '', bucket: 'products', mimeType: '', altText: '', sortOrder: idx };
  });

  return {
    _id: p._id,
    title: p.title || '',
    slug: p.slug || generateSlug(p.title || ''),
    description: p.description || '',
    longDescription: p.longDescription || p.content || '',
    price: p.price || 0,
    originalPrice: p.originalPrice || p.price || 0,
    thumbnail,
    images,
    formats,
    digitalFile: { key: '', bucket: 'digital', fileName: '', fileSize: 0 },
    digitalUrl: p.digitalUrl || '',
    digitalPrice: p.isDigital ? (p.price || 0) : 0,
    isPrintable: false,
    printPrice: 0,
    author: p.author || '',
    publisher: p.publisher || '',
    pages: p.pages || 0,
    isbn: p.isbn || '',
    language: Array.isArray(p.language) ? p.language : (p.language ? [p.language] : ['Hindi']),
    edition: '',
    rating: p.rating || 0,
    reviewCount: (p.reviews || []).length,
    reviews: (p.reviews || []).map(r => ({
      userId: r.userId,
      rating: r.rating || 5,
      comment: r.comment || '',
    })),
    tags: uniqueTags,
    badge: '',
    gradient: 'from-blue-600 to-indigo-700',
    isFeatured: p.isFeatured || false,
    isEditorPick: false,
    isVisible: p.isVisible !== false,
    stock: p.stock || 0,
    specifications: p.specifications || {},
    metaTitle: '',
    metaDescription: '',
    createdAt: p.createdAt || p.date || new Date(),
    updatedAt: p.updatedAt || new Date(),
  };
}

// ── Main handler ──

const runMigration = async (req, res) => {
  if (!OLD_URI) {
    return res.status(400).json({ success: false, error: 'OLD_MONGODB_URI environment variable is not set' });
  }

  let oldConn, newConn;
  const logs = [];
  const log = (msg) => { logs.push(msg); logger.info(`[MIGRATE] ${msg}`); };

  try {
    log('Connecting to OLD database (Atlas)...');
    oldConn = await mongoose.createConnection(OLD_URI).asPromise();
    log('Connected to OLD database');

    log('Connecting to NEW database...');
    newConn = await mongoose.createConnection(NEW_URI).asPromise();
    log('Connected to NEW database');

    const oldDb = oldConn.db;
    const newDb = newConn.db;

    // ── 1. Notifications ──
    const existingNotifs = await newDb.collection('notifications').countDocuments();
    if (existingNotifs > 0) {
      log(`Found ${existingNotifs} existing notifications — dropping...`);
      await newDb.collection('notifications').drop();
      log('Dropped existing notifications');
    }

    log('Starting notification migration...');
    const oldNotifs = await oldDb.collection('notifications').find({}).toArray();
    log(`Found ${oldNotifs.length} notifications in OLD database`);

    let notifCount = 0;
    if (oldNotifs.length > 0) {
      const newNotifs = oldNotifs.map(transformNotification);
      await newDb.collection('notifications').insertMany(newNotifs);
      notifCount = newNotifs.length;
    }
    log(`Notifications migrated: ${notifCount}`);

    // ── 2. Products (books, photo frames, etc.) ──
    const existingProducts = await newDb.collection('products').countDocuments();
    if (existingProducts > 0) {
      log(`Found ${existingProducts} existing products — dropping...`);
      await newDb.collection('products').drop();
      log('Dropped existing products');
    }

    log('Starting product migration...');
    const oldProducts = await oldDb.collection('products').find({}).toArray();
    log(`Found ${oldProducts.length} products in OLD database`);

    let productCount = 0;
    if (oldProducts.length > 0) {
      const newProducts = oldProducts.map(transformProduct);

      // Log breakdown
      const photoFrames = newProducts.filter(p => p.tags.includes('photo-frame') || p.tags.includes('photo-frames'));
      const books = newProducts.filter(p => !p.tags.includes('photo-frame') && !p.tags.includes('photo-frames'));
      log(`  📦 ${books.length} books, 🖼️ ${photoFrames.length} photo frames`);

      await newDb.collection('products').insertMany(newProducts);
      productCount = newProducts.length;
    }
    log(`Products migrated: ${productCount}`);

    log('Migration completed successfully!');

    res.json({
      success: true,
      data: {
        notifications: notifCount,
        products: productCount,
      },
      logs,
    });
  } catch (error) {
    logger.error('Migration failed:', error);
    res.status(500).json({ success: false, error: error.message, logs });
  } finally {
    if (oldConn) await oldConn.close();
    if (newConn) await newConn.close();
  }
};

module.exports = { runMigration };
