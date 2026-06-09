// =====================================================
// main.js — ES Module: Main app logic
// Demonstrates: import, variables, functions,
// DOM manipulation, arrays & array methods,
// objects, object iteration, destructuring,
// rest & spread, Promise, async/await
// =====================================================

import { showToast, scrollToSection } from './utils.js';
import {
  getStats, getMyState,
  getPets, getMyPets, addPet, removePet, followPet,
  getPosts, createPost, likePost, getComments, postComment,
  getEvents, joinEvent, getUserEvents, postUserEvent,
  sendOTP, register, login, resetPassword,
  updateProfile, deleteAccount, getUserTimeline
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

const POSTS_PER_PAGE = 5;
let currentPage      = 1;

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
  card.dataset.postId = id;

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

  if (allPosts.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'no-comments';
    empty.style.textAlign = 'center';
    empty.style.padding = '40px 0';
    empty.textContent = 'No posts yet. Be the first to share! 🐾';
    container.appendChild(empty);
    return;
  }

  // Show only the current page's posts
  const start     = (currentPage - 1) * POSTS_PER_PAGE;
  const pagePosts = allPosts.slice(start, start + POSTS_PER_PAGE);

  pagePosts.forEach(post => {
    container.appendChild(createPostCard(post, likedPostIds.includes(post.id)));
  });

  renderPagination(container);
}

// ===== PAGINATION =====
function renderPagination(container) {
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
  if (totalPages <= 1) return;

  const nav = document.createElement('div');
  nav.className = 'pagination';

  // Prev button
  const prevBtn = document.createElement('button');
  prevBtn.className = 'page-btn';
  prevBtn.textContent = '← Prev';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => {
    currentPage--;
    renderFeed();
    scrollToSection('feed');
  });

  // Page number buttons
  const nums = document.createElement('div');
  nums.className = 'page-numbers';
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = `page-num ${i === currentPage ? 'active' : ''}`;
    btn.textContent = i;
    btn.addEventListener('click', () => {
      currentPage = i;
      renderFeed();
      scrollToSection('feed');
    });
    nums.appendChild(btn);
  }

  // Next button
  const nextBtn = document.createElement('button');
  nextBtn.className = 'page-btn';
  nextBtn.textContent = 'Next →';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    currentPage++;
    renderFeed();
    scrollToSection('feed');
  });

  nav.appendChild(prevBtn);
  nav.appendChild(nums);
  nav.appendChild(nextBtn);
  container.appendChild(nav);
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
      allPosts    = [newPost, ...allPosts];
      currentPage = 1;  // go back to page 1 to see the new post
      renderFeed();
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

  const statsBar = `
    <div class="profile-stats-bar">
      <div class="profile-stat"><span class="profile-stat-num">${data.totalPosts}</span><span class="profile-stat-label">Posts</span></div>
      <div class="profile-stat"><span class="profile-stat-num">${data.totalLikes.toLocaleString()}</span><span class="profile-stat-label">Total Likes</span></div>
      <div class="profile-stat"><span class="profile-stat-num">${data.events.length}</span><span class="profile-stat-label">Events</span></div>
      <div class="profile-stat"><span class="profile-stat-num">${data.pets.length}</span><span class="profile-stat-label">Pets</span></div>
    </div>
  `;

  const petsHTML = data.pets.length === 0 ? '' : `
    <div class="timeline-section-title">🐾 Pets</div>
    <div class="profile-pets-row">
      ${data.pets.map(p => `
        <div class="profile-pet-chip">
          <span>${p.emoji}</span>
          <div>
            <div class="ppc-name">${p.name}</div>
            <div class="ppc-followers">${p.followers} followers</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  const postsHTML = data.posts.length === 0
    ? '<p class="timeline-empty">No posts yet.</p>'
    : data.posts.map(p => `
        <div class="timeline-post-item">
          <div class="timeline-post-content">${p.content}</div>
          <div class="timeline-post-meta">
            ❤️ ${p.likes} likes · 💬 ${p.comments} comments · ${p.time}
          </div>
        </div>
      `).join('');

  const eventsHTML = data.events.length === 0
    ? '<p class="timeline-empty">No events posted yet.</p>'
    : data.events.map(e => `
        <div class="timeline-event-item">
          <div class="timeline-event-title">${e.emoji || '🎉'} ${e.title}</div>
          <div class="timeline-event-date">📅 ${e.date} · 📍 ${e.location}</div>
        </div>
      `).join('');

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.id = 'timelineOverlay';
  overlay.innerHTML = `
    <div class="modal modal-wide profile-modal-body">
      <button class="modal-close" onclick="document.getElementById('timelineOverlay').remove()">✕</button>
      <div class="timeline-header">
        <div class="timeline-avatar">${emoji}</div>
        <div>
          <div class="timeline-name">${data.name}</div>
          <div class="timeline-sub">with ${data.petName}</div>
        </div>
      </div>
      ${statsBar}
      ${petsHTML}
      <div class="timeline-section-title">📝 Posts</div>
      ${postsHTML}
      <div class="timeline-section-title">🎉 Events Hosted</div>
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
  document.getElementById('registerDesc').textContent = 'Create your free account';
  document.getElementById('registerForm').reset();
  document.getElementById('stepDot1').classList.add('active');
  document.getElementById('stepDot2').classList.remove('active');
}

function setupRegisterForm() {
  const sendOtpBtn = document.getElementById('sendRegOtpBtn');
  const resendBtn  = document.getElementById('resendOtpBtn');
  const form       = document.getElementById('registerForm');
  let step1Data    = {};

  sendOtpBtn.addEventListener('click', async () => {
    const name        = document.getElementById('reg-name').value.trim();
    const nickname    = document.getElementById('reg-nickname').value.trim();
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
      await sendOTP({ email, type: 'register' });
      step1Data  = { name, nickname, email, password, petName, petType };

      document.getElementById('registerStep1').style.display = 'none';
      document.getElementById('registerStep2').style.display = 'block';
      document.getElementById('registerDesc').textContent    = 'Enter the code sent to your email';
      document.getElementById('stepDot1').classList.remove('active');
      document.getElementById('stepDot2').classList.add('active');
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
      await sendOTP({ email: step1Data.email, type: 'register' });
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
      await sendOTP({ email, type: 'reset' });
      resetEmail = email;

      document.getElementById('forgotStep1').style.display = 'none';
      document.getElementById('forgotStep2').style.display = 'block';
      showToast('Reset code sent to your email!');
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
    <div class="profile-name-big">${currentUser.nickname || currentUser.name}</div>
    <div class="profile-email-small">${currentUser.name} · ${currentUser.email}</div>
  `;
  document.getElementById('prof-name').value     = currentUser.name;
  document.getElementById('prof-nickname').value = currentUser.nickname || currentUser.name;
  document.getElementById('prof-petname').value  = currentUser.petName;
  document.getElementById('prof-pettype').value  = currentUser.petType;
  document.getElementById('profileError').textContent = '';
  document.getElementById('delete-confirm-input').value = '';
  document.getElementById('deleteError').textContent = '';

  // Tab switching
  document.querySelectorAll('.prof-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.prof-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.prof-tab-content').forEach(c => c.style.display = 'none');
      btn.classList.add('active');
      document.getElementById(`tab-${btn.dataset.tab}`).style.display = 'block';
      if (btn.dataset.tab === 'pets') loadMyPets();
    });
  });

  // Show first tab
  document.querySelectorAll('.prof-tab-content').forEach(c => c.style.display = 'none');
  document.getElementById('tab-edit').style.display = 'block';
  document.querySelectorAll('.prof-tab').forEach(b => b.classList.remove('active'));
  document.querySelector('.prof-tab[data-tab="edit"]').classList.add('active');

  document.getElementById('profileOverlay').classList.add('open');
}

function closeProfileModal() {
  document.getElementById('profileOverlay').classList.remove('open');
}

async function loadMyPets() {
  const list = document.getElementById('myPetsList');
  list.innerHTML = '<p style="color:var(--muted);font-size:13px;">Loading...</p>';
  try {
    const pets = await getMyPets(currentUser.id);
    if (pets.length === 0) {
      list.innerHTML = '<p class="no-pets-msg">You have no pets added yet. Add one below!</p>';
      return;
    }
    list.innerHTML = '';
    pets.forEach(pet => {
      const item = document.createElement('div');
      item.className = 'my-pet-item';
      item.innerHTML = `
        <div class="my-pet-info">
          <span class="my-pet-emoji">${pet.emoji}</span>
          <div>
            <div class="my-pet-name">${pet.name}</div>
            <div class="my-pet-type">${pet.type} · ${pet.followers} followers</div>
          </div>
        </div>
        <button class="remove-pet-btn" data-id="${pet.id}">Remove</button>
      `;
      item.querySelector('.remove-pet-btn').addEventListener('click', async () => {
        if (!confirm(`Remove ${pet.name}?`)) return;
        try {
          await removePet(pet.id, currentUser.id);
          loadMyPets();
          showToast(`${pet.name} removed.`);
        } catch (err) {
          showToast(err.message);
        }
      });
      list.appendChild(item);
    });
  } catch {
    list.innerHTML = '<p style="color:red;font-size:13px;">Could not load pets.</p>';
  }
}

function setupProfileForm() {
  // Save profile
  document.getElementById('saveProfileBtn').addEventListener('click', async () => {
    const name     = document.getElementById('prof-name').value.trim();
    const nickname = document.getElementById('prof-nickname').value.trim();
    const petName  = document.getElementById('prof-petname').value.trim();
    const petType  = document.getElementById('prof-pettype').value;
    const errorEl  = document.getElementById('profileError');
    errorEl.textContent = '';

    if (!name || !petName || !petType) { errorEl.textContent = 'Please fill in all fields.'; return; }

    const btn = document.getElementById('saveProfileBtn');
    btn.disabled = true; btn.textContent = 'Saving...';

    try {
      const { user } = await updateProfile({ userId: currentUser.id, name, nickname, petName, petType });
      currentUser = { ...currentUser, ...user };
      saveCurrentUser(currentUser);
      closeProfileModal();
      updateNavForUser();
      renderFeed();
      showToast('Profile updated! 🐾');
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      btn.disabled = false; btn.textContent = 'Save Changes';
    }
  });

  // Add pet
  document.getElementById('addPetBtn').addEventListener('click', async () => {
    const name    = document.getElementById('new-pet-name').value.trim();
    const type    = document.getElementById('new-pet-type').value;
    const bio     = document.getElementById('new-pet-bio').value.trim();
    const errorEl = document.getElementById('addPetError');
    errorEl.textContent = '';

    if (!name) { errorEl.textContent = 'Enter a pet name.'; return; }

    const btn = document.getElementById('addPetBtn');
    btn.disabled = true; btn.textContent = 'Adding...';

    try {
      await addPet({ memberId: currentUser.id, name, type, bio });
      document.getElementById('new-pet-name').value = '';
      document.getElementById('new-pet-bio').value  = '';
      loadMyPets();
      showToast(`${name} added! 🐾`);
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      btn.disabled = false; btn.textContent = 'Add Pet 🐾';
    }
  });

  // Delete account
  document.getElementById('deleteAccountBtn').addEventListener('click', async () => {
    const confirm = document.getElementById('delete-confirm-input').value.trim();
    const errorEl = document.getElementById('deleteError');
    errorEl.textContent = '';

    if (confirm !== 'DELETE') {
      errorEl.textContent = 'You must type DELETE exactly to confirm.'; return;
    }

    const btn = document.getElementById('deleteAccountBtn');
    btn.disabled = true; btn.textContent = 'Deleting...';

    try {
      await deleteAccount({ userId: currentUser.id, confirm });
      currentUser = null;
      localStorage.removeItem('pv_user');
      closeProfileModal();
      updateNavForUser();
      currentPage = 1;
      const [postsData] = await Promise.all([getPosts()]);
      allPosts = postsData;
      renderFeed();
      showToast('Your account has been deleted. Goodbye! 👋');
    } catch (err) {
      errorEl.textContent = err.message;
      btn.disabled = false; btn.textContent = 'Delete My Account Forever';
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
  currentPage = 1;
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
  currentPage = 1;
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
      <button class="nav-user" onclick="showProfileModal()">${emoji} ${currentUser.nickname || currentUser.name}</button>
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

    setupSSE();
    setupFlatpickr();

    console.log('PetVerse loaded!');
  } catch {
    const msg = '<div class="loading">⚠️ Server not running — open terminal and run: node server.js</div>';
    document.getElementById('petsGrid').innerHTML      = msg;
    document.getElementById('feedContainer').innerHTML = msg;
    document.getElementById('eventsGrid').innerHTML    = msg;
    showToast('Start the server first: node server.js');
  }
}


// ===== FLATPICKR CALENDAR =====
function setupFlatpickr() {
  if (typeof flatpickr === 'undefined') return;
  flatpickr('#ev-date', {
    altInput:    true,
    altFormat:   'F j, Y',
    dateFormat:  'F j, Y',
    minDate:     'today',
    disableMobile: false
  });
}


// ===== LIVE UPDATES (SSE) =====
function setupSSE() {
  const es = new EventSource('http://localhost:4000/api/stream');

  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      handleLiveEvent(data);
    } catch { /* ignore parse errors */ }
  };

  es.onerror = () => {
    // Silently reconnect — browser handles this automatically
  };
}

function handleLiveEvent(data) {
  switch (data.event) {

    case 'new_post': {
      // Only show live new posts if we are on page 1
      if (currentPage !== 1) return;
      const isOwn = currentUser && data.post.author === currentUser.name;
      if (isOwn) return; // already added locally on submit
      allPosts = [data.post, ...allPosts];
      renderFeed();
      showLiveBadge('📝 New post just shared!');
      break;
    }

    case 'new_event': {
      const isOwn = currentUser && data.event.posterName === currentUser.name;
      if (isOwn) return;
      allEvents = [data.event, ...allEvents];
      renderEvents();
      showLiveBadge('🎉 New event posted!');
      break;
    }

    case 'new_member': {
      // Bump member count in stats bar
      const numEl = document.querySelector('.stat-card:first-child .stat-number');
      if (numEl) {
        const cur = parseInt(numEl.textContent.replace(/\D/g, '')) || 0;
        numEl.textContent = `${(cur + 1).toLocaleString()}+`;
        numEl.classList.add('stat-bump');
        setTimeout(() => numEl.classList.remove('stat-bump'), 600);
      }
      showLiveBadge(`🐾 ${data.name} just joined PetVerse!`);
      break;
    }

    case 'post_liked': {
      // Update like count on visible post cards
      document.querySelectorAll('.post-card').forEach(card => {
        const likeBtn = card.querySelector('.like-btn');
        const likeCount = card.querySelector('.like-count');
        if (likeBtn && likeCount && card.dataset.postId == data.postId) {
          likeCount.textContent = data.likes;
        }
      });
      break;
    }
  }
}

function showLiveBadge(message) {
  const badge = document.createElement('div');
  badge.className = 'live-badge';
  badge.textContent = message;
  document.body.appendChild(badge);
  requestAnimationFrame(() => badge.classList.add('live-badge-show'));
  setTimeout(() => {
    badge.classList.remove('live-badge-show');
    setTimeout(() => badge.remove(), 400);
  }, 3500);
}


init();
