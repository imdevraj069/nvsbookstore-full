#!/usr/bin/env node

/**
 * Migration script that runs via Docker
 * Connects to both OLD Atlas and NEW local MongoDB replica set
 */

const mongoose = require('mongoose');

const OLD_URI = 'mongodb+srv://nvsbookpdf:hxzD9Sc2rKXjMq4u@cluster0.hmclrwp.mongodb.net/nvsbookstore';
const NEW_URI = 'mongodb://mongo-primary:27017,mongo-secondary:27017,mongo-arbiter:27017/?replicaSet=rs0';

const log = (msg) => console.log(`[MIGRATE] ${msg}`);
const err = (msg) => console.error(`[ERROR]   ${msg}`);

// Simple schema for migration
const userSchema = new mongoose.Schema({}, { strict: false });
const productSchema = new mongoose.Schema({}, { strict: false });
const notificationSchema = new mongoose.Schema({}, { strict: false });
const orderSchema = new mongoose.Schema({}, { strict: false });
const cartSchema = new mongoose.Schema({}, { strict: false });
const pvcOrderSchema = new mongoose.Schema({}, { strict: false });

const generateSlug = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

async function migrate() {
  let oldConn, newConn;

  try {
    log('═══════════════════════════════════════════');
    log('NVS BookStore — Data Migration (Docker)');
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

    // Check if new database already has data
    const existingUsers = await newDb.collection('users').countDocuments();
    if (existingUsers > 0) {
      log('⚠️  NEW database already has data! Skipping migration.');
      process.exit(0);
    }

    log('');
    log('Starting migration...');
    log('───────────────────────────────────────────');

    // Migrate Users
    log('Migrating Users...');
    const oldUsers = await oldDb.collection('users').find({}).toArray();
    if (oldUsers.length > 0) {
      await newDb.collection('users').insertMany(oldUsers);
    }
    log(`  ✅ Users migrated: ${oldUsers.length}`);

    // Migrate Products
    log('Migrating Products...');
    const oldProducts = await oldDb.collection('products').find({}).toArray();
    const newProducts = oldProducts.map((p) => ({
      ...p,
      slug: p.slug || generateSlug(p.title || ''),
    }));
    if (newProducts.length > 0) {
      await newDb.collection('products').insertMany(newProducts);
    }
    log(`  ✅ Products migrated: ${newProducts.length}`);

    // Migrate Notifications
    log('Migrating Notifications...');
    const oldNotifs = await oldDb.collection('notifications').find({}).toArray();
    const newNotifs = oldNotifs.map((n) => ({
      ...n,
      slug: n.slug || generateSlug(n.title || ''),
    }));
    if (newNotifs.length > 0) {
      await newDb.collection('notifications').insertMany(newNotifs);
    }
    log(`  ✅ Notifications migrated: ${newNotifs.length}`);

    // Migrate Tags
    log('Migrating Tags...');
    const oldTags = await oldDb.collection('tags').find({}).toArray();
    if (oldTags.length > 0) {
      await newDb.collection('tags').insertMany(oldTags);
    }
    log(`  ✅ Tags migrated: ${oldTags.length}`);

    // Migrate Orders
    log('Migrating Orders...');
    const oldOrders = await oldDb.collection('orders').find({}).toArray();
    if (oldOrders.length > 0) {
      await newDb.collection('orders').insertMany(oldOrders);
    }
    log(`  ✅ Orders migrated: ${oldOrders.length}`);

    // Migrate Carts
    log('Migrating Carts...');
    const oldCarts = await oldDb.collection('carts').find({}).toArray();
    if (oldCarts.length > 0) {
      await newDb.collection('carts').insertMany(oldCarts);
    }
    log(`  ✅ Carts migrated: ${oldCarts.length}`);

    // Migrate PVCOrders
    log('Migrating PVCOrders...');
    const oldPvc = await oldDb.collection('pvcorders').find({}).toArray();
    if (oldPvc.length > 0) {
      await newDb.collection('printorders').insertMany(oldPvc.map(p => ({
        ...p,
        totalPrice: p.price || 0
      })));
    }
    log(`  ✅ PVCOrders migrated: ${oldPvc.length}`);

    log('');
    log('───────────────────────────────────────────');
    log('✅ Migration completed successfully!');
    log('');

    // Summary
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

migrate();
