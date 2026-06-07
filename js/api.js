// =====================================================
// api.js — ES Module: Frontend API client
// =====================================================

const BASE = 'http://localhost:4000/api';

function getSessionId() {
  let id = localStorage.getItem('pv_session');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('pv_session', id);
  }
  return id;
}

export const sessionId = getSessionId();

async function request(method, path, body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

// --- Config ---
export const getConfig     = () => request('GET', '/config');

// --- Stats ---
export const getStats      = () => request('GET', '/stats');

// --- Session state ---
export const getMyState    = () => request('GET', `/session/state?sessionId=${sessionId}`);

// --- Pets ---
export const getPets       = ()    => request('GET',  '/pets');
export const followPet     = (id)  => request('POST', `/pets/${id}/follow`, { sessionId });

// --- Posts ---
export const getPosts      = ()         => request('GET',  '/posts');
export const createPost    = (data)     => request('POST', '/posts',                { ...data, sessionId });
export const likePost      = (id)       => request('POST', `/posts/${id}/like`,     { sessionId });
export const getComments   = (id)       => request('GET',  `/posts/${id}/comments`);
export const postComment   = (id, data) => request('POST', `/posts/${id}/comments`, data);

// --- Events ---
export const getEvents     = ()     => request('GET',  '/events');
export const joinEvent     = (id)   => request('POST', `/events/${id}/join`, { sessionId });
export const getUserEvents = ()     => request('GET',  '/user-events');
export const postUserEvent = (data) => request('POST', '/user-events', data);

// --- Auth ---
export const sendOTP          = (data) => request('POST', '/auth/send-otp',         data);
export const register         = (data) => request('POST', '/auth/register',         data);
export const login            = (data) => request('POST', '/auth/login',            data);
export const resetPassword    = (data) => request('POST', '/auth/reset-password',   data);
export const loginWithCode    = (data) => request('POST', '/auth/login-with-code',  data);
export const updateProfile    = (data) => request('PUT',  '/auth/profile',           data);
export const getUserTimeline  = (name) => request('GET',  `/timeline/${encodeURIComponent(name)}`);
