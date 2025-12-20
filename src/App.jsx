import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  MessageCircle,
  Home,
  Send,
  Loader,
  Languages,
} from 'lucide-react';
import './App.css';
import {
  startSpeechRecognition,
  speakText,
  translateText,
  LANGUAGE_CODES,
  LANGUAGE_FLAGS,
  formatTime,
  generateMessageId,
  CHATBOT_SYSTEM_PROMPT,
} from './utils.js';
import * as sessionService from './services/sessionService';
import * as authService from './services/authService';
import * as userService from './services/userService';
const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:5000';
import HistoryModal from './components/HistoryModal';
import ProfileModal from './components/ProfileModal';
import AuthModal from './components/AuthModal';
import { GoogleGenAI } from "@google/genai"; 

// ==================== HOME COMPONENT ====================
function HomePage({ isActive }) {
  const [isListening, setIsListening] = useState(false);
  const [glovesConnected, setGlovesConnected] = useState(false);
  const [glovesProcessing, setGlovesProcessing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  // const [glovesConnected, setGlovesConnected] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);

  const languages = ['English', 'Urdu', 'Spanish', 'French'];

  const handleGlovesClick = () => {
    // Toggle connection: when connecting, fetch one glove gesture and process it
    if (glovesConnected) {
      setGlovesConnected(false);
      return;
    }

    // connect and process one gesture
    (async () => {
      setGlovesConnected(true);
      try {
        setIsProcessing(true);
        const res = await fetch(`${BACKEND}/api/glove/simulate`);
        if (!res.ok) throw new Error('Glove simulate failed');
        const data = await res.json();
        const text = data.gesture_text;

        // create a new user message and attempt translation like mic
        const newMessage = {
          id: generateMessageId(),
          source: 'user',
          text,
          translated: null,
          language: navigator.language || 'unknown',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, newMessage]);

        try {
          const targetCode = LANGUAGE_CODES[selectedLanguage] || 'en';
          const translated = await translateText(text, targetCode);
          setMessages((prev) => prev.map(m => m.id === newMessage.id ? { ...m, translated } : m));

          // persist
          const uid = (authService.getCurrentUser() || {}).user_id || undefined;
          if (!currentSessionId) {
            const ns = await sessionService.createSession(uid, 'home', 'New Home Chat');
            setCurrentSessionId(ns.id);
          }
          const sid = currentSessionId || (await sessionService.getSessions(uid, 'home'))[0].id;
          await sessionService.addMessage(uid, 'home', sid, { sender: 'user', text, translated });
        } catch (e) {
          console.error('Glove processing failed', e);
          const uid = (authService.getCurrentUser() || {}).user_id || null;
          userService.logError({ user_id: uid, error_type: 'glove', message: String(e), context: 'home_glove_process' }).catch(() => {});
        }
      } catch (e) {
        console.error('Glove simulate error', e);
        const uid = (authService.getCurrentUser() || {}).user_id || null;
        userService.logError({ user_id: uid, error_type: 'glove_simulate', message: String(e), context: 'glove_fetch' }).catch(() => {});
      } finally {
        setIsProcessing(false);
      }
    })();
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentTranscript]);

  // initialize or load session/messages
  useEffect(() => {
    (async () => {
      try {
        const uid = (authService.getCurrentUser() || {}).user_id || undefined;
        const sessions = await sessionService.getSessions(uid, 'home');
        if (sessions && sessions.length > 0) {
          const first = sessions[0];
          setCurrentSessionId(first.id);
          const msgs = await sessionService.fetchSessionMessages(uid, 'home', first.id);
          setMessages((msgs || []).map(m => ({ id: m.home_message_id || generateMessageId(), source: m.sender === 'user' ? 'user' : 'ai', text: m.input_text || m.output_text || '', translated: m.translated_text || null, timestamp: new Date(m.created_at || m.createdAt) })));
        } else {
          const ns = await sessionService.createSession(uid, 'home', 'New Home Chat');
          setCurrentSessionId(ns.id);
        }
      } catch (e) {
        console.error('Home session init failed', e);
      }
    })();

    const newHandler = async (e) => {
      if (e?.detail?.type !== 'home') return;
      try {
        const uid = (authService.getCurrentUser() || {}).user_id || undefined;
        const ns = await sessionService.createSession(uid, 'home', 'New Home Chat');
        setCurrentSessionId(ns.id);
        setMessages([]);
      } catch (err) {
        console.error('New home session error', err);
      }
    };

    const loadHandler = async (e) => {
      if (e?.detail?.type !== 'home') return;
      const sid = e?.detail?.sessionId;
      if (!sid) return;
      try {
        const uid = (authService.getCurrentUser() || {}).user_id || undefined;
        const msgs = await sessionService.fetchSessionMessages(uid, 'home', sid);
        setCurrentSessionId(sid);
        setMessages((msgs || []).map(m => ({ id: m.home_message_id || generateMessageId(), source: m.sender === 'user' ? 'user' : 'ai', text: m.input_text || m.output_text || '', translated: m.translated_text || null, timestamp: new Date(m.created_at || m.createdAt) })));
      } catch (err) {
        console.error('Load home session failed', err);
      }
    };

    window.addEventListener('gv:new-session', newHandler);
    window.addEventListener('gv:load-session', loadHandler);
    return () => {
      window.removeEventListener('gv:new-session', newHandler);
      window.removeEventListener('gv:load-session', loadHandler);
    };
  }, []);

  const handleStartListening = () => {
    if (isListening) {
      setIsListening(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    setIsListening(true);
    setCurrentTranscript('');
    setTranslatedText('');

    const speechLang = navigator.language || 'en-US';

    recognitionRef.current = startSpeechRecognition(
      speechLang,
      (transcript, isFinal) => {
        setCurrentTranscript(transcript);

        if (isFinal) {
          (async () => {
            setIsProcessing(true);
            try {
              // Add original message (source language transcript)
              const newMessage = {
                id: generateMessageId(),
                source: 'user',
                text: transcript,
                translated: null,
                language: navigator.language || 'unknown',
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, newMessage]);

              // Always attempt translation to the selected target language
              const targetCode = LANGUAGE_CODES[selectedLanguage] || 'en';
              const translated = await translateText(transcript, targetCode);
              setTranslatedText(translated);
              // update the last message with translated text
              setMessages((prev) => prev.map(m => m.id === newMessage.id ? { ...m, translated } : m));

              try {
                const uid = (authService.getCurrentUser() || {}).user_id || undefined;
                if (!currentSessionId) {
                  const ns = await sessionService.createSession(uid, 'home', 'New Home Chat');
                  setCurrentSessionId(ns.id);
                }
                const sid = currentSessionId || (await sessionService.getSessions(uid, 'home'))[0].id;
                await sessionService.addMessage(uid, 'home', sid, { sender: 'user', text: newMessage.text, translated: newMessage.translated });
              } catch (e) {
                console.error('Failed to persist home message', e);
                const uid = (authService.getCurrentUser() || {}).user_id || null;
                userService.logError({ user_id: uid, error_type: 'db', message: String(e), context: 'persist_home_message' }).catch(() => {});
              }

              setCurrentTranscript('');
              setIsListening(false);
            } catch (error) {
              console.error('Error:', error);
              const uid = (authService.getCurrentUser() || {}).user_id || null;
              userService.logError({ user_id: uid, error_type: 'home_processing', message: String(error), context: 'home_listen_process' }).catch(() => {});
              setCurrentTranscript('');
              setIsListening(false);
            } finally {
              setIsProcessing(false);
            }
          })();
        }
      },
      (error) => {
        console.error(error);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );
  };

  const handleSpeakMessage = (text) => {
    if (!text || String(text).trim().length === 0) {
      console.debug('handleSpeakMessage: no text to speak');
      return;
    }
    console.debug('handleSpeakMessage:', text, 'selectedLanguage=', selectedLanguage);
    const langMap = {
      English: 'en-US',
      Urdu: 'ur-PK',
      Spanish: 'es-ES',
      French: 'fr-FR',
    };
    let speakLang = langMap[selectedLanguage] || 'en-US';
    // For Urdu, if ur-PK doesn't work, try ur as fallback
    if (selectedLanguage === 'Urdu') {
      speakText(text, 'ur-PK')
        .catch(() => {
          console.debug('ur-PK failed, trying ur');
          return speakText(text, 'ur');
        })
        .catch((e) => console.error('speakText error', e));
    } else {
      speakText(text, speakLang).catch((e) => console.error('speakText error', e));
    }
  };

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    setTranslatedText('');
    setCurrentTranscript('');
  };

  if (!isActive) return null;

  return (
    <div className="app-content">
      <div className="home-container">
        <div>
          <h2 className="home-title">Speech Recognition</h2>
          <p className="home-subtitle">Speak and get real-time translation</p>
        </div>

        {/* Inline language selector placed under subtitle as a compact grid */}
        <div className="language-selector" style={{ marginTop: '0.5rem' }}>
          <div className="language-selector-label">
            <Languages />
            <span>Select Output Language</span>
          </div>
          <div className="language-selector-grid">
            {languages.map((lang) => (
              <button
                key={lang}
                className={`language-button ${selectedLanguage === lang ? 'active' : ''}`}
                onClick={() => handleLanguageChange(lang)}
              >
                <div className="language-button-flag">{LANGUAGE_FLAGS[lang]}</div>
                <div className="language-button-name">{lang}</div>
                <div className="language-button-code">{LANGUAGE_CODES[lang]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Messages Display */}
        <div className="transcript-container" ref={scrollRef}>
          {messages.length === 0 && !currentTranscript && (
            <div className="empty-state opacity-50">
              <Mic className="w-12 h-12" />
              <p className="empty-state-text">
                Press the mic button and start speaking...
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`transcript-message ${
                msg.source === 'user' ? 'user' : 'ai'
              }`}
            >
              <div className={`message-avatar ${msg.source}`}>
                <Mic width="18" height="18" />
              </div>
              <div className={`message-bubble ${msg.source}`}>
                <p className="message-text">{msg.translated || msg.text}</p>
                <span className="message-time">{formatTime(msg.timestamp)}</span>
              </div>
            </div>
          ))}

          {(isListening || isProcessing || currentTranscript) && (
            <div className="listening-indicator">
              <div className="listening-indicator-icon">
                <Mic width="16" height="16" />
                <span>
                  {isProcessing ? 'Processing...' : 'Listening...'}
                </span>
              </div>
              <p className="listening-indicator-text">
                {currentTranscript}
                {isListening && (
                  <span className="listening-indicator-cursor">|</span>
                )}
              </p>
              {translatedText && (
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Translated ({selectedLanguage}):
                  </p>
                  <p style={{ color: '#22d3ee', marginTop: '0.5rem' }}>
                    {translatedText}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Control Deck */}
      <div className="control-deck">
        <div className="control-buttons">
          <button
            onClick={() => {
              if (messages.length > 0) {
                const last = messages[messages.length - 1];
                handleSpeakMessage(last.translated || last.text);
              }
            }}
            className="control-button secondary"
            title="Speak last message"
          >
            <Volume2 />
            <span className="control-button-label">Speak</span>
          </button>

          <button
            onClick={handleStartListening}
            className={`control-button primary ${isListening ? 'listening' : ''}`}
            title={isListening ? 'Stop listening' : 'Start listening'}
          >
            {isListening ? <MicOff /> : <Mic />}
          </button>

          <button
            className="control-button secondary"
            title="Clear messages"
            onClick={() => {
              if (window.speechSynthesis) window.speechSynthesis.cancel();
              setMessages([]);
              setCurrentTranscript('');
              setTranslatedText('');
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>×</span>
            <span className="control-button-label">Clear</span>
          </button>

          <button
            onClick={handleGlovesClick}
            className={`gloves-button ${glovesConnected ? 'connected' : 'not-connected'}`}
            title="Gloves connection status"
          >
            <span className="gloves-label">Gloves</span>
            <span className="gloves-status">{glovesConnected ? 'Connected' : 'Not Connected'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== CHATBOT COMPONENT ====================
function ChatbotPage({ isActive }) {
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: generateMessageId(),
      role: 'assistant',
      text: 'Hello! I am your Sign Language Guide Assistant. I am here to help you learn how to sign words, phrases, and expressions. Ask me anything about sign language!',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  // Gloves state used by the chatbot control buttons (was missing and caused a runtime error)
  const [glovesConnected, setGlovesConnected] = useState(false);
  const [glovesProcessing, setGlovesProcessing] = useState(false);
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // initialize or load chatbot sessions
  useEffect(() => {
    (async () => {
      try {
        const uid = (authService.getCurrentUser() || {}).user_id || undefined;
        const sessions = await sessionService.getSessions(uid, 'chatbot');
        if (sessions && sessions.length > 0) {
          const first = sessions[0];
          setCurrentSessionId(first.id);
          const msgs = await sessionService.fetchSessionMessages(uid, 'chatbot', first.id);
          setMessages((msgs || []).map(m => ({ id: m.message_id || generateMessageId(), role: m.sender === 'user' ? 'user' : 'assistant', text: m.input_text || m.output_text || '', translated: m.translated_text || null, timestamp: new Date(m.created_at || m.createdAt) })));
        } else {
          const ns = await sessionService.createSession(uid, 'chatbot', 'New Chatbot Chat');
          setCurrentSessionId(ns.id);
        }
      } catch (e) {
        console.error('Chatbot session init failed', e);
      }
    })();

    const newHandler = async (e) => {
      if (e?.detail?.type !== 'chatbot') return;
      try {
        const uid = (authService.getCurrentUser() || {}).user_id || undefined;
        const ns = await sessionService.createSession(uid, 'chatbot', 'New Chatbot Chat');
        setCurrentSessionId(ns.id);
        setMessages([{
          id: generateMessageId(),
          role: 'assistant',
          text: 'New chat started',
          timestamp: new Date(),
        }]);
      } catch (err) {
        console.error('New chatbot session error', err);
      }
    };

    const loadHandler = async (e) => {
      if (e?.detail?.type !== 'chatbot') return;
      const sid = e?.detail?.sessionId;
      if (!sid) return;
      try {
        const uid = (authService.getCurrentUser() || {}).user_id || undefined;
        const msgs = await sessionService.fetchSessionMessages(uid, 'chatbot', sid);
        setCurrentSessionId(sid);
        setMessages((msgs || []).map(m => ({ id: m.message_id || generateMessageId(), role: m.sender === 'user' ? 'user' : 'assistant', text: m.input_text || m.output_text || '', translated: m.translated_text || null, timestamp: new Date(m.created_at || m.createdAt) })));
      } catch (err) {
        console.error('Load chatbot session failed', err);
      }
    };

    window.addEventListener('gv:new-session', newHandler);
    window.addEventListener('gv:load-session', loadHandler);
    return () => {
      window.removeEventListener('gv:new-session', newHandler);
      window.removeEventListener('gv:load-session', loadHandler);
    };
  }, []);

  const handleStartListening = () => {
    if (isListening) {
      setIsListening(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    setIsListening(true);
    const speechLang = navigator.language || 'en-US';

    recognitionRef.current = startSpeechRecognition(
      speechLang,
      async (transcript, isFinal) => {
        if (isFinal) {
          try {
            const targetCode = LANGUAGE_CODES[selectedLanguage] || 'en';
            const translated = await translateText(transcript, targetCode);
            setInputText(translated || transcript);
          } catch (err) {
                console.error('Translation during chat input failed:', err);
                const uid = (authService.getCurrentUser() || {}).user_id || null;
                userService.logError({ user_id: uid, error_type: 'translation', message: String(err), context: 'chatbot_input_translation' }).catch(() => {});
                setInputText(transcript);
          } finally {
            setIsListening(false);
          }
        }
      },
      (error) => {
        console.error(error);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // Add user message
    const userMessage = {
      id: generateMessageId(),
      role: 'user',
      text: inputText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');

    // persist user message to backend
    try {
      const uid = (authService.getCurrentUser() || {}).user_id || undefined;
      if (!currentSessionId) {
        const ns = await sessionService.createSession(uid, 'chatbot', 'New Chatbot Chat');
        setCurrentSessionId(ns.id);
      }
      const sid = currentSessionId || (await sessionService.getSessions(uid, 'chatbot'))[0].id;
      await sessionService.addMessage(uid, 'chatbot', sid, { sender: 'user', text: userMessage.text });
    } catch (e) {
      console.error('Failed to persist user chatbot message', e);
      const uid = (authService.getCurrentUser() || {}).user_id || null;
      userService.logError({ user_id: uid, error_type: 'db', message: String(e), context: 'persist_user_chatbot_message' }).catch(() => {});
    }

    setIsLoading(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('VITE_GEMINI_API_KEY not configured');
      }

      const client = new GoogleGenAI({ apiKey });

      // Build conversation history for context
      const conversationHistory = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: [
          {
            role: 'user',
            parts: [{ text: `${CHATBOT_SYSTEM_PROMPT}\n\nConversation history:\n${conversationHistory.map(m => `${m.role}: ${m.parts[0].text}`).join('\n')}\n\nUser: ${inputText}` }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
        }
      });

      const assistantMessage = {
        id: generateMessageId(),
        role: 'assistant',
        text: response.text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      try {
        const uid = (authService.getCurrentUser() || {}).user_id || undefined;
        const sid = currentSessionId || (await sessionService.getSessions(uid, 'chatbot'))[0].id;
        await sessionService.addMessage(uid, 'chatbot', sid, { sender: 'assistant', output: assistantMessage.text });
      } catch (e) {
        console.error('Failed to persist assistant chatbot message', e);
        const uid = (authService.getCurrentUser() || {}).user_id || null;
        userService.logError({ user_id: uid, error_type: 'db', message: String(e), context: 'persist_assistant_chatbot_message' }).catch(() => {});
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      // Log external API failures (Gemini/translation) to error_logs for later inspection
      const uid = (authService.getCurrentUser() || {}).user_id || null;
      userService.logError({ user_id: uid, error_type: 'chatbot_api', message: String(error), context: `generateContent input=${inputText}` }).catch(() => {});
      // Show error message to user
      const errorMessage = {
        id: generateMessageId(),
        role: 'assistant',
        text: `Error: ${error.message}. Please try again later.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };


  if (!isActive) return null;

  return (
    <div className="app-content">
      <div className="chatbot-container">
        {/* Chat Messages */}
        <div className="chatbot-conversation" ref={scrollRef}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`transcript-message ${
                msg.role === 'user' ? 'user' : 'ai'
              }`}
            >
              <div
                className={`message-avatar ${msg.role === 'user' ? 'user' : 'ai'}`}
              >
                {msg.role === 'user' ? (
                  <Mic width="18" height="18" />
                ) : (
                  <MessageCircle width="18" height="18" />
                )}
              </div>
              <div className={`message-bubble ${msg.role === 'user' ? 'user' : 'ai'}`}>
                <p className="message-text">{msg.translated || msg.text}</p>
                <span className="message-time">{formatTime(msg.timestamp)}</span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="transcript-message ai">
              <div className="message-avatar ai">
                <Loader width="18" height="18" className="animate-spin" />
              </div>
              <div className="message-bubble ai">
                <p className="message-text">Processing your message...</p>
              </div>
            </div>
          )}
        </div>

        {/* Input Area moved to control deck below */}
      </div>

      {/* Control Deck for Chatbot (combined input + controls) */}
      <div className="control-deck">
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 1rem' }}>
          <form onSubmit={handleSendMessage} className="chatbot-input-wrapper" style={{ marginBottom: '0.75rem' }}>
            <input
              type="text"
              className="chatbot-input"
              placeholder="Ask about sign language..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading}
            />
            <div className="chatbot-input-buttons">
              <button
                type="button"
                className={`chatbot-mic-button ${isListening ? 'active' : ''}`}
                onClick={handleStartListening}
                title={isListening ? 'Stop listening' : 'Start listening'}
              >
                {isListening ? <MicOff width="20" height="20" /> : <Mic width="20" height="20" />}
              </button>
              <button
                type="submit"
                className="chatbot-send-button"
                disabled={isLoading || !inputText.trim()}
              >
                <Send width="20" height="20" />
              </button>
            </div>
          </form>

          <div className="control-buttons" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                onClick={async () => {
                  if (glovesProcessing) return;
                  if (glovesConnected) { setGlovesConnected(false); return; }
                  setGlovesConnected(true);
                  setGlovesProcessing(true);
                  try {
                    const res = await fetch(`${BACKEND}/api/glove/simulate`);
                    if (!res.ok) throw new Error('Glove simulate failed');
                    const data = await res.json();
                    const text = data.gesture_text;
                    try {
                      const targetCode = LANGUAGE_CODES[selectedLanguage] || 'en';
                      const translated = await translateText(text, targetCode);
                      setInputText(translated || text);
                    } catch (err) {
                      console.error('Glove translation failed', err);
                      const uid = (authService.getCurrentUser() || {}).user_id || null;
                      userService.logError({ user_id: uid, error_type: 'glove', message: String(err), context: 'chatbot_glove_translate' }).catch(() => {});
                      setInputText(text);
                    }
                  } catch (e) {
                    console.error('Glove simulate error', e);
                    const uid = (authService.getCurrentUser() || {}).user_id || null;
                    userService.logError({ user_id: uid, error_type: 'glove_simulate', message: String(e), context: 'chatbot_glove_fetch' }).catch(() => {});
                  } finally {
                    setGlovesProcessing(false);
                  }
                }}
                className={`gloves-button ${glovesConnected ? 'connected' : 'not-connected'}`}
                title="Gloves connection status"
              >
                <span className="gloves-label">Gloves</span>
                <span className="gloves-status">{glovesConnected ? 'Connected' : 'Not Connected'}</span>
              </button>
              <button
                onClick={() => {
                  const last = messages.slice().reverse().find(m => m.role === 'assistant' || m.role === 'user');
                  if (last) {
                    const langMap = {
                      English: 'en-US',
                      Urdu: 'ur-PK',
                      Spanish: 'es-ES',
                      French: 'fr-FR',
                    };
                    let speakLang = langMap[selectedLanguage] || 'en-US';
                    if (selectedLanguage === 'Urdu') {
                      speakText(last.translated || last.text, 'ur-PK')
                        .catch(() => speakText(last.translated || last.text, 'ur'))
                        .catch((e) => console.error('speakText error', e));
                    } else {
                      speakText(last.translated || last.text, speakLang);
                    }
                  }
                }}
                className="control-button secondary"
                title="Speak last message"
              >
                <Volume2 />
                <span className="control-button-label">Speak</span>
              </button>

              <button
                className="control-button secondary"
                title="Clear chat"
                onClick={() => {
                  // stop any ongoing speech
                  if (window.speechSynthesis) window.speechSynthesis.cancel();
                  setMessages([
                    {
                      id: generateMessageId(),
                      role: 'assistant',
                      text: 'Chat cleared. How can I help you learn sign language today?',
                      timestamp: new Date(),
                    },
                  ]);
                }}
              >
                <span style={{ fontSize: '1.5rem' }}>×</span>
                <span className="control-button-label">Clear</span>
              </button>
            </div>

            <div>
              <button
                onClick={handleStartListening}
                className={`control-button primary ${isListening ? 'listening' : ''}`}
                title={isListening ? 'Stop listening' : 'Start listening'}
              >
                {isListening ? <MicOff /> : <Mic />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== MAIN APP COMPONENT ====================
export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [showHistory, setShowHistory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const onOpenAuth = () => setShowAuth(true);
    window.addEventListener('gv:open-auth', onOpenAuth);
    return () => window.removeEventListener('gv:open-auth', onOpenAuth);
  }, []);

  return (
    <div className="app-container">
      {/* Background Glows */}
      <div className="app-background">
        <div className="app-bg-glow app-bg-glow-cyan"></div>
        <div className="app-bg-glow app-bg-glow-indigo"></div>
      </div>

      {/* Main App Wrapper */}
      <div className="app-wrapper">
        {/* Header with Navigation */}
        <header className="app-header">
          <div className="app-header-brand">
            <div className="app-header-icon">
              {currentPage === 'home' ? (
                <Home width="20" height="20" />
              ) : (
                <MessageCircle width="20" height="20" />
              )}
            </div>
            <div>
              <h1 className="app-header-title">GestureVox</h1>
              <p className="app-header-subtitle">Fusion Suite</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="app-header-controls">
            <button
              className={`app-nav-tab ${currentPage === 'home' ? 'active' : ''}`}
              onClick={() => setCurrentPage('home')}
            >
              <Home width="16" height="16" style={{ display: 'inline', marginRight: '0.5rem' }} />
              Home
            </button>
            <button
              className={`app-nav-tab ${currentPage === 'chatbot' ? 'active' : ''}`}
              onClick={() => setCurrentPage('chatbot')}
            >
              <MessageCircle width="16" height="16" style={{ display: 'inline', marginRight: '0.5rem' }} />
              Chatbot
            </button>
          </div>
        </header>

        {/* Sub-ribbon with New Chat / History */}
        <div className="sub-ribbon">
          <button className="small-btn primary" onClick={() => window.dispatchEvent(new CustomEvent('gv:new-session', { detail: { type: currentPage } }))}>New Chat</button>
          <button className="small-btn" onClick={() => setShowHistory(true)}>Chat History</button>
          <button className="small-btn" onClick={() => { const cur = authService.getCurrentUser(); if (cur) setShowProfile(true); else setShowAuth(true); }}>Profile</button>
        </div>

        {/* Page Content */}
        <HomePage isActive={currentPage === 'home'} />
        <ChatbotPage isActive={currentPage === 'chatbot'} />

        <HistoryModal visible={showHistory} onClose={() => setShowHistory(false)} />
        <ProfileModal visible={showProfile} onClose={() => setShowProfile(false)} />
        <AuthModal visible={showAuth} onClose={() => setShowAuth(false)} />
      </div>
    </div>
  );
}