// ==================== Speech Recognition Utils ====================
export const getSpeechRecognitionAPI = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  return SpeechRecognition;
};

export const startSpeechRecognition = (language = 'en-US', onResult, onError, onEnd) => {
  const SpeechRecognition = getSpeechRecognitionAPI();
  if (!SpeechRecognition) {
    onError('Speech Recognition API not supported in your browser');
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = language;
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    console.log('Speech recognition started');
  };

  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }

    if (finalTranscript) {
      onResult(finalTranscript.trim(), true);
    } else if (interimTranscript) {
      onResult(interimTranscript, false);
    }
  };

  recognition.onerror = (event) => {
    onError(`Speech recognition error: ${event.error}`);
  };

  recognition.onend = () => {
    console.log('Speech recognition ended');
    if (onEnd) onEnd();
  };

  recognition.start();
  return recognition;
};

// ==================== Text-to-Speech Utils ====================
export const speakText = (text, language = 'en-US') => {
  if (!('speechSynthesis' in window)) {
    console.error('Speech Synthesis API not supported');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;

  window.speechSynthesis.speak(utterance);
};

// ==================== Translation API Utils ====================
// Free translation APIs:
// 1. MyMemory Translation API (No API key required)
// 2. LibreTranslate (Open source, self-hosted option available)
// 3. Rapid Translate (Has free tier)
// Recommendation: MyMemory for simplicity (no key required)

export const translateText = async (text, targetLanguage) => {
  try {
    // Using MyMemory Translation API (free, no authentication required)
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLanguage}`
    );
    
    if (!response.ok) {
      throw new Error('Translation API error');
    }

    const data = await response.json();
    
    if (data.responseStatus === 200) {
      return data.responseData.translatedText;
    } else {
      throw new Error(data.responseDetails);
    }
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
};

// Language code mapping
export const LANGUAGE_CODES = {
  'English': 'en',
  'Urdu': 'ur',
  'Spanish': 'es',
  'French': 'fr',
  'German': 'de',
  'Arabic': 'ar',
};

export const LANGUAGE_FLAGS = {
  'English': '🇬🇧',
  'Urdu': '🇵🇰',
  'Spanish': '🇪🇸',
  'French': '🇫🇷',
  'German': '🇩🇪',
  'Arabic': '🇸🇦',
};

export const SPEECH_LANGUAGES = {
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  'ur-PK': 'Urdu (Pakistan)',
  'es-ES': 'Spanish (Spain)',
  'fr-FR': 'French (France)',
  'de-DE': 'German (Germany)',
};

// ==================== Chatbot System Prompt ====================
export const CHATBOT_SYSTEM_PROMPT = `You are an expert Sign Language Guide Assistant. Your purpose is to help users learn about sign language, including:

1. Teaching how to sign specific words, phrases, and common expressions
2. Explaining sign language grammar and syntax
3. Providing cultural context about deaf communities
4. Demonstrating finger-spelling techniques
5. Explaining regional sign language variations
6. Helping with accessibility and inclusive communication

When responding:
- Be clear and educational
- Use descriptive language to explain hand movements, positions, and facial expressions
- Provide step-by-step instructions when teaching signs
- Encourage practice and patience
- Suggest resources when appropriate
- Always maintain a respectful tone about deaf culture

You are NOT designed to:
- Provide medical advice
- Translate general content unrelated to sign language
- Assist with non-sign-language topics

Start each response by acknowledging the user's question about sign language.`;

// ==================== Format Utilities ====================
export const formatTime = (date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const generateMessageId = () => {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
