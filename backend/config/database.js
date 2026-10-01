const mongoose = require('mongoose');
const dns = require('dns');

// Fix for Node.js querySrv ECONNREFUSED on networks where local DNS blocks/fails SRV lookups
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (dnsErr) {
  console.warn('⚠️ Could not set custom DNS servers, using system defaults:', dnsErr.message);
}

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/faculty_recruitment';

    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Database connection error:', error.message);
    throw error;
  }
};

module.exports = connectDB;
