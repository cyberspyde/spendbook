const TelegramBot = require('node-telegram-bot-api');
const { Database } = require('./database');
const config = require('./config');

class SpendBookBot {
  constructor() {
    this.bot = new TelegramBot(config.telegram.token, { polling: true });
    this.userStates = new Map();
    this.setupCommands();
    this.setupCallbackHandlers();
  }

  setupCommands() {
    // Start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const user = msg.from;

      try {
        await Database.createUser(user.id, user.username, user.first_name, user.last_name);
        
        const welcomeText = `Assalomu alaykum, ${user.first_name}! 🎉

Xarajatlar yuzasidan hisobot berish botiga xush kelibsiz!

📝 Buyruqlar:
/expense - Xarajat qo'shish
/deposit - Depozit so'rash
/today - Bugungi xarajatlar
/help - Yordam`;

        this.bot.sendMessage(chatId, welcomeText);
      } catch (error) {
        console.error('Start command error:', error);
        this.bot.sendMessage(chatId, 'Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
      }
    });

    // Expense command
    this.bot.onText(/\/expense/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

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

    // Deposit command
    this.bot.onText(/\/deposit/, (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

      this.userStates.set(userId, { action: 'waiting_deposit_amount' });
      this.bot.sendMessage(chatId, 'Depozit miqdorini kiriting (so\'m):');
    });

    // Today command
    this.bot.onText(/\/today/, async (msg) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;

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
        
        this.bot.sendMessage(chatId, message);
      } catch (error) {
        console.error('Today command error:', error);
        this.bot.sendMessage(chatId, 'Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
      }
    });

    // Help command
    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      const helpText = `🤖 Bot buyruqlari:

/start - Botni ishga tushirish
/expense - Xarajat qo'shish
/deposit - Depozit so'rash
/today - Bugungi xarajatlar
/help - Bu yordam xabari

📞 Yordam kerakmi? Administratorga murojaat qiling.`;

      this.bot.sendMessage(chatId, helpText);
    });

    // Handle text messages based on user state
    this.bot.on('message', async (msg) => {
      if (msg.text && msg.text.startsWith('/')) return;

      const chatId = msg.chat.id;
      const userId = msg.from.id;
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

          this.bot.sendMessage(chatId, 'Xarajat uchun izoh kiriting (ixtiyoriy):');

        } else if (userState.action === 'waiting_expense_description') {
          const description = msg.text === '/skip' ? null : msg.text;

          await Database.createExpense(
            user.id,
            userState.categoryId,
            userState.amount,
            description
          );

          this.userStates.delete(userId);
          this.bot.sendMessage(chatId, `✅ Xarajat saqlandi!\n\n💰 Miqdor: ${userState.amount.toLocaleString()} so'm\n${description ? `📝 Izoh: ${description}` : ''}`);

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

          this.bot.sendMessage(chatId, 'Depozit uchun izoh kiriting:');

        } else if (userState.action === 'waiting_deposit_description') {
          const description = msg.text;

          await Database.createDeposit(user.id, userState.amount, description);
          this.userStates.delete(userId);

          this.bot.sendMessage(chatId, `📤 Depozit so'rovi yuborildi!\n\n💰 Miqdor: ${userState.amount.toLocaleString()} so'm\n📝 Izoh: ${description}\n\n⏳ Administrator tasdiqlashini kuting.`);
        }
      } catch (error) {
        console.error('Message handling error:', error);
        this.bot.sendMessage(chatId, 'Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
        this.userStates.delete(userId);
      }
    });
  }

  setupCallbackHandlers() {
    this.bot.on('callback_query', async (callbackQuery) => {
      const chatId = callbackQuery.message.chat.id;
      const userId = callbackQuery.from.id;
      const data = callbackQuery.data;

      try {
        if (data.startsWith('category_')) {
          const categoryId = parseInt(data.split('_')[1]);
          const category = await Database.getCategoryById(categoryId);

          this.userStates.set(userId, {
            action: 'waiting_expense_amount',
            categoryId: categoryId
          });

          this.bot.editMessageText(
            `${category.name_uz} kategoriyasi tanlandi.\n\nXarajat miqdorini kiriting (so'm):`,
            {
              chat_id: chatId,
              message_id: callbackQuery.message.message_id
            }
          );
        }

        this.bot.answerCallbackQuery(callbackQuery.id);
      } catch (error) {
        console.error('Callback query error:', error);
        this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Xatolik yuz berdi' });
      }
    });
  }

  async notifyDepositUpdate(depositId, status, user) {
    try {
      const statusText = status === 'approved' ? 'tasdiqlandi ✅' : 'rad etildi ❌';
      const message = `🏦 Depozit so'rovingiz ${statusText}`;
      
      this.bot.sendMessage(user.telegram_id, message);
    } catch (error) {
      console.error('Deposit notification error:', error);
    }
  }
}

module.exports = SpendBookBot;