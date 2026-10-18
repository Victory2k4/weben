require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { setupDatabase } = require('./db/setup');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS: cho phép tất cả *.vercel.app và localhost
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /\.vercel\.app$/.test(origin) || /^http:\/\/localhost/.test(origin)) {
      return callback(null, true);
    }
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/decks', require('./routes/decks'));
app.use('/api/cards', require('./routes/cards'));
app.use('/api/progress', require('./routes/progress'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/admin', require('./routes/admin'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server (bỏ qua khi chạy trên Vercel Serverless)
async function start() {
  try {
    await setupDatabase();
    if (!process.env.VERCEL) {
      app.listen(PORT, () => console.log(`🚀 API chạy tại http://localhost:${PORT}`));
    }
  } catch (err) {
    console.error('❌ Lỗi khởi động:', err.message);
    if (!process.env.VERCEL) process.exit(1);
  }
}

start();

module.exports = app;
