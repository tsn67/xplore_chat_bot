import express from 'express';
import { config } from "dotenv";
import NodeCache from 'node-cache';
import PQueue from 'p-queue';
import fetch from 'node-fetch';

config();

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Initialize request queue
const queue = new PQueue({ 
  concurrency: 5,
  timeout: 30000
});

// Initialize cache with 5 minute TTL
const cache = new NodeCache({ 
  stdTTL: 300,
  checkperiod: 60
});

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Event data
const eventData = {
  general: {
    name: "Xplore '24",
    description: "Xplore 24 is the Techno-Management-Cultural Festival of Government College of Engineering, Kannur. It brings together technology, management, and culture through various events, workshops, and competitions.",
    venue: "Government College of Engineering, Kannur (GCEK)",
    contact: {
      general: "xplore24.gcek@gmail.com | +91 6238 055 808",
      technical: "support@xplore24.com | +91 80756 83613"
    }
  },
  // ... rest of your event data
};

const systemPrompt = `You are the official AI assistant for Xplore '24, the Techno-Management-Cultural Festival of GCEK. Use this information to help attendees:

Event Overview:
${eventData.general.description}

Important Information:
- Venue: ${eventData.general.venue}
- Contact: ${eventData.general.contact.general}

Please provide accurate, helpful information about the event. If you're unsure about any details, please say so politely.`;

// Generate cache key from message
function generateCacheKey(message) {
  return `chat_${Buffer.from(message).toString('base64')}`;
}

// Process chat message using OpenRouter API
async function processChatMessage(message) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://your-site.com', // Replace with your site
      'X-Title': 'Xplore 24 Chat Assistant' // Your app name
    },
    body: JSON.stringify({
      model: 'openai/gpt-3.5-turbo', // OpenRouter model identifier for GPT-3.5
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'OpenRouter API request failed');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Middleware for basic request validation
function validateRequest(req, res, next) {
  if (!req.body.message || typeof req.body.message !== 'string' || req.body.message.length > 500) {
    return res.status(400).json({ 
      error: 'Invalid message format or length' 
    });
  }
  next();
}

// Chat endpoint with optimizations
app.post('/chat', validateRequest, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { message } = req.body;
    const cacheKey = generateCacheKey(message);
    
    // Check cache first
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      console.log(`Cache hit for: ${cacheKey}`);
      return res.json({
        response: cachedResponse,
        source: 'cache'
      });
    }

    // Queue the request
    const response = await queue.add(async () => {
      return await processChatMessage(message);
    });

    // Cache the response
    cache.set(cacheKey, response);

    // Send response with timing info
    const processingTime = Date.now() - startTime;
    res.json({
      response,
      source: 'live',
      processingTime: `${processingTime}ms`
    });

  } catch (error) {
    console.error('Chat error:', error);
    
    // Provide more detailed error response
    res.status(500).json({ 
      error: 'Failed to process message',
      details: error.message,
      processingTime: `${Date.now() - startTime}ms`
    });
  }
});

// Health check endpoint with basic metrics
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    queueSize: queue.size,
    queuePending: queue.pending,
    cacheStats: cache.getStats(),
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Optimized server running on port ${PORT}`);
});