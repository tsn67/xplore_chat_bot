
import { config } from "dotenv";
import NodeCache from 'node-cache';
import PQueue from 'p-queue';
import fetch from 'node-fetch';

config();


const queue = new PQueue({ 
  concurrency: 5,
  timeout: 30000
});


const cache = new NodeCache({ 
  stdTTL: 300,
  checkperiod: 60
});


const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

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
    
};

const systemPrompt = `You are the official AI assistant for Xplore '24, the Techno-Management-Cultural Festival of GCEK. Use this information to help attendees:

Event Overview:
${eventData.general.description}

Important Information:
- Venue: ${eventData.general.venue}
- Contact: ${eventData.general.contact.general}

Please provide accurate, helpful information about the event. If you're unsure about any details, please say so politely.
this is some json data about our xplore chat app possible questions and answers,

workshops in xplore are,
info about xplore wokshops:
{
  "Technical Events": {
    "Hackathons": [
      {
        "name": "Innovators Asylum 3.0",
        "venue": "Main Auditorium",
        "date": "Feb 9, 2024",
        "time": "9 AM - 9 AM (24 hours)",
        "fee": 200,
        "prizes": "30K"
      }
    ],
    "Coding Competitions": [
      {
        "name": "Code Vortex",
        "venue": "Online + CCF Lab",
        "date": "Feb 8, 2024",
        "time": "6 PM - 9 PM",
        "fee": 50,
        "prizes": "6K"
      }
    ],
    "Robotics": [
      {
        "name": "Robo War",
        "venue": "PG Block Ground Floor",
        "date": "Feb 9, 2024",
        "time": "9 AM - 5 PM",
        "fee": 250,
        "prizes": "40K"
      }
    ]
  },
  "Management Events": {
    "Stock Market": [
      {
        "name": "Stock Wizards",
        "venue": "PG Block 105",
        "date": "Feb 9, 2024",
        "time": "1 PM - 5 PM",
        "fee": 50,
        "prizes": "5K"
      }
    ]
  },
  "Cultural Events": {
    "Music": [
      {
        "name": "Harmony",
        "venue": "Open Stage",
        "date": "Feb 10, 2024",
        "time": "7 PM - 10 PM",
        "fee": "Free",
        "prizes": "N/A"
      }
    ]
  }
}

{
  "Management Events": {
    "Stock Market": [
      {
        "name": "Stock Wizards",
        "venue": "PG Block 105",
        "date": "Feb 9, 2024",
        "time": "1 PM - 5 PM",
        "fee": 50,
        "prizes": "5K"
      }
    ]
  },
  "Cultural Events": {
    "Music": [
      {
        "name": "Harmony",
        "venue": "Open Stage",
        "date": "Feb 10, 2024",
        "time": "7 PM - 10 PM",
        "fee": "Free",
        "prizes": "N/A"
      }
    ],
    "Dance": [
      {
        "name": "Oppana",
        "venue": "Main Stage",
        "date": "Feb 7, 2025",
        "time": "10 AM - 12 PM",
        "fee": 100,
        "prizes": "15K"
      },
      {
        "name": "Mime",
        "venue": "Auditorium",
        "date": "Feb 6, 2025",
        "time": "2 PM - 4 PM",
        "fee": 1000,
        "prizes": "9K"
      },
      {
        "name": "Duet Dance",
        "venue": "Open Stage",
        "date": "Feb 6, 2025",
        "time": "5 PM - 7 PM",
        "fee": 200,
        "prizes": "5K"
      }
    ]
  },
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
        "fee": 399,
        "prizes": "N/A"
      },
      {
        "name": "Drone Workshop: Explore, Learn, Fly!",
        "venue": "Outdoor Arena",
        "date": "Feb 8, 2025",
        "time": "10 AM - 2:30 PM",
        "fee": 499,
        "prizes": "N/A"
      },
      {
        "name": "Robotic Arm Workshop",
        "venue": "Robotics Lab",
        "date": "Feb 8, 2025",
        "time": "9 AM - 4 PM",
        "fee": 499,
        "prizes": "N/A"
      }
    ]
  },
  "Special Events": {
    "Magic and Mentalism": [
      {
        "name": "The Psychic Mind",
        "venue": "Auditorium",
        "date": "Feb 7, 2025",
        "time": "7 PM - 9 PM",
        "fee": "Free",
        "prizes": "N/A"
      }
    ]
  }
}


`;


function generateCacheKey(message) {
  return `chat_${Buffer.from(message).toString('base64')}`;
}


async function processChatMessage(message) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://www.xplore24.com/', 
      'X-Title': 'Xplore 24 Chat Assistant' 
    },
    body: JSON.stringify({
      model: 'openai/gpt-3.5-turbo', 
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


export const chat = async (req, res) => {

    const startTime = Date.now();
  
  try {
    const { message } = req.body;
    const cacheKey = generateCacheKey(message);
    
    
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      console.log(`Cache hit for: ${cacheKey}`);
      return res.json({
        response: cachedResponse,
        source: 'cache'
      });
    }

  
    const response = await queue.add(async () => {
      return await processChatMessage(message);
    });

    
    cache.set(cacheKey, response);

    
    const processingTime = Date.now() - startTime;
    res.json({
      response,
      source: 'live',
      processingTime: `${processingTime}ms`
    });

  } catch (error) {
    console.error('Chat error:', error);
    
    
    res.status(500).json({ 
      error: 'Failed to process message',
      details: error.message,
      processingTime: `${Date.now() - startTime}ms`
    });
  }
};