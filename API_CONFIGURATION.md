# API Configuration Examples

This file provides ready-to-use code snippets for integrating various AI services with the GestureVox Chatbot.

## Current Status

**Translation API**: ✅ MyMemory (No API key needed - already working!)

**Chatbot AI**: Ready for integration with your choice below.

---

## 🤖 Chatbot Integration Examples

### Option 1: OpenAI GPT-3.5/GPT-4 (Recommended)

#### Installation
```bash
npm install openai
```

#### Setup
Create or update `.env` file:
```env
REACT_APP_OPENAI_KEY=your_api_key_here
```

#### Integration Code

Replace the chatbot logic in `App.jsx`:

```javascript
import { GoogleGenAI } from "@google/genai";
import "dotenv/config"; 

const myKey = process.env.GEMINI_API_KEY;

CHATBOT_SYSTEM_PROMPT = "The chatbot uses this system prompt to guide responses toward sign language education: You are an expert Sign Language Guide Assistant. Your purpose is to help users learn about sign language, including: 1. Teaching how to sign specific words, phrases, and common expressions 2. Explaining sign language grammar and syntax 3. Providing cultural context about deaf communities 4. Demonstrating finger-spelling techniques 5. Explaining regional sign language variations 6. Helping with accessibility and inclusive communication"

const client = new GoogleGenAI({
  apiKey: mykey,
  dangerMode: 'ALLOW_BROWSER',
});

// Inside ChatbotPage component
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
    const response = await client.chat.completions.create({
      model: "gemini-2.5-flash-lite", 
      messages: [
        {
          role: 'system',
          content: CHATBOT_SYSTEM_PROMPT
        },
        ...messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.text
        })),
        {
          role: 'user',
          content: inputText
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
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
```

#### Cost
- Free trial: $5 credit
- After trial: Pay-as-you-go (~$0.001-0.003 per message)

#### Pros
- ✅ Excellent quality responses
- ✅ Best for sign language education
- ✅ Easy to set up
- ✅ Good documentation

#### Cons
- ❌ Paid service (after free trial)
- ❌ Requires API key

---

### Option 2: Hugging Face Inference API

#### Installation
```bash
npm install @huggingface/inference
```

#### Setup
Create or update `.env` file:
```env
VITE_HF_TOKEN=your_token_here
```

#### Integration Code

```javascript
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(import.meta.env.VITE_HF_TOKEN);

// Inside ChatbotPage component
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
    // Build conversation context
    const conversationContext = messages
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
      .join('\n');

    const prompt = `${CHATBOT_SYSTEM_PROMPT}\n\n${conversationContext}\nUser: ${inputText}\nAssistant:`;

    const response = await hf.textGeneration({
      model: 'mistralai/Mistral-7B-Instruct-v0.2',
      inputs: prompt,
      parameters: {
        max_new_tokens: 200,
        temperature: 0.7,
        top_p: 0.95,
      },
    });

    const assistantText = response.generated_text
      .split('Assistant:')
      .pop()
      .trim();

    const assistantMessage = {
      id: generateMessageId(),
      role: 'assistant',
      text: assistantText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    speakText(assistantText, 'en-US');
  } catch (error) {
    console.error('Chatbot error:', error);
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
```

#### Cost
- Free tier: Limited free requests
- Paid tier: ~$9/month for unlimited

#### Pros
- ✅ Free tier available
- ✅ Open source models
- ✅ Can be self-hosted
- ✅ Good community support

#### Cons
- ❌ Lower quality than GPT
- ❌ Rate limiting on free tier

---

### Option 3: Custom Backend (Recommended for Production)

#### Setup Backend (Node.js + Express example)

```bash
npm install express cors body-parser
```

**backend/server.js**:

```javascript
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const OpenAI = require('openai');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize OpenAI (or other service)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Chatbot endpoint
app.post('/api/chatbot', async (req, res) => {
  try {
    const { message, conversationHistory, systemPrompt } = req.body;

    // Validate input
    if (!message || !systemPrompt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Build messages array
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text
      })),
      { role: 'user', content: message }
    ];

    // Call OpenAI API (or your chosen service)
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const assistantText = response.choices[0].message.content;

    res.json({ response: assistantText });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Chatbot server running on http://localhost:${PORT}`);
});
```

**Environment Variables** (.env):
```env
OPENAI_API_KEY=your_api_key_here
PORT=3000
```

**Start backend**:
```bash
node server.js
```

#### Frontend Integration Code

```javascript
// Inside ChatbotPage component
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
    const response = await fetch('/api/chatbot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: inputText,
        conversationHistory: messages,
        systemPrompt: CHATBOT_SYSTEM_PROMPT
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get response from chatbot');
    }

    const data = await response.json();

    const assistantMessage = {
      id: generateMessageId(),
      role: 'assistant',
      text: data.response,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    speakText(data.response, 'en-US');
  } catch (error) {
    console.error('Chatbot error:', error);
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
```

#### Deployment Options

- **Local**: Run backend on your machine
- **Docker**: Containerize backend
- **Heroku**: Free/paid hosting
- **Railway**: Easy deployment
- **DigitalOcean**: Affordable VPS
- **AWS**: Scalable cloud option

#### Cost
- Depends on hosting choice
- API costs passed through

#### Pros
- ✅ Full control
- ✅ Can hide API keys
- ✅ Can add authentication
- ✅ Scalable
- ✅ Can customize responses

#### Cons
- ❌ More complex setup
- ❌ Need backend knowledge
- ❌ Additional hosting costs

---

## Comparison Table

| Criteria | OpenAI | Hugging Face | Custom Backend |
|----------|--------|--------------|---|
| **Quality** | Excellent | Good | Depends on model |
| **Cost** | Paid | Free/Paid | Depends on hosting |
| **Setup** | Easy | Medium | Complex |
| **API Key Exposure** | Risk | Risk | Safe |
| **Customization** | Limited | Medium | Full |
| **Scalability** | Good | Good | Excellent |
| **Time to Implement** | 30 min | 30 min | 2+ hours |

---

## Recommendation

### For Quick Testing
→ Use **Hugging Face Free Tier**

### For Production
→ Use **Custom Backend with OpenAI API**

### For Best Quality
→ Use **OpenAI GPT-4**

### For Cost-Conscious
→ Use **Hugging Face Paid Tier**

---

## Additional Customization

### System Prompt for Different Purposes

If you want different chatbot behaviors, modify the system prompt:

**For Medical Assistant**:
```javascript
export const CHATBOT_SYSTEM_PROMPT = `You are a medical information assistant...`;
```

**For Travel Guide**:
```javascript
export const CHATBOT_SYSTEM_PROMPT = `You are a travel guide assistant...`;
```

**For Language Teacher**:
```javascript
export const CHATBOT_SYSTEM_PROMPT = `You are a language teaching assistant...`;
```

### Response Formatting

For better responses, you can add formatting instructions:

```javascript
const prompt = `${CHATBOT_SYSTEM_PROMPT}

Please format your response as follows:
1. Start with a brief answer
2. Provide 2-3 specific examples
3. End with a helpful tip

User question: ${inputText}`;
```

---

## Testing Your Integration

### Step 1: Verify Backend Running
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok"}
```

### Step 2: Test Chatbot Endpoint
```bash
curl -X POST http://localhost:3000/api/chatbot \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I sign hello?",
    "systemPrompt": "You are a sign language assistant."
  }'
```

### Step 3: Test in Frontend
- Open app in browser
- Go to Chatbot page
- Send test message
- Verify response appears

---

## Troubleshooting Integration

### OpenAI Issues
- **Error: Invalid API key** → Check .env file
- **Error: Rate limit** → Implement exponential backoff
- **Error: Timeout** → Increase timeout value

### Hugging Face Issues
- **Error: Model not found** → Check model name
- **Error: Rate limited** → Wait or upgrade plan
- **Error: Token invalid** → Regenerate token

### Custom Backend Issues
- **Error: Cannot POST /api/chatbot** → Check backend running
- **Error: CORS error** → Enable CORS on backend
- **Error: Timeout** → Check network connectivity

---

## Security Best Practices

1. **Never expose API keys in frontend**
   ```javascript
   // ❌ BAD
   const apiKey = "sk-xxx";
   
   // ✅ GOOD
   const response = await fetch('/api/chatbot', { ... });
   ```

2. **Always use HTTPS in production**
   ```javascript
   // Only allow HTTPS
   if (process.env.NODE_ENV === 'production' && location.protocol !== 'https:') {
     location.protocol = 'https:';
   }
   ```

3. **Implement rate limiting**
   ```javascript
   // Limit requests to 1 per second
   let lastMessageTime = 0;
   const handleSendMessage = async (e) => {
     const now = Date.now();
     if (now - lastMessageTime < 1000) {
       alert('Please wait before sending another message');
       return;
     }
     lastMessageTime = now;
     // ... rest of code
   };
   ```

4. **Validate user input**
   ```javascript
   if (!inputText.trim() || inputText.length > 1000) {
     alert('Invalid message length');
     return;
   }
   ```

---

## Environment Variables Reference

### For OpenAI
```env
VITE_OPENAI_KEY=sk-proj-xxx
```

### For Hugging Face
```env
VITE_HF_TOKEN=hf_xxx
```

### For Custom Backend
```env
VITE_API_URL=http://localhost:3000
VITE_API_KEY=your_secret_key
```

---

**Choose your integration method and enjoy enhanced GestureVox Chatbot! 🚀**
