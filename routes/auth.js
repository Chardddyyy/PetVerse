// routes/auth.js — register, login, OTP, social auth, profile, timeline

const express               = require('express');
const router                = express.Router();
const bcrypt                = require('bcrypt');
const { sanitize, timeAgo } = require('../lib/helpers');
const { sendOTPEmail }      = require('../lib/mailer');
const { broadcast }         = require('./stream');

const SALT_ROUNDS = 10;

let pool;
function setPool(p) { pool = p; }

function formatUser(m) {
  return {
    id:       m.id,
    name:     m.name,
    nickname: m.nickname || m.name,
    email:    m.email,
    petName:  m.pet_name,
    petType:  m.pet_type
  };
}

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  const { email, type } = req.body;
  if (!email || !type) return res.status(400).json({ error: 'Email and type are required.' });

  try {
    if (type === 'register') {
      const [existing] = await pool.query('SELECT id FROM members WHERE email = ?', [email]);
      if (existing.length > 0)
        return res.status(400).json({ error: 'That email is already registered.' });
    }
    if (type === 'reset') {
      const [existing] = await pool.query(
        'SELECT id FROM members WHERE email = ? AND password_hash IS NOT NULL', [email]
      );
      if (existing.length === 0)
        return res.json({ message: 'If that email is registered, a reset code was sent.' });
    }

    const code      = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query('DELETE FROM otps WHERE email = ? AND type = ?', [email, type]);
    await pool.query(
      'INSERT INTO otps (email, code, type, expires_at) VALUES (?, ?, ?, ?)',
      [email, code, type, expiresAt]
    );

    await sendOTPEmail(email, code, type);
    res.json({ message: 'Code sent! Check your email.' });
  } catch (err) {
    console.error('OTP error:', err.message);
    res.status(500).json({ error: err.message || 'Could not send the code. Check server logs.' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, nickname, email, password, petName, petType, otpCode } = req.body;

  if (!name || !email || !password || !petName || !petType || !otpCode)
    return res.status(400).json({ error: 'Please fill in all fields.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  try {
    const [otpRows] = await pool.query(
      'SELECT * FROM otps WHERE email = ? AND code = ? AND type = "register" AND used = 0 AND expires_at > NOW()',
      [email, otpCode]
    );
    if (otpRows.length === 0)
      return res.status(400).json({ error: 'Invalid or expired verification code.' });

    const [existing] = await pool.query('SELECT id FROM members WHERE email = ?', [email]);
    if (existing.length > 0)
      return res.status(400).json({ error: 'That email is already registered.' });

    await pool.query('UPDATE otps SET used = 1 WHERE id = ?', [otpRows[0].id]);

    const passwordHash  = await bcrypt.hash(password, SALT_ROUNDS);
    const displayNick   = sanitize(nickname) || sanitize(name);
    const [result] = await pool.query(
      'INSERT INTO members (name, nickname, email, password_hash, pet_name, pet_type) VALUES (?, ?, ?, ?, ?, ?)',
      [sanitize(name), displayNick, email, passwordHash, sanitize(petName), petType]
    );

    const [[member]] = await pool.query('SELECT * FROM members WHERE id = ?', [result.insertId]);
    broadcast('new_member', { name: member.name, nickname: member.nickname, petName: member.pet_name, petType: member.pet_type });
    res.json({ user: formatUser(member) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required.' });

  try {
    const [rows] = await pool.query('SELECT * FROM members WHERE email = ?', [email]);
    if (rows.length === 0 || !rows[0].password_hash)
      return res.status(401).json({ error: 'Wrong email or password.' });

    const match = await bcrypt.compare(password, rows[0].password_hash);
    if (!match)
      return res.status(401).json({ error: 'Wrong email or password.' });

    const m = rows[0];
    res.json({ user: formatUser(m) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { email, otpCode, newPassword } = req.body;
  if (!email || !otpCode || !newPassword)
    return res.status(400).json({ error: 'All fields are required.' });
  if (newPassword.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });

  try {
    const [otpRows] = await pool.query(
      'SELECT * FROM otps WHERE email = ? AND code = ? AND type = "reset" AND used = 0 AND expires_at > NOW()',
      [email, otpCode]
    );
    if (otpRows.length === 0)
      return res.status(400).json({ error: 'Invalid or expired reset code.' });

    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query('UPDATE members SET password_hash = ? WHERE email = ?', [hash, email]);
    await pool.query('UPDATE otps SET used = 1 WHERE id = ?', [otpRows[0].id]);
    res.json({ message: 'Password reset successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login-with-code
router.post('/login-with-code', async (req, res) => {
  const { email, otpCode } = req.body;
  if (!email || !otpCode)
    return res.status(400).json({ error: 'Email and code are required.' });

  try {
    const [otpRows] = await pool.query(
      'SELECT * FROM otps WHERE email = ? AND code = ? AND type = "login" AND used = 0 AND expires_at > NOW()',
      [email, otpCode]
    );
    if (otpRows.length === 0)
      return res.status(400).json({ error: 'Invalid or expired code.' });

    const [rows] = await pool.query('SELECT * FROM members WHERE email = ?', [email]);
    if (rows.length === 0)
      return res.status(404).json({ error: 'No account found. Please register first.' });

    await pool.query('UPDATE otps SET used = 1 WHERE id = ?', [otpRows[0].id]);
    const m = rows[0];
    res.json({ user: formatUser(m) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/facebook
router.post('/facebook', async (req, res) => {
  const { accessToken } = req.body;
  try {
    const fbRes  = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`);
    const fbData = await fbRes.json();
    if (!fbData.id) return res.status(401).json({ error: 'Invalid Facebook token.' });

    let [rows] = await pool.query('SELECT * FROM members WHERE facebook_id = ?', [fbData.id]);
    if (rows.length === 0 && fbData.email) {
      [rows] = await pool.query('SELECT * FROM members WHERE email = ?', [fbData.email]);
      if (rows.length > 0)
        await pool.query('UPDATE members SET facebook_id = ? WHERE id = ?', [fbData.id, rows[0].id]);
    }
    if (rows.length === 0) {
      const [result] = await pool.query(
        'INSERT INTO members (name, email, facebook_id, pet_name, pet_type) VALUES (?, ?, ?, ?, ?)',
        [fbData.name, fbData.email || '', fbData.id, 'My Pet', 'other']
      );
      [rows] = await pool.query('SELECT * FROM members WHERE id = ?', [result.insertId]);
      broadcast('new_member', { name: fbData.name, petName: 'My Pet', petType: 'other' });
    }
    const m = rows[0];
    res.json({ user: formatUser(m) });
  } catch {
    res.status(500).json({ error: 'Facebook login failed. Try again.' });
  }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  const { token } = req.body;
  try {
    const gRes  = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    const gData = await gRes.json();
    if (!gData.sub) return res.status(401).json({ error: 'Invalid Google token.' });

    let [rows] = await pool.query('SELECT * FROM members WHERE google_id = ?', [gData.sub]);
    if (rows.length === 0 && gData.email) {
      [rows] = await pool.query('SELECT * FROM members WHERE email = ?', [gData.email]);
      if (rows.length > 0)
        await pool.query('UPDATE members SET google_id = ? WHERE id = ?', [gData.sub, rows[0].id]);
    }
    if (rows.length === 0) {
      const [result] = await pool.query(
        'INSERT INTO members (name, email, google_id, pet_name, pet_type) VALUES (?, ?, ?, ?, ?)',
        [gData.name, gData.email, gData.sub, 'My Pet', 'other']
      );
      [rows] = await pool.query('SELECT * FROM members WHERE id = ?', [result.insertId]);
      broadcast('new_member', { name: gData.name, petName: 'My Pet', petType: 'other' });
    }
    const m = rows[0];
    res.json({ user: formatUser(m) });
  } catch {
    res.status(500).json({ error: 'Google login failed. Try again.' });
  }
});

// PUT /api/auth/profile
router.put('/profile', async (req, res) => {
  const { userId, name, nickname, petName, petType } = req.body;
  if (!userId || !name || !petName || !petType)
    return res.status(400).json({ error: 'All fields are required.' });

  try {
    const displayNick = sanitize(nickname) || sanitize(name);
    await pool.query(
      'UPDATE members SET name = ?, nickname = ?, pet_name = ?, pet_type = ? WHERE id = ?',
      [sanitize(name), displayNick, sanitize(petName), petType, userId]
    );
    const [[member]] = await pool.query('SELECT * FROM members WHERE id = ?', [userId]);
    res.json({ user: formatUser(member) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/account
router.delete('/account', async (req, res) => {
  const { userId, confirm } = req.body;
  if (!userId) return res.status(400).json({ error: 'User ID is required.' });
  if (confirm !== 'DELETE') return res.status(400).json({ error: 'Type DELETE to confirm.' });

  try {
    const [[member]] = await pool.query('SELECT * FROM members WHERE id = ?', [userId]);
    if (!member) return res.status(404).json({ error: 'Account not found.' });

    // Delete posts and related data
    const [posts] = await pool.query('SELECT id FROM posts WHERE author = ?', [member.name]);
    if (posts.length > 0) {
      const ids = posts.map(p => p.id);
      await pool.query('DELETE FROM post_likes WHERE post_id IN (?)', [ids]);
      await pool.query('DELETE FROM comments   WHERE post_id IN (?)', [ids]);
      await pool.query('DELETE FROM post_tags  WHERE post_id IN (?)', [ids]);
      await pool.query('DELETE FROM posts      WHERE id IN (?)',      [ids]);
    }

    // Delete user's pets and their follows
    const [pets] = await pool.query('SELECT id FROM pets WHERE member_id = ?', [userId]);
    if (pets.length > 0) {
      const ids = pets.map(p => p.id);
      await pool.query('DELETE FROM pet_follows WHERE pet_id IN (?)', [ids]);
      await pool.query('DELETE FROM pets         WHERE id IN (?)',    [ids]);
    }

    // Delete user events and OTPs
    await pool.query('DELETE FROM user_events WHERE poster_id = ?', [userId]);
    await pool.query('DELETE FROM otps         WHERE email = ?',    [member.email]);

    // Delete member
    await pool.query('DELETE FROM members WHERE id = ?', [userId]);

    res.json({ message: 'Account deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { router, setPool };
