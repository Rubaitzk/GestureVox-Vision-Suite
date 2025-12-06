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
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.error('Speech Synthesis API not supported');
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    try {
      if (!text || String(text).trim().length === 0) {
        // nothing to speak
        console.debug('speakText: empty text, skipping');
        resolve();
        return;
      }
      const synth = window.speechSynthesis;

      // Helper to select a voice that best matches the requested language
      const pickVoice = (voicesList, lang) => {
        if (!voicesList || voicesList.length === 0) return null;
        const normalized = (lang || '').toLowerCase();
        // exact match first
        let v = voicesList.find(x => x.lang && x.lang.toLowerCase() === normalized);
        if (v) return v;
        // partial match (prefix)
        const prefix = normalized.split('-')[0];
        v = voicesList.find(x => x.lang && x.lang.toLowerCase().startsWith(prefix));
        if (v) return v;
        // fallback to default
        return voicesList[0];
      };

      const speakNow = (voices) => {
        // Cancel any ongoing speech to ensure immediate playback
        try { synth.cancel(); } catch (e) { /* ignore */ }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;

        // Use the browser's default voice instead of selecting specific voices
        // (Some environments expose voices inconsistently; using the default
        // ensures a single voice is used for all languages as requested.)

        utterance.onstart = () => {
          console.debug('Speech started');
        };
        utterance.onend = () => {
          resolve();
        };
        utterance.onerror = (e) => {
          console.error('Speech synthesis error', e);
          resolve();
        };

        synth.speak(utterance);
      };

      // Speak immediately using available voices (or none). Waiting for
      // `voiceschanged` may make the call async and get blocked by browser
      // autoplay/user-gesture policies. Speaking immediately avoids that.
      const voices = synth.getVoices();
      speakNow(voices);
    } catch (err) {
      console.error('speakText failed:', err);
      resolve();
    }
  });
};

// ==================== Translation API Utils ====================
// Free translation APIs:
// 1. MyMemory Translation API (No API key required)
// 2. LibreTranslate (Open source, self-hosted option available)
// 3. Rapid Translate (Has free tier)
// Recommendation: MyMemory for simplicity (no key required)

export const translateText = async (text, targetLanguage) => {
  try {
    // If Azure Translator env vars are present, use Azure Translator (preferred)
    const azureKey = import.meta.env.VITE_LANG_TRANS_API_KEY;
    const azureRegion = import.meta.env.VITE_REGION_LANG;
    const azureEndpoint = import.meta.env.VITE_LANG_TRANS_ENDPOINT || 'https://api.cognitive.microsofttranslator.com';

    if (azureKey) {
      const url = `${azureEndpoint}/translate?api-version=3.0&to=${encodeURIComponent(targetLanguage)}`;

      const headers = {
        'Ocp-Apim-Subscription-Key': azureKey,
        'Content-Type': 'application/json',
      };
      if (azureRegion) headers['Ocp-Apim-Subscription-Region'] = azureRegion;

      const body = [{ text }];

      const resp = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Azure Translator error: ${resp.status} ${errText}`);
      }

      const data = await resp.json();
      // response is an array; first item contains translations array
      if (Array.isArray(data) && data[0] && data[0].translations && data[0].translations[0]) {
        return data[0].translations[0].text;
      }

      throw new Error('Unexpected Azure Translator response');
    }
    // Fallback to MyMemory Translation API (free, no authentication required)
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
    // On error return original text as graceful fallback
    return text;
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

Conversation rules:
- If the user greets (e.g., "hello") or performs simple small-talk, reply briefly and naturally (example: "Hello — how can I help you with sign language today?"). Do not always expand greetings into full sign-language lessons.
- If the user asks for help about sign language, provide clear, concise guidance. For simple words or phrases, offer a brief description or finger-spelling steps.
- If the user's request is outside of sign language, reply: "I'm trained to help with sign language topics. I can provide guidance on signing words, grammar, cultural context, and practice tips. For other topics, I can't help." 

When responding:
- Be clear and educational
- Use descriptive language to explain hand movements, positions, and facial expressions when teaching signs
- Provide step-by-step instructions when teaching signs
- Encourage practice and patience
- Suggest resources when appropriate
- Always maintain a respectful tone about deaf culture

Start each sign-language response by acknowledging the user's question when appropriate.`;

// ==================== Format Utilities ====================
export const formatTime = (date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const generateMessageId = () => {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
