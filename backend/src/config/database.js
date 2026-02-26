const mongoose = require('mongoose');

exports.connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connecté ✅');
  } catch (error) {
    console.error('Erreur MongoDB:', error.message);
    process.exit(1);
  }
};