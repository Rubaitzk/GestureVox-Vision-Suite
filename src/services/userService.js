const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000';

export async function getLanguages() {
  if (!BACKEND) return [];
  const res = await fetch(`${BACKEND}/api/languages`);
  if (!res.ok) throw new Error('Failed to fetch languages');
  return res.json();
}

export async function getUser(userId) {
  if (!BACKEND) return null;
  const res = await fetch(`${BACKEND}/api/user?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) return null;
  return res.json();
}

export async function updateUser(payload) {
  if (!BACKEND) return false;
  const res = await fetch(`${BACKEND}/api/user`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return res.ok;
}

export async function getPreferences(userId) {
  if (!BACKEND) return null;
  const res = await fetch(`${BACKEND}/api/preferences?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) return null;
  return res.json();
}

export async function savePreferences(payload) {
  if (!BACKEND) return false;
  const res = await fetch(`${BACKEND}/api/preferences`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return res.ok;
}

export async function logError(payload) {
  if (!BACKEND) return false;
  const res = await fetch(`${BACKEND}/api/error`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return res.ok;
}

export default {
  getLanguages,
  getUser,
  updateUser,
  getPreferences,
  savePreferences,
  logError
};
