// Database wrapper for web app

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGO_URI || process.env.OLD_MONGODB_URI;

let cached = global.mongoose || { conn: null, promise: null };

export async function connection() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
      })
      .then((mongoose) => {
        return mongoose;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Dummy exports - actual models are imported directly in API routes
// This prevents circular dependency issues in the build
export const models = {
  Blog: null,
  BlogAccess: null,
  ProductReview: null,
  Feedback: null,
  User: null,
  Product: null,
  Order: null,
};
