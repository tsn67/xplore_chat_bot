import  NodeCache  from 'node-cache';
import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

// Initialize cache
const cache = new NodeCache({ 
  stdTTL: 300,  // 5 minutes
  checkperiod: 60
});

// Event data (same as original)
const eventData = {
  "Technical Events": {
    "Robotics": [
      {
        "name": "BattleBots Arena",
        "venue": "Robotics Lab",
        "date": "Feb 8, 2025",
        "time": "9 AM - 5 PM",
        "fee": 699,
        "prizes": "35K"
      },
      {
        "name": "Robotrack Challenge",
        "venue": "Robotics Lab",
        "date": "Feb 7, 2025",
        "time": "9 AM - 5 PM",
        "fee": 499,
        "prizes": "25K"
      }
    ],
    "Workshops": [
      {
        "name": "LLM Fine-Tuning and Edge AI",
        "venue": "System Lab DB02",
        "date": "Feb 7, 2025",
        "time": "9 AM - 5 PM",
        "fee": 399
      },
      {
        "name": "Drone Workshop",
        "venue": "Outdoor Arena",
        "date": "Feb 8, 2025",
        "time": "10 AM - 2:30 PM",
        "fee": 499
      }
    ]
  },
  "Cultural Events": {
    "Dance": [
      {
        "name": "Oppana",
        "venue": "Main Stage",
        "date": "Feb 7, 2025",
        "time": "10 AM - 12 PM",
        "fee": 100,
        "prizes": "15K"
      }
    ]
  }
};

// System prompt
const systemPrompt = `You are the AI assistant for Xplore '24, the Techno-Management-Cultural Festival of Government College of Engineering, Kannur. Use this event information to help attendees:

Event Details:
${JSON.stringify(eventData, null, 2)}

Additional Information:
- Venue: Government College of Engineering, Kannur (GCEK)
- Contact: xplore24.gcek@gmail.com
- General Inquiries: +91 6238 055 808
- Technical Support: +91 80756 83613
`;

// Initialize Groq chat model
const initializeGroqChat = (apiKey) => {
  return new ChatGroq({
    apiKey: apiKey,
    model: "mixtral-8x7b-32768", // You can change this to other Groq models
    temperature: 0.7,
    maxTokens: 300,
  });
};

// Chat function to handle messages
export const chat = async (req, res) => {
  const startTime = Date.now();

  try {
    const { message, groqApiKey } = req.body;

    if (!message || !groqApiKey) {
      return res.status(400).json({ 
        error: 'Message and Groq API key are required' 
      });
    }

    // Check cache
    const cacheKey = `chat_${Buffer.from(message).toString('base64')}`;
    const cachedResponse = cache.get(cacheKey);

    if (cachedResponse) {
      return res.json({
        response: cachedResponse,
        source: 'cache',
        processingTime: `${Date.now() - startTime}ms`
      });
    }

    // Initialize chat model
    const model = initializeGroqChat(groqApiKey);

    // Create message list
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(message)
    ];

    // Get response from Groq
    const result = await model.invoke(messages);
    const response = result.content;

    // Cache response
    cache.set(cacheKey, response);

    res.json({
      response,
      source: 'live',
      processingTime: `${Date.now() - startTime}ms`
    });

  } catch (error) {
    console.error('Chat error:', error);

    // Handle rate limiting
    if (error.response?.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Please try again later.',
        processingTime: `${Date.now() - startTime}ms`
      });
    }

    res.status(500).json({ 
      error: 'Failed to process message',
      details: error.message,
      processingTime: `${Date.now() - startTime}ms`
    });
  }
};

// Error handler middleware
export const errorHandler = (err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};