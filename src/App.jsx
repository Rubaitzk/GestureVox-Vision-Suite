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
import { GoogleGenAI } from "@google/genai"; 

// ==================== HOME COMPONENT ====================
function HomePage({ isActive }) {
  const [isListening, setIsListening] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('English');
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);

  const languages = ['English', 'Urdu', 'Spanish', 'French'];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentTranscript]);

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

              setCurrentTranscript('');
              setIsListening(false);
            } catch (error) {
              console.error('Error:', error);
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
    speakText(text, 'en-US');
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

        {/* Language Selector */}
        <div className="language-selector">
          <div className="language-selector-label">
            <Languages />
            <span>Select Output Language</span>
          </div>
          <div className="language-selector-grid">
            {languages.map((lang) => (
              <button
                key={lang}
                className={`language-button ${
                  selectedLanguage === lang ? 'active' : ''
                }`}
                onClick={() => handleLanguageChange(lang)}
              >
                <div className="language-button-flag">
                  {LANGUAGE_FLAGS[lang]}
                </div>
                <div className="language-button-name">{lang}</div>
                <div className="language-button-code">
                  {LANGUAGE_CODES[lang]}
                </div>
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
              setMessages([]);
              setCurrentTranscript('');
              setTranslatedText('');
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>×</span>
            <span className="control-button-label">Clear</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== CHATBOT COMPONENT ====================
function ChatbotPage({ isActive }) {
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
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
      speakText(assistantMessage.translated || assistantMessage.text, 'en-US');
    } catch (error) {
      console.error('Chatbot error:', error);
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

        {/* Input Area */}
        <div className="chatbot-input-area">
          <form onSubmit={handleSendMessage} className="chatbot-input-wrapper">
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

          {/* Additional Input Options */}
          <div className="chatbot-input-icons">
            <div
              className="chatbot-input-icon"
              onClick={() => setSelectedLanguage('English')}
              title="English"
            >
              <span>🇬🇧</span>
              <span>English</span>
            </div>
            <div
              className="chatbot-input-icon"
              onClick={() => setSelectedLanguage('Urdu')}
              title="Urdu"
            >
              <span>🇵🇰</span>
              <span>اردو</span>
            </div>
            <div
              className="chatbot-input-icon"
              onClick={() => speakText(inputText || 'Ask about sign language', 'en-US')}
              title="Speak"
            >
              <Volume2 width="20" height="20" />
              <span>Speak</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Deck for Chatbot */}
      <div className="control-deck">
        <div className="control-buttons">
          <button
            onClick={() =>
              speakText(
                messages.length > 0
                  ? messages[messages.length - 1].text
                  : 'No messages',
                'en-US'
              )
            }
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
            title="Clear chat"
            onClick={() => {
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
      </div>
    </div>
  );
}

// ==================== MAIN APP COMPONENT ====================
export default function App() {
  const [currentPage, setCurrentPage] = useState('home');

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

        {/* Page Content */}
        <HomePage isActive={currentPage === 'home'} />
        <ChatbotPage isActive={currentPage === 'chatbot'} />
      </div>
    </div>
  );
}