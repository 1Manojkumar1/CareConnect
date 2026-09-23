const mongoose = require('mongoose');
const { env } = require('./env');

let cached = global.__careconnect_mongoose || { conn: null, promise: null };
global.__careconnect_mongoose = cached;

async function connectDb(uri = env.mongoUri) {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    mongoose.set('strictQuery', true);
    cached.promise = mongoose.connect(uri).then((m) => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

async function disconnectDb() {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}

module.exports = { connectDb, disconnectDb };
