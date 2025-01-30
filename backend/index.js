import express from 'express';
import { config } from "dotenv";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import NodeCache from 'node-cache';
import PQueue from 'p-queue';
import fs from 'fs';

config();

// Initialize Express app with increased limits
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Initialize request queue
const queue = new PQueue({ 
  concurrency: 5, // Handle 5 concurrent requests
  timeout: 30000  // 30 second timeout
});

// Initialize cache with 5 minute TTL
const cache = new NodeCache({ 
  stdTTL: 300,
  checkperiod: 60
});

// Handle Google credentials
if (process.env.GOOGLE_BASE64_KEY) {
  const buffer = Buffer.from(process.env.GOOGLE_BASE64_KEY, 'base64');
  fs.writeFileSync('./cred.json', buffer);
  console.log('Google credentials restored!');
}

// Event data
const eventData = {
  // ... [Your existing event data remains the same]
};

// Initialize the Gemini model with a connection pool
const modelPool = Array(3).fill(null).map(() => new ChatVertexAI({
  model: "gemini-1.5-flash",
  temperature: 0.7,
  maxRetries: 2,
  timeout: 20000
}));

let currentModelIndex = 0;

// Get next available model from pool
function getNextModel() {
  const model = modelPool[currentModelIndex];
  currentModelIndex = (currentModelIndex + 1) % modelPool.length;
  return model;
}

const systemPrompt = `You are the official AI assistant for Xplore '24, the Techno-Management-Cultural Festival of GCEK. Use this information to help attendees:
// ... [Your existing system prompt remains the same]`;

// Generate cache key from message
function generateCacheKey(message) {
  return `chat_${Buffer.from(message).toString('base64')}`;
}

// Process chat message
async function processChatMessage(message) {
  const promptTemplate = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["human", message]
  ]);
  
  const prompt = await promptTemplate.invoke({});
  const model = getNextModel();
  const response = await model.invoke(prompt);
  
  return response.content;
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