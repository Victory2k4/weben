const express = require('express');
const { query, pool } = require('../db/setup');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/decks – list user's decks with card count
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT d.*,
        COUNT(c.id)::int AS card_count,
        COALESCE(SUM(CASE WHEN p.status = 'mastered' THEN 1 ELSE 0 END), 0)::int AS mastered_count
      FROM decks d
      LEFT JOIN cards c ON c.deck_id = d.id
      LEFT JOIN user_card_progress p ON p.card_id = c.id AND p.user_id = $1
      WHERE d.user_id = $1
      GROUP BY d.id
      ORDER BY d.created_at DESC
    `, [req.userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/decks – create deck
router.post('/', async (req, res) => {
  const { title, description = '', color = '#6366f1' } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  try {
    const result = await query(
      'INSERT INTO decks (user_id, title, description, color) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.userId, title, description, color]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/decks/import
router.post('/import', async (req, res) => {
  const { title, rawText, color = '#6366f1' } = req.body;
  if (!title || !rawText || !rawText.trim()) return res.status(400).json({ error: 'Thiếu tên bộ thẻ hoặc nội dung' });

  try {
    let cards = [];
    
    // 1. Local parse
    const lines = rawText.trim().split('\n').filter(l => l.trim());
    if (lines.length >= 2 && lines[0].includes('\t')) {
      for (const line of lines) {
        const cols = line.split('\t').map(c => c.trim());
        if (cols.length >= 2 && cols[0]) {
          cards.push({ term: cols[0], phonetic: cols[1] || '', part_of_speech: cols[2] || '', definition: cols[3] || cols[1] || '', example_sentence: cols[4] || '' });
        }
      }
    }
    if (cards.length < 2) {
      const sepRegex = /^(.+?)\s*[-–|]\s*(.+)$/;
      const allMatch = lines.every(l => sepRegex.test(l.replace(/^\d+[\.\)]\s*/, '')));
      if (allMatch) {
        cards = [];
        for (const line of lines) {
          const m = line.replace(/^\d+[\.\)]\s*/, '').match(sepRegex);
          if (m) cards.push({ term: m[1].trim(), phonetic: '', part_of_speech: '', definition: m[2].trim(), example_sentence: '' });
        }
      }
    }

    // 2. AI parse fallback
    if (cards.length < 2) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-3.6-flash',
        generationConfig: { responseMimeType: "application/json" }
      });
      const prompt = `Parse this vocab list into a JSON array of objects with exact keys: term, phonetic, part_of_speech, definition, example_sentence. If missing, use "". Keep original order. Do not invent details. Raw text: \n${rawText}`.trim();
      try {
        const result = await model.generateContent(prompt);
        cards = JSON.parse(result.response.text());
      } catch (e) {
        console.error("AI Parse Error:", e);
        if (e.status === 503) return res.status(503).json({ error: 'Server AI Google đang quá tải (503). Vui lòng thử lại sau!' });
        return res.status(500).json({ error: 'Lỗi kết nối AI: ' + e.message });
      }
    }
    if (cards.length === 0) return res.status(400).json({ error: 'Không thể phân tích từ vựng từ nội dung bạn dán!' });

    // 3. Database Insert
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const deckRes = await client.query(
        'INSERT INTO decks (user_id, title, description, color) VALUES ($1, $2, $3, $4) RETURNING id',
        [req.userId, title, `Bộ thẻ dán nhanh (${cards.length} từ)`, color]
      );
      const deckId = deckRes.rows[0].id;

      for (const c of cards) {
        if (!c.term) continue;
        await client.query(
          'INSERT INTO cards (deck_id, term, phonetic, part_of_speech, definition, example_sentence) VALUES ($1, $2, $3, $4, $5, $6)',
          [deckId, c.term, c.phonetic || '', c.part_of_speech || '', c.definition || '', c.example_sentence || '']
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    res.status(201).json({ success: true, count: cards.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// POST /api/decks/:id/import - Thêm nhiều từ vào bộ có sẵn
router.post('/:id/import', authMiddleware, async (req, res) => {
  const { rawText } = req.body;
  const deckId = req.params.id;
  if (!rawText || !rawText.trim()) return res.status(400).json({ error: 'Thiếu nội dung' });

  try {
    // Check if deck exists and belongs to user
    const deckRes = await query('SELECT id FROM decks WHERE id = $1 AND user_id = $2', [deckId, req.userId]);
    if (deckRes.rowCount === 0) return res.status(404).json({ error: 'Không tìm thấy bộ từ' });

    let cards = [];
    const lines = rawText.trim().split('\n').filter(l => l.trim());
    if (lines.length >= 2 && lines[0].includes('\t')) {
      for (const line of lines) {
        const cols = line.split('\t').map(c => c.trim());
        if (cols.length >= 2 && cols[0]) {
          cards.push({ term: cols[0], phonetic: cols[1] || '', part_of_speech: cols[2] || '', definition: cols[3] || cols[1] || '', example_sentence: cols[4] || '' });
        }
      }
    }
    if (cards.length < 2) {
      const sepRegex = /^(.+?)\s*[-–|]\s*(.+)$/;
      const allMatch = lines.every(l => sepRegex.test(l.replace(/^\d+[\.\)]\s*/, '')));
      if (allMatch) {
        cards = [];
        for (const line of lines) {
          const m = line.replace(/^\d+[\.\)]\s*/, '').match(sepRegex);
          if (m) cards.push({ term: m[1].trim(), phonetic: '', part_of_speech: '', definition: m[2].trim(), example_sentence: '' });
        }
      }
    }
    if (cards.length < 2) {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-3.6-flash',
        generationConfig: { responseMimeType: "application/json" }
      });
      const prompt = `Parse this vocab list into a JSON array of objects with exact keys: term, phonetic, part_of_speech, definition, example_sentence. If missing, use "". Keep original order. Do not invent details. Raw text: \n${rawText}`.trim();
      try {
        const result = await model.generateContent(prompt);
        cards = JSON.parse(result.response.text());
      } catch (e) {
        console.error("AI Parse Error:", e);
        if (e.status === 503) return res.status(503).json({ error: 'Server AI Google đang quá tải (503). Vui lòng thử lại sau!' });
        return res.status(500).json({ error: 'Lỗi kết nối AI: ' + e.message });
      }
    }
    if (cards.length === 0) return res.status(400).json({ error: 'Không thể phân tích từ vựng từ nội dung bạn dán!' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const c of cards) {
        await client.query(
          'INSERT INTO cards (deck_id, term, phonetic, part_of_speech, definition, example_sentence) VALUES ($1, $2, $3, $4, $5, $6)',
          [deckId, c.term, c.phonetic || '', c.part_of_speech || '', c.definition || '', c.example_sentence || '']
        );
      }
      await client.query('COMMIT');
      res.status(201).json({ success: true, count: cards.length });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET /api/decks/:id – get single deck with all cards
router.get('/:id', async (req, res) => {
  try {
    const deckRes = await query(
      'SELECT * FROM decks WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    const deck = deckRes.rows[0];
    if (!deck) return res.status(404).json({ error: 'Deck not found' });

    const cardsRes = await query(`
      SELECT c.*, p.status, p.next_review_at, p.ease_factor, p.interval, p.repetitions
      FROM cards c
      LEFT JOIN user_card_progress p ON p.card_id = c.id AND p.user_id = $1
      WHERE c.deck_id = $2
      ORDER BY c.created_at ASC
    `, [req.userId, req.params.id]);

    res.json({ ...deck, cards: cardsRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/decks/:id – update deck
router.put('/:id', async (req, res) => {
  const { title, description, color } = req.body;
  try {
    const deckRes = await query(
      'SELECT * FROM decks WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    const deck = deckRes.rows[0];
    if (!deck) return res.status(404).json({ error: 'Deck not found' });

    const result = await query(
      'UPDATE decks SET title = $1, description = $2, color = $3 WHERE id = $4 RETURNING *',
      [title || deck.title, description ?? deck.description, color || deck.color, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/decks/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM decks WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Deck not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/decks/:id/study – cards due for review today
router.get('/:id/study', async (req, res) => {
  try {
    const deckRes = await query(
      'SELECT * FROM decks WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (!deckRes.rows[0]) return res.status(404).json({ error: 'Deck not found' });

    const cardsRes = await query(`
      SELECT c.*, COALESCE(p.status, 'new') AS status, p.next_review_at, p.ease_factor, p.interval, p.repetitions
      FROM cards c
      LEFT JOIN user_card_progress p ON p.card_id = c.id AND p.user_id = $1
      WHERE c.deck_id = $2
        AND (p.next_review_at IS NULL OR p.next_review_at <= NOW())
        AND COALESCE(p.status, 'new') != 'mastered'
      ORDER BY RANDOM()
      LIMIT 20
    `, [req.userId, req.params.id]);

    res.json(cardsRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
