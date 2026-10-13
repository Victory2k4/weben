const express = require('express');
const { query } = require('../db/setup');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

/**
 * SM-2 Spaced Repetition Algorithm
 * rating: 0 = Again, 1 = Hard, 2 = Easy
 */
function calculateSM2(progress, rating) {
  let { ease_factor = 2.5, interval = 0, repetitions = 0 } = progress || {};

  let newStatus = 'learning';

  if (rating === 0) {
    // Again – reset
    repetitions = 0;
    interval = 1;
    newStatus = 'learning';
  } else if (rating === 1) {
    // Hard
    repetitions = Math.max(0, repetitions);
    interval = repetitions === 0 ? 1 : Math.round(interval * 1.2);
    ease_factor = Math.max(1.3, ease_factor - 0.15);
    newStatus = 'learning';
  } else {
    // Easy
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 3;
    } else {
      interval = Math.round(interval * ease_factor);
    }
    repetitions += 1;
    ease_factor = Math.max(1.3, ease_factor + 0.1);
    newStatus = interval >= 7 ? 'mastered' : 'learning';
  }

  // Calculate next review date
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    ease_factor: Math.round(ease_factor * 100) / 100,
    interval,
    repetitions,
    status: newStatus,
    next_review_at: nextReview.toISOString(),
  };
}

// POST /api/progress/review – submit a card review
router.post('/review', async (req, res) => {
  const { card_id, rating } = req.body; // rating: 0=Again, 1=Hard, 2=Easy

  if (card_id === undefined || rating === undefined) {
    return res.status(400).json({ error: 'card_id and rating are required' });
  }
  if (![0, 1, 2].includes(Number(rating))) {
    return res.status(400).json({ error: 'rating must be 0, 1, or 2' });
  }

  try {
    // Get existing progress
    const existingRes = await query(
      'SELECT * FROM user_card_progress WHERE user_id = $1 AND card_id = $2',
      [req.userId, card_id]
    );
    const existing = existingRes.rows[0];
    const newProgress = calculateSM2(existing, Number(rating));

    if (existing) {
      await query(`
        UPDATE user_card_progress
        SET status = $1, ease_factor = $2, interval = $3, repetitions = $4,
            next_review_at = $5, last_reviewed_at = NOW()
        WHERE user_id = $6 AND card_id = $7
      `, [
        newProgress.status, newProgress.ease_factor, newProgress.interval,
        newProgress.repetitions, newProgress.next_review_at,
        req.userId, card_id
      ]);
    } else {
      await query(`
        INSERT INTO user_card_progress
          (user_id, card_id, status, ease_factor, interval, repetitions, next_review_at, last_reviewed_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [
        req.userId, card_id, newProgress.status, newProgress.ease_factor,
        newProgress.interval, newProgress.repetitions, newProgress.next_review_at
      ]);
    }

    res.json(newProgress);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/progress/session – save study session summary
router.post('/session', async (req, res) => {
  const { deck_id, cards_studied, cards_mastered, duration_seconds } = req.body;

  try {
    await query(`
      INSERT INTO study_sessions (user_id, deck_id, cards_studied, cards_mastered, duration_seconds)
      VALUES ($1, $2, $3, $4, $5)
    `, [req.userId, deck_id, cards_studied || 0, cards_mastered || 0, duration_seconds || 0]);

    // Update streak
    const userRes = await query(
      'SELECT last_study_date, streak FROM users WHERE id = $1',
      [req.userId]
    );
    const user = userRes.rows[0];
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let newStreak = 1;
    if (user.last_study_date === yesterday) {
      newStreak = (user.streak || 0) + 1;
    } else if (user.last_study_date === today) {
      newStreak = user.streak || 1;
    }

    await query(
      'UPDATE users SET streak = $1, last_study_date = $2 WHERE id = $3',
      [newStreak, today, req.userId]
    );

    res.json({ success: true, streak: newStreak });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/progress/stats – user stats
router.get('/stats', async (req, res) => {
  try {
    const totalCardsRes = await query(`
      SELECT COUNT(c.id)::int AS total FROM cards c
      JOIN decks d ON d.id = c.deck_id WHERE d.user_id = $1
    `, [req.userId]);

    const progressRes = await query(`
      SELECT
        COUNT(*)::int AS studied,
        COALESCE(SUM(CASE WHEN status = 'mastered' THEN 1 ELSE 0 END), 0)::int AS mastered,
        COALESCE(SUM(CASE WHEN status = 'learning' THEN 1 ELSE 0 END), 0)::int AS learning
      FROM user_card_progress WHERE user_id = $1
    `, [req.userId]);

    const sessionsRes = await query(`
      SELECT s.*, d.title AS deck_title FROM study_sessions s
      JOIN decks d ON d.id = s.deck_id
      WHERE s.user_id = $1 ORDER BY s.created_at DESC LIMIT 7
    `, [req.userId]);

    const quizRes = await query(`
      SELECT q.*, d.title AS deck_title FROM quiz_results q
      JOIN decks d ON d.id = q.deck_id
      WHERE q.user_id = $1 ORDER BY q.created_at DESC LIMIT 5
    `, [req.userId]);

    const userRes = await query(
      'SELECT streak FROM users WHERE id = $1',
      [req.userId]
    );

    const total = totalCardsRes.rows[0].total || 0;
    const prog = progressRes.rows[0];

    res.json({
      total_cards: total,
      studied: prog.studied || 0,
      mastered: prog.mastered || 0,
      learning: prog.learning || 0,
      new: total - (prog.studied || 0),
      streak: userRes.rows[0]?.streak || 0,
      recent_sessions: sessionsRes.rows,
      recent_quizzes: quizRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/progress/quiz – save quiz result & penalize wrong cards
router.post('/quiz', async (req, res) => {
  const { deck_id, total_questions, correct_answers, wrong_card_ids = [], quiz_mode = 'mixed', duration_seconds = 0 } = req.body;

  if (!deck_id || total_questions === undefined || correct_answers === undefined) {
    return res.status(400).json({ error: 'deck_id, total_questions, correct_answers are required' });
  }

  try {
    // Save quiz result
    await query(`
      INSERT INTO quiz_results (user_id, deck_id, total_questions, correct_answers, wrong_card_ids, quiz_mode, duration_seconds)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [req.userId, deck_id, total_questions, correct_answers, wrong_card_ids, quiz_mode, duration_seconds]);

    // Penalize wrong cards: reduce ease_factor & pull next_review_at closer
    if (wrong_card_ids.length > 0) {
      for (const cardId of wrong_card_ids) {
        const existing = await query(
          'SELECT * FROM user_card_progress WHERE user_id = $1 AND card_id = $2',
          [req.userId, cardId]
        );
        if (existing.rows[0]) {
          const newEase = Math.max(1.3, (existing.rows[0].ease_factor || 2.5) - 0.1);
          await query(`
            UPDATE user_card_progress
            SET ease_factor = $1, status = CASE WHEN status = 'mastered' THEN 'learning' ELSE status END,
                next_review_at = LEAST(next_review_at, NOW() + INTERVAL '1 day')
            WHERE user_id = $2 AND card_id = $3
          `, [newEase, req.userId, cardId]);
        }
      }
    }

    // Update streak (same logic as session)
    const userRes = await query('SELECT last_study_date, streak FROM users WHERE id = $1', [req.userId]);
    const user = userRes.rows[0];
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    let newStreak = 1;
    if (user.last_study_date === yesterday) newStreak = (user.streak || 0) + 1;
    else if (user.last_study_date === today) newStreak = user.streak || 1;
    await query('UPDATE users SET streak = $1, last_study_date = $2 WHERE id = $3', [newStreak, today, req.userId]);

    res.json({ success: true, streak: newStreak });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
