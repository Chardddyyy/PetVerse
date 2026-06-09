// routes/timeline.js — public user profile timeline

const express          = require('express');
const router           = express.Router();
const { timeAgo }      = require('../lib/helpers');

let pool;
function setPool(p) { pool = p; }

// GET /api/timeline/:name
router.get('/:name', async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  try {
    const [members] = await pool.query(
      'SELECT name, nickname, pet_name, pet_type FROM members WHERE name = ? LIMIT 1', [name]
    );
    const member = members[0] || { name, nickname: name, pet_name: 'their pet', pet_type: 'other' };

    const [posts] = await pool.query(
      `SELECT p.id, p.content, p.likes, p.pet_emoji, p.created_at,
              COUNT(DISTINCT c.id) AS comments
       FROM posts p
       LEFT JOIN comments c ON c.post_id = p.id
       WHERE p.author = ?
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT 20`,
      [name]
    );

    const [[{ totalLikes }]] = await pool.query(
      'SELECT COALESCE(SUM(likes), 0) AS totalLikes FROM posts WHERE author = ?', [name]
    );

    const [events] = await pool.query(
      'SELECT title, date, location, emoji FROM user_events WHERE poster_name = ? ORDER BY created_at DESC',
      [name]
    );

    const [pets] = await pool.query(
      'SELECT name, emoji, type, followers FROM pets WHERE owner = ?', [name]
    );

    res.json({
      name:       member.name,
      nickname:   member.nickname || member.name,
      petName:    member.pet_name,
      petType:    member.pet_type,
      totalPosts: posts.length,
      totalLikes: Number(totalLikes),
      posts:  posts.map(p => ({
        id:       p.id,
        content:  p.content,
        likes:    p.likes,
        comments: Number(p.comments),
        emoji:    p.pet_emoji,
        time:     timeAgo(p.created_at)
      })),
      events: events.map(e => ({ title: e.title, date: e.date, location: e.location, emoji: e.emoji || '🎉' })),
      pets:   pets.map(p => ({ name: p.name, emoji: p.emoji, type: p.type, followers: p.followers }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, setPool };
