const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const XLSX = require('xlsx');

const { Database } = require('./database');
const SpendBookBot = require('./telegramBot');
const config = require('./config');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Initialize database structures (settings)
Database.init().catch(err => console.error('DB init error:', err));

// Middleware
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json());

// Initialize Telegram Bot (may be disabled if no token)
const bot = new SpendBookBot();

// WebSocket connections
const wsConnections = new Set();

wss.on('connection', (ws) => {
  wsConnections.add(ws);
  console.log('WebSocket client connected');

  ws.on('close', () => {
    wsConnections.delete(ws);
    console.log('WebSocket client disconnected');
  });
});

// Broadcast to all WebSocket clients
function broadcast(data) {
  const message = JSON.stringify(data);
  wsConnections.forEach(ws => {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  });
}

// Auth middleware
const authenticateAdmin = async (_req, _res, next) => next();

// Routes
app.post('/api/admin/login', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (password !== config.server.adminPassword) {
      return res.status(401).json({ error: 'Noto\'g\'ri parol' });
    }

    const sessionToken = uuidv4();
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    await Database.createAdminSession(sessionToken, ipAddress);
    
    res.json({
      token: sessionToken,
      message: 'Muvaffaqiyatli kirildi'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Serverda xatolik' });
  }
});

// Get all expenses
app.get('/api/expenses', authenticateAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let expenses;
    if (startDate && endDate) {
      expenses = await Database.getExpensesByDateRange(startDate, endDate);
    } else {
      expenses = await Database.getAllExpenses();
    }

    res.json(expenses);
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ error: 'Xarajatlarni olishda xatolik' });
  }
});

// Get pending deposits
app.get('/api/deposits/pending', authenticateAdmin, async (req, res) => {
  try {
    const deposits = await Database.getPendingDeposits();
    res.json(deposits);
  } catch (error) {
    console.error('Get pending deposits error:', error);
    res.status(500).json({ error: 'Depozitlarni olishda xatolik' });
  }
});

// Get all deposits
app.get('/api/deposits', authenticateAdmin, async (req, res) => {
  try {
    const deposits = await Database.getAllDeposits();
    res.json(deposits);
  } catch (error) {
    console.error('Get deposits error:', error);
    res.status(500).json({ error: 'Depozitlarni olishda xatolik' });
  }
});

// Update deposit status
app.put('/api/deposits/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approvedAmount } = req.body;
    
    const updatedDeposit = await Database.updateDepositStatus(id, status, 'Admin', approvedAmount ?? null);
    
    // Broadcast to all authorized bot users via Telegram
    if (bot && bot.broadcastDepositUpdate) {
      await bot.broadcastDepositUpdate(updatedDeposit);
    }
    
    // Broadcast to WebSocket clients
    broadcast({
      type: 'deposit_updated',
      data: updatedDeposit
    });
    
    res.json(updatedDeposit);
  } catch (error) {
    console.error('Update deposit error:', error);
    res.status(500).json({ error: 'Depozitni yangilashda xatolik' });
  }
});

// Get analytics
app.get('/api/analytics', authenticateAdmin, async (req, res) => {
  try {
    const categoryData = await Database.getExpensesByCategory();
    const monthlyData = await Database.getMonthlyExpenses();
    
    res.json({
      categories: categoryData,
      monthly: monthlyData
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Tahlil ma\'lumotlarini olishda xatolik' });
  }
});

// Balance summary
app.get('/api/balance', authenticateAdmin, async (_req, res) => {
  try {
    const totalExpenses = await Database.getTotalExpenses();
    const totalDeposits = await Database.getTotalApprovedDeposits();
    const balance = totalDeposits - totalExpenses;
    res.json({ totalDeposits, totalExpenses, balance });
  } catch (error) {
    console.error('Balance error:', error);
    res.status(500).json({ error: 'Balansni olishda xatolik' });
  }
});

// Recent history
app.get('/api/history/recent', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const [expenses, deposits] = await Promise.all([
      Database.getRecentExpenses(limit),
      Database.getRecentDeposits(limit)
    ]);
    res.json({ expenses, deposits });
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({ error: 'Tarixni olishda xatolik' });
  }
});

// Export to Excel
app.get('/api/export/expenses', authenticateAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let expenses;
    if (startDate && endDate) {
      expenses = await Database.getExpensesByDateRange(startDate, endDate);
    } else {
      expenses = await Database.getAllExpenses();
    }
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(expenses.map(expense => ({
      'Sana': expense.date,
      'Foydalanuvchi': `${expense.first_name} ${expense.last_name}`,
      'Kategoriya': expense.category_name,
      'Miqdor': expense.amount,
      'Izoh': expense.description || '',
      'Yaratilgan': expense.created_at
    })));
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Xarajatlar');
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=xarajatlar.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Eksport qilishda xatolik' });
  }
});

// Settings routes: admin telegram username
app.get('/api/settings/admin', authenticateAdmin, async (_req, res) => {
  try {
    const adminUsername = await Database.getSetting('admin_telegram_username');
    res.json({ adminUsername });
  } catch (e) {
    console.error('Get admin setting error:', e);
    res.status(500).json({ error: 'Sozlamani olishda xatolik' });
  }
});

app.put('/api/settings/admin', authenticateAdmin, async (req, res) => {
  try {
    const { adminUsername } = req.body || {};
    if (typeof adminUsername !== 'string') {
      return res.status(400).json({ error: 'adminUsername string bo\'lishi kerak' });
    }
    const saved = await Database.setSetting('admin_telegram_username', adminUsername.replace(/^@/, ''));
    res.json({ adminUsername: saved });
  } catch (e) {
    console.error('Set admin setting error:', e);
    res.status(500).json({ error: 'Sozlamani saqlashda xatolik' });
  }
});

// Authorized Telegram users
app.get('/api/settings/auth-users', authenticateAdmin, async (_req, res) => {
  try {
    const users = await Database.listAuthorizedUsers();
    res.json(users);
  } catch (e) {
    console.error('List auth users error:', e);
    res.status(500).json({ error: 'Ruxsat etilgan foydalanuvchilarni olishda xatolik' });
  }
});

app.post('/api/settings/auth-users', authenticateAdmin, async (req, res) => {
  try {
    const { telegramId, displayName } = req.body || {};
    if (!telegramId) return res.status(400).json({ error: 'telegramId majburiy' });
    const saved = await Database.addAuthorizedUser(telegramId, displayName);
    res.json(saved);
  } catch (e) {
    console.error('Add auth user error:', e);
    res.status(500).json({ error: 'Ruxsat etilgan foydalanuvchini qo\'shishda xatolik' });
  }
});

app.delete('/api/settings/auth-users/:telegramId', authenticateAdmin, async (req, res) => {
  try {
    const { telegramId } = req.params;
    await Database.removeAuthorizedUser(telegramId);
    res.json({ ok: true });
  } catch (e) {
    console.error('Remove auth user error:', e);
    res.status(500).json({ error: 'Ruxsat etilgan foydalanuvchini o\'chirishda xatolik' });
  }
});

// Get categories
app.get('/api/categories', authenticateAdmin, async (req, res) => {
  try {
    const categories = await Database.getAllCategories();
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Kategoriyalarni olishda xatolik' });
  }
});

// Listen for new expenses and deposits to broadcast
setInterval(async () => {
  try {
    const pendingDeposits = await Database.getPendingDeposits();
    const recentExpenses = await Database.getAllExpenses();
    
    broadcast({
      type: 'data_update',
      data: {
        pendingDeposits,
        expenses: recentExpenses.slice(0, 10) // Last 10 expenses
      }
    });
  } catch (error) {
    console.error('Broadcast error:', error);
  }
}, 5000); // Every 5 seconds

server.listen(config.server.port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${config.server.port}`);
});