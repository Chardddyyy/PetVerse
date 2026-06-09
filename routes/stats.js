// routes/stats.js — GET /api/stats, GET /api/session/state

const express = require('express');
const router  = express.Router();

let pool;
function setPool(p) { pool = p; }

router.get('/stats', async (req, res) => {
  try {
    const [[{ members }]] = await pool.query('SELECT COUNT(*) AS members FROM members');
    const [[{ pets }]]    = await pool.query('SELECT COUNT(*) AS pets FROM pets');
    const [[{ posts }]]   = await pool.query('SELECT COUNT(*) AS posts FROM posts');
    const [[{ events }]]  = await pool.query('SELECT COUNT(*) AS events FROM events');
    res.json({ members, pets, posts, events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/session/state', async (req, res) => {
  const { sessionId } = req.query;
  try {
    const [liked]    = await pool.query('SELECT post_id  AS id FROM post_likes      WHERE session_id = ?', [sessionId]);
    const [followed] = await pool.query('SELECT pet_id   AS id FROM pet_follows     WHERE session_id = ?', [sessionId]);
    const [joined]   = await pool.query('SELECT event_id AS id FROM event_attendees WHERE session_id = ?', [sessionId]);
    res.json({
      likedPosts:   liked.map(r => r.id),
      followedPets: followed.map(r => r.id),
      joinedEvents: joined.map(r => r.id)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, setPool };
