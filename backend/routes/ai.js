const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { authMiddleware } = require('../middleware/auth');
const { query } = require('../db/setup');

const router = express.Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST /api/ai/generate-deck
// Tự động tạo bộ thẻ từ vựng từ 1 chủ đề bằng Gemini AI
router.post('/generate-deck', authMiddleware, async (req, res) => {
  const { topic, language = 'English', count = 15 } = req.body;
  if (!topic) return res.status(400).json({ error: 'Vui lòng nhập chủ đề' });
  if (count > 30) return res.status(400).json({ error: 'Tối đa 30 thẻ mỗi lần' });

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

    const prompt = `
You are a language learning assistant. Generate ${count} flashcard words for the topic "${topic}" in ${language}.
Return ONLY a valid JSON array (no markdown, no explanation):
[
  {
    "term": "word in target language",
    "phonetic": "/pronunciation/",
    "part_of_speech": "noun/verb/adjective/etc",
    "definition": "clear Vietnamese definition",
    "example_sentence": "example sentence using this word"
  }
]
Rules: definitions in Vietnamese, words relevant to "${topic}", practical vocabulary, IPA phonetic notation.
`.trim();

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Gemini không trả về JSON hợp lệ');
    const cards = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(cards) || cards.length === 0) throw new Error('Dữ liệu không hợp lệ');

    const deckResult = await query(
      `INSERT INTO decks (user_id, title, description, color) VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.userId, `${topic} (AI)`, `Bộ thẻ AI tạo cho chủ đề: ${topic}`, '#8b5cf6']
    );
    const deck = deckResult.rows[0];

    const insertedCards = [];
    for (const card of cards) {
      const cardResult = await query(
        `INSERT INTO cards (deck_id, term, phonetic, part_of_speech, definition, example_sentence)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [deck.id, card.term || '', card.phonetic || '', card.part_of_speech || '', card.definition || '', card.example_sentence || '']
      );
      insertedCards.push(cardResult.rows[0]);
    }

    res.status(201).json({
      deck,
      cards: insertedCards,
      message: `Đã tạo ${insertedCards.length} thẻ cho chủ đề "${topic}"`,
    });
  } catch (err) {
    console.error('AI generate error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/suggest-card
// Gợi ý định nghĩa + phiên âm cho 1 từ cụ thể
router.post('/suggest-card', authMiddleware, async (req, res) => {
  const { term, language = 'English' } = req.body;
  if (!term) return res.status(400).json({ error: 'Vui lòng nhập từ cần tra' });

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    const prompt = `
Give information for the ${language} word/phrase: "${term}"
Return ONLY a valid JSON object (no markdown):
{
  "term": "${term}",
  "phonetic": "/IPA pronunciation/",
  "part_of_speech": "noun/verb/adjective/etc",
  "definition": "Vietnamese definition",
  "example_sentence": "example sentence in ${language}"
}`.trim();

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Không thể xử lý phản hồi từ AI');
    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error('AI suggest error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/ask
// Hỏi AI dựa trên dữ liệu thẻ của người dùng trong CSDL
router.post('/ask', authMiddleware, async (req, res) => {
  const { question, deck_id } = req.body;
  if (!question) return res.status(400).json({ error: 'Vui lòng nhập câu hỏi' });

  try {
    // Lấy dữ liệu thẻ từ CSDL của người dùng (hoặc 1 deck cụ thể)
    let cardsResult;
    if (deck_id) {
      // Hỏi về 1 bộ thẻ cụ thể - kiểm tra quyền sở hữu
      const deckCheck = await query('SELECT * FROM decks WHERE id=$1 AND user_id=$2', [deck_id, req.userId]);
      if (deckCheck.rows.length === 0) return res.status(403).json({ error: 'Không tìm thấy bộ thẻ' });
      cardsResult = await query(
        `SELECT c.term, c.phonetic, c.part_of_speech, c.definition, c.example_sentence, d.title as deck_title
         FROM cards c JOIN decks d ON c.deck_id = d.id
         WHERE c.deck_id = $1 LIMIT 80`,
        [deck_id]
      );
    } else {
      // Hỏi toàn bộ thẻ của user (lấy 80 thẻ gần nhất)
      cardsResult = await query(
        `SELECT c.term, c.phonetic, c.part_of_speech, c.definition, c.example_sentence, d.title as deck_title
         FROM cards c JOIN decks d ON c.deck_id = d.id
         WHERE d.user_id = $1
         ORDER BY c.created_at DESC LIMIT 80`,
        [req.userId]
      );
    }

    const cards = cardsResult.rows;
    if (cards.length === 0) {
      return res.json({ answer: 'Bạn chưa có thẻ từ vựng nào. Hãy tạo bộ thẻ trước nhé!' });
    }

    // Chuyển cards thành context text cho Gemini
    const context = cards
      .map(c => `- ${c.term} (${c.part_of_speech}): ${c.definition}. Ví dụ: ${c.example_sentence} [Bộ: ${c.deck_title}]`)
      .join('\n');

    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
    const prompt = `
Bạn là "Gấu Trúc", trợ lý học từ vựng tiếng Anh dạng chatbot. Phong cách: thân thiện, vui vẻ, dùng emoji vừa phải.

QUY TẮC BẮT BUỘC:
- Trả lời NGẮN GỌN, tối đa 2-3 câu cho câu hỏi đơn giản.
- Chỉ giải thích dài hơn (tối đa 80 từ) khi người dùng hỏi chi tiết.
- KHÔNG liệt kê toàn bộ danh sách từ. Chỉ nhắc 1-2 từ liên quan nhất.
- KHÔNG viết dạng bài luận hay hướng dẫn dài. Viết như đang CHAT.
- Dùng markdown nhẹ: **bold** cho từ vựng, *italic* cho phiên âm/nghĩa.

Từ vựng người dùng đang học:
${context}

Câu hỏi: "${question}"
`.trim();

    const result = await model.generateContent(prompt);
    res.json({ answer: result.response.text(), cards_used: cards.length });
  } catch (err) {
    console.error('AI ask error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
