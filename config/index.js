require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

module.exports = {
  PORT: process.env.PORT || 5001,
  // SECURITY WARNING: In production, JWT_SECRET must be set via environment variable
  // The default value is only for local development and should never be used in production
  JWT_SECRET: process.env.JWT_SECRET || 'chatconnect_super_secret_for_local_dev',
  DATABASE_URL: process.env.DATABASE_URL || 'file:../database/dev.db',
  CORS_ORIGIN: 'http://localhost:5173'
};
