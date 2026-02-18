// Migration Controller — triggers data migration from old Atlas DB to new local DB
// Temporary endpoint for testing — will be removed after production migration

const mongoose = require('mongoose');
const logger = require('@sarkari/logger');

const OLD_URI = process.env.OLD_MONGODB_URI || '';
const NEW_URI = process.env.MONGO_URI || '';

const generateSlug = (text) => {
  if (!text) return '';
  return text.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '');
};

// ── Migration functions (same logic as scripts/migrate.js) ──

async function migrateUsers(oldDb, newDb) {
  const oldUsers = await oldDb.collection('users').find({}).toArray();
  const newUsers = oldUsers.map((u) => {
    const addresses = [];
    if (u.address && u.address.trim() && u.address.trim() !== ' ') {
      addresses.push({ label: 'Home', address: u.address.trim(), city: '', state: '', pincode: '', phone: u.phone || '', isDefault: true });
    }
    return {
      _id: u._id, name: u.name || '', email: (u.email || '').toLowerCase(), password: u.password || '',
      phone: u.phone || '', authType: u.authtype || u.authType || 'credentials', isVerified: u.isVerified || false,
      signupOtp: u.signupOtp || '', verifyOtp: u.verifyOTP || u.verifyOtp || '', verifyId: u.verifyId || '',
      role: u.role || 'user', image: u.image || '', bio: u.bio || '', education: u.education || '',
      dateOfBirth: u.dateOfBirth || null, interests: u.interests || [], addresses, favorites: u.favorites || [],
      createdAt: u.createdAt || new Date(), updatedAt: u.updatedAt || new Date(),
    };
  });
  if (newUsers.length > 0) await newDb.collection('users').insertMany(newUsers);
  return newUsers.length;
}

function collectTags(products, notifications) {
  const tagMap = new Map();
  for (const p of products) {
    if (p.category?.name) { const slug = p.category.slug || generateSlug(p.category.name); if (!tagMap.has(slug)) tagMap.set(slug, { name: p.category.name, slug, type: 'product' }); }
    for (const t of p.tags || []) { const slug = generateSlug(t); if (slug && !tagMap.has(slug)) tagMap.set(slug, { name: t, slug, type: 'product' }); }
  }
  for (const n of notifications) {
    if (n.category?.name) { const slug = n.category.slug || generateSlug(n.category.name); if (tagMap.has(slug)) tagMap.get(slug).type = 'both'; else tagMap.set(slug, { name: n.category.name, slug, type: 'notification' }); }
    for (const t of n.tags || []) { const slug = generateSlug(t); if (slug && !tagMap.has(slug)) tagMap.set(slug, { name: t, slug, type: 'notification' }); }
  }
  return Array.from(tagMap.values());
}

async function migrateTags(tags, newDb) {
  const tagDocs = tags.map((t) => ({ name: t.name, slug: t.slug, description: '', color: '', icon: '', type: t.type, isActive: true, createdAt: new Date(), updatedAt: new Date() }));
  if (tagDocs.length > 0) await newDb.collection('tags').insertMany(tagDocs);
  return tagDocs.length;
}

async function migrateProducts(oldDb, newDb) {
  const oldProducts = await oldDb.collection('products').find({}).toArray();
  const newProducts = oldProducts.map((p) => {
    const tags = [...(p.tags || [])];
    if (p.category?.slug) tags.push(p.category.slug);
    if (p.category?.name) tags.push(generateSlug(p.category.name));
    const uniqueTags = [...new Set(tags.map((t) => generateSlug(t)).filter(Boolean))];
    const thumbnail = p.image ? { url: p.image, key: '', bucket: 'products', mimeType: 'image/jpeg', altText: p.title || '', sortOrder: 0 } : null;
    const images = (p.images || []).map((img, idx) => ({ url: typeof img === 'string' ? img : img.url || '', key: '', bucket: 'products', mimeType: 'image/jpeg', altText: '', sortOrder: idx }));
    const formats = [];
    if (p.isDigital) formats.push('digital');
    if (!p.isDigital || p.stock > 0) formats.push('physical');
    if (formats.length === 0) formats.push('physical');
    return {
      _id: p._id, title: p.title || '', slug: p.slug || generateSlug(p.title || ''), description: p.description || '',
      longDescription: p.longDescription || p.content || '', price: p.price || 0, originalPrice: p.originalPrice || p.price || 0,
      thumbnail, images, formats, digitalFile: { key: '', bucket: 'digital', fileName: '', fileSize: 0 },
      digitalUrl: p.digitalUrl || '', isPrintable: false, printPrice: 0, author: p.author || '', publisher: p.publisher || '',
      pages: p.pages || 0, isbn: p.isbn || '', language: p.language || ['English'], edition: '', rating: p.rating || 0,
      reviewCount: (p.reviews || []).length, reviews: (p.reviews || []).map((r) => ({ userId: r.userId, rating: r.rating, comment: r.comment || '', createdAt: r.createdAt || new Date(), updatedAt: r.updatedAt || new Date() })),
      tags: uniqueTags, badge: '', gradient: 'from-blue-600 to-indigo-700', isFeatured: p.isFeatured || false, isEditorPick: false,
      isVisible: p.isVisible !== false, stock: p.stock || 0, specifications: p.specifications || {},
      metaTitle: '', metaDescription: '', createdAt: p.createdAt || p.date || new Date(), updatedAt: p.updatedAt || new Date(),
    };
  });
  if (newProducts.length > 0) await newDb.collection('products').insertMany(newProducts);
  return newProducts.length;
}

async function migrateNotifications(oldDb, newDb) {
  const oldNotifs = await oldDb.collection('notifications').find({}).toArray();
  const newNotifs = oldNotifs.map((n) => {
    const tags = [...(n.tags || [])];
    if (n.category?.slug) tags.push(n.category.slug);
    if (n.category?.name) tags.push(generateSlug(n.category.name));
    const uniqueTags = [...new Set(tags.map((t) => generateSlug(t)).filter(Boolean))];
    return {
      _id: n._id, title: n.title || '', slug: n.slug || generateSlug(n.title || ''), description: n.description || '',
      content: n.content || '', tags: uniqueTags, publishDate: n.date || n.createdAt || new Date(),
      lastDate: n.lastDate || null, department: n.department || '', location: n.location || '',
      applyUrl: n.applyUrl || '', websiteUrl: n.websiteUrl || '', loginUrl: n.loginUrl || '',
      resultUrl: n.resultUrl || '', admitCardUrl: n.admitCardUrl || '',
      pdfFile: { key: '', bucket: 'notifications', fileName: '', fileSize: 0 },
      pdfUrl: n.pdfUrl || '', isFeatured: n.isfeatured || n.isFeatured || false,
      isVisible: n.isVisible !== false, priority: 'normal',
      createdAt: n.createdAt || n.date || new Date(), updatedAt: n.updatedAt || new Date(),
    };
  });
  if (newNotifs.length > 0) await newDb.collection('notifications').insertMany(newNotifs);
  return newNotifs.length;
}

async function migrateOrders(oldDb, newDb) {
  const oldOrders = await oldDb.collection('orders').find({}).toArray();
  const oldProducts = await oldDb.collection('products').find({}).toArray();
  const productMap = {};
  for (const p of oldProducts) productMap[p._id.toString()] = p;
  const newOrders = oldOrders.map((o) => {
    const items = (o.items || []).map((item) => {
      const prod = item.product ? productMap[item.product.toString()] : null;
      return { product: item.product, title: prod?.title || 'Unknown', price: prod?.price || 0, quantity: item.quantity || 1, format: 'physical' };
    });
    return {
      _id: o._id, customerId: o.customerId, customerName: o.customerName || '', customerEmail: o.customerEmail || '',
      customerPhone: o.customerPhone || '', shippingAddress: o.shippingAddress || { address: '', city: '', state: '', pincode: '' },
      items, paymentMethod: o.paymentMethod || 'razorpay', razorpayOrderId: o.razorpayOrderId || '',
      razorpayPaymentId: o.razorpayPaymentId || '', razorpaySignature: o.razorpaySignature || '',
      price: o.price || { subtotal: 0, discount: 0, shipping: 0, total: 0 }, status: o.status || 'pending',
      trackingNumber: '', notes: '', createdAt: o.createdAt || new Date(), updatedAt: o.updatedAt || new Date(),
    };
  });
  if (newOrders.length > 0) await newDb.collection('orders').insertMany(newOrders);
  return newOrders.length;
}

async function migrateCarts(oldDb, newDb) {
  const oldCarts = await oldDb.collection('carts').find({}).toArray();
  const newCarts = oldCarts.map((c) => ({
    _id: c._id, userId: c.userId,
    items: (c.items || []).map((item) => ({ product: item.product, quantity: item.quantity || 1, format: 'physical' })),
    createdAt: c.createdAt || new Date(), updatedAt: c.updatedAt || new Date(),
  }));
  if (newCarts.length > 0) await newDb.collection('carts').insertMany(newCarts);
  return newCarts.length;
}

async function migratePvcOrders(oldDb, newDb) {
  const oldPvc = await oldDb.collection('pvcorders').find({}).toArray();
  const statusMap = { pending: 'pending', processing: 'printing', printed: 'shipped', delivered: 'delivered', cancelled: 'cancelled' };
  const newPrint = oldPvc.map((p) => ({
    _id: p._id, customerId: p.customerId, customerName: p.customerName || '', customerEmail: p.customerEmail || '',
    customerPhone: p.customerPhone || '', address: p.address || '',
    items: (p.items || []).map((item) => ({ product: p.customerId, title: item.productType || 'PVC Order', copies: item.copies || 1, pricePerCopy: p.price ? Math.round(p.price / (p.items || []).length) : 0, details: { productType: item.productType, mode: item.mode, ...(item.details || {}) } })),
    totalPrice: p.price || 0, paymentMethod: p.paymentMethod || 'razorpay', razorpayOrderId: '', razorpayPaymentId: '',
    status: statusMap[p.status] || 'pending', createdAt: p.createdAt || new Date(), updatedAt: p.updatedAt || new Date(),
  }));
  if (newPrint.length > 0) await newDb.collection('printorders').insertMany(newPrint);
  return newPrint.length;
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

    // Check if new database already has data
    const existingUsers = await newDb.collection('users').countDocuments();
    if (existingUsers > 0) {
      log('Database already has data — dropping existing collections first...');
      const collections = ['users', 'tags', 'products', 'notifications', 'orders', 'carts', 'printorders'];
      for (const col of collections) {
        try { await newDb.collection(col).drop(); } catch (e) { /* collection may not exist */ }
      }
      log('Existing collections dropped');
    }

    log('Starting migration...');

    const oldProducts = await oldDb.collection('products').find({}).toArray();
    const oldNotifs = await oldDb.collection('notifications').find({}).toArray();

    const userCount = await migrateUsers(oldDb, newDb);
    log(`Users migrated: ${userCount}`);

    const tags = collectTags(oldProducts, oldNotifs);
    const tagCount = await migrateTags(tags, newDb);
    log(`Tags migrated: ${tagCount}`);

    const productCount = await migrateProducts(oldDb, newDb);
    log(`Products migrated: ${productCount}`);

    const notifCount = await migrateNotifications(oldDb, newDb);
    log(`Notifications migrated: ${notifCount}`);

    const orderCount = await migrateOrders(oldDb, newDb);
    log(`Orders migrated: ${orderCount}`);

    const cartCount = await migrateCarts(oldDb, newDb);
    log(`Carts migrated: ${cartCount}`);

    const printCount = await migratePvcOrders(oldDb, newDb);
    log(`PrintOrders migrated: ${printCount}`);

    log('Migration completed successfully!');

    res.json({
      success: true,
      data: {
        users: userCount,
        tags: tagCount,
        products: productCount,
        notifications: notifCount,
        orders: orderCount,
        carts: cartCount,
        printOrders: printCount,
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
