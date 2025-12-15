import React, { useEffect, useState } from 'react';
// We use "import" instead of "require"
import * as userService from '../services/userService';
import * as authService from '../services/authService'; 

export default function ProfileModal({ visible, onClose }) {
  // Fix: Use authService directly, no "import()" or "require()"
  const [user, setUser] = useState({});
  const [prefs, setPrefs] = useState({});
  const [languages, setLanguages] = useState([]);
  const [saving, setSaving] = useState(false);

  // Initialize state when modal opens
  useEffect(() => {
    if (!visible) return;
    
    // Get current user immediately from authService
    const currentUser = authService.getCurrentUser();
    
    if (currentUser) {
      setUser(currentUser);
    } else {
      setUser({});
      setPrefs({});
    }

    // Fetch async data
    (async () => {
      try {
        const ls = await userService.getLanguages();
        setLanguages(ls || []);

        if (currentUser && currentUser.user_id) {
          // If userService has a getUser function, use it, otherwise rely on authService data
          try {
            const u = await userService.getUser(currentUser.user_id);
            if (u) setUser(u);
          } catch (err) {
            console.warn("Could not fetch extended user details:", err);
          }

          try {
            const p = await userService.getPreferences(currentUser.user_id);
            if (p) setPrefs(p || {});
          } catch (err) {
            console.warn("Could not fetch preferences:", err);
          }
        }
      } catch (e) {
        console.error('Profile load failed', e);
      }
    })();
  }, [visible]);

  const save = async () => {
    setSaving(true);
    try {
      const cur = authService.getCurrentUser();
      if (!cur) {
        // prompt login
        window.dispatchEvent(new CustomEvent('gv:open-auth'));
        onClose();
        return;
      }
      
      // Update User
      await userService.updateUser({ 
        user_id: cur.user_id, 
        name: user.name, 
        email: user.email 
      });

      // Update Preferences
      await userService.savePreferences({ 
        user_id: cur.user_id, 
        preferred_language_id: prefs.preferred_language_id || null, 
        tts_voice: prefs.tts_voice || null, 
        tts_speed: prefs.tts_speed || null, 
        theme: prefs.theme || null 
      });
      
      onClose();
    } catch (e) {
      console.error('Save profile failed', e);
      // Optional: Log error if userService supports it
      if (userService.logError) {
         const uid = authService.getCurrentUser()?.user_id || null;
         await userService.logError({ user_id: uid, error_type: 'profile_save', message: String(e) });
      }
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  const isLoggedIn = !!authService.getCurrentUser();

  return (
    <div className="history-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="history-header">
          <h3>Profile</h3>
          <button className="small-btn" onClick={onClose}>Close</button>
        </div>
        <div className="history-body">
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            <label>Name</label>
            <input 
              value={user.name || ''} 
              onChange={(e) => setUser({ ...user, name: e.target.value })} 
              disabled={!isLoggedIn}
            />

            <label>Email</label>
            <input 
              value={user.email || ''} 
              onChange={(e) => setUser({ ...user, email: e.target.value })} 
              disabled={!isLoggedIn}
            />

            <label>Preferred Language</label>
            <select 
              value={prefs.preferred_language_id || ''} 
              onChange={(e) => setPrefs({ ...prefs, preferred_language_id: e.target.value })}
              disabled={!isLoggedIn}
            >
              <option value="">(none)</option>
              {languages.map(l => (
                <option key={l.language_id} value={l.language_id}>{l.language_name}</option>
              ))}
            </select>

            <label>Theme</label>
            <select 
              value={prefs.theme || ''} 
              onChange={(e) => setPrefs({ ...prefs, theme: e.target.value })}
              disabled={!isLoggedIn}
            >
              <option value="">Default</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              {isLoggedIn ? (
                <>
                  <button className="control-button primary" onClick={save} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button className="control-button secondary" onClick={() => { authService.logout(); onClose(); }}>
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button className="control-button primary" onClick={() => { window.dispatchEvent(new CustomEvent('gv:open-auth')); onClose(); }}>
                    Sign in
                  </button>
                  <button className="control-button secondary" onClick={onClose}>
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}