#!/usr/bin/env node

/**
 * ═══════════════════════════════════════════════════════════════
 * NVS BookStore — Data Migration Script
 * ═══════════════════════════════════════════════════════════════
 *
 * Migrates data from the OLD MongoDB Atlas database (nvsbookstorefinal)
 * to the NEW local MongoDB replica-set database (new architecture).
 *
 * OLD schemas → NEW schemas field mapping:
 *
 * ┌─────────────┬────────────────────────────────────────────────┐
 * │  OLD Model   │  NEW Model + Key Changes                      │
 * ├─────────────┼────────────────────────────────────────────────┤
 * │  User        │  User: authtype→authType, verifyOTP→verifyOtp │
 * │              │  address(String)→addresses([addressSchema])    │
 * │  Product     │  Product: category(embed)→tags[], image→thumb  │
 * │              │  isDigital stays, + formats, badge, gradient   │
 * │  Notification│  Notification: category→tags[], isfeatured→isF │
 * │              │  date→publishDate                              │
 * │  Order       │  Order: items add title/format snapshot        │
 * │  Cart        │  Cart: items add format field                  │
 * │  PVCOrder    │  PrintOrder: price→totalPrice, productType→ref │
 * └─────────────┴────────────────────────────────────────────────┘
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
// MIGRATION FUNCTIONS
// ═══════════════════════════════════════════

/**
 * Migrate Users
 * OLD: authtype, verifyOTP, address (string)
 * NEW: authType, verifyOtp, addresses (array of addressSchema)
 */
async function migrateUsers(oldDb, newDb) {
  log('Migrating Users...');
  const oldUsers = await oldDb.collection('users').find({}).toArray();

  const newUsers = oldUsers.map((u) => {
    const addresses = [];
    // Old schema had a single `address` string field
    if (u.address && u.address.trim() && u.address.trim() !== ' ') {
      addresses.push({
        label: 'Home',
        address: u.address.trim(),
        city: '',
        state: '',
        pincode: '',
        phone: u.phone || '',
        isDefault: true,
      });
    }

    return {
      _id: u._id,
      name: u.name || '',
      email: (u.email || '').toLowerCase(),
      password: u.password || '',
      phone: u.phone || '',
      authType: u.authtype || u.authType || 'credentials',
      isVerified: u.isVerified || false,
      signupOtp: u.signupOtp || '',
      verifyOtp: u.verifyOTP || u.verifyOtp || '',
      verifyId: u.verifyId || '',
      role: u.role || 'user',
      image: u.image || '',
      bio: u.bio || '',
      education: u.education || '',
      dateOfBirth: u.dateOfBirth || null,
      interests: u.interests || [],
      addresses,
      favorites: u.favorites || [],
      createdAt: u.createdAt || new Date(),
      updatedAt: u.updatedAt || new Date(),
    };
  });

  if (newUsers.length > 0) {
    await newDb.collection('users').insertMany(newUsers);
  }
  log(`  ✅ Users migrated: ${newUsers.length}`);
}

/**
 * Extract unique tags from categories and tag arrays
 */
function collectTags(products, notifications) {
  const tagMap = new Map();

  // From product categories
  for (const p of products) {
    if (p.category?.name) {
      const slug = p.category.slug || generateSlug(p.category.name);
      if (!tagMap.has(slug)) {
        tagMap.set(slug, {
          name: p.category.name,
          slug,
          type: 'product',
        });
      }
    }
    // From product tags array
    for (const t of p.tags || []) {
      const slug = generateSlug(t);
      if (slug && !tagMap.has(slug)) {
        tagMap.set(slug, { name: t, slug, type: 'product' });
      }
    }
  }

  // From notification categories
  for (const n of notifications) {
    if (n.category?.name) {
      const slug = n.category.slug || generateSlug(n.category.name);
      if (tagMap.has(slug)) {
        // Mark as 'both' if already exists from products
        tagMap.get(slug).type = 'both';
      } else {
        tagMap.set(slug, {
          name: n.category.name,
          slug,
          type: 'notification',
        });
      }
    }
    for (const t of n.tags || []) {
      const slug = generateSlug(t);
      if (slug && !tagMap.has(slug)) {
        tagMap.set(slug, { name: t, slug, type: 'notification' });
      }
    }
  }

  return Array.from(tagMap.values());
}

/**
 * Migrate Tags (extracted from old categories + tag arrays)
 */
async function migrateTags(tags, newDb) {
  log('Migrating Tags...');

  const tagDocs = tags.map((t) => ({
    name: t.name,
    slug: t.slug,
    description: '',
    color: '',
    icon: '',
    type: t.type,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }));

  if (tagDocs.length > 0) {
    await newDb.collection('tags').insertMany(tagDocs);
  }
  log(`  ✅ Tags migrated: ${tagDocs.length}`);
}

/**
 * Migrate Products
 * OLD: category (embed), image (string), images (array of strings)
 * NEW: tags[], thumbnail (mediaSchema), images (array of mediaSchema), formats
 */
async function migrateProducts(oldDb, newDb) {
  log('Migrating Products...');
  const oldProducts = await oldDb.collection('products').find({}).toArray();

  const newProducts = oldProducts.map((p) => {
    // Build tags from old category + old tags array
    const tags = [...(p.tags || [])];
    if (p.category?.slug) tags.push(p.category.slug);
    if (p.category?.name && !tags.includes(p.category.name.toLowerCase())) {
      tags.push(generateSlug(p.category.name));
    }
    const uniqueTags = [...new Set(tags.map((t) => generateSlug(t)).filter(Boolean))];

    // Map old Cloudinary image URL to media schema
    const thumbnail = p.image
      ? {
          url: p.image,
          key: '',
          bucket: 'products',
          mimeType: 'image/jpeg',
          altText: p.title || '',
          sortOrder: 0,
        }
      : null;

    // Map old images array (strings) to media schema array
    const images = (p.images || []).map((img, idx) => ({
      url: typeof img === 'string' ? img : img.url || '',
      key: '',
      bucket: 'products',
      mimeType: 'image/jpeg',
      altText: '',
      sortOrder: idx,
    }));

    // Determine formats
    const formats = [];
    if (p.isDigital) formats.push('digital');
    if (!p.isDigital || p.stock > 0) formats.push('physical');
    if (formats.length === 0) formats.push('physical');

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
      isPrintable: false,
      printPrice: 0,
      author: p.author || '',
      publisher: p.publisher || '',
      pages: p.pages || 0,
      isbn: p.isbn || '',
      language: p.language || ['English'],
      edition: '',
      rating: p.rating || 0,
      reviewCount: (p.reviews || []).length,
      reviews: (p.reviews || []).map((r) => ({
        userId: r.userId,
        rating: r.rating,
        comment: r.comment || '',
        createdAt: r.createdAt || new Date(),
        updatedAt: r.updatedAt || new Date(),
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
  });

  if (newProducts.length > 0) {
    await newDb.collection('products').insertMany(newProducts);
  }
  log(`  ✅ Products migrated: ${newProducts.length}`);
  return oldProducts; // for tag extraction
}

/**
 * Migrate Notifications
 * OLD: category (embed), isfeatured, date
 * NEW: tags[], isFeatured, publishDate
 */
async function migrateNotifications(oldDb, newDb) {
  log('Migrating Notifications...');
  const oldNotifs = await oldDb.collection('notifications').find({}).toArray();

  const newNotifs = oldNotifs.map((n) => {
    // Build tags from old category + old tags array
    const tags = [...(n.tags || [])];
    if (n.category?.slug) tags.push(n.category.slug);
    if (n.category?.name) tags.push(generateSlug(n.category.name));
    const uniqueTags = [...new Set(tags.map((t) => generateSlug(t)).filter(Boolean))];

    return {
      _id: n._id,
      title: n.title || '',
      slug: n.slug || generateSlug(n.title || ''),
      description: n.description || '',
      content: n.content || '',
      tags: uniqueTags,
      publishDate: n.date || n.createdAt || new Date(),
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
      priority: 'normal',
      createdAt: n.createdAt || n.date || new Date(),
      updatedAt: n.updatedAt || new Date(),
    };
  });

  if (newNotifs.length > 0) {
    await newDb.collection('notifications').insertMany(newNotifs);
  }
  log(`  ✅ Notifications migrated: ${newNotifs.length}`);
  return oldNotifs; // for tag extraction
}

/**
 * Migrate Orders
 * OLD: items[{product, quantity}], price{subtotal,discount,shipping,total}
 * NEW: items[{product, title, price, quantity, format}], same price structure
 */
async function migrateOrders(oldDb, newDb) {
  log('Migrating Orders...');
  const oldOrders = await oldDb.collection('orders').find({}).toArray();

  // Build product title lookup
  const oldProducts = await oldDb.collection('products').find({}).toArray();
  const productMap = {};
  for (const p of oldProducts) {
    productMap[p._id.toString()] = p;
  }

  const newOrders = oldOrders.map((o) => {
    const items = (o.items || []).map((item) => {
      const prod = item.product ? productMap[item.product.toString()] : null;
      return {
        product: item.product,
        title: prod?.title || 'Unknown Product',
        price: prod?.price || 0,
        quantity: item.quantity || 1,
        format: 'physical',
      };
    });

    return {
      _id: o._id,
      customerId: o.customerId,
      customerName: o.customerName || '',
      customerEmail: o.customerEmail || '',
      customerPhone: o.customerPhone || '',
      shippingAddress: o.shippingAddress || { address: '', city: '', state: '', pincode: '' },
      items,
      paymentMethod: o.paymentMethod || 'razorpay',
      razorpayOrderId: o.razorpayOrderId || '',
      razorpayPaymentId: o.razorpayPaymentId || '',
      razorpaySignature: o.razorpaySignature || '',
      price: o.price || { subtotal: 0, discount: 0, shipping: 0, total: 0 },
      status: o.status || 'pending',
      trackingNumber: '',
      notes: '',
      createdAt: o.createdAt || new Date(),
      updatedAt: o.updatedAt || new Date(),
    };
  });

  if (newOrders.length > 0) {
    await newDb.collection('orders').insertMany(newOrders);
  }
  log(`  ✅ Orders migrated: ${newOrders.length}`);
}

/**
 * Migrate Carts
 * OLD: items[{product, quantity}]
 * NEW: items[{product, quantity, format}]
 */
async function migrateCarts(oldDb, newDb) {
  log('Migrating Carts...');
  const oldCarts = await oldDb.collection('carts').find({}).toArray();

  const newCarts = oldCarts.map((c) => ({
    _id: c._id,
    userId: c.userId,
    items: (c.items || []).map((item) => ({
      product: item.product,
      quantity: item.quantity || 1,
      format: 'physical',
    })),
    createdAt: c.createdAt || new Date(),
    updatedAt: c.updatedAt || new Date(),
  }));

  if (newCarts.length > 0) {
    await newDb.collection('carts').insertMany(newCarts);
  }
  log(`  ✅ Carts migrated: ${newCarts.length}`);
}

/**
 * Migrate PVCOrders → PrintOrders
 * OLD: price (number), items[{productType, mode, copies, details}]
 * NEW: totalPrice (number), items[{product, title, copies, pricePerCopy, details}]
 */
async function migratePvcOrders(oldDb, newDb) {
  log('Migrating PVCOrders → PrintOrders...');
  const oldPvc = await oldDb.collection('pvcorders').find({}).toArray();

  const newPrintOrders = oldPvc.map((p) => ({
    _id: p._id,
    customerId: p.customerId,
    customerName: p.customerName || '',
    customerEmail: p.customerEmail || '',
    customerPhone: p.customerPhone || '',
    address: p.address || '',
    items: (p.items || []).map((item) => ({
      // PVCOrders didn't reference products by ObjectId, they used productType string
      // We map them as-is using a generic structure
      product: p.customerId, // placeholder — PVC items don't have product refs
      title: item.productType || 'PVC Order',
      copies: item.copies || 1,
      pricePerCopy: p.price ? Math.round(p.price / (p.items || []).length) : 0,
      details: {
        productType: item.productType,
        mode: item.mode,
        ...(item.details || {}),
      },
    })),
    totalPrice: p.price || 0,
    paymentMethod: p.paymentMethod || 'razorpay',
    razorpayOrderId: '',
    razorpayPaymentId: '',
    status: mapPvcStatus(p.status),
    createdAt: p.createdAt || new Date(),
    updatedAt: p.updatedAt || new Date(),
  }));

  if (newPrintOrders.length > 0) {
    await newDb.collection('printorders').insertMany(newPrintOrders);
  }
  log(`  ✅ PrintOrders migrated: ${newPrintOrders.length} (from PVCOrders)`);
}

function mapPvcStatus(oldStatus) {
  const statusMap = {
    pending: 'pending',
    processing: 'printing',
    printed: 'shipped',
    delivered: 'delivered',
    cancelled: 'cancelled',
  };
  return statusMap[oldStatus] || 'pending';
}

// ═══════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════

async function main() {
  log('═══════════════════════════════════════════');
  log('NVS BookStore — Data Migration');
  log('═══════════════════════════════════════════');
  log(`OLD DB: ${OLD_URI.replace(/:[^:@]+@/, ':***@')}`);
  log(`NEW DB: ${NEW_URI.replace(/:[^:@]+@/, ':***@')}`);
  log('');

  let oldConn, newConn;

  try {
    // Connect to both databases
    log('Connecting to OLD database (Atlas)...');
    oldConn = await mongoose.createConnection(OLD_URI).asPromise();
    log('  ✅ Connected to OLD database');

    log('Connecting to NEW database (local replica set)...');
    newConn = await mongoose.createConnection(NEW_URI).asPromise();
    log('  ✅ Connected to NEW database');

    const oldDb = oldConn.db;
    const newDb = newConn.db;

    // Check if new database already has data
    const existingUsers = await newDb.collection('users').countDocuments();
    if (existingUsers > 0) {
      log('');
      log('⚠️  NEW database already has data!');
      log('   To re-run migration, drop the new database first:');
      log('   db.dropDatabase()');
      log('');
      log('   Skipping migration to prevent duplicates.');
      process.exit(0);
    }

    log('');
    log('Starting migration...');
    log('───────────────────────────────────────────');

    // 1. Users first (other collections reference them)
    await migrateUsers(oldDb, newDb);

    // 2. Products + notifications (for tag extraction)
    const oldProducts = await oldDb.collection('products').find({}).toArray();
    const oldNotifs = await oldDb.collection('notifications').find({}).toArray();

    // 3. Extract and create tags from both
    const tags = collectTags(oldProducts, oldNotifs);
    await migrateTags(tags, newDb);

    // 4. Products
    await migrateProducts(oldDb, newDb);

    // 5. Notifications
    await migrateNotifications(oldDb, newDb);

    // 6. Orders
    await migrateOrders(oldDb, newDb);

    // 7. Carts
    await migrateCarts(oldDb, newDb);

    // 8. PVCOrders → PrintOrders
    await migratePvcOrders(oldDb, newDb);

    log('');
    log('───────────────────────────────────────────');
    log('✅ Migration completed successfully!');
    log('');

    // Print summary
    const summary = {
      users: await newDb.collection('users').countDocuments(),
      tags: await newDb.collection('tags').countDocuments(),
      products: await newDb.collection('products').countDocuments(),
      notifications: await newDb.collection('notifications').countDocuments(),
      orders: await newDb.collection('orders').countDocuments(),
      carts: await newDb.collection('carts').countDocuments(),
      printOrders: await newDb.collection('printorders').countDocuments(),
    };

    log('Summary:');
    for (const [collection, count] of Object.entries(summary)) {
      log(`  ${collection}: ${count}`);
    }
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
