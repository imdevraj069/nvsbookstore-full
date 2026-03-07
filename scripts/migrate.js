#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 * NVS BookStore — Migration Script
 * ═══════════════════════════════════════════════════════════════
 *
 * Migrates NOTIFICATIONS and PRODUCTS from the OLD MongoDB Atlas
 * database to the NEW local MongoDB replica-set database.
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

async function migrateNotifications(oldDb, newDb) {
  log('Fetching notifications from OLD database...');
  const oldNotifs = await oldDb.collection('notifications').find({}).toArray();
  log(`  Found ${oldNotifs.length} notifications in OLD database`);

  if (oldNotifs.length === 0) {
    log('  ⚠️  No notifications to migrate');
    return 0;
  }

  const newNotifs = oldNotifs.map(transformNotification);

  log('  Sample transformed notification:');
  const sample = newNotifs[0];
  log(`    title: "${sample.title}"`);
  log(`    slug:  "${sample.slug}"`);
  log(`    tags:  [${sample.tags.join(', ')}]`);

  await newDb.collection('notifications').insertMany(newNotifs);
  log(`  ✅ Notifications migrated: ${newNotifs.length}`);
  return newNotifs.length;
}

// ═══════════════════════════════════════════
// MIGRATE PRODUCTS (books, photo frames, etc.)
// ═══════════════════════════════════════════

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

async function migrateProducts(oldDb, newDb) {
  log('Fetching products from OLD database...');
  const oldProducts = await oldDb.collection('products').find({}).toArray();
  log(`  Found ${oldProducts.length} products in OLD database`);

  if (oldProducts.length === 0) {
    log('  ⚠️  No products to migrate');
    return 0;
  }

  const newProducts = oldProducts.map(transformProduct);

  // Log stats
  const photoFrames = newProducts.filter(p => p.tags.includes('photo-frame') || p.tags.includes('photo-frames'));
  const books = newProducts.filter(p => !p.tags.includes('photo-frame') && !p.tags.includes('photo-frames'));
  log(`  📦 ${books.length} books, 🖼️  ${photoFrames.length} photo frames`);

  log('  Sample transformed product:');
  const sample = newProducts[0];
  log(`    title:   "${sample.title}"`);
  log(`    slug:    "${sample.slug}"`);
  log(`    tags:    [${sample.tags.join(', ')}]`);
  log(`    price:   ₹${sample.price}`);
  log(`    formats: [${sample.formats.join(', ')}]`);

  await newDb.collection('products').insertMany(newProducts);
  log(`  ✅ Products migrated: ${newProducts.length}`);
  return newProducts.length;
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════

async function main() {
  log('═══════════════════════════════════════════');
  log('NVS BookStore — Full Migration');
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

    // ── Notifications ──
    const existingNotifs = await newDb.collection('notifications').countDocuments();
    if (existingNotifs > 0) {
      log(`\n⚠️  NEW database already has ${existingNotifs} notifications — dropping...`);
      await newDb.collection('notifications').drop();
      log('   ✅ Dropped');
    }

    log('\nStarting notification migration...');
    log('───────────────────────────────────────────');
    const nCount = await migrateNotifications(oldDb, newDb);

    // ── Products ──
    const existingProducts = await newDb.collection('products').countDocuments();
    if (existingProducts > 0) {
      log(`\n⚠️  NEW database already has ${existingProducts} products — dropping...`);
      await newDb.collection('products').drop();
      log('   ✅ Dropped');
    }

    log('\nStarting product migration...');
    log('───────────────────────────────────────────');
    const pCount = await migrateProducts(oldDb, newDb);

    log('');
    log('═══════════════════════════════════════════');
    log(`✅ Migration completed`);
    log(`   📋 ${nCount} notifications migrated`);
    log(`   📦 ${pCount} products migrated`);
    log('═══════════════════════════════════════════');
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
