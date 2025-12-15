import React, { useEffect, useState } from 'react';
import * as sessionService from '../services/sessionService';
import { formatTime } from '../utils';

export default function HistoryModal({ visible, onClose }) {
  const USER = 'guest';
  const [homeSessions, setHomeSessions] = useState([]);
  const [chatSessions, setChatSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoading(true);
      try {
        const hs = await sessionService.getSessions(USER, 'home');
        const cs = await sessionService.getSessions(USER, 'chatbot');
        setHomeSessions(hs || []);
        setChatSessions(cs || []);
      } catch (e) {
        console.error('Failed to load history', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [visible]);

  const loadSession = (type, id) => {
    window.dispatchEvent(new CustomEvent('gv:load-session', { detail: { type, sessionId: id } }));
    onClose();
  };

  const del = async (type, id) => {
    const ok = await sessionService.deleteSession(USER, type, id);
    if (ok) {
      if (type === 'home') setHomeSessions((s) => s.filter(x => String(x.id) !== String(id)));
      else setChatSessions((s) => s.filter(x => String(x.id) !== String(id)));
    }
  };

  if (!visible) return null;

  return (
    <div className="history-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <h3>Chat History</h3>
          <button className="btn small" onClick={onClose}>Close</button>
        </div>
        <div className="history-body">
          <div className="history-column">
            <h4>Home</h4>
            {loading && <p className="muted">Loading...</p>}
            {!loading && homeSessions.length === 0 && <p className="muted">No home history yet.</p>}
            <ul className="history-list">
              {homeSessions.map(s => (
                <li key={s.id} className="history-item">
                  <div>
                    <div className="history-title">{s.title || 'Home Session'}</div>
                    <div className="history-meta">{formatTime(new Date(s.startedAt || s.createdAt || Date.now()))}</div>
                  </div>
                  <div className="history-actions">
                    <button className="btn small" onClick={() => loadSession('home', s.id)}>Load</button>
                    <button className="btn small danger" onClick={() => del('home', s.id)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="history-column">
            <h4>Chatbot</h4>
            {!loading && chatSessions.length === 0 && <p className="muted">No chatbot history yet.</p>}
            <ul className="history-list">
              {chatSessions.map(s => (
                <li key={s.id} className="history-item">
                  <div>
                    <div className="history-title">{s.title || 'Chatbot Session'}</div>
                    <div className="history-meta">{formatTime(new Date(s.startedAt || s.createdAt || Date.now()))}</div>
                  </div>
                  <div className="history-actions">
                    <button className="btn small" onClick={() => loadSession('chatbot', s.id)}>Load</button>
                    <button className="btn small danger" onClick={() => del('chatbot', s.id)}>Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
