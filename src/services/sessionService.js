export function _key(userId, type) {
  return `gv_sessions_${userId}_${type}`;
}

const BACKEND = import.meta.env.VITE_BACKEND_URL || '';

function getOrCreateClientToken() {
  let t = localStorage.getItem('gv_client_token');
  if (!t) {
    t = `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
    localStorage.setItem('gv_client_token', t);
  }
  return t;
}

function looksLikeNumeric(id) {
  return typeof id === 'number' || (/^\d+$/.test(String(id)));
}

function _localKey(userId, type) {
  return _key(userId, type);
}

export async function getSessions(userId, type) {
  // accept userId (numeric) or fallback to client token
  const token = (!userId || !looksLikeNumeric(userId)) ? getOrCreateClientToken() : null;
  if (BACKEND) {
    try {
      const endpoint = type === 'chatbot' ? 'chatbot/history' : 'home/history';
      const param = token ? `client_token=${encodeURIComponent(token)}` : `user_id=${encodeURIComponent(userId)}`;
      const url = `${BACKEND}/api/${endpoint}?${param}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch sessions');
      const data = await res.json();
      // map rows to uniform session objects
      return data.map(d => ({ id: String(d[`${type === 'chatbot' ? 'chatbot_session_id' : 'home_session_id'}`]), title: d.title || `${type} session`, createdAt: d.started_at || d.created_at, updatedAt: d.started_at || d.created_at, messages: [] }));
    } catch (e) {
      console.error('getSessions backend failed', e);
    }
  }
  try {
    const id = userId || getOrCreateClientToken();
    const raw = localStorage.getItem(_localKey(id, type));
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveSessions(userId, type, sessions) {
  localStorage.setItem(_key(userId, type), JSON.stringify(sessions || []));
}

export async function createSession(userId, type, title = 'New Chat') {
  const token = (!userId || !looksLikeNumeric(userId)) ? getOrCreateClientToken() : null;
  if (BACKEND) {
    try {
      const endpoint = type === 'chatbot' ? 'chatbot/session' : 'home/session';
      const url = `${BACKEND}/api/${endpoint}`;
      const body = token ? { client_token: token, title } : { user_id: userId, title };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('Failed to create session');
      const data = await res.json();
      return { id: String(data.session_id), title, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messages: [] };
    } catch (e) {
      console.error('createSession backend failed', e);
    }
  }
  const id = userId || getOrCreateClientToken();
  const sessions = JSON.parse(localStorage.getItem(_localKey(id, type)) || '[]');
  const session = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [],
  };
  sessions.unshift(session); // most recent first
  saveSessions(id, type, sessions);
  return session;
}

export async function fetchSessionMessages(userId, type, sessionId) {
  if (BACKEND) {
    try {
      const endpoint = type === 'chatbot' ? 'chatbot/messages' : 'home/messages';
      const url = `${BACKEND}/api/${endpoint}?session_id=${encodeURIComponent(sessionId)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      return data;
    } catch (e) {
      console.error('fetchSessionMessages backend failed', e);
      return [];
    }
  }
  const sessions = JSON.parse(localStorage.getItem(_localKey(userId, type)) || '[]');
  const s = sessions.find(x => x.id === sessionId);
  return s ? (s.messages || []) : [];
}

export async function addMessage(userId, type, sessionId, message) {
  if (BACKEND) {
    try {
      const endpoint = type === 'chatbot' ? 'chatbot/message' : 'home/message';
      const url = `${BACKEND}/api/${endpoint}`;
      const payload = type === 'chatbot' ? { chatbot_session_id: sessionId, sender: message.sender, input_text: message.text, output_text: message.output || null } : { home_session_id: sessionId, sender: message.sender, input_text: message.text, translated_text: message.translated || null };
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      return res.ok;
    } catch (e) {
      console.error('addMessage backend failed', e);
    }
  }
  // local fallback
  const sessions = JSON.parse(localStorage.getItem(_localKey(userId, type)) || '[]');
  const idx = sessions.findIndex(s => s.id === sessionId);
  if (idx !== -1) {
    sessions[idx].messages = sessions[idx].messages || [];
    sessions[idx].messages.push(message);
    sessions[idx].updatedAt = new Date().toISOString();
    saveSessions(userId, type, sessions);
    return true;
  }
  return false;
}

export function updateSession(userId, type, session) {
  const sessions = getSessions(userId, type);
  const idx = sessions.findIndex(s => s.id === session.id);
  if (idx !== -1) {
    sessions[idx] = { ...session, updatedAt: new Date().toISOString() };
  } else {
    sessions.unshift({ ...session, updatedAt: new Date().toISOString() });
  }
  saveSessions(userId, type, sessions);
  return session;
}

export async function deleteSession(userId, type, sessionId) {
  if (!userId) return false;
  if (BACKEND) {
    try {
      const endpoint = type === 'chatbot' ? `chatbot/session/${encodeURIComponent(sessionId)}` : `home/session/${encodeURIComponent(sessionId)}`;
      const url = `${BACKEND}/api/${endpoint}`;
      const res = await fetch(url, { method: 'DELETE' });
      return res.ok;
    } catch (e) {
      console.error('deleteSession backend failed', e);
      return false;
    }
  }

  try {
    const sessions = JSON.parse(localStorage.getItem(_localKey(userId, type)) || '[]');
    const filtered = sessions.filter(s => s.id !== sessionId);
    saveSessions(userId, type, filtered);
    return true;
  } catch (e) {
    console.error('deleteSession failed', e);
    return false;
  }
}

export function getSessionById(userId, type, sessionId) {
  return getSessions(userId, type).find(s => s.id === sessionId) || null;
}
