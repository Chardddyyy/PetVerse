// =====================================================
// main.js — ES Module: Main app logic
// Demonstrates: import, variables, functions,
// DOM manipulation, arrays & array methods,
// objects, object iteration, destructuring,
// rest & spread, Promise, async/await
// =====================================================

import { showToast, scrollToSection } from './utils.js';
import {
  sessionId,
  getStats, getMyState,
  getPets, followPet,
  getPosts, createPost, likePost, getComments, postComment,
  getEvents, joinEvent, getUserEvents, postUserEvent,
  sendOTP, register, login, resetPassword, loginWithCode,
  updateProfile, getUserTimeline
} from './api.js';


// ===== MODULE STATE =====
let allPets       = [];
let allPosts      = [];
let allEvents     = [];
let likedPostIds  = [];
let followedIds   = [];
let joinedIds     = [];
let currentFilter = 'All';
let currentUser   = loadCurrentUser();

const PET_EMOJI = { dog: '🐕', cat: '🐈', rabbit: '🐇', bird: '🦜', other: '🐾' };


// ===== CURRENT USER (localStorage) =====
function loadCurrentUser() {
  try { return JSON.parse(localStorage.getItem('pv_user')); }
  catch { return null; }
}
function saveCurrentUser(user) {
  localStorage.setItem('pv_user', JSON.stringify(user));
}
function isLoggedIn() {
  return currentUser !== null;
}

// Shows login modal and a toast if user tries to do something without logging in
function requireLogin(message) {
  if (isLoggedIn()) return true;
  showToast(message || 'Log in to continue');
  showLoginModal();
  return false;
}


// ===== HERO BUBBLES =====
function renderHeroBubbles() {
  const container = document.getElementById('petBubbles');
  const bubbles = [
    { emoji: '🐕', top: '5%',  left: '10%', delay: '0s',   size: '110px', bg: '#FEF3C7' },
    { emoji: '🐈', top: '62%', left: '0%',  delay: '0.6s', size: '85px',  bg: '#F3E8FF' },
    { emoji: '🐇', top: '15%', left: '68%', delay: '1.2s', size: '88px',  bg: '#FCE7F3' },
    { emoji: '🦜', top: '70%', left: '62%', delay: '0.3s', size: '80px',  bg: '#D1FAE5' },
    { emoji: '🐶', top: '38%', left: '32%', delay: '0.9s', size: '130px', bg: '#FEE2E2' },
    { emoji: '🐾', top: '82%', left: '25%', delay: '1.5s', size: '68px',  bg: '#E0E7FF' },
  ];
  bubbles.forEach(({ emoji, top, left, delay, size, bg }) => {
    const el = document.createElement('div');
    el.className = 'pet-bubble';
    el.textContent = emoji;
    el.style.cssText = `top:${top};left:${left};width:${size};height:${size};font-size:calc(${size}*0.45);background:${bg};animation-delay:${delay};`;
    container.appendChild(el);
  });
}


// ===== STATS =====
function renderStats(data) {
  const container = document.getElementById('statsContainer');
  container.innerHTML = '';
  const labels = {
    members: '🌟 Community Members',
    pets:    '🐾 Registered Pets',
    posts:   '💬 Total Posts',
    events:  '🎉 Events Hosted'
  };
  Object.entries(labels).forEach(([key, label]) => {
    const card = document.createElement('div');
    card.className = 'stat-card';
    card.innerHTML = `
      <span class="stat-number">${Number(data[key]).toLocaleString()}+</span>
      <span class="stat-label">${label}</span>
    `;
    container.appendChild(card);
  });
}


// ===== FILTER BUTTONS =====
function renderFilterButtons(petTypes) {
  const container = document.getElementById('filterButtons');
  container.innerHTML = '';
  petTypes.forEach(type => {
    const btn = document.createElement('button');
    btn.className = `filter-btn ${type === currentFilter ? 'active' : ''}`;
    btn.textContent = type;
    btn.addEventListener('click', () => {
      currentFilter = type;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderPets(type);
    });
    container.appendChild(btn);
  });
}


// ===== PETS GRID =====
function renderPets(filter = 'All') {
  currentFilter = filter;
  const grid = document.getElementById('petsGrid');
  grid.innerHTML = '';

  const filtered = filter === 'All' ? allPets : allPets.filter(p => p.type === filter);
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="loading">No pets found for "${filter}" 🐾</div>`;
    return;
  }

  filtered.forEach(pet => {
    const { id, name, breed, owner, emoji, likes, followers, bio, color } = pet;
    const isFollowing = followedIds.includes(id);

    const card = document.createElement('div');
    card.className = 'pet-card';
    card.innerHTML = `
      <div class="pet-avatar" style="background:${color};">${emoji}</div>
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
          <span class="pet-stat-num follow-count">${followers}</span>
          <span class="pet-stat-label">Followers</span>
        </div>
      </div>
      <button class="follow-btn ${isFollowing ? 'following' : ''}">
        ${isFollowing ? '✓ Following' : '+ Follow'}
      </button>
    `;

    const followBtn = card.querySelector('.follow-btn');
    const countEl   = card.querySelector('.follow-count');

    followBtn.addEventListener('mouseenter', () => {
      if (followBtn.classList.contains('following')) followBtn.textContent = 'Unfollow';
    });
    followBtn.addEventListener('mouseleave', () => {
      if (followBtn.classList.contains('following')) followBtn.textContent = '✓ Following';
    });

    followBtn.addEventListener('click', async () => {
      if (!requireLogin('Log in to follow pets')) return;
      followBtn.disabled = true;
      try {
        const { following, followers: n } = await followPet(id);
        followBtn.textContent = following ? '✓ Following' : '+ Follow';
        followBtn.classList.toggle('following', following);
        countEl.textContent = n;
        followedIds = following ? [...followedIds, id] : followedIds.filter(x => x !== id);
        showToast(following ? `Following ${name}! 🐾` : `Unfollowed ${name}`);
      } catch {
        showToast('Something went wrong.');
      } finally {
        followBtn.disabled = false;
      }
    });

    grid.appendChild(card);
  });
}


// ===== CREATE POST CARD =====
function createPostCard(post, isLiked) {
  const { id, author, petEmoji, petName, content, likes, time, tags, comments } = post;

  const card = document.createElement('div');
  card.className = 'post-card';

  const tagsHTML = (tags || []).map(t => `<span class="post-tag">#${t}</span>`).join('');

  card.innerHTML = `
    <div class="post-header">
      <div class="post-avatar">${petEmoji || '🐾'}</div>
      <div>
        <div class="post-author-name">${author}</div>
        <div class="post-meta">with ${petName} · ${time}</div>
      </div>
    </div>
    <div class="post-content">${content}</div>
    ${tagsHTML ? `<div class="post-tags">${tagsHTML}</div>` : ''}
    <div class="post-actions">
      <button class="post-btn like-btn ${isLiked ? 'liked' : ''}">
        ❤️ <span class="like-count">${likes}</span>
      </button>
      <button class="post-btn comment-btn">
        💬 <span class="comment-count">${comments}</span>
      </button>
    </div>
    <div class="comment-section" style="display:none;">
      <div class="comment-list"></div>
      <div class="comment-input-row">
        <input class="comment-input" type="text" placeholder="Write a comment..." />
        <button class="comment-submit">Post</button>
      </div>
    </div>
  `;

  // Clicking author name opens their timeline
  card.querySelector('.post-author-name').addEventListener('click', () => {
    openTimeline(author);
  });

  // Like button — requires login
  const likeBtn   = card.querySelector('.like-btn');
  const likeCount = card.querySelector('.like-count');
  likeBtn.addEventListener('click', async () => {
    if (!requireLogin('Log in to like posts')) return;
    likeBtn.disabled = true;
    try {
      const { liked, likes: n } = await likePost(id);
      likeCount.textContent = n;
      likeBtn.classList.toggle('liked', liked);
      likedPostIds = liked ? [...likedPostIds, id] : likedPostIds.filter(x => x !== id);
      if (liked) showToast('Liked! ❤️');
    } catch {
      showToast('Something went wrong.');
    } finally {
      likeBtn.disabled = false;
    }
  });

  // Comment section — requires login
  const commentBtn     = card.querySelector('.comment-btn');
  const commentCount   = card.querySelector('.comment-count');
  const commentSection = card.querySelector('.comment-section');
  const commentList    = card.querySelector('.comment-list');
  const commentInput   = card.querySelector('.comment-input');
  const commentSubmit  = card.querySelector('.comment-submit');

  const renderCommentList = (data) => {
    commentList.innerHTML = data.length === 0
      ? '<p class="no-comments">No comments yet. Be the first!</p>'
      : data.map(c => `
          <div class="comment-item">
            <span class="comment-author">${c.author}</span>
            <span class="comment-text">${c.text}</span>
            <span class="comment-time">${c.time}</span>
          </div>
        `).join('');
  };

  let commentsLoaded = false;
  commentBtn.addEventListener('click', async () => {
    const isOpen = commentSection.style.display !== 'none';
    commentSection.style.display = isOpen ? 'none' : 'block';
    if (!isOpen && !commentsLoaded) {
      commentList.innerHTML = '<p class="no-comments">Loading...</p>';
      try {
        const data = await getComments(id);
        commentsLoaded = true;
        renderCommentList(data);
        commentCount.textContent = data.length;
      } catch {
        commentList.innerHTML = '<p class="no-comments">Could not load comments.</p>';
      }
    }
  });

  const submitComment = async () => {
    if (!requireLogin('Log in to comment')) return;
    const text = commentInput.value.trim();
    if (!text) return;
    const author = currentUser ? currentUser.name : 'Guest';
    commentSubmit.disabled = true;
    try {
      await postComment(id, { author, text });
      commentInput.value = '';
      const fresh = await getComments(id);
      renderCommentList(fresh);
      commentCount.textContent = fresh.length;
      showToast('Comment posted!');
    } catch {
      showToast('Could not post comment.');
    } finally {
      commentSubmit.disabled = false;
    }
  };

  commentSubmit.addEventListener('click', submitComment);
  commentInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitComment(); });

  return card;
}


// ===== COMMUNITY FEED =====
function renderFeed() {
  const container = document.getElementById('feedContainer');
  container.innerHTML = '';

  if (isLoggedIn()) renderPostForm(container);

  allPosts.forEach(post => {
    container.appendChild(createPostCard(post, likedPostIds.includes(post.id)));
  });
}


// ===== WRITE-A-POST FORM =====
function renderPostForm(container) {
  const emoji = PET_EMOJI[currentUser.petType] || '🐾';

  const form = document.createElement('div');
  form.className = 'post-form';
  form.innerHTML = `
    <div class="post-form-header">
      <div class="post-avatar">${emoji}</div>
      <textarea class="post-textarea" placeholder="What's your pet up to today? (Ctrl+Enter to post)"></textarea>
    </div>
    <div class="post-form-footer">
      <label class="anon-toggle">
        <input type="checkbox" id="anonToggle" />
        Post anonymously
      </label>
      <button class="post-form-btn">Post</button>
    </div>
  `;

  const textarea  = form.querySelector('.post-textarea');
  const postBtn   = form.querySelector('.post-form-btn');
  const anonCheck = form.querySelector('#anonToggle');

  const submitPost = async () => {
    const content = textarea.value.trim();
    if (!content) { showToast('Write something first!'); return; }
    const isAnon = anonCheck.checked;

    postBtn.disabled = true;
    try {
      const newPost = await createPost({
        author:   isAnon ? 'Anonymous' : currentUser.name,
        petName:  isAnon ? 'their pet' : currentUser.petName,
        petEmoji: isAnon ? '🥷' : emoji,
        content
      });
      textarea.value = '';
      anonCheck.checked = false;
      allPosts = [newPost, ...allPosts];

      const card      = createPostCard(newPost, false);
      const firstCard = container.querySelector('.post-card');
      firstCard ? container.insertBefore(card, firstCard) : container.appendChild(card);
      showToast(isAnon ? 'Posted anonymously! 🥷' : 'Post shared! 🐾');
    } catch {
      showToast('Could not post. Is the server running?');
    } finally {
      postBtn.disabled = false;
    }
  };

  postBtn.addEventListener('click', submitPost);
  textarea.addEventListener('keydown', e => { if (e.key === 'Enter' && e.ctrlKey) submitPost(); });
  container.appendChild(form);
}


// ===== EVENTS =====
function renderPostEventButton() {
  const area = document.getElementById('postEventBtnArea');
  if (!area) return;
  area.innerHTML = isLoggedIn()
    ? '<button class="post-event-btn" onclick="showPostEventModal()">+ Post an Event</button>'
    : '';
}

function renderEvents() {
  const grid = document.getElementById('eventsGrid');
  grid.innerHTML = '';
  renderPostEventButton();

  if (allEvents.length === 0) {
    grid.innerHTML = '<div class="loading">No events yet. Be the first to post one!</div>';
    return;
  }

  allEvents.forEach(event => {
    const { id, title, desc, date, location, emoji, color, isUserEvent, contact, posterName } = event;
    const isJoined = joinedIds.includes(id);

    const card = document.createElement('div');
    card.className = 'event-card';
    card.innerHTML = `
      <div class="event-banner" style="background:${color};">${emoji}</div>
      <div class="event-body">
        ${isUserEvent ? `<div class="event-poster-badge">👤 Posted by ${posterName}</div>` : ''}
        <div class="event-date">📅 ${date}</div>
        <div class="event-title">${title}</div>
        <div class="event-desc">${desc || ''}</div>
        <div class="event-footer">
          <div class="event-location">📍 ${location}</div>
          ${isUserEvent
            ? `<button class="event-contact-btn" data-contact="${contact}">📞 Contact Organizer</button>`
            : `<button class="event-join-btn ${isJoined ? 'joined' : ''}" style="${isJoined ? 'background:#10B981;' : ''}">
                ${isJoined ? '✓ Joined!' : 'Join Event'}
               </button>`
          }
        </div>
      </div>
    `;

    if (isUserEvent) {
      card.querySelector('.event-contact-btn').addEventListener('click', () => {
        showToast(`Contact organizer: ${contact}`);
      });
    } else {
      const joinBtn = card.querySelector('.event-join-btn');
      joinBtn.addEventListener('click', async () => {
        if (!requireLogin('Log in to join events')) return;
        joinBtn.disabled = true;
        try {
          const { joined } = await joinEvent(id);
          if (joined) {
            joinBtn.textContent = '✓ Joined!';
            joinBtn.style.background = '#10B981';
            joinBtn.classList.add('joined');
            joinedIds = [...joinedIds, id];
            showToast(`You joined "${title}"! 🎉`);
          } else {
            joinBtn.textContent = 'Join Event';
            joinBtn.style.background = '';
            joinBtn.classList.remove('joined');
            joinedIds = joinedIds.filter(x => x !== id);
            showToast(`Left "${title}"`);
          }
        } catch {
          showToast('Something went wrong.');
        } finally {
          joinBtn.disabled = false;
        }
      });
    }

    grid.appendChild(card);
  });
}


// ===== USER TIMELINE MODAL =====
async function openTimeline(authorName) {
  if (authorName === 'Anonymous') return; // anonymous posts have no profile
  try {
    const data = await getUserTimeline(authorName);
    showTimelineModal(data);
  } catch {
    showToast('Could not load this profile.');
  }
}

function showTimelineModal(data) {
  document.getElementById('timelineOverlay')?.remove();

  const emoji = PET_EMOJI[data.petType] || '🐾';
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'timelineOverlay';

  const postsHTML = data.posts.length === 0
    ? '<p class="timeline-empty">No posts yet.</p>'
    : data.posts.map(p => `
        <div class="timeline-post-item">
          ${p.content}
          <div class="timeline-post-meta">❤️ ${p.likes} · ${p.time}</div>
        </div>
      `).join('');

  const eventsHTML = data.events.length === 0
    ? '<p class="timeline-empty">No events posted yet.</p>'
    : data.events.map(e => `
        <div class="timeline-event-item">
          <div class="timeline-event-title">🎉 ${e.title}</div>
          <div class="timeline-event-date">📅 ${e.date} · 📍 ${e.location}</div>
        </div>
      `).join('');

  overlay.innerHTML = `
    <div class="modal modal-wide">
      <button class="modal-close" onclick="document.getElementById('timelineOverlay').remove()">✕</button>
      <div class="timeline-header">
        <div class="timeline-avatar">${emoji}</div>
        <div>
          <div class="timeline-name">${data.name}</div>
          <div class="timeline-sub">with ${data.petName}</div>
        </div>
      </div>
      <div class="timeline-section-title">📝 Posts</div>
      ${postsHTML}
      <div class="timeline-section-title">🎉 Events Posted</div>
      ${eventsHTML}
    </div>
  `;

  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}


// ===== LOGIN MODAL =====
function showLoginModal() {
  document.getElementById('loginOverlay').classList.add('open');
}

function closeLoginModal() {
  document.getElementById('loginOverlay').classList.remove('open');
  document.getElementById('loginError').textContent = '';
  document.getElementById('loginForm').reset();
}

function setupLoginForm() {
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email         = document.getElementById('login-email').value.trim();
    const password      = document.getElementById('login-password').value;
    const errorEl       = document.getElementById('loginError');
    errorEl.textContent = '';

    const btn = e.target.querySelector('[type="submit"]');
    btn.disabled    = true;
    btn.textContent = 'Logging in...';

    try {
      const { user } = await login({ email, password });
      onLoginSuccess(user);
      closeLoginModal();
      showToast(`Welcome back, ${user.name}! 🐾`);
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Log In';
    }
  });
}


// ===== REGISTER MODAL (2 steps) =====
function showRegisterModal() {
  document.getElementById('registerOverlay').classList.add('open');
}

function closeRegisterModal() {
  document.getElementById('registerOverlay').classList.remove('open');
  document.getElementById('registerError').textContent = '';
  document.getElementById('otpError').textContent = '';
  document.getElementById('registerStep1').style.display = 'block';
  document.getElementById('registerStep2').style.display = 'none';
  document.getElementById('registerDesc').textContent    = 'Create your free account';
  document.getElementById('registerForm').reset();
}

function setupRegisterForm() {
  const sendOtpBtn = document.getElementById('sendRegOtpBtn');
  const resendBtn  = document.getElementById('resendOtpBtn');
  const form       = document.getElementById('registerForm');
  let step1Data    = {};

  sendOtpBtn.addEventListener('click', async () => {
    const name        = document.getElementById('reg-name').value.trim();
    const email       = document.getElementById('reg-email').value.trim();
    const password    = document.getElementById('reg-password').value;
    const confirmPass = document.getElementById('reg-confirm').value;
    const petName     = document.getElementById('reg-petname').value.trim();
    const petType     = document.getElementById('reg-pettype').value;
    const errorEl     = document.getElementById('registerError');
    errorEl.textContent = '';

    if (!name || !email || !password || !confirmPass || !petName || !petType) {
      errorEl.textContent = 'Please fill in all fields.'; return;
    }
    if (password.length < 6) {
      errorEl.textContent = 'Password must be at least 6 characters.'; return;
    }
    if (password !== confirmPass) {
      errorEl.textContent = 'Passwords do not match.'; return;
    }

    sendOtpBtn.disabled   = true;
    sendOtpBtn.textContent = 'Sending...';

    try {
      const data = await sendOTP({ email, type: 'register' });
      step1Data  = { name, email, password, petName, petType };

      document.getElementById('registerStep1').style.display = 'none';
      document.getElementById('registerStep2').style.display = 'block';
      document.getElementById('registerDesc').textContent    = 'Enter the code sent to your email';

      // Show code in browser if email not configured
      const devBox = document.getElementById('regDevCode');
      if (data.devCode) {
        devBox.style.display = 'block';
        devBox.innerHTML = `📧 Email not set up yet. Your code is:<strong>${data.devCode}</strong>`;
      }
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      sendOtpBtn.disabled   = false;
      sendOtpBtn.textContent = 'Send Verification Code';
    }
  });

  resendBtn.addEventListener('click', async () => {
    if (!step1Data.email) return;
    resendBtn.disabled = true;
    try {
      const data = await sendOTP({ email: step1Data.email, type: 'register' });
      if (data.devCode) {
        const devBox = document.getElementById('regDevCode');
        devBox.style.display = 'block';
        devBox.innerHTML = `📧 New code:<strong>${data.devCode}</strong>`;
      }
      showToast('Code resent!');
    } catch {
      showToast('Could not resend. Try again.');
    } finally {
      resendBtn.disabled = false;
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const otpCode  = document.getElementById('reg-otp').value.trim();
    const errorEl  = document.getElementById('otpError');
    errorEl.textContent = '';

    if (!otpCode) { errorEl.textContent = 'Enter the verification code.'; return; }

    const btn = form.querySelector('[type="submit"]');
    btn.disabled   = true;
    btn.textContent = 'Creating account...';

    try {
      const { user } = await register({ ...step1Data, otpCode });
      onLoginSuccess(user);
      closeRegisterModal();
      showToast(`Welcome to PetVerse, ${user.name}! 🐾✨`);
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      btn.disabled   = false;
      btn.textContent = 'Verify & Create Account';
    }
  });
}


// ===== FORGOT PASSWORD MODAL =====
function showForgotModal() {
  document.getElementById('forgotOverlay').classList.add('open');
}

function closeForgotModal() {
  document.getElementById('forgotOverlay').classList.remove('open');
  document.getElementById('forgotStep1').style.display = 'block';
  document.getElementById('forgotStep2').style.display = 'none';
  document.getElementById('forgotError').textContent   = '';
  document.getElementById('forgotError2').textContent  = '';
  document.getElementById('forgot-email').value        = '';
}

function setupForgotForm() {
  let resetEmail = '';

  document.getElementById('sendResetBtn').addEventListener('click', async () => {
    const email   = document.getElementById('forgot-email').value.trim();
    const errorEl = document.getElementById('forgotError');
    errorEl.textContent = '';

    if (!email) { errorEl.textContent = 'Please enter your email.'; return; }

    const btn      = document.getElementById('sendResetBtn');
    btn.disabled   = true;
    btn.textContent = 'Sending...';

    try {
      const data = await sendOTP({ email, type: 'reset' });
      resetEmail = email;

      document.getElementById('forgotStep1').style.display = 'none';
      document.getElementById('forgotStep2').style.display = 'block';

      if (data.devCode) {
        const devBox = document.getElementById('forgotDevCode');
        devBox.style.display = 'block';
        devBox.innerHTML = `📧 Email not set up. Your reset code:<strong>${data.devCode}</strong>`;
      } else {
        showToast('Reset code sent to your email!');
      }
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      btn.disabled   = false;
      btn.textContent = 'Send Reset Code';
    }
  });

  document.getElementById('resetPassBtn').addEventListener('click', async () => {
    const otpCode  = document.getElementById('forgot-otp').value.trim();
    const newPass  = document.getElementById('forgot-newpass').value;
    const confirm  = document.getElementById('forgot-confirm').value;
    const errorEl  = document.getElementById('forgotError2');
    errorEl.textContent = '';

    if (!otpCode)           { errorEl.textContent = 'Enter the reset code.'; return; }
    if (newPass.length < 6) { errorEl.textContent = 'Password must be at least 6 characters.'; return; }
    if (newPass !== confirm) { errorEl.textContent = 'Passwords do not match.'; return; }

    const btn      = document.getElementById('resetPassBtn');
    btn.disabled   = true;
    btn.textContent = 'Resetting...';

    try {
      await resetPassword({ email: resetEmail, otpCode, newPassword: newPass });
      closeForgotModal();
      showLoginModal();
      showToast('Password reset! You can now log in. 🔑');
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      btn.disabled   = false;
      btn.textContent = 'Reset Password';
    }
  });
}




// ===== POST EVENT MODAL =====
function showPostEventModal() {
  document.getElementById('postEventOverlay').classList.add('open');
}

function closePostEventModal() {
  document.getElementById('postEventOverlay').classList.remove('open');
  document.getElementById('postEventError').textContent = '';
  document.getElementById('postEventForm').reset();
}

function setupPostEventForm() {
  document.getElementById('postEventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title    = document.getElementById('ev-title').value.trim();
    const desc     = document.getElementById('ev-desc').value.trim();
    const date     = document.getElementById('ev-date').value.trim();
    const location = document.getElementById('ev-location').value.trim();
    const contact  = document.getElementById('ev-contact').value.trim();
    const petType  = document.getElementById('ev-pettype').value;
    const errorEl  = document.getElementById('postEventError');
    errorEl.textContent = '';

    if (!title || !date || !location || !contact) {
      errorEl.textContent = 'Please fill in all required fields.'; return;
    }

    const btn = document.getElementById('postEventForm').querySelector('[type="submit"]');
    btn.disabled   = true;
    btn.textContent = 'Posting...';

    try {
      const newEvent = await postUserEvent({
        posterId: currentUser.id, posterName: currentUser.name,
        contact, title, description: desc, date, location, emoji: '🐾', petType
      });
      allEvents = [newEvent, ...allEvents];
      closePostEventModal();
      showToast('Event posted! 🎉');
      renderEvents();
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      btn.disabled   = false;
      btn.textContent = 'Post Event';
    }
  });
}


// ===== PROFILE MODAL =====
function showProfileModal() {
  if (!currentUser) return;
  const emoji = PET_EMOJI[currentUser.petType] || '🐾';

  document.getElementById('profileHeader').innerHTML = `
    <div class="profile-avatar-big">${emoji}</div>
    <div class="profile-name-big">${currentUser.name}</div>
    <div class="profile-email-small">${currentUser.email}</div>
  `;
  document.getElementById('prof-name').value    = currentUser.name;
  document.getElementById('prof-petname').value = currentUser.petName;
  document.getElementById('prof-pettype').value = currentUser.petType;
  document.getElementById('profileError').textContent = '';
  document.getElementById('profileOverlay').classList.add('open');
}

function closeProfileModal() {
  document.getElementById('profileOverlay').classList.remove('open');
}

function setupProfileForm() {
  document.getElementById('saveProfileBtn').addEventListener('click', async () => {
    const name    = document.getElementById('prof-name').value.trim();
    const petName = document.getElementById('prof-petname').value.trim();
    const petType = document.getElementById('prof-pettype').value;
    const errorEl = document.getElementById('profileError');
    errorEl.textContent = '';

    if (!name || !petName || !petType) { errorEl.textContent = 'Please fill in all fields.'; return; }

    const btn = document.getElementById('saveProfileBtn');
    btn.disabled   = true;
    btn.textContent = 'Saving...';

    try {
      const { user } = await updateProfile({ userId: currentUser.id, name, petName, petType });
      currentUser = { ...currentUser, ...user };
      saveCurrentUser(currentUser);
      closeProfileModal();
      updateNavForUser();
      renderFeed();
      showToast('Profile updated! 🐾');
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      btn.disabled   = false;
      btn.textContent = 'Save Changes';
    }
  });
}


// ===== PRIVACY MODAL =====
function showPrivacyModal() {
  document.getElementById('privacyOverlay').classList.add('open');
}

function closePrivacyModal() {
  document.getElementById('privacyOverlay').classList.remove('open');
}


// ===== MODAL SWITCHES =====
function switchToLogin()      { closeRegisterModal(); showLoginModal(); }
function switchToRegister()   { closeLoginModal();    showRegisterModal(); }
function switchToForgot()     { closeLoginModal();    showForgotModal(); }
function switchForgotToLogin(){ closeForgotModal();   showLoginModal(); }


// ===== LOG OUT =====
function logout() {
  currentUser = null;
  localStorage.removeItem('pv_user');
  updateNavForUser();
  renderFeed();
  renderPostEventButton();
  showToast('Logged out. See you next time! 👋');
}


// ===== AFTER LOGIN SUCCESS =====
function onLoginSuccess(user) {
  currentUser = user;
  saveCurrentUser(user);
  updateNavForUser();
  renderFeed();
  renderPostEventButton();
}


// ===== NAVBAR =====
function updateNavForUser() {
  const navAuth = document.getElementById('navAuth');
  if (!navAuth) return;

  if (currentUser) {
    const emoji = PET_EMOJI[currentUser.petType] || '🐾';
    navAuth.innerHTML = `
      <button class="nav-user" onclick="showProfileModal()">${emoji} ${currentUser.name}</button>
      <button class="btn-logout" onclick="logout()">Log Out</button>
    `;
  } else {
    navAuth.innerHTML = `
      <button class="btn-login" onclick="showLoginModal()">Log In</button>
      <button class="btn-join"  onclick="showRegisterModal()">Join Free</button>
    `;
  }
}


// ===== NAV SCROLL =====
function setupNavScroll() {
  const sections = ['home', 'pets', 'feed', 'events', 'donate'];
  const navLinks = document.querySelectorAll('.nav-link');
  window.addEventListener('scroll', () => {
    sections.forEach(id => {
      const section = document.getElementById(id);
      if (!section) return;
      const { top, bottom } = section.getBoundingClientRect();
      if (top <= 120 && bottom >= 120) {
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  });
}

function setupNavLinks() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      scrollToSection(link.getAttribute('href').replace('#', ''));
    });
  });
}



// ===== EXPOSE GLOBALS =====
window.showLoginModal      = showLoginModal;
window.closeLoginModal     = closeLoginModal;
window.showRegisterModal   = showRegisterModal;
window.closeRegisterModal  = closeRegisterModal;
window.showForgotModal     = showForgotModal;
window.closeForgotModal    = closeForgotModal;
window.showPostEventModal  = showPostEventModal;
window.closePostEventModal = closePostEventModal;
window.showProfileModal    = showProfileModal;
window.closeProfileModal   = closeProfileModal;
window.showPrivacyModal    = showPrivacyModal;
window.closePrivacyModal   = closePrivacyModal;
window.switchToLogin       = switchToLogin;
window.switchToRegister    = switchToRegister;
window.switchToForgot      = switchToForgot;
window.switchForgotToLogin = switchForgotToLogin;
window.logout              = logout;
window.scrollToSection     = scrollToSection;


// ===== INIT =====
async function init() {
  renderHeroBubbles();
  setupLoginForm();
  setupRegisterForm();
  setupForgotForm();
  setupPostEventForm();
  setupProfileForm();
  setupNavLinks();
  setupNavScroll();
  updateNavForUser();

  document.getElementById('petsGrid').innerHTML      = '<div class="loading">Loading pets... 🐾</div>';
  document.getElementById('feedContainer').innerHTML = '<div class="loading">Loading feed... 🐾</div>';
  document.getElementById('eventsGrid').innerHTML    = '<div class="loading">Loading events... 🐾</div>';

  try {
    const [petsData, postsData, eventsData, userEventsData, sessionState, statsData] = await Promise.all([
      getPets(), getPosts(), getEvents(), getUserEvents(), getMyState(), getStats()
    ]);

    allPets      = petsData;
    allPosts     = postsData;
    allEvents    = [...userEventsData, ...eventsData];
    likedPostIds = sessionState.likedPosts;
    followedIds  = sessionState.followedPets;
    joinedIds    = sessionState.joinedEvents;

    const petTypes = ['All', ...new Set(allPets.map(p => p.type))];

    renderStats(statsData);
    renderFilterButtons(petTypes);
    renderPets();
    renderFeed();
    renderEvents();

    console.log('PetVerse loaded!');
  } catch {
    const msg = '<div class="loading">⚠️ Server not running — open terminal and run: node server.js</div>';
    document.getElementById('petsGrid').innerHTML      = msg;
    document.getElementById('feedContainer').innerHTML = msg;
    document.getElementById('eventsGrid').innerHTML    = msg;
    showToast('Start the server first: node server.js');
  }
}

init();
