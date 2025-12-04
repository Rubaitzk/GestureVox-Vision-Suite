# GestureVox-Vision-Suite
This repository is one of my subject projects which is about building a web app that assists in providing a chat like interface for sign language gestures also implementing additional features like chatbot, speech to text and language translation 


# GestureVox Fusion Suite

A comprehensive web application for **speech recognition, multi-language translation, and sign language guidance** with an integrated chatbot.

## 🎯 Features

### 🏠 Home Page - Speech & Translation
- **Real-time Speech Recognition**: Uses Web Speech API for accurate voice input
- **Multi-language Support**: English, Urdu, Spanish, French
- **Automatic Translation**: Recognized speech is automatically translated
- **Text-to-Speech**: Play back any message using speech synthesis
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

### 💬 Chatbot Page - Sign Language Guide
- **Smart Chatbot**: Specialized in sign language education and guidance
- **Voice Input**: Speak your questions directly to the chatbot
- **Multi-language Chat**: Switch between English and Urdu
- **Message History**: Full conversation history with timestamps
- **Auto-speak**: Responses are automatically spoken aloud
- **Ready for AI Integration**: Built with hooks for OpenAI, Hugging Face, and other APIs

### 🎨 Design Excellence
- **Dark Mode UI**: Professional dark theme with cyan/indigo accents
- **Smooth Animations**: Polished transitions and loading states
- **Accessibility**: Keyboard navigation and screen reader support
- **Mobile First**: Optimized for all screen sizes

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Modern web browser (Chrome, Firefox, Safari, or Edge)
- Microphone access for speech recognition

### Installation

```bash
# Navigate to project directory
cd "f:\SoftwareE\Pro"

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will open at `http://localhost:5173`

## 📖 Usage

### Home Page: Speech Recognition & Translation

1. **Select Language**: Choose your desired output language (English, Urdu, Spanish, or French)
2. **Click Mic Button**: Start recording your speech
3. **Speak Clearly**: Say your message
4. **View Results**: See real-time transcription and translation
5. **Playback**: Click "Speak" to hear the message aloud
6. **Clear History**: Use the "Clear" button to reset the conversation

### Chatbot Page: Sign Language Assistant

1. **Navigate to Chatbot**: Click the "Chatbot" tab at the top
2. **Ask Questions**: Type or speak questions about sign language
3. **Voice Input**: Use the mic button to speak instead of typing
4. **View Responses**: Chat history with timestamps and auto-speak
5. **Change Language**: Use the flags at the bottom to switch languages

## 🔧 Technical Details

### Technologies Used

- **React 19**: Modern UI library
- **Vite**: Lightning-fast build tool
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide Icons**: Beautiful icon library
- **Web Speech API**: Native browser speech recognition
- **MyMemory Translation API**: Free translation service (no API key needed)

### Key Features

#### Speech Recognition (Home Page)
- Real-time speech-to-text using Web Speech API
- Supports: English, Urdu, Spanish, French
- Interim results shown while speaking
- Final results saved to message history

#### Translation
- Free MyMemory Translation API (no authentication needed!)
- Automatic translation of recognized speech
- 100+ languages supported
- Fallback for translation errors

#### Chatbot (Chatbot Page)
- System prompt configured for sign language education
- Full chat interface with history
- Voice input capability
- Ready for AI API integration (OpenAI, Hugging Face, etc.)
- Auto-speak responses

## 📡 Free Translation API

**MyMemory Translation API** - Currently implemented and working!

✅ **No API key required**  
✅ **Unlimited free requests**  
✅ **100+ languages supported**  
✅ **Simple REST API**

See `IMPLEMENTATION_GUIDE.md` for:
- Alternative translation APIs
- Detailed integration instructions
- How to add your own chatbot AI

## 🌐 Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Speech Recognition | ✅ | ✅ | ✅ | ✅ |
| Speech Synthesis | ✅ | ✅ | ✅ | ✅ |
| Translation API | ✅ | ✅ | ✅ | ✅ |

**Recommended**: Use Chrome or Edge for best speech recognition.

## 📱 Responsive Design

- **Desktop (1024px+)**: Full layout with side controls
- **Tablet (768px-1023px)**: Optimized touch controls
- **Mobile (< 768px)**: Stacked layout, full-height app

## 🎓 Sign Language Learning

The chatbot is configured to help with:
- How to sign specific words and phrases
- Sign language grammar and syntax
- Finger-spelling techniques
- Regional variations
- Deaf culture and accessibility

## 📚 Documentation

- **IMPLEMENTATION_GUIDE.md**: Detailed technical guide, API integration, and troubleshooting
- **README.md**: This file - quick overview and usage

## 🔄 Build Commands

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## 📦 Project Structure

```
src/
├── App.jsx          # Main app component with Home & Chatbot pages
├── App.css          # Complete styling (CSS only, no inline styles)
├── utils.js         # Speech API, Translation API, utilities
├── index.css        # Tailwind imports
└── main.jsx         # React entry point

public/             # Static assets
package.json        # Dependencies and scripts
tailwind.config.js  # Tailwind configuration
vite.config.js      # Vite configuration
```

## 🔒 Security

- ✅ No sensitive data stored in browser
- ✅ All APIs use HTTPS
- ✅ No API keys in frontend (use backend for API integration)
- ✅ XSS protection via React
- ✅ Web Speech API requires user permission

## 🐛 Troubleshooting

**Speech Recognition Not Working?**
- Check microphone permissions in browser
- Ensure browser supports Web Speech API
- Try Chrome or Edge for best results
- Check browser console for error messages

**Translation Not Working?**
- Verify internet connection
- MyMemory API may be temporarily down (rare)
- Try refreshing the page
- Check browser console for CORS errors

**Chatbot Not Responding?**
- If using custom API, ensure it's properly configured
- Check network tab in browser developer tools
- Verify API endpoint is accessible

## 🚀 Performance

- ⚡ **Fast Load Time**: Vite provides instant server start and hot reload
- 🎯 **Optimized Bundle**: Minimal JavaScript, CSS-based animations
- 📱 **Mobile Optimized**: Responsive design with touch-friendly controls
- 🔄 **Real-time Processing**: Smooth UI updates during speech recognition

## 💡 Next Steps

1. **Read IMPLEMENTATION_GUIDE.md** for detailed technical information
2. **Test Speech Recognition** on Home page
3. **Try Translation** with different languages
4. **Explore Chatbot** for sign language queries
5. **Integrate Your Chatbot AI** when ready (see IMPLEMENTATION_GUIDE.md)

## 📞 Support

For detailed technical information and troubleshooting:
- See `IMPLEMENTATION_GUIDE.md`
- Check browser console for errors
- Verify all prerequisites are met

---

**Version**: 1.0.0  
**Last Updated**: December 2025  
**Status**: ✅ Production Ready

