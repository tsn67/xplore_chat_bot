import express from 'express';
import { config } from "dotenv";
import cors from 'cors';
import chatRoute from './routes/chatRoute.js'

config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

const corsOptions = {
  origin: '*', 
  methods: 'GET,POST,PUT,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type,Authorization',
};

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message
  });
});

app.use(cors(corsOptions));

app.use('', chatRoute);


// const queue = new PQueue({ 
//   concurrency: 5,
//   timeout: 30000
// });


// const cache = new NodeCache({ 
//   stdTTL: 300,
//   checkperiod: 60
// });


// const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
// const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';


// const eventData = {
//   general: {
//     name: "Xplore '24",
//     description: "Xplore 24 is the Techno-Management-Cultural Festival of Government College of Engineering, Kannur. It brings together technology, management, and culture through various events, workshops, and competitions.",
//     venue: "Government College of Engineering, Kannur (GCEK)",
//     contact: {
//       general: "xplore24.gcek@gmail.com | +91 6238 055 808",
//       technical: "support@xplore24.com | +91 80756 83613"
//     }
//   },
  
// };

// const systemPrompt = `You are the official AI assistant for Xplore '24, the Techno-Management-Cultural Festival of GCEK. Use this information to help attendees:

// Event Overview:
// ${eventData.general.description}

// Important Information:
// - Venue: ${eventData.general.venue}
// - Contact: ${eventData.general.contact.general}

// Please provide accurate, helpful information about the event. If you're unsure about any details, please say so politely.`;


// function generateCacheKey(message) {
//   return `chat_${Buffer.from(message).toString('base64')}`;
// }


// async function processChatMessage(message) {
//   const response = await fetch(OPENROUTER_URL, {
//     method: 'POST',
//     headers: {
//       'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
//       'Content-Type': 'application/json',
//       'HTTP-Referer': 'https://www.xplore24.com/', 
//       'X-Title': 'Xplore 24 Chat Assistant' 
//     },
//     body: JSON.stringify({
//       model: 'openai/gpt-3.5-turbo', 
//       messages: [
//         { role: "system", content: systemPrompt },
//         { role: "user", content: message }
//       ],
//       temperature: 0.7,
//       max_tokens: 500
//     })
//   });

//   if (!response.ok) {
//     const error = await response.json();
//     throw new Error(error.message || 'OpenRouter API request failed');
//   }

//   const data = await response.json();
//   return data.choices[0].message.content;
// }


// function validateRequest(req, res, next) {
//   if (!req.body.message || typeof req.body.message !== 'string' || req.body.message.length > 500) {
//     return res.status(400).json({ 
//       error: 'Invalid message format or length' 
//     });
//   }
//   next();
// }


// app.post('/chat', validateRequest, async (req, res) => {
//   const startTime = Date.now();
  
//   try {
//     const { message } = req.body;
//     const cacheKey = generateCacheKey(message);
    
    
//     const cachedResponse = cache.get(cacheKey);
//     if (cachedResponse) {
//       console.log(`Cache hit for: ${cacheKey}`);
//       return res.json({
//         response: cachedResponse,
//         source: 'cache'
//       });
//     }

  
//     const response = await queue.add(async () => {
//       return await processChatMessage(message);
//     });

    
//     cache.set(cacheKey, response);

    
//     const processingTime = Date.now() - startTime;
//     res.json({
//       response,
//       source: 'live',
//       processingTime: `${processingTime}ms`
//     });

//   } catch (error) {
//     console.error('Chat error:', error);
    
    
//     res.status(500).json({ 
//       error: 'Failed to process message',
//       details: error.message,
//       processingTime: `${Date.now() - startTime}ms`
//     });
//   }
// });


// app.get('/health', (req, res) => {
//   res.json({ 
//     status: 'ok',
//     queueSize: queue.size,
//     queuePending: queue.pending,
//     cacheStats: cache.getStats(),
//     uptime: process.uptime()
//   });
// });




// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`server running ${PORT}`);
// });

export default app;