// routes/pets.js — GET /api/pets, POST /api/pets/:id/follow

const express           = require('express');
const router            = express.Router();
const { formatPet }     = require('../lib/helpers');

let pool;
function setPool(p) { pool = p; }

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM pets ORDER BY id');
    res.json(rows.map(formatPet));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
