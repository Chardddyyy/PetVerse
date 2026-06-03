// =====================================================
// main.js — ES Module: Main app logic
// Demonstrates: import, variables, functions,
// DOM manipulation, arrays & array methods,
// objects, object iteration, destructuring,
// rest & spread, Promise
// =====================================================

// ===== ES MODULE IMPORTS =====
import { pets, posts, events, stats } from './data.js';
import { loadData, showToast, scrollToSection } from './utils.js';


// ===== VARIABLES =====
let currentFilter = 'All';
let likedPosts    = [];              // tracks which posts we liked

// Spread: add 'All' option in front of unique pet types
const petTypes = ['All', ...new Set(pets.map(pet => pet.type))];


// ===== HERO BUBBLES =====
function renderHeroBubbles() {
  const container = document.getElementById('petBubbles');

  const bubbles = [
    { emoji: '🐕', top: '5%',  left: '10%', delay: '0s',    size: '110px', bg: '#FEF3C7' },
    { emoji: '🐈', top: '62%', left: '0%',  delay: '0.6s',  size: '85px',  bg: '#F3E8FF' },
    { emoji: '🐇', top: '15%', left: '68%', delay: '1.2s',  size: '88px',  bg: '#FCE7F3' },
    { emoji: '🦜', top: '70%', left: '62%', delay: '0.3s',  size: '80px',  bg: '#D1FAE5' },
    { emoji: '🐶', top: '38%', left: '32%', delay: '0.9s',  size: '130px', bg: '#FEE2E2' },
    { emoji: '🐾', top: '82%', left: '25%', delay: '1.5s',  size: '68px',  bg: '#E0E7FF' },
  ];

  // Destructuring in forEach
  bubbles.forEach(({ emoji, top, left, delay, size, bg }) => {
    const el = document.createElement('div');
    el.className = 'pet-bubble';
    el.textContent = emoji;
    el.style.cssText = `
      top: ${top}; left: ${left};
      width: ${size}; height: ${size};
      font-size: calc(${size} * 0.45);
      background: ${bg};
      animation-delay: ${delay};
    `;
    container.appendChild(el);
  });
}


// ===== STATS SECTION =====
function renderStats() {
  const container = document.getElementById('statsContainer');

  // Object with labels for each stats key
  const labels = {
    members: '🌟 Community Members',
    pets:    '🐾 Registered Pets',
    posts:   '💬 Total Posts',
    events:  '🎉 Events Hosted'
  };

  // Object iteration using Object.entries()
  Object.entries(labels).forEach(([key, label]) => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `
      <span class="stat-number">${stats[key]}</span>
      <span class="stat-label">${label}</span>
    `;
    container.appendChild(card);
  });
}


// ===== FILTER BUTTONS =====
function renderFilterButtons() {
  const container = document.getElementById('filterButtons');

  petTypes.forEach(type => {
    const btn = document.createElement('button');
    btn.className = `filter-btn ${type === currentFilter ? 'active' : ''}`;
    btn.textContent = type;

    btn.addEventListener('click', () => {
      currentFilter = type;

      // DOM manipulation: update active class on all buttons
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      renderPets(type);
    });

    container.appendChild(btn);
  });
}


// ===== PETS GRID =====
function renderPets(filter = 'All') {
  const grid = document.getElementById('petsGrid');
  grid.innerHTML = '';

  // Array filter() method
  const filtered = filter === 'All'
    ? pets
    : pets.filter(pet => pet.type === filter);

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="loading">No pets found for "${filter}" 🐾</div>`;
    return;
  }

  // forEach + object destructuring
  filtered.forEach(pet => {
    const { name, breed, owner, emoji, likes, followers, bio, color } = pet;

    const card = document.createElement('div');
    card.className = 'pet-card';
    card.innerHTML = `
      <div class="pet-avatar" style="background: ${color};">${emoji}</div>
      <div class="pet-name">${name}</div>
      <div class="pet-breed">${breed}</div>
      <div class="pet-owner">👤 ${owner}</div>
      <div class="pet-bio">${bio}</div>
      <div class="pet-stats-row">
        <div>
          <span class="pet-stat-num">${likes}</span>
          <span class="pet-stat-label">Likes</span>
        </div>
        <div>
          <span class="pet-stat-num">${followers}</span>
          <span class="pet-stat-label">Followers</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      showToast(`You are now following ${name}! 🐾`);
    });

    grid.appendChild(card);
  });
}


// ===== COMMUNITY FEED =====
function renderFeed() {
  const container = document.getElementById('feedContainer');

  posts.forEach(post => {
    // Object destructuring
    const { id, author, petEmoji, petName, content, likes, comments, time, tags } = post;

    // Spread: make a local copy with extra property
    const postState = { ...post, liked: false };

    const card = document.createElement('div');
    card.className = 'post-card';

    // Array map() to build tag HTML
    const tagsHTML = tags.map(tag => `<span class="post-tag">#${tag}</span>`).join('');

    card.innerHTML = `
      <div class="post-header">
        <div class="post-avatar">${petEmoji}</div>
        <div>
          <div class="post-author-name">${author}</div>
          <div class="post-meta">with ${petName} · ${time}</div>
        </div>
      </div>
      <div class="post-content">${content}</div>
      <div class="post-tags">${tagsHTML}</div>
      <div class="post-actions">
        <button class="post-btn like-btn" data-id="${id}">❤️ ${likes}</button>
        <button class="post-btn comment-btn">💬 ${comments}</button>
        <button class="post-btn share-btn">↗️ Share</button>
      </div>
    `;

    // Like button with state tracking
    const likeBtn = card.querySelector('.like-btn');
    likeBtn.addEventListener('click', () => {
      const alreadyLiked = likedPosts.includes(id);

      if (alreadyLiked) {
        // Array filter() to remove id from liked list
        likedPosts = likedPosts.filter(pid => pid !== id);
        likeBtn.textContent = `❤️ ${likes}`;
        likeBtn.classList.remove('liked');
      } else {
        // Spread to add id to liked list
        likedPosts = [...likedPosts, id];
        likeBtn.textContent = `❤️ ${likes + 1}`;
        likeBtn.classList.add('liked');
        showToast('You liked this post! ❤️');
      }
    });

    container.appendChild(card);
  });
}


// ===== EVENTS SECTION =====
function renderEvents() {
  const grid = document.getElementById('eventsGrid');

  events.forEach(event => {
    // Destructuring with rest — capture remaining properties in `rest`
    const { title, desc, date, location, emoji, color, ...rest } = event;

    const card = document.createElement('div');
    card.className = 'event-card';
    card.innerHTML = `
      <div class="event-banner" style="background: ${color};">${emoji}</div>
      <div class="event-body">
        <div class="event-date">📅 ${date}</div>
        <div class="event-title">${title}</div>
        <div class="event-desc">${desc}</div>
        <div class="event-footer">
          <div class="event-location">📍 ${location}</div>
          <button class="event-join-btn" data-id="${rest.id}">Join Event</button>
        </div>
      </div>
    `;

    const joinBtn = card.querySelector('.event-join-btn');
    joinBtn.addEventListener('click', () => {
      showToast(`You joined "${title}"! 🎉`);
      joinBtn.textContent = '✓ Joined!';
      joinBtn.style.background = '#10B981';
    });

    grid.appendChild(card);
  });
}


// ===== MODAL =====
function showJoinModal() {
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}


// ===== JOIN FORM =====
function setupJoinForm() {
  const form = document.getElementById('joinForm');

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Spread NodeList into array, then map to get values
    const inputs = [...form.querySelectorAll('.form-input')];
    const values = inputs.map(input => input.value);

    // Array destructuring from values
    const [name, email, petName, petType] = values;

    closeModal();
    showToast(`Welcome to PetVerse, ${name}! 🐾✨`);
    form.reset();
  });
}


// ===== ACTIVE NAV ON SCROLL =====
function setupNavScroll() {
  const sections  = ['home', 'pets', 'feed', 'events'];
  const navLinks  = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    sections.forEach(id => {
      const section = document.getElementById(id);
      if (!section) return;

      const { top, bottom } = section.getBoundingClientRect();

      if (top <= 120 && bottom >= 120) {
        navLinks.forEach(link => {
          const isActive = link.getAttribute('href') === `#${id}`;
          link.classList.toggle('active', isActive);
        });
      }
    });
  });
}


// ===== SMOOTH NAV CLICK =====
function setupNavLinks() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const id = link.getAttribute('href').replace('#', '');
      scrollToSection(id);
    });
  });
}


// ===== EXPOSE GLOBALS (used by onclick in HTML) =====
window.showJoinModal  = showJoinModal;
window.closeModal     = closeModal;
window.scrollToSection = scrollToSection;


// ===== INIT — load everything with Promise =====
function init() {
  // Load pets with Promise, then render
  loadData(pets)
    .then(data => {
      renderPets();
      console.log(`Loaded ${data.length} pets`);
    })
    .catch(err => console.error('Pets error:', err));

  // Load multiple data sources with Promise.all
  Promise.all([loadData(posts), loadData(events)])
    .then(([postsData, eventsData]) => {
      renderFeed();
      renderEvents();
      console.log(`Loaded ${postsData.length} posts, ${eventsData.length} events`);
    })
    .catch(err => console.error('Feed/Events error:', err));

  // Render UI parts that do not need async loading
  renderHeroBubbles();
  renderStats();
  renderFilterButtons();
  setupJoinForm();
  setupNavLinks();
  setupNavScroll();
}

init();
