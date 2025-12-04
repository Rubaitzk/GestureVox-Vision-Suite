# GestureVox Fusion Suite - Implementation Guide

## Overview

GestureVox Fusion Suite is a comprehensive web application for **speech-to-text recognition, multi-language translation, and sign language guidance chatbot**. The app separates into two main sections:

### 1. **Home Page** - Speech Recognition & Translation
- Real-time speech-to-text with Web Speech API
- Multi-language output support (English, Urdu, Spanish, French)
- Automatic translation of recognized speech
- Text-to-speech playback capability

### 2. **Chatbot Page** - Sign Language Guide
- Interactive sign language guidance chatbot
- System prompt configured for sign language education
- Speech input support in chatbot
- Multi-language interaction support
- Ready for AI API integration

---

## Free Translation APIs

### Recommended: **MyMemory Translation API** ⭐ (Currently Implemented)

**Why Choose MyMemory?**
- ✅ **NO API key required**
- ✅ **Free tier: Unlimited requests**
- ✅ **Simple REST API**
- ✅ **Supports 100+ languages**
- ✅ **No rate limiting issues for normal usage**

**Endpoint:**
```
https://api.mymemory.translated.net/get?q=[TEXT]&langpair=[SOURCE]|[TARGET]
```

**Example:**
```javascript
// Translate "Hello" from English to Urdu
https://api.mymemory.translated.net/get?q=Hello&langpair=en|ur
```

**Response:**
```json
{
  "responseStatus": 200,
  "responseData": {
    "translatedText": "ہیلو"
  }
}
```

**Implementation (Already in utils.js):**
```javascript
export const translateText = async (text, targetLanguage) => {
  const response = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLanguage}`
  );
  const data = await response.json();
  return data.responseData.translatedText;
};
```

---

### Alternative Options

#### **LibreTranslate** (Self-hosted or API)
- Open-source alternative
- Free tier available at https://libretranslate.com/
- Can be self-hosted for complete control

**Endpoint:**
```
https://libretranslate.com/translate
```

**Implementation:**
```javascript
const translateViaLibreTranslate = async (text, targetLang) => {
  const response = await fetch('https://libretranslate.com/translate', {
    method: 'POST',
    body: JSON.stringify({
      q: text,
      source: 'auto',
      target: targetLang
    }),
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await response.json();
  return data.translatedText;
};
```

#### **Google Cloud Translation API** (Paid, but free trial)
- Most accurate translations
- $15/month free credit for new users
- Requires API key

#### **Azure Translator** (Paid, but free tier)
- Enterprise-grade translations
- Free tier: 2 million characters/month
- Requires API key

---

## Language Codes Reference

Currently supported in the app:

| Language | Code | Flag |
|----------|------|------|
| English | `en` | 🇬🇧 |
| Urdu | `ur` | 🇵🇰 |
| Spanish | `es` | 🇪🇸 |
| French | `fr` | 🇫🇷 |

For MyMemory API, use these codes in the `langpair` parameter.

---

## Web Speech API Integration

### Speech Recognition (STT)

The app uses the native **Web Speech API** for speech recognition. No external API needed!

```javascript
import { startSpeechRecognition } from './utils.js';

// Start listening
const recognition = startSpeechRecognition(
  'en-US',  // Language
  (transcript, isFinal) => {
    console.log(transcript);
  },
  (error) => console.error(error)
);
```

**Supported Language Codes:**
- `en-US` - English (US)
- `en-GB` - English (UK)
- `ur-PK` - Urdu (Pakistan)
- `es-ES` - Spanish (Spain)
- `fr-FR` - French (France)
- `de-DE` - German (Germany)

### Text-to-Speech (TTS)

Also uses native Web Speech Synthesis API.

```javascript
import { speakText } from './utils.js';

speakText('Hello World', 'en-US');
```

---

## Chatbot Integration

### System Prompt

The chatbot uses this system prompt to guide responses toward sign language education:

```
You are an expert Sign Language Guide Assistant. Your purpose is to help users learn about sign language, including:

1. Teaching how to sign specific words, phrases, and common expressions
2. Explaining sign language grammar and syntax
3. Providing cultural context about deaf communities
4. Demonstrating finger-spelling techniques
5. Explaining regional sign language variations
6. Helping with accessibility and inclusive communication
```

### How to Add a Real Chatbot API

#### **Option 1: OpenAI GPT API** (Recommended)

1. **Sign up** at https://platform.openai.com
2. **Get API key** from dashboard
3. **Install package:**
```bash
npm install openai
```

4. **Update chatbot logic** in App.jsx:
```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_KEY,
  dangerMode: 'ALLOW_BROWSER',
});

const handleSendMessage = async (e) => {
  e.preventDefault();
  if (!inputText.trim()) return;

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
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: CHATBOT_SYSTEM_PROMPT
        },
        ...messages.map(m => ({
          role: m.role,
          content: m.text
        })),
        {
          role: 'user',
          content: inputText
        }
      ],
      temperature: 0.7,
    });

    const assistantMessage = {
      id: generateMessageId(),
      role: 'assistant',
      text: response.choices[0].message.content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    speakText(assistantMessage.text, 'en-US');
  } catch (error) {
    console.error('Chatbot error:', error);
  } finally {
    setIsLoading(false);
  }
};
```

5. **Add environment variable** in `.env`:
```
REACT_APP_OPENAI_KEY=your_api_key_here
```

#### **Option 2: Hugging Face API**

1. **Sign up** at https://huggingface.co
2. **Get API token** from settings
3. **Install package:**
```bash
npm install @huggingface/inference
```

4. **Use in chatbot:**
```javascript
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.REACT_APP_HF_TOKEN);

const response = await hf.textGeneration({
  model: 'mistralai/Mistral-7B-Instruct-v0.2',
  inputs: `${CHATBOT_SYSTEM_PROMPT}\n\nUser: ${inputText}`,
  parameters: {
    max_new_tokens: 200,
  },
});
```

#### **Option 3: Cloud Backend (Recommended for Production)**

Create a backend server that handles chatbot logic:

```javascript
// Backend endpoint
const response = await fetch('/api/chatbot', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: inputText,
    conversationHistory: messages,
    systemPrompt: CHATBOT_SYSTEM_PROMPT
  })
});

const data = await response.json();
// Use data.response as chatbot message
```

**Backend Example (Node.js + Express):**
```javascript
app.post('/api/chatbot', async (req, res) => {
  const { message, conversationHistory, systemPrompt } = req.body;
  
  // Call OpenAI, Hugging Face, or your chosen service
  const response = await callChatbotService(
    message,
    conversationHistory,
    systemPrompt
  );
  
  res.json({ response });
});
```

---

## Project Structure

```
src/
├── App.jsx              # Main component with Home & Chatbot pages
├── App.css              # All styling (no inline styles in JSX)
├── utils.js             # Speech API, Translation API, Helper functions
├── index.css            # Tailwind imports
└── main.jsx             # React entry point
```

---

## Key Features Implemented

### ✅ Home Page
- **Speech Recognition**: Click mic button to record speech
- **Language Selection**: Choose output language (English, Urdu, Spanish, French)
- **Real-time Translation**: Automatically translates recognized speech
- **Message Display**: Shows all conversations with timestamps
- **Text-to-Speech**: Speak any message back
- **Clear Function**: Reset conversation history

### ✅ Chatbot Page
- **Interactive Chat**: Full chat interface with message history
- **Sign Language Guidance**: System prompt configured for sign language topics
- **Speech Input**: Mic button for voice input in chatbot
- **Language Support**: Switch between English and Urdu
- **Auto-speak**: Chatbot responses are spoken aloud
- **Ready for API Integration**: Placeholder code for OpenAI, Hugging Face, etc.

### ✅ UI/UX
- **Dark Mode**: Professional dark theme with cyan/indigo accents
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Smooth Animations**: Slide-in, fade-in, and pulse animations
- **CSS-based Styling**: All styles in CSS files, no inline styles
- **Real-time Indicators**: Visual feedback for listening, processing, speaking

---

## Usage Instructions

### Start the App
```bash
cd "f:\SoftwareE\Pro"
npm run dev
```

Then open: `http://localhost:5173` (or the displayed port)

### Home Page
1. Click the **Home** tab (if not already there)
2. Select desired output language
3. Click the large **mic button** to start recording
4. Speak your message
5. Watch the real-time translation appear
6. Click **Speak** button to hear the message back

### Chatbot Page
1. Click the **Chatbot** tab
2. Ask questions about sign language
3. Use the **mic button** to speak instead of typing
4. Switch language using the flags at the bottom
5. Clear chat with the **clear button**

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Web Speech API (STT) | ✅ | ✅ | ✅ | ✅ |
| Speech Synthesis (TTS) | ✅ | ✅ | ✅ | ✅ |
| Fetch API | ✅ | ✅ | ✅ | ✅ |

**Note:** For best compatibility, use Chrome or Edge on desktop.

---

## Troubleshooting

### Speech Recognition Not Working
- **Check browser**: Web Speech API requires Chrome, Firefox, Safari, or Edge
- **Check permissions**: Browser should ask for microphone access
- **Allow microphone**: Grant permission in browser settings

### Translation API Not Working
- **Check internet**: Ensure you have active internet connection
- **Check API**: Visit https://api.mymemory.translated.net/get?q=hello&langpair=en|ur to test
- **CORS Issues**: If using custom backend, ensure CORS is configured

### Chatbot API Integration Issues
- **API Key**: Double-check API key in environment variables
- **Network**: Ensure backend endpoint is accessible
- **Headers**: Verify Content-Type and authorization headers

---

## Security Considerations

1. **Never commit API keys**: Use environment variables
2. **Backend validation**: Validate all user inputs on backend
3. **Rate limiting**: Implement rate limiting for API calls
4. **HTTPS only**: Use HTTPS in production
5. **CORS policy**: Configure CORS properly for cross-origin requests

---

## Next Steps for Enhancement

1. **Database**: Store conversation history
2. **User Accounts**: Add authentication and user profiles
3. **Sign Language Video**: Integrate video demonstrations
4. **Multi-user**: Add real-time collaboration features
5. **Mobile App**: Build React Native version
6. **Accessibility**: Enhance keyboard navigation and screen reader support
7. **Analytics**: Track usage patterns and learning progress

---

## Support & Resources

- **Web Speech API**: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- **MyMemory Translation**: https://mymemory.translated.net/
- **Tailwind CSS**: https://tailwindcss.com/
- **Lucide Icons**: https://lucide.dev/
- **React Docs**: https://react.dev/

---

## License

This project is open source and available under the MIT License.

---

**Last Updated**: December 2025
**Version**: 1.0.0
