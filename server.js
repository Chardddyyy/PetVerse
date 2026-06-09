// =====================================================
// server.js — PetVerse backend
// =====================================================

require('dotenv').config();

const express    = require('express');
const mysql      = require('mysql2/promise');
const bcrypt     = require('bcrypt');
const nodemailer = require('nodemailer');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const cors       = require('cors');
const path       = require('path');
const adminPanel = require('./admin-panel');

const app         = express();
const SALT_ROUNDS = 10;

// ===== SECURITY MIDDLEWARE =====
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.get('/favicon.ico', (req, res) => res.status(204).end());

// Expose FB App ID to frontend
app.get('/api/config', (req, res) => {
  res.json({
    fbAppId:        process.env.FB_APP_ID        || '',
    googleClientId: process.env.GOOGLE_CLIENT_ID || ''
  });
});

// Rate limiter — max 15 auth requests every 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many attempts. Please wait 15 minutes and try again.' }
});
app.use('/api/auth', authLimiter);

// ===== DATABASE =====
const pool = mysql.createPool({
  host:               process.env.DB_HOST || '127.0.0.1',
  user:               process.env.DB_USER || 'root',
  password:           process.env.DB_PASS || '',
  database:           process.env.DB_NAME || 'petverse',
  waitForConnections: true,
  connectionLimit:    10,
  charset:            'utf8mb4'
});

// ===== PHPMYADMIN-STYLE ADMIN PANEL =====
// Access at http://localhost:4000/phpmyadmin/
adminPanel.setPool(pool);
app.use('/phpmyadmin', adminPanel.router);

// ===== EMAIL SETUP =====
const mailer = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendOTPEmail(email, code, type) {
  const isReset = type === 'reset';
  const subject = isReset ? 'Reset your PetVerse password' : 'Your PetVerse verification code';
  const action  = isReset ? 'reset your password' : 'verify your email';

  // Always print OTP to terminal so you can test without real email setup
  console.log(`\n📧 OTP for ${email} (${type}): ${code}\n`);

  // Try to send real email — skip if credentials are still placeholder values
  const user = process.env.EMAIL_USER || '';
  if (!user || user.includes('your_gmail')) return;

  try {
    await mailer.sendMail({
      from: `"PetVerse 🐾" <${user}>`,
      to:   email,
      subject,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9f9f9;border-radius:16px;">
          <h2 style="color:#7C3AED;margin-bottom:4px;">🐾 PetVerse</h2>
          <p style="color:#444;">Here is your code to <strong>${action}</strong>:</p>
          <div style="font-size:42px;font-weight:900;letter-spacing:10px;color:#7C3AED;text-align:center;padding:28px;background:white;border-radius:12px;margin:24px 0;">
            ${code}
          </div>
          <p style="color:#888;font-size:13px;">⏱ This code expires in 10 minutes.</p>
          <p style="color:#888;font-size:13px;">If you didn't request this, just ignore this email.</p>
        </div>
      `
    });
    console.log(`   ✅ Email sent to ${email}`);
  } catch (err) {
    console.log(`   ⚠  Email send failed: ${err.message}`);
    console.log('   Use the code above from the terminal instead.\n');
  }
}

// ===== HELPERS =====
// Basic string sanitizer — removes HTML tags to prevent XSS
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
}

// Convert DB timestamp to human-readable "time ago"
function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60)     return 'just now';
  if (diff < 3600)   { const m = Math.floor(diff / 60);  return `${m} ${m === 1 ? 'min' : 'mins'} ago`; }
  if (diff < 86400)  { const h = Math.floor(diff / 3600); return `${h} ${h === 1 ? 'hour' : 'hours'} ago`; }
  if (diff < 172800) return 'yesterday';
  return new Date(date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function formatPost(row) {
  return {
    id:       row.id,
    author:   row.author,
    petName:  row.pet_name,
    petEmoji: row.pet_emoji,
    content:  row.content,
    likes:    row.likes,
    comments: Number(row.comments) || 0,
    time:     timeAgo(row.created_at),
    tags:     row.tags ? row.tags.split(',') : []
  };
}

function formatPet(row) {
  return {
    id: row.id, name: row.name, type: row.type, breed: row.breed,
    owner: row.owner, age: row.age, emoji: row.emoji, likes: row.likes,
    followers: row.followers, bio: row.bio, color: row.color
  };
}

function formatEvent(row) {
  return {
    id: row.id, title: row.title, desc: row.description, date: row.date,
    location: row.location, emoji: row.emoji, color: row.color, attendees: row.attendees
  };
}

// ===== STATS =====
app.get('/api/stats', async (req, res) => {
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

// ===== SESSION STATE =====
app.get('/api/session/state', async (req, res) => {
  const { sessionId } = req.query;
  try {
    const [liked]    = await pool.query('SELECT post_id  AS id FROM post_likes       WHERE session_id = ?', [sessionId]);
    const [followed] = await pool.query('SELECT pet_id   AS id FROM pet_follows      WHERE session_id = ?', [sessionId]);
    const [joined]   = await pool.query('SELECT event_id AS id FROM event_attendees  WHERE session_id = ?', [sessionId]);
    res.json({
      likedPosts:   liked.map(r => r.id),
      followedPets: followed.map(r => r.id),
      joinedEvents: joined.map(r => r.id)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== PETS =====
app.get('/api/pets', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM pets ORDER BY id');
    res.json(rows.map(formatPet));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pets/:id/follow', async (req, res) => {
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

// ===== POSTS =====
app.get('/api/posts', async (req, res) => {
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

app.post('/api/posts', async (req, res) => {
  const { author, petName, petEmoji, content, sessionId } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO posts (author, pet_name, pet_emoji, content, session_id) VALUES (?, ?, ?, ?, ?)',
      [sanitize(author), sanitize(petName), petEmoji, sanitize(content), sessionId]
    );
    const [[row]] = await pool.query('SELECT p.*, 0 AS comments, NULL AS tags FROM posts p WHERE p.id = ?', [result.insertId]);
    res.json(formatPost(row));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts/:id/like', async (req, res) => {
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

app.get('/api/posts/:id/comments', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC', [req.params.id]
    );
    res.json(rows.map(r => ({ id: r.id, author: r.author, text: r.text, time: timeAgo(r.created_at) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts/:id/comments', async (req, res) => {
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

// ===== EVENTS =====
app.get('/api/events', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM events ORDER BY id');
    res.json(rows.map(formatEvent));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events/:id/join', async (req, res) => {
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

// ===== USER-POSTED EVENTS =====
app.get('/api/user-events', async (req, res) => {
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

app.post('/api/user-events', async (req, res) => {
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
      id: `ue${row.id}`, title: row.title, desc: row.description, date: row.date,
      location: row.location, emoji: row.emoji, color: 'linear-gradient(135deg, #10B981, #0EA5E9)',
      contact: row.contact, posterName: row.poster_name, petType: row.pet_type, isUserEvent: true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== AUTH — SEND OTP =====
app.post('/api/auth/send-otp', async (req, res) => {
  const { email, type } = req.body;

  if (!email || !type) return res.status(400).json({ error: 'Email and type are required.' });

  try {
    if (type === 'register') {
      const [existing] = await pool.query('SELECT id FROM members WHERE email = ?', [email]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'That email is already registered.' });
      }
    }

    if (type === 'reset') {
      const [existing] = await pool.query('SELECT id FROM members WHERE email = ? AND password_hash IS NOT NULL', [email]);
      if (existing.length === 0) {
        // Don't reveal if the email exists — security best practice
        return res.json({ message: 'If that email is registered, a reset code was sent.' });
      }
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Remove old unused OTPs for this email + type
    await pool.query('DELETE FROM otps WHERE email = ? AND type = ?', [email, type]);

    // Save the new OTP
    await pool.query(
      'INSERT INTO otps (email, code, type, expires_at) VALUES (?, ?, ?, ?)',
      [email, code, type, expiresAt]
    );

    // Send the email (or print to terminal if email not configured)
    await sendOTPEmail(email, code, type);

    // Return the code in the response if email is not configured (dev fallback)
    const emailConfigured = process.env.EMAIL_USER && !process.env.EMAIL_USER.includes('your_gmail');
    const response = { message: 'Code sent! Check your email.' };
    if (!emailConfigured) response.devCode = code;

    res.json(response);
  } catch (err) {
    console.error('OTP error:', err.message);
    res.status(500).json({ error: 'Could not send the code. Check server logs.' });
  }
});

// ===== AUTH — REGISTER =====
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, petName, petType, otpCode } = req.body;

  if (!name || !email || !password || !petName || !petType || !otpCode) {
    return res.status(400).json({ error: 'Please fill in all fields.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    // Verify OTP
    const [otpRows] = await pool.query(
      'SELECT * FROM otps WHERE email = ? AND code = ? AND type = "register" AND used = 0 AND expires_at > NOW()',
      [email, otpCode]
    );
    if (otpRows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    // Double-check email is not taken
    const [existing] = await pool.query('SELECT id FROM members WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'That email is already registered.' });
    }

    // Mark OTP as used
    await pool.query('UPDATE otps SET used = 1 WHERE id = ?', [otpRows[0].id]);

    // Hash password and create account
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await pool.query(
      'INSERT INTO members (name, email, password_hash, pet_name, pet_type) VALUES (?, ?, ?, ?, ?)',
      [sanitize(name), email, passwordHash, sanitize(petName), petType]
    );

    const [[member]] = await pool.query('SELECT * FROM members WHERE id = ?', [result.insertId]);
    res.json({
      user: { id: member.id, name: member.name, email: member.email, petName: member.pet_name, petType: member.pet_type }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== AUTH — LOGIN =====
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM members WHERE email = ?', [email]);

    // Same message for wrong email or wrong password — don't tell attacker which one
    if (rows.length === 0 || !rows[0].password_hash) {
      return res.status(401).json({ error: 'Wrong email or password.' });
    }

    const match = await bcrypt.compare(password, rows[0].password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Wrong email or password.' });
    }

    const member = rows[0];
    res.json({
      user: { id: member.id, name: member.name, email: member.email, petName: member.pet_name, petType: member.pet_type }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== AUTH — RESET PASSWORD =====
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, otpCode, newPassword } = req.body;

  if (!email || !otpCode || !newPassword) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    // Verify OTP
    const [otpRows] = await pool.query(
      'SELECT * FROM otps WHERE email = ? AND code = ? AND type = "reset" AND used = 0 AND expires_at > NOW()',
      [email, otpCode]
    );
    if (otpRows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset code.' });
    }

    // Update password
    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query('UPDATE members SET password_hash = ? WHERE email = ?', [hash, email]);
    await pool.query('UPDATE otps SET used = 1 WHERE id = ?', [otpRows[0].id]);

    res.json({ message: 'Password reset successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== AUTH — LOGIN WITH EMAIL CODE (passwordless) =====
app.post('/api/auth/login-with-code', async (req, res) => {
  const { email, otpCode } = req.body;
  if (!email || !otpCode) return res.status(400).json({ error: 'Email and code are required.' });
  try {
    const [otpRows] = await pool.query(
      'SELECT * FROM otps WHERE email = ? AND code = ? AND type = "login" AND used = 0 AND expires_at > NOW()',
      [email, otpCode]
    );
    if (otpRows.length === 0) return res.status(400).json({ error: 'Invalid or expired code.' });

    const [rows] = await pool.query('SELECT * FROM members WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(404).json({ error: 'No account found. Please register first.' });

    await pool.query('UPDATE otps SET used = 1 WHERE id = ?', [otpRows[0].id]);
    const m = rows[0];
    res.json({ user: { id: m.id, name: m.name, email: m.email, petName: m.pet_name, petType: m.pet_type } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== AUTH — FACEBOOK LOGIN (auto-creates account if new) =====
app.post('/api/auth/facebook', async (req, res) => {
  const { accessToken } = req.body;
  try {
    const fbRes  = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`);
    const fbData = await fbRes.json();
    if (!fbData.id) return res.status(401).json({ error: 'Invalid Facebook token.' });

    // Find by facebook_id first, then by email
    let [rows] = await pool.query('SELECT * FROM members WHERE facebook_id = ?', [fbData.id]);
    if (rows.length === 0 && fbData.email) {
      [rows] = await pool.query('SELECT * FROM members WHERE email = ?', [fbData.email]);
      if (rows.length > 0) {
        await pool.query('UPDATE members SET facebook_id = ? WHERE id = ?', [fbData.id, rows[0].id]);
      }
    }

    // New user — create automatically using FB data, no extra steps
    if (rows.length === 0) {
      const [result] = await pool.query(
        'INSERT INTO members (name, email, facebook_id, pet_name, pet_type) VALUES (?, ?, ?, ?, ?)',
        [fbData.name, fbData.email || '', fbData.id, 'My Pet', 'other']
      );
      [rows] = await pool.query('SELECT * FROM members WHERE id = ?', [result.insertId]);
    }

    const m = rows[0];
    res.json({ user: { id: m.id, name: m.name, email: m.email, petName: m.pet_name, petType: m.pet_type } });
  } catch (err) {
    res.status(500).json({ error: 'Facebook login failed. Try again.' });
  }
});

// ===== AUTH — GOOGLE LOGIN (auto-creates account if new) =====
app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body;
  try {
    // Verify token with Google
    const gRes  = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    const gData = await gRes.json();
    if (!gData.sub) return res.status(401).json({ error: 'Invalid Google token.' });

    // Find by google_id first, then by email
    let [rows] = await pool.query('SELECT * FROM members WHERE google_id = ?', [gData.sub]);
    if (rows.length === 0 && gData.email) {
      [rows] = await pool.query('SELECT * FROM members WHERE email = ?', [gData.email]);
      if (rows.length > 0) {
        await pool.query('UPDATE members SET google_id = ? WHERE id = ?', [gData.sub, rows[0].id]);
      }
    }

    // New user — create automatically using Google data
    if (rows.length === 0) {
      const [result] = await pool.query(
        'INSERT INTO members (name, email, google_id, pet_name, pet_type) VALUES (?, ?, ?, ?, ?)',
        [gData.name, gData.email, gData.sub, 'My Pet', 'other']
      );
      [rows] = await pool.query('SELECT * FROM members WHERE id = ?', [result.insertId]);
    }

    const m = rows[0];
    res.json({ user: { id: m.id, name: m.name, email: m.email, petName: m.pet_name, petType: m.pet_type } });
  } catch (err) {
    res.status(500).json({ error: 'Google login failed. Try again.' });
  }
});

// ===== PUBLIC TIMELINE (lookup by author name) =====
app.get('/api/timeline/:name', async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  try {
    // Get member info
    const [members] = await pool.query(
      'SELECT name, pet_name, pet_type FROM members WHERE name = ? LIMIT 1', [name]
    );
    const member = members[0] || { name, pet_name: 'their pet', pet_type: 'other' };

    // Get their posts
    const [posts] = await pool.query(
      'SELECT id, content, likes, pet_emoji, created_at FROM posts WHERE author = ? ORDER BY created_at DESC LIMIT 10',
      [name]
    );

    // Get events they posted
    const [events] = await pool.query(
      'SELECT title, date, location FROM user_events WHERE poster_name = ? ORDER BY created_at DESC',
      [name]
    );

    res.json({
      name:    member.name,
      petName: member.pet_name,
      petType: member.pet_type,
      posts:   posts.map(p => ({ id: p.id, content: p.content, likes: p.likes, time: timeAgo(p.created_at) })),
      events:  events.map(e => ({ title: e.title, date: e.date, location: e.location }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== AUTH — UPDATE PROFILE =====
app.put('/api/auth/profile', async (req, res) => {
  const { userId, name, petName, petType } = req.body;
  if (!userId || !name || !petName || !petType) return res.status(400).json({ error: 'All fields are required.' });
  try {
    await pool.query(
      'UPDATE members SET name = ?, pet_name = ?, pet_type = ? WHERE id = ?',
      [sanitize(name), sanitize(petName), petType, userId]
    );
    res.json({ user: { id: userId, name, petName, petType } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== START SERVER =====
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`PetVerse server running → http://localhost:${PORT}`);
  if (!process.env.EMAIL_USER) {
    console.log('⚠  Email not configured. OTP codes will appear here in the terminal.');
    console.log('   Add EMAIL_USER and EMAIL_PASS to your .env file to send real emails.\n');
  }
});
