const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool(config.database);

// Test database connection
pool.on('connect', () => {
  console.log('PostgreSQL database connected');
});

pool.on('error', (err) => {
  console.error('Database error:', err);
});

class Database {
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

  static async getUserByTelegramId(telegramId) {
    const query = 'SELECT * FROM users WHERE telegram_id = $1';
    const result = await pool.query(query, [telegramId]);
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
  static async createExpense(userId, categoryId, amount, description, date) {
    const query = `
      INSERT INTO expenses (user_id, category_id, amount, description, date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
    const result = await pool.query(query, [userId, categoryId, amount, description, date || new Date()]);
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

  static async updateDepositStatus(id, status, processedBy) {
    const query = `
      UPDATE deposits 
      SET status = $1, processed_at = CURRENT_TIMESTAMP, processed_by = $2
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [status, processedBy, id]);
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