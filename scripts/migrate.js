#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 * NVS BookStore — Notification Migration Script
 * ═══════════════════════════════════════════════════════════════
 *
 * Migrates NOTIFICATIONS from the OLD MongoDB Atlas database
 * to the NEW local MongoDB replica-set database.
 *
 * - Tags are kept as slug strings in the `tags` array
 * - NO Tag documents are created
 * - Only the `notifications` collection is touched
 *
 * OLD schema → NEW schema field mapping:
 *   category (embedded obj)  →  tags[] (slug strings)
 *   isfeatured               →  isFeatured
 *   date                     →  publishDate
 *   + all new fields get defaults
 *
 * Usage:
 *   node scripts/migrate.js
 *
 * Env vars:
 *   OLD_MONGODB_URI — connection string for the old Atlas cluster
 *   MONGO_URI       — connection string for the new local replica-set
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════

const OLD_URI = process.env.OLD_MONGODB_URI || 'mongodb+srv://nvsbookpdf:hxzD9Sc2rKXjMq4u@cluster0.hmclrwp.mongodb.net/nvsbookstore';
const NEW_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nvsbookstore?replicaSet=rs0';

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

const log = (msg) => console.log(`[MIGRATE] ${msg}`);
const err = (msg) => console.error(`[ERROR]   ${msg}`);

const generateSlug = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// ═══════════════════════════════════════════
// MIGRATE NOTIFICATIONS
// ═══════════════════════════════════════════

/**
 * Convert one old notification document to the new schema.
 * Tags stay as plain slug strings — no Tag collection writes.
 */
function transformNotification(n) {
  // Build tags from old category + old tags array
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

async function migrateNotifications(oldDb, newDb) {
  log('Fetching notifications from OLD database...');
  const oldNotifs = await oldDb.collection('notifications').find({}).toArray();
  log(`  Found ${oldNotifs.length} notifications in OLD database`);

  if (oldNotifs.length === 0) {
    log('  ⚠️  No notifications to migrate');
    return 0;
  }

  const newNotifs = oldNotifs.map(transformNotification);

  // Log sample for verification
  log('  Sample transformed notification:');
  const sample = newNotifs[0];
  log(`    title: "${sample.title}"`);
  log(`    slug:  "${sample.slug}"`);
  log(`    tags:  [${sample.tags.join(', ')}]`);
  log(`    publishDate: ${sample.publishDate}`);

  await newDb.collection('notifications').insertMany(newNotifs);
  log(`  ✅ Notifications migrated: ${newNotifs.length}`);
  return newNotifs.length;
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════

async function main() {
  log('═══════════════════════════════════════════');
  log('NVS BookStore — Notification Migration');
  log('═══════════════════════════════════════════');
  log(`OLD DB: ${OLD_URI.replace(/:[^:@]+@/, ':***@')}`);
  log(`NEW DB: ${NEW_URI.replace(/:[^:@]+@/, ':***@')}`);
  log('');

  let oldConn, newConn;

  try {
    log('Connecting to OLD database (Atlas)...');
    oldConn = await mongoose.createConnection(OLD_URI).asPromise();
    log('  ✅ Connected to OLD database');

    log('Connecting to NEW database (local replica set)...');
    newConn = await mongoose.createConnection(NEW_URI).asPromise();
    log('  ✅ Connected to NEW database');

    const oldDb = oldConn.db;
    const newDb = newConn.db;

    // Check if notifications already exist
    const existingCount = await newDb.collection('notifications').countDocuments();
    if (existingCount > 0) {
      log('');
      log(`⚠️  NEW database already has ${existingCount} notifications!`);
      log('   Dropping existing notifications collection...');
      await newDb.collection('notifications').drop();
      log('   ✅ Dropped');
    }

    log('');
    log('Starting notification migration...');
    log('───────────────────────────────────────────');

    const count = await migrateNotifications(oldDb, newDb);

    log('');
    log('───────────────────────────────────────────');
    log(`✅ Migration completed — ${count} notifications migrated`);
    log('   Tags kept as slug strings (no Tag documents created)');
    log('');
  } catch (error) {
    err(`Migration failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    if (oldConn) await oldConn.close();
    if (newConn) await newConn.close();
    log('Connections closed.');
  }
}

main();
