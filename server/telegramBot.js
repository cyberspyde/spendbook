const TelegramBot = require('node-telegram-bot-api');
const { Database } = require('./database');
const config = require('./config');

class SpendBookBot {
  constructor() {
    const token = config.telegram.token;
    if (!token || token === 'YOUR_BOT_TOKEN_HERE') {
      console.warn('Telegram bot token not set; bot polling is disabled. Set TELEGRAM_BOT_TOKEN in server/.env to enable.');
      this.bot = null;
      this.userStates = new Map();
      return;
    }

    this.bot = new TelegramBot(token, { polling: true });
    this.userStates = new Map();
    this._authCache = new Set();
    this._authCacheLast = 0;
    this._authCacheTTL = 15000; // 15s
    this.setupCommands();
    this.setupCallbackHandlers();
    this.setupPersistentMenu();
    // Prime and periodically refresh authorization cache
    this._refreshAuthCache();
    setInterval(() => this._refreshAuthCache(), this._authCacheTTL);
  }

  async _refreshAuthCache() {
    try {
      const list = await Database.listAuthorizedUsers();
      this._authCache = new Set(list.map(u => String(u.telegram_id)));
      this._authCacheLast = Date.now();
    } catch (e) {
      console.error('Auth cache refresh error:', e);
    }
  }

  isAuthorized(userId) {
    // If cache is cold, deny by default but schedule a refresh
    if (!this._authCacheLast) {
      this._refreshAuthCache();
    }
    return this._authCache.has(String(userId));
  }

  setupCommands() {
    // Start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const user = msg.from;

      if (!this.isAuthorized(user.id)) {
        this.bot.sendMessage(chatId, `❌ Siz ushbu botdan foydalanishga ruxsat etilmagansiz.\n\nID: ${user.id}\nIltimos administratorga ID raqamingizni yuboring.`);
        return;
      }

      try {
        await Database.createUser(user.id, user.username, user.first_name, user.last_name);
        
  const adminUsername = await Database.getSetting('admin_telegram_username');
  const adminLine = adminUsername ? `\n\n📞 Yordam kerakmi? Administrator: @${adminUsername}` : '';
  const welcomeText = `Assalomu alaykum, ${user.first_name}! 🎉

Xarajatlar yuzasidan hisobot berish botiga xush kelibsiz!

📝 Buyruqlar:
/balance - Balans
/history - Tarix (so'nggi 10 ta)
/expense - Xarajat qo'shish
/deposit - Depozit so'rash
/today - Bugungi xarajatlar
/help - Yordam${adminLine}`;

  this.bot.sendMessage(chatId, welcomeText, { reply_markup: this.mainMenu() });
      } catch (error) {
        console.error('Start command error:', error);
        this.bot.sendMessage(chatId, 'Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
      }
    });

    // Expense command
    this.bot.onText(/\/expense/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      if (!this.isAuthorized(userId)) {
        this.bot.sendMessage(chatId, `❌ Siz ushbu botdan foydalanishga ruxsat etilmagansiz. ID: ${userId}`);
        return;
      }

      try {
        const categories = await Database.getAllCategories();
        const keyboard = {
          inline_keyboard: categories.map(cat => [{
            text: cat.name_uz,
            callback_data: `category_${cat.id}`
          }])
        };

        this.userStates.set(userId, { action: 'waiting_category' });
        this.bot.sendMessage(chatId, 'Xarajat kategoriyasini tanlang:', {
          reply_markup: keyboard
        });
      } catch (error) {
        console.error('Expense command error:', error);
        this.bot.sendMessage(chatId, 'Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
      }
    });

    // Balance command
    this.bot.onText(/\/balance/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      if (!this.isAuthorized(userId)) {
        this.bot.sendMessage(chatId, `❌ Siz ushbu botdan foydalanishga ruxsat etilmagansiz. ID: ${userId}`);
        return;
      }
      try {
        const totalExpenses = await Database.getTotalExpenses();
        const totalDeposits = await Database.getTotalApprovedDeposits();
        const balance = totalDeposits - totalExpenses;
        const text = `📟 Balans\n\n💵 Depozitlar (tasdiqlangan): ${totalDeposits.toLocaleString()} so'm\n💸 Xarajatlar: ${totalExpenses.toLocaleString()} so'm\n\n🧮 Balans: ${balance.toLocaleString()} so'm`;
        this.bot.sendMessage(chatId, text, { reply_markup: this.mainMenu() });
      } catch (error) {
        console.error('Balance command error:', error);
        this.bot.sendMessage(chatId, 'Balansni olishda xatolik.');
      }
    });

  // History command (recent expenses and deposits)
    this.bot.onText(/\/history/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      if (!this.isAuthorized(userId)) {
        this.bot.sendMessage(chatId, `❌ Siz ushbu botdan foydalanishga ruxsat etilmagansiz. ID: ${userId}`);
        return;
      }
      try {
        const [recentExpenses, recentDeposits] = await Promise.all([
          Database.getRecentExpensesByUser((await Database.getUserByTelegramId(userId))?.id || 0, 5),
          Database.getDepositsByUser((await Database.getUserByTelegramId(userId))?.id || 0, 5)
        ]);

        let text = '🧾 So\'nggi tarix (5 ta):\n\n';
        if (recentExpenses.length) {
          text += '• Xarajatlar:\n';
          recentExpenses.forEach(e => {
            const amount = parseFloat(e.amount).toLocaleString();
            text += `  - ${e.category_name}: ${amount} so'm${e.description ? ` — ${e.description}` : ''}\n`;
          });
        } else {
          text += '• Xarajatlar: yo\'q\n';
        }

        if (recentDeposits.length) {
          text += '\n• Depozitlar:\n';
          recentDeposits.forEach(d => {
            const amount = parseFloat(d.amount).toLocaleString();
            const statusUz = d.status === 'approved' ? 'Tasdiqlangan' : d.status === 'rejected' ? 'Rad etilgan' : 'Kutilmoqda';
            text += `  - ${amount} so'm — ${statusUz}\n`;
          });
        } else {
          text += '\n• Depozitlar: yo\'q\n';
        }

        this.bot.sendMessage(chatId, text, { reply_markup: this.mainMenu() });
      } catch (error) {
        console.error('History command error:', error);
        this.bot.sendMessage(chatId, 'Tarixni olishda xatolik.');
      }
    });

    // Deposit command
    this.bot.onText(/\/deposit/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      if (!this.isAuthorized(userId)) {
        this.bot.sendMessage(chatId, `❌ Siz ushbu botdan foydalanishga ruxsat etilmagansiz. ID: ${userId}`);
        return;
      }

  this.userStates.set(userId, { action: 'waiting_deposit_amount' });
  this.bot.sendMessage(chatId, 'Depozit miqdorini kiriting (so\'m):', { reply_markup: this.mainMenu() });
    });

    // Today command
    this.bot.onText(/\/today/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      if (!this.isAuthorized(userId)) {
        this.bot.sendMessage(chatId, "❌ Siz ushbu botdan foydalanishga ruxsat etilmagansiz.");
        return;
      }

      try {
        const user = await Database.getUserByTelegramId(userId);
        if (!user) {
          this.bot.sendMessage(chatId, 'Iltimos /start buyrug\'ini bosing.');
          return;
        }

        const todayExpenses = await Database.getTodaysExpenses(user.id);
        
        if (todayExpenses.length === 0) {
          this.bot.sendMessage(chatId, 'Bugun hech qanday xarajat yo\'q.');
          return;
        }

        let total = 0;
        let message = '📊 Bugungi xarajatlar:\n\n';
        
        todayExpenses.forEach(expense => {
          total += parseFloat(expense.amount);
          message += `• ${expense.category_name}: ${expense.amount.toLocaleString()} so'm\n`;
          if (expense.description) {
            message += `  ${expense.description}\n`;
          }
          message += '\n';
        });

        message += `💰 Jami: ${total.toLocaleString()} so'm`;
        
    this.bot.sendMessage(chatId, message, { reply_markup: this.mainMenu() });
      } catch (error) {
        console.error('Today command error:', error);
        this.bot.sendMessage(chatId, 'Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
      }
    });

    // Help command
    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      if (!this.isAuthorized(userId)) {
        this.bot.sendMessage(chatId, "❌ Siz ushbu botdan foydalanishga ruxsat etilmagansiz.");
        return;
      }
      (async () => {
        const adminUsername = await Database.getSetting('admin_telegram_username');
        const adminLine = adminUsername ? `\n\n📞 Yordam: @${adminUsername}` : '';
        const helpText = `🤖 Bot buyruqlari:

/start - Botni ishga tushirish
/balance - Balans
/history - Tarix
/expense - Xarajat qo'shish
/deposit - Depozit so'rash
/today - Bugungi xarajatlar
/help - Bu yordam xabari${adminLine}`;
        this.bot.sendMessage(chatId, helpText, { reply_markup: this.mainMenu() });
      })();
    });

    // Handle text messages based on user state
    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      // Allow '/skip' during optional description steps; otherwise ignore slash commands here
      if (msg.text && msg.text.startsWith('/')) {
        const st = this.userStates.get(userId);
        const isSkipAllowed = st && ((st.action === 'waiting_expense_description' || st.action === 'waiting_deposit_description') && msg.text === '/skip');
        if (!isSkipAllowed) return;
      }
      if (!this.isAuthorized(userId)) {
        this.bot.sendMessage(chatId, "❌ Siz ushbu botdan foydalanishga ruxsat etilmagansiz.");
        return;
      }
      const userState = this.userStates.get(userId);

      if (!userState) return;

      try {
        const user = await Database.getUserByTelegramId(userId);
        if (!user) {
          this.bot.sendMessage(chatId, 'Iltimos /start buyrug\'ini bosing.');
          return;
        }

        if (userState.action === 'waiting_expense_amount') {
          const amount = parseFloat(msg.text);
          if (isNaN(amount) || amount <= 0) {
            this.bot.sendMessage(chatId, 'Iltimos to\'g\'ri miqdor kiriting (masalan: 50000)');
            return;
          }

          this.userStates.set(userId, {
            ...userState,
            action: 'waiting_expense_description',
            amount: amount
          });

          this.bot.sendMessage(chatId, 'Xarajat uchun izoh kiriting (ixtiyoriy):', { reply_markup: this.skipCommentKeyboard() });

        } else if (userState.action === 'waiting_expense_description') {
          const isSkip = msg.text === '/skip' || msg.text === "⏭ Izohsiz o'tkazish";
          const description = isSkip ? null : msg.text;

          await Database.createExpense(
            user.id,
            userState.categoryId,
            userState.amount,
            description
          );

          this.userStates.delete(userId);
          this.bot.sendMessage(chatId, `✅ Xarajat saqlandi!\n\n💰 Miqdor: ${userState.amount.toLocaleString()} so'm\n${description ? `📝 Izoh: ${description}` : ''}` , { reply_markup: this.mainMenu() });

        } else if (userState.action === 'waiting_deposit_amount') {
          const amount = parseFloat(msg.text);
          if (isNaN(amount) || amount <= 0) {
            this.bot.sendMessage(chatId, 'Iltimos to\'g\'ri miqdor kiriting (masalan: 100000)');
            return;
          }

          this.userStates.set(userId, {
            action: 'waiting_deposit_description',
            amount: amount
          });

          this.bot.sendMessage(chatId, 'Depozit uchun izoh kiriting (ixtiyoriy):', { reply_markup: this.skipCommentKeyboard() });

        } else if (userState.action === 'waiting_deposit_description') {
          const isSkip = msg.text === '/skip' || msg.text === "⏭ Izohsiz o'tkazish";
          const description = isSkip ? null : msg.text;

          await Database.createDeposit(user.id, userState.amount, description);
          this.userStates.delete(userId);

          this.bot.sendMessage(chatId, `📤 Depozit so'rovi yuborildi!\n\n💰 Miqdor: ${userState.amount.toLocaleString()} so'm\n${description ? `📝 Izoh: ${description}\n` : ''}\n⏳ Administrator tasdiqlashini kuting.`, { reply_markup: this.mainMenu() });
        }
      } catch (error) {
        console.error('Message handling error:', error);
        this.bot.sendMessage(chatId, 'Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
        this.userStates.delete(userId);
      }
    });
  }

  mainMenu() {
    return {
      resize_keyboard: true,
      keyboard: [
        [ { text: '/balance' }, { text: '/history' } ],
        [ { text: '/expense' }, { text: '/deposit' } ],
        [ { text: '/today' }, { text: '/help' } ]
      ]
    };
  }

  // Single-use keyboard to allow skipping optional comment
  skipCommentKeyboard() {
    return {
      resize_keyboard: true,
      one_time_keyboard: true,
      keyboard: [
        [ { text: "⏭ Izohsiz o'tkazish" } ]
      ]
    };
  }

  setupPersistentMenu() {
    if (!this.bot) return;
    // Set bot commands, which also powers the slash-menu in Telegram UI
    this.bot.setMyCommands([
      { command: 'start', description: 'Botni ishga tushirish' },
      { command: 'balance', description: 'Balansni ko\'rish' },
      { command: 'history', description: 'So\'nggi tarix' },
      { command: 'expense', description: 'Xarajat qo\'shish' },
      { command: 'deposit', description: 'Depozit so\'rash' },
      { command: 'today', description: 'Bugungi xarajatlar' },
      { command: 'help', description: 'Yordam' }
    ]).catch(() => {});
  }

  setupCallbackHandlers() {
    this.bot.on('callback_query', async (callbackQuery) => {
      const chatId = callbackQuery.message.chat.id;
      const userId = callbackQuery.from.id;
      const data = callbackQuery.data;

      if (!this.isAuthorized(userId)) {
        try { this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Ruxsat yo\'q' }); } catch (_) {}
        return;
      }

      try {
        if (data.startsWith('category_')) {
          const categoryId = parseInt(data.split('_')[1]);
          const category = await Database.getCategoryById(categoryId);

          this.userStates.set(userId, {
            action: 'waiting_expense_amount',
            categoryId: categoryId
          });

          this.bot.editMessageText(
            `${category.name_uz} kategoriyasi tanlandi.`,
            {
              chat_id: chatId,
              message_id: callbackQuery.message.message_id
            }
          );
          // Send next-step prompt with persistent reply keyboard
          this.bot.sendMessage(chatId, `Xarajat miqdorini kiriting (so'm):`, { reply_markup: this.mainMenu() });
        }

        this.bot.answerCallbackQuery(callbackQuery.id);
      } catch (error) {
        console.error('Callback query error:', error);
        this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Xatolik yuz berdi' });
      }
    });
  }

  // Notify all authorized bot users about a deposit update
  async broadcastDepositUpdate(deposit) {
    try {
      if (!this.bot) return; // bot disabled
      const requester = await Database.getUserById(deposit.user_id);
      const statusText = deposit.status === 'approved' ? 'Tasdiqlandi ✅' : deposit.status === 'rejected' ? 'Rad etildi ❌' : 'Kutilmoqda ⏳';
      const message = `🏦 Depozit yangilandi\n👤 Foydalanuvchi: ${requester?.first_name || ''} ${requester?.last_name || ''}\n💰 Miqdor: ${parseFloat(deposit.amount).toLocaleString()} so'm\n📌 Holat: ${statusText}`;
      const list = await Database.listAuthorizedUsers();
      for (const u of list) {
        try { await this.bot.sendMessage(u.telegram_id, message); } catch (_) {}
      }
    } catch (error) {
      console.error('Deposit broadcast error:', error);
    }
  }
}

module.exports = SpendBookBot;