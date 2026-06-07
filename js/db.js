// =====================================================
// db.js — ES Module: localStorage database
// Demonstrates: modules, objects, arrays, spread
// =====================================================

const KEYS = {
  members:      'pv_members',
  currentUser:  'pv_current_user',
  likedPosts:   'pv_liked_posts',
  followedPets: 'pv_followed_pets',
  joinedEvents: 'pv_joined_events',
  comments:     'pv_comments',
  userPosts:    'pv_user_posts'
};

function read(key) {
  try { return JSON.parse(localStorage.getItem(key)) ?? null; }
  catch { return null; }
}

function store(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// --- Members ---
export function getMembers() { return read(KEYS.members) ?? []; }

export function saveMember(member) {
  const list = getMembers();
  list.push({ ...member, joinedAt: new Date().toLocaleDateString('en-PH') });
  store(KEYS.members, list);
}

// --- Current user ---
export function getCurrentUser() { return read(KEYS.currentUser); }
export function setCurrentUser(u) { store(KEYS.currentUser, u); }
export function isLoggedIn() { return getCurrentUser() !== null; }

// --- Liked posts ---
export function getLikedPosts() { return read(KEYS.likedPosts) ?? []; }

export function toggleLikePost(id) {
  const liked = getLikedPosts();
  if (liked.includes(id)) {
    store(KEYS.likedPosts, liked.filter(x => x !== id));
    return false;
  }
  store(KEYS.likedPosts, [...liked, id]);
  return true;
}

// --- Followed pets ---
export function getFollowedPets() { return read(KEYS.followedPets) ?? []; }

export function toggleFollowPet(id) {
  const followed = getFollowedPets();
  if (followed.includes(id)) {
    store(KEYS.followedPets, followed.filter(x => x !== id));
    return false;
  }
  store(KEYS.followedPets, [...followed, id]);
  return true;
}

// --- Joined events ---
export function getJoinedEvents() { return read(KEYS.joinedEvents) ?? []; }

export function toggleJoinEvent(id) {
  const joined = getJoinedEvents();
  if (joined.includes(id)) {
    store(KEYS.joinedEvents, joined.filter(x => x !== id));
    return false;
  }
  store(KEYS.joinedEvents, [...joined, id]);
  return true;
}

// --- Comments ---
export function getComments(postId) {
  const all = read(KEYS.comments) ?? {};
  return all[String(postId)] ?? [];
}

export function addComment(postId, text, author) {
  const all = read(KEYS.comments) ?? {};
  const key = String(postId);
  const entry = { id: Date.now(), author, text, time: 'just now' };
  all[key] = [...(all[key] ?? []), entry];
  store(KEYS.comments, all);
  return entry;
}

// --- User-created posts ---
export function getUserPosts() { return read(KEYS.userPosts) ?? []; }

export function addUserPost(post) {
  const list = getUserPosts();
  const entry = { ...post, id: `u${Date.now()}`, likes: 0, comments: 0, time: 'just now', tags: [] };
  const updated = [entry, ...list];
  store(KEYS.userPosts, updated);
  return entry;
}
