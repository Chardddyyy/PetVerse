// routes/pets.js — community pets + user pet management

const express            = require('express');
const router             = express.Router();
const { sanitize, formatPet } = require('../lib/helpers');
const { broadcast }      = require('./stream');

const PET_EMOJI  = { dog: '🐕', cat: '🐈', rabbit: '🐇', bird: '🦜', other: '🐾' };
const PET_COLORS = { dog: '#FEF3C7', cat: '#F3E8FF', rabbit: '#FCE7F3', bird: '#D1FAE5', other: '#E0E7FF' };

let pool;
function setPool(p) { pool = p; }

// GET /api/pets
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM pets ORDER BY id');
    res.json(rows.map(formatPet));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pets/mine?userId=X  — pets owned by a specific member
router.get('/mine', async (req, res) => {
  const { userId } = req.query;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM pets WHERE member_id = ? ORDER BY id', [userId]
    );
    res.json(rows.map(formatPet));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pets  — add a new pet (user)
router.post('/', async (req, res) => {
  const { memberId, name, type, breed, bio } = req.body;
  if (!memberId || !name || !type)
    return res.status(400).json({ error: 'Pet name and type are required.' });

  try {
    const [[member]] = await pool.query('SELECT name FROM members WHERE id = ?', [memberId]);
    if (!member) return res.status(404).json({ error: 'Member not found.' });

    const emoji = PET_EMOJI[type] || '🐾';
    const color = PET_COLORS[type] || '#F3F4F6';

    const [result] = await pool.query(
      'INSERT INTO pets (member_id, name, type, breed, owner, emoji, bio, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [memberId, sanitize(name), type, sanitize(breed) || null, member.name, emoji, sanitize(bio) || null, color]
    );
    const [[pet]] = await pool.query('SELECT * FROM pets WHERE id = ?', [result.insertId]);
    broadcast('new_pet', { pet: formatPet(pet) });
    res.json(formatPet(pet));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/pets/:id  — remove a user's pet
router.delete('/:id', async (req, res) => {
  const { id }     = req.params;
  const { userId } = req.body;
  try {
    const [rows] = await pool.query(
      'SELECT * FROM pets WHERE id = ? AND member_id = ?', [id, userId]
    );
    if (rows.length === 0)
      return res.status(403).json({ error: 'Pet not found or does not belong to you.' });

    await pool.query('DELETE FROM pet_follows WHERE pet_id = ?', [id]);
    await pool.query('DELETE FROM pets WHERE id = ?', [id]);
    res.json({ message: 'Pet removed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pets/:id/follow
router.post('/:id/follow', async (req, res) => {
  const { id }        = req.params;
  const { sessionId } = req.body;
  try {
    const [existing] = await pool.query(
      'SELECT id FROM pet_follows WHERE pet_id = ? AND session_id = ?', [id, sessionId]
    );
    if (existing.length > 0) {
      await pool.query('DELETE FROM pet_follows WHERE pet_id = ? AND session_id = ?', [id, sessionId]);
      await pool.query('UPDATE pets SET followers = GREATEST(followers - 1, 0) WHERE id = ?', [id]);
    } else {
      await pool.query('INSERT INTO pet_follows (pet_id, session_id) VALUES (?, ?)', [id, sessionId]);
      await pool.query('UPDATE pets SET followers = followers + 1 WHERE id = ?', [id]);
    }
    const [[pet]] = await pool.query('SELECT followers FROM pets WHERE id = ?', [id]);
    res.json({ following: existing.length === 0, followers: pet.followers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, setPool };
