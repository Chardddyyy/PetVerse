// =====================================================
// server.js — PetVerse backend entry point
// =====================================================

require('dotenv').config();

const express        = require('express');
const mysql          = require('mysql2/promise');
const helmet         = require('helmet');
const rateLimit      = require('express-rate-limit');
const cors           = require('cors');
const path           = require('path');

const adminPanel     = require('./admin-panel');
const streamRoutes   = require('./routes/stream');
const statsRoutes    = require('./routes/stats');
const petsRoutes     = require('./routes/pets');
const postsRoutes    = require('./routes/posts');
const eventsRoutes   = require('./routes/events');
const authRoutes     = require('./routes/auth');
const timelineRoutes = require('./routes/timeline');

const app = express();

// ===== MIDDLEWARE =====
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ===== RATE LIMITER — auth routes only =====
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      15,
  message:  { error: 'Too many attempts. Please wait 15 minutes and try again.' }
});

// ===== DATABASE =====
const pool = mysql.createPool({
  host:               process.env.DB_HOST     || '127.0.0.1',
  port:               Number(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASS     || '',
  database:           process.env.DB_NAME     || 'PetVerse',
  waitForConnections: true,
  connectionLimit:    10,
  charset:            'utf8mb4'
});

// ===== ROUTES =====

// Frontend config (FB / Google App IDs)
app.get('/api/config', (req, res) => {
  res.json({
    fbAppId:        process.env.FB_APP_ID        || '',
    googleClientId: process.env.GOOGLE_CLIENT_ID || ''
  });
});

// Database admin panel
adminPanel.setPool(pool);
app.use('/phpmyadmin', adminPanel.router);

// Live updates (SSE)
app.use('/api/stream', streamRoutes.router);

// Stats and session
statsRoutes.setPool(pool);
app.use('/api', statsRoutes.router);

// Pets
petsRoutes.setPool(pool);
app.use('/api/pets', petsRoutes.router);

// Posts and comments
postsRoutes.setPool(pool);
app.use('/api/posts', postsRoutes.router);

// Events and user-events
eventsRoutes.setPool(pool);
app.use('/api', eventsRoutes.router);

// Auth — rate-limited
authRoutes.setPool(pool);
app.use('/api/auth', authLimiter);
app.use('/api/auth', authRoutes.router);

// Public user timeline
timelineRoutes.setPool(pool);
app.use('/api/timeline', timelineRoutes.router);

// ===== START SERVER =====
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n🐾 PetVerse running → http://localhost:${PORT}`);
  console.log(`📊 DB Admin panel  → http://localhost:${PORT}/phpmyadmin/\n`);
});
