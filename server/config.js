require('dotenv').config();

const config = {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'spendbook',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    // Pool tuning (dev-friendly defaults)
    max: parseInt(process.env.DB_MAX || '5'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS || '300000'), // 5 minutes
    connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT_MS || '10000'), // 10s
    keepAlive: (process.env.DB_KEEPALIVE || 'true').toLowerCase() !== 'false'
  },
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE',
    webhookUrl: process.env.WEBHOOK_URL || '',
    allowedUserIds: (process.env.ALLOWED_TELEGRAM_IDS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  },
  server: {
    port: parseInt(process.env.PORT) || 3001,
    adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key'
  }
};

module.exports = config;