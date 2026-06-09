// lib/helpers.js — shared utility functions

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/[<>]/g, '');
}

function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60)     return 'just now';
  if (diff < 3600)   { const m = Math.floor(diff / 60);   return `${m} ${m === 1 ? 'min' : 'mins'} ago`; }
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
    id:        row.id,
    name:      row.name,
    type:      row.type,
    breed:     row.breed,
    owner:     row.owner,
    age:       row.age,
    emoji:     row.emoji,
    likes:     row.likes,
    followers: row.followers,
    bio:       row.bio,
    color:     row.color
  };
}

function formatEvent(row) {
  return {
    id:        row.id,
    title:     row.title,
    desc:      row.description,
    date:      row.date,
    location:  row.location,
    emoji:     row.emoji,
    color:     row.color,
    attendees: row.attendees
  };
}

module.exports = { sanitize, timeAgo, formatPost, formatPet, formatEvent };
