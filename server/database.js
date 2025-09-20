const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool(config.database);

// Log once on first successful query to reduce noise in dev
let _dbLoggedOnce = false;
async function _logOnce() {
  if (_dbLoggedOnce) return;
  try {
    await pool.query('SELECT 1');
    if (!_dbLoggedOnce) {
      console.log('PostgreSQL database connected');
      _dbLoggedOnce = true;
    }
  } catch (e) {
    console.error('Database connection check failed:', e.message);
  }
}
_logOnce();

pool.on('error', (err) => {
  console.error('Database error:', err);
});

class Database {
  static async init() {
    const createSettings = `
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `;
    const createAuthUsers = `
      CREATE TABLE IF NOT EXISTS authorized_users (
        telegram_id TEXT PRIMARY KEY,
        display_name TEXT
      );
    `;
  await pool.query(createSettings);
  await pool.query(createAuthUsers);
  // Ensure optional columns exist
  await pool.query("ALTER TABLE IF EXISTS expenses ADD COLUMN IF NOT EXISTS image_path TEXT");
    // Background keep-alive ping to avoid idle disconnects in some environments (dev only)
    const intervalMs = parseInt(process.env.DB_PING_INTERVAL_MS || '60000'); // 1 min
    if (!this._pingTimer && intervalMs > 0) {
      this._pingTimer = setInterval(() => {
        pool.query('SELECT 1').catch(() => {});
      }, intervalMs);
      this._pingTimer.unref?.();
    }
  }
  // Users
  static async createUser(telegramId, username, firstName, lastName) {
    const query = `
      INSERT INTO users (telegram_id, username, first_name, last_name)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (telegram_id) DO UPDATE SET
        username = $2,
        first_name = $3,
        last_name = $4
      RETURNING id
    `;
    const result = await pool.query(query, [telegramId, username, firstName, lastName]);
    return result.rows[0];
  }

  // Settings
  static async getSetting(key) {
    const res = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
    return res.rows[0]?.value || null;
  }

  // Authorized Users (Whitelist)
  static async listAuthorizedUsers() {
    const res = await pool.query('SELECT telegram_id, display_name FROM authorized_users ORDER BY display_name NULLS LAST, telegram_id');
    return res.rows;
  }

  static async addAuthorizedUser(telegramId, displayName) {
    const q = `
      INSERT INTO authorized_users(telegram_id, display_name)
      VALUES ($1, $2)
      ON CONFLICT (telegram_id) DO UPDATE SET display_name = EXCLUDED.display_name
      RETURNING telegram_id, display_name
    `;
    const res = await pool.query(q, [String(telegramId), displayName || null]);
    return res.rows[0];
  }

  static async removeAuthorizedUser(telegramId) {
    await pool.query('DELETE FROM authorized_users WHERE telegram_id = $1', [String(telegramId)]);
    return true;
  }

  static async isAuthorizedTelegramId(telegramId) {
    const res = await pool.query('SELECT 1 FROM authorized_users WHERE telegram_id = $1', [String(telegramId)]);
    return res.rowCount > 0;
  }

  static async setSetting(key, value) {
    const upsert = `
      INSERT INTO settings(key, value) VALUES ($1, $2)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      RETURNING value
    `;
    const res = await pool.query(upsert, [key, value]);
    return res.rows[0]?.value || null;
  }

  static async getUserByTelegramId(telegramId) {
    const query = 'SELECT * FROM users WHERE telegram_id = $1';
    const result = await pool.query(query, [telegramId]);
    return result.rows[0];
  }

  static async getUserById(userId) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  // Categories
  static async getAllCategories() {
    const query = 'SELECT * FROM categories ORDER BY name';
    const result = await pool.query(query);
    return result.rows;
  }

  static async getCategoryById(id) {
    const query = 'SELECT * FROM categories WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  // Expenses
  static async createExpense(userId, categoryId, amount, description, date, imagePath = null) {
    // Flexible insert to optionally include image_path
    const hasImage = !!imagePath;
    let query;
    let params;
    if (hasImage) {
      query = `
        INSERT INTO expenses (user_id, category_id, amount, description, date, image_path)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;
      params = [userId, categoryId, amount, description, date || new Date(), imagePath];
    } else {
      query = `
        INSERT INTO expenses (user_id, category_id, amount, description, date)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;
      params = [userId, categoryId, amount, description, date || new Date()];
    }
    const result = await pool.query(query, params);
    return result.rows[0];
  }

  static async getTodaysExpenses(userId) {
    const query = `
      SELECT e.*, c.name_uz as category_name, c.color as category_color
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1 AND e.date = CURRENT_DATE
      ORDER BY e.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  static async getAllExpenses() {
    const query = `
      SELECT e.*, u.first_name, u.last_name, u.username, c.name_uz as category_name, c.color as category_color
      FROM expenses e
      JOIN users u ON e.user_id = u.id
      JOIN categories c ON e.category_id = c.id
      ORDER BY e.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getRecentExpenses(limit = 10) {
    const query = `
      SELECT e.*, u.first_name, u.last_name, u.username, c.name_uz as category_name, c.color as category_color
      FROM expenses e
      JOIN users u ON e.user_id = u.id
      JOIN categories c ON e.category_id = c.id
      ORDER BY e.created_at DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  static async getRecentExpensesByUser(userId, limit = 10) {
    const query = `
      SELECT e.*, c.name_uz as category_name, c.color as category_color
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.user_id = $1
      ORDER BY e.created_at DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }

  static async getExpensesByDateRange(startDate, endDate) {
    const query = `
      SELECT e.*, u.first_name, u.last_name, u.username, c.name_uz as category_name, c.color as category_color
      FROM expenses e
      JOIN users u ON e.user_id = u.id
      JOIN categories c ON e.category_id = c.id
      WHERE e.date BETWEEN $1 AND $2
      ORDER BY e.created_at DESC
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows;
  }
  
  static async getExpenseById(id) {
    const q = `SELECT * FROM expenses WHERE id = $1`;
    const res = await pool.query(q, [Number(id)]);
    return res.rows[0] || null;
  }
  
  static async clearExpenseImage(id) {
    await pool.query(`UPDATE expenses SET image_path = NULL WHERE id = $1`, [Number(id)]);
    return true;
  }
  
  static async listExpensesWithImages() {
    const res = await pool.query(`SELECT id, image_path FROM expenses WHERE image_path IS NOT NULL`);
    return res.rows;
  }

  // Deposits
  static async createDeposit(userId, amount, description) {
    const query = `
      INSERT INTO deposits (user_id, amount, description)
      VALUES ($1, $2, $3)
      RETURNING id
    `;
    const result = await pool.query(query, [userId, amount, description]);
    return result.rows[0];
  }

  static async getPendingDeposits() {
    const query = `
      SELECT d.*, u.first_name, u.last_name, u.username
      FROM deposits d
      JOIN users u ON d.user_id = u.id
      WHERE d.status = 'pending'
      ORDER BY d.requested_at ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async updateDepositStatus(id, status, processedBy, approvedAmount = null) {
    // Coerce values to correct types to help Postgres type inference
    const idInt = Number(id);
    const hasApprovedAmount = approvedAmount !== null && approvedAmount !== undefined && `${approvedAmount}`.trim() !== '' && !Number.isNaN(Number(approvedAmount));
    const amountNum = hasApprovedAmount ? Number(approvedAmount) : undefined;

    let query;
    let params;

    if (hasApprovedAmount) {
      // With approved amount
      query = `
        UPDATE deposits
        SET status = $1,
            processed_at = CURRENT_TIMESTAMP,
            processed_by = $2,
            amount = $3
        WHERE id = $4
        RETURNING *
      `;
      params = [status, processedBy, amountNum, idInt];
    } else {
      // Without amount change
      query = `
        UPDATE deposits
        SET status = $1,
            processed_at = CURRENT_TIMESTAMP,
            processed_by = $2
        WHERE id = $3
        RETURNING *
      `;
      params = [status, processedBy, idInt];
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  static async getAllDeposits() {
    const query = `
      SELECT d.*, u.first_name, u.last_name, u.username
      FROM deposits d
      JOIN users u ON d.user_id = u.id
      ORDER BY d.requested_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getRecentDeposits(limit = 10) {
    const query = `
      SELECT d.*, u.first_name, u.last_name, u.username
      FROM deposits d
      JOIN users u ON d.user_id = u.id
      ORDER BY d.requested_at DESC
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  static async getDepositsByUser(userId, limit = 10) {
    const query = `
      SELECT * FROM deposits
      WHERE user_id = $1
      ORDER BY requested_at DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }

  static async getTotalExpenses() {
    const query = `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses`;
    const result = await pool.query(query);
    return parseFloat(result.rows[0].total) || 0;
  }

  static async getTotalApprovedDeposits() {
    const query = `SELECT COALESCE(SUM(amount), 0) AS total FROM deposits WHERE status = 'approved'`;
    const result = await pool.query(query);
    return parseFloat(result.rows[0].total) || 0;
  }

  // Analytics
  static async getExpensesByCategory() {
    const query = `
      SELECT c.name_uz as category, c.color, SUM(e.amount) as total
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      GROUP BY c.id, c.name_uz, c.color
      ORDER BY total DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async getMonthlyExpenses() {
    const query = `
      SELECT 
        TO_CHAR(date, 'YYYY-MM') as month,
        SUM(amount) as total
      FROM expenses
      WHERE date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(date, 'YYYY-MM')
      ORDER BY month
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // Admin Sessions
  static async createAdminSession(sessionToken, ipAddress) {
    const query = `
      INSERT INTO admin_sessions (session_token, ip_address, expires_at)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const result = await pool.query(query, [sessionToken, ipAddress, expiresAt]);
    return result.rows[0];
  }

  static async getValidAdminSession(sessionToken) {
    const query = `
      SELECT * FROM admin_sessions 
      WHERE session_token = $1 AND expires_at > CURRENT_TIMESTAMP
    `;
    const result = await pool.query(query, [sessionToken]);
    return result.rows[0];
  }
}

module.exports = { Database, pool };