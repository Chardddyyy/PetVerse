// routes/posts.js — posts and comments

const express                       = require('express');
const router                        = express.Router();
const { sanitize, timeAgo, formatPost } = require('../lib/helpers');

let pool;
function setPool(p) { pool = p; }

// GET /api/posts
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*,
        GROUP_CONCAT(DISTINCT t.tag ORDER BY t.id SEPARATOR ',') AS tags,
        COUNT(DISTINCT c.id) AS comments
      FROM posts p
      LEFT JOIN post_tags t ON t.post_id = p.id
      LEFT JOIN comments c  ON c.post_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);
    res.json(rows.map(formatPost));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts
router.post('/', async (req, res) => {
  const { author, petName, petEmoji, content, sessionId } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO posts (author, pet_name, pet_emoji, content, session_id) VALUES (?, ?, ?, ?, ?)',
      [sanitize(author), sanitize(petName), petEmoji, sanitize(content), sessionId]
    );
    const [[row]] = await pool.query(
      'SELECT p.*, 0 AS comments, NULL AS tags FROM posts p WHERE p.id = ?',
      [result.insertId]
    );
    res.json(formatPost(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts/:id/like
router.post('/:id/like', async (req, res) => {
  const { id }        = req.params;
  const { sessionId } = req.body;
  try {
    const [existing] = await pool.query(
      'SELECT id FROM post_likes WHERE post_id = ? AND session_id = ?', [id, sessionId]
    );
    if (existing.length > 0) {
      await pool.query('DELETE FROM post_likes WHERE post_id = ? AND session_id = ?', [id, sessionId]);
      await pool.query('UPDATE posts SET likes = GREATEST(likes - 1, 0) WHERE id = ?', [id]);
    } else {
      await pool.query('INSERT INTO post_likes (post_id, session_id) VALUES (?, ?)', [id, sessionId]);
      await pool.query('UPDATE posts SET likes = likes + 1 WHERE id = ?', [id]);
    }
    const [[post]] = await pool.query('SELECT likes FROM posts WHERE id = ?', [id]);
    res.json({ liked: existing.length === 0, likes: post.likes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/posts/:id/comments
router.get('/:id/comments', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC', [req.params.id]
    );
    res.json(rows.map(r => ({ id: r.id, author: r.author, text: r.text, time: timeAgo(r.created_at) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/posts/:id/comments
router.post('/:id/comments', async (req, res) => {
  const { author, text } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO comments (post_id, author, text) VALUES (?, ?, ?)',
      [req.params.id, sanitize(author), sanitize(text)]
    );
    const [[row]] = await pool.query('SELECT * FROM comments WHERE id = ?', [result.insertId]);
    res.json({ id: row.id, author: row.author, text: row.text, time: 'just now' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, setPool };
