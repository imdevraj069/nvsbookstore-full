// Migration Controller — Notification-only migration
// Migrates notifications from old Atlas DB to new local DB
// Tags kept as slug strings — no Tag documents created

const mongoose = require('mongoose');
const logger = require('@sarkari/logger');

const OLD_URI = process.env.OLD_MONGODB_URI || '';
const NEW_URI = process.env.MONGO_URI || '';

const generateSlug = (text) => {
  if (!text) return '';
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '');
};

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

    // Drop existing notifications if any
    const existingCount = await newDb.collection('notifications').countDocuments();
    if (existingCount > 0) {
      log(`Found ${existingCount} existing notifications — dropping...`);
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
    log('Tags kept as slug strings (no Tag documents created)');
    log('Migration completed successfully!');

    res.json({
      success: true,
      data: {
        notifications: notifCount,
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
