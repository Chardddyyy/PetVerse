// routes/stream.js — Server-Sent Events for live updates

const express = require('express');
const router  = express.Router();
const clients = new Set();

function broadcast(event, data) {
  const payload = `data: ${JSON.stringify({ event, ...data })}\n\n`;
  for (const res of clients) {
    try { res.write(payload); }
    catch { clients.delete(res); }
  }
}

// GET /api/stream
router.get('/', (req, res) => {
  res.set({
    'Content-Type':      'text/event-stream',
    'Cache-Control':     'no-cache',
    'Connection':        'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();

  // Heartbeat every 25s to keep connection alive
  const heartbeat = setInterval(() => {
    try { res.write(': ping\n\n'); }
    catch { clearInterval(heartbeat); clients.delete(res); }
  }, 25000);

  clients.add(res);
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});

module.exports = { router, broadcast };
