// routes/events.js — events and user-posted events

const express           = require('express');
const router            = express.Router();
const { sanitize, formatEvent } = require('../lib/helpers');

let pool;
function setPool(p) { pool = p; }

// GET /api/events
router.get('/events', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM events ORDER BY id');
    res.json(rows.map(formatEvent));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events/:id/join
router.post('/events/:id/join', async (req, res) => {
  const { id }        = req.params;
  const { sessionId } = req.body;
  try {
    const [existing] = await pool.query(
      'SELECT id FROM event_attendees WHERE event_id = ? AND session_id = ?', [id, sessionId]
    );
    if (existing.length > 0) {
      await pool.query('DELETE FROM event_attendees WHERE event_id = ? AND session_id = ?', [id, sessionId]);
      await pool.query('UPDATE events SET attendees = GREATEST(attendees - 1, 0) WHERE id = ?', [id]);
      res.json({ joined: false });
    } else {
      await pool.query('INSERT INTO event_attendees (event_id, session_id) VALUES (?, ?)', [id, sessionId]);
      await pool.query('UPDATE events SET attendees = attendees + 1 WHERE id = ?', [id]);
      res.json({ joined: true });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/user-events
router.get('/user-events', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM user_events ORDER BY created_at DESC');
    res.json(rows.map(r => ({
      id:          `ue${r.id}`,
      title:       r.title,
      desc:        r.description,
      date:        r.date,
      location:    r.location,
      emoji:       r.emoji,
      color:       'linear-gradient(135deg, #10B981, #0EA5E9)',
      contact:     r.contact,
      posterName:  r.poster_name,
      petType:     r.pet_type,
      isUserEvent: true
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/user-events
router.post('/user-events', async (req, res) => {
  const { posterId, posterName, contact, title, description, date, location, emoji, petType } = req.body;
  if (!posterId || !title || !date || !location || !contact) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO user_events (poster_id, poster_name, contact, title, description, date, location, emoji, pet_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [posterId, sanitize(posterName), sanitize(contact), sanitize(title), sanitize(description), sanitize(date), sanitize(location), emoji || '🐾', petType]
    );
    const [[row]] = await pool.query('SELECT * FROM user_events WHERE id = ?', [result.insertId]);
    res.json({
      id:          `ue${row.id}`,
      title:       row.title,
      desc:        row.description,
      date:        row.date,
      location:    row.location,
      emoji:       row.emoji,
      color:       'linear-gradient(135deg, #10B981, #0EA5E9)',
      contact:     row.contact,
      posterName:  row.poster_name,
      petType:     row.pet_type,
      isUserEvent: true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, setPool };
