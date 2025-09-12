# SpendBook - Telegram Bot va Administrator Paneli

Ushbu loyiha Telegram bot va web administrator paneli orqali xarajatlarni kuzatish va boshqarish tizimini taqdim etadi.

## Xususiyatlar

### Telegram Bot
- ✅ Xarajat qo'shish `/expense`
- ✅ Depozit so'rash `/deposit`
- ✅ Bugungi xarajatlarni ko'rish `/today`
- ✅ Kategoriya bo'yicha xarajat kiritish
- ✅ To'liq o'zbek tilida interfeys

### Administrator Paneli
- ✅ Real vaqtda xarajatlarni monitoring qilish
- ✅ Depozit so'rovlarini tasdiqlash/rad etish
- ✅ Kategoriya va oylik analitika
- ✅ Excel formatda eksport
- ✅ Chek bosish funksiyasi
- ✅ WebSocket orqali real vaqt yangilanishi

## O'rnatish

### 1. PostgreSQL Ma'lumotlar Bazasini O'rnatish

```bash
# PostgreSQL o'rnatish (Ubuntu/Debian)
sudo apt update
sudo apt install postgresql postgresql-contrib

# PostgreSQL xizmati ishga tushirish
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Ma'lumotlar bazasini yaratish
sudo -u postgres createdb spendbook

# SQL sxemasini import qilish
sudo -u postgres psql spendbook < server/database.sql
```

### 2. Loyihani O'rnatish

```bash
# Loyihani klonlash yoki yuklab olish
git clone <repository-url>
cd spendbook

# Frontend dependencies o'rnatish
npm install

# Backend dependencies o'rnatish
cd server
npm install
cd ..
```

### 3. Konfiguratsiya

`.env` faylini tahrirlang:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spendbook
DB_USER=postgres
DB_PASSWORD=your_password

# Telegram Bot Configuration (BotFather dan oling)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Server Configuration
PORT=3001
ADMIN_PASSWORD=your_admin_password
```

### 4. Telegram Bot Yaratish

1. Telegram'da @BotFather ga murojaat qiling
2. `/newbot` buyrug'ini yuboring
3. Bot uchun nom va username belgilang
4. Olingan tokenni `.env` fayliga qo'ying

### 5. Loyihani Ishga Tushirish

```bash
# Backend serverni ishga tushirish
npm run server:dev

# Frontend'ni ishga tushirish (yangi terminal)
npm run dev
```

## Foydalanish

### Telegram Bot
1. Telegram'da botingizni toping
2. `/start` buyrug'ini yuboring
3. Xarajat qo'shish uchun `/expense`
4. Depozit so'rash uchun `/deposit`
5. Bugungi xarajatlar uchun `/today`

### Administrator Paneli
1. Brauzeringizda `http://localhost:3000` ga o'ting
2. `.env` faylidagi parolni kiriting
3. Dashboard orqali xarajatlar va depozitlarni boshqaring

## API Endpoints

### Autentifikatsiya
- `POST /api/admin/login` - Administrator kirish

### Xarajatlar
- `GET /api/expenses` - Barcha xarajatlar
- `GET /api/categories` - Kategoriyalar ro'yxati

### Depozitlar
- `GET /api/deposits` - Barcha depozitlar
- `GET /api/deposits/pending` - Kutilayotgan depozitlar
- `PUT /api/deposits/:id` - Depozit statusini yangilash

### Analitika
- `GET /api/analytics` - Kategoriya va oylik analitika

### Eksport
- `GET /api/export/expenses` - Excel formatda eksport

## Texnologiyalar

### Frontend
- React 18 + TypeScript
- Tailwind CSS
- Lucide React (ikonkalar)
- Recharts (grafiklar)
- Vite (build tool)

### Backend
- Node.js + Express
- PostgreSQL
- node-telegram-bot-api
- WebSocket (real-time updates)
- XLSX (Excel eksport)

## Folder Structure

```
spendbook/
├── src/                    # Frontend kod
│   ├── components/         # React komponentlar
│   └── App.tsx            # Asosiy app
├── server/                 # Backend kod
│   ├── database.js        # Database funksiyalar
│   ├── telegramBot.js     # Telegram bot logikasi
│   ├── server.js          # Express server
│   └── database.sql       # Database schema
├── .env                   # Konfiguratsiya
└── README.md             # Bu fayl
```

## Qo'shimcha Imkoniyatlar

- 📱 Responsiv dizayn
- 🔄 Real vaqt yangilanishi
- 📊 Interaktiv grafiklar
- 🖨️ A4 formatda chek bosish
- 📁 Excel eksport
- 🛡️ Oddiy parol autentifikatsiyasi
- 🇺🇿 To'liq o'zbek tilida

## Muammolarni Hal Qilish

### PostgreSQL ulanish muammosi
```bash
# PostgreSQL xizmatini tekshirish
sudo systemctl status postgresql

# Parolni o'rnatish
sudo -u postgres psql
ALTER USER postgres PASSWORD 'your_password';
```

### Bot token muammosi
1. @BotFather ga qaytib, tokenni tekshiring
2. `.env` fayldagi tokenni yangilang
3. Serverni qayta ishga tushiring

## Yordam

Savollar yoki muammolar bo'lsa, GitHub Issues bo'limida yozing yoki loyiha administratoriga murojaat qiling.