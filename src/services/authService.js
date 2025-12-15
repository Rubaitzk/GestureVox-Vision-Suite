const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000/api/health';

function getClientToken() {
  let t = localStorage.getItem('gv_client_token');
  if (!t) {
    t = `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
    localStorage.setItem('gv_client_token', t);
  }
  return t;
}

export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('gv_user') || 'null');
  } catch (e) {
    return null;
  }
}

export function setCurrentUser(user) {
  if (user) localStorage.setItem('gv_user', JSON.stringify(user));
  else localStorage.removeItem('gv_user');
  window.dispatchEvent(new CustomEvent('gv:user-changed', { detail: { user } }));
}

export async function signup({ name, email, password }) {
  if (!BACKEND) throw new Error('No backend configured');
  const res = await fetch(`${BACKEND}/api/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Signup failed');
  }
  const data = await res.json();
  const userRes = await fetch(`${BACKEND}/api/user?user_id=${encodeURIComponent(data.user_id)}`);
  const user = await userRes.json();
  setCurrentUser(user);
  // migrate sessions created with client token
  const token = getClientToken();
  await fetch(`${BACKEND}/api/migrate_sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: data.user_id, client_token: token }) });
  return user;
}

export async function login({ email, password }) {
  if (!BACKEND) throw new Error('No backend configured');
  const res = await fetch(`${BACKEND}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Login failed');
  }
  const data = await res.json();
  const user = data.user;
  setCurrentUser(user);
  // migrate sessions
  const token = getClientToken();
  await fetch(`${BACKEND}/api/migrate_sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: user.user_id, client_token: token }) });
  return user;
}

export function logout() {
  setCurrentUser(null);
}

export default {
  signup,
  login,
  logout,
  getCurrentUser,
  setCurrentUser,
  getClientToken,
};
