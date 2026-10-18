const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false, sslmode: 'verify-full' }
    : false,
});

// Lazy init: tạo bảng khi có request đầu tiên (hỗ trợ Vercel Serverless)
let dbReady = false;

const query = async (text, params) => {
  if (!dbReady) {
    await setupDatabase();
    dbReady = true;
  }
  return pool.query(text, params);
};

async function setupDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      streak INTEGER DEFAULT 0,
      last_study_date TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Migration: thêm cột role nếu bảng users đã tồn tại nhưng chưa có cột role
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'role'
      ) THEN
        ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS decks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      is_public INTEGER DEFAULT 0,
      color TEXT DEFAULT '#6366f1',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS cards (
      id SERIAL PRIMARY KEY,
      deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
      term TEXT NOT NULL,
      phonetic TEXT DEFAULT '',
      part_of_speech TEXT DEFAULT '',
      definition TEXT NOT NULL,
      example_sentence TEXT DEFAULT '',
      audio_url TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_card_progress (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'new',
      ease_factor REAL DEFAULT 2.5,
      interval INTEGER DEFAULT 0,
      repetitions INTEGER DEFAULT 0,
      next_review_at TIMESTAMPTZ DEFAULT NOW(),
      last_reviewed_at TIMESTAMPTZ,
      UNIQUE(user_id, card_id)
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      deck_id INTEGER NOT NULL REFERENCES decks(id),
      cards_studied INTEGER DEFAULT 0,
      cards_mastered INTEGER DEFAULT 0,
      duration_seconds INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS quiz_results (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      deck_id INTEGER NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
      total_questions INTEGER NOT NULL,
      correct_answers INTEGER NOT NULL,
      wrong_card_ids INTEGER[] DEFAULT '{}',
      quiz_mode TEXT DEFAULT 'mixed',
      duration_seconds INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ PostgreSQL schema ready');
}

module.exports = { query, pool, setupDatabase };
