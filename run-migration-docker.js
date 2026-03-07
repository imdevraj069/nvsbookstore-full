#!/usr/bin/env node

/**
 * Notification Migration — Docker version
 * Connects to OLD Atlas and NEW local MongoDB replica set
 * Only migrates notifications — tags kept as slugs, no Tag docs created
 */

const mongoose = require('mongoose');

const OLD_URI = 'mongodb+srv://nvsbookpdf:hxzD9Sc2rKXjMq4u@cluster0.hmclrwp.mongodb.net/nvsbookstore';
const NEW_URI = 'mongodb://mongo-primary:27017,mongo-secondary:27017,mongo-arbiter:27017/?replicaSet=rs0';

const log = (msg) => console.log(`[MIGRATE] ${msg}`);
const err = (msg) => console.error(`[ERROR]   ${msg}`);

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

async function migrate() {
  let oldConn, newConn;

  try {
    log('═══════════════════════════════════════════');
    log('NVS BookStore — Notification Migration (Docker)');
    log('═══════════════════════════════════════════');

    log('Connecting to OLD database (Atlas)...');
    oldConn = await mongoose.createConnection(OLD_URI).asPromise();
    log('  ✅ Connected to OLD database');

    log('Connecting to NEW database (local replica set)...');
    newConn = await mongoose.createConnection(NEW_URI, {
      retryWrites: true,
      w: 'majority',
    }).asPromise();
    log('  ✅ Connected to NEW database');

    const oldDb = oldConn.db;
    const newDb = newConn.db;

    // Drop existing notifications if any
    const existingCount = await newDb.collection('notifications').countDocuments();
    if (existingCount > 0) {
      log(`⚠️  Found ${existingCount} existing notifications — dropping...`);
      await newDb.collection('notifications').drop();
      log('  ✅ Dropped');
    }

    log('');
    log('Starting notification migration...');
    log('───────────────────────────────────────────');

    const oldNotifs = await oldDb.collection('notifications').find({}).toArray();
    log(`  Found ${oldNotifs.length} notifications in OLD database`);

    if (oldNotifs.length > 0) {
      const newNotifs = oldNotifs.map(transformNotification);
      await newDb.collection('notifications').insertMany(newNotifs);
      log(`  ✅ Notifications migrated: ${newNotifs.length}`);
    } else {
      log('  ⚠️  No notifications to migrate');
    }

    log('');
    log('───────────────────────────────────────────');
    log('✅ Migration completed!');
    log('   Tags kept as slug strings (no Tag documents created)');

    // Summary
    const finalCount = await newDb.collection('notifications').countDocuments();
    log(`  notifications: ${finalCount}`);
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

migrate();
