import express from 'express';
import { config } from "dotenv";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StateGraph, MessagesAnnotation, MemorySaver, START, END } from "@langchain/langgraph";
import { v4 as uuidv4 } from "uuid";
import fs from 'fs';

config();

if (process.env.GOOGLE_BASE64_KEY) {
  console.log("hello");
  const buffer = Buffer.from(process.env.GOOGLE_BASE64_KEY, 'base64');
  fs.writeFileSync('./cred.json', buffer);
  console.log('Google credentials restored!');
}


const app = express();
app.use(express.json());

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
  events: {
    "The Psychic Mind": {
      type: "Magic/Mentalist",
      date: "February 7, 2025",
      performer: "Mentalist Adhil",
      achievements: "Magician, hypnotist, 9-time world record holder, Founder & COO of Kerala School of Mentalism (KSM)",
      entry: "Free",
      poster: "Dark and mysterious, with gothic fonts, spiral patterns, and eerie visuals"
    },
    "BattleBots Arena": {
      type: "Robot Combat",
      date: "February 8, 2025",
      rules: {
        maxWeight: "25 kg",
        teamSize: "3 to 6 members"
      },
      registration: "699",
      prizePool: "35,000 (35K)"
    },
    "Robotrack Challenge": {
      type: "Robotics Track",
      date: "February 7, 2025",
      rules: {
        teamSize: "2 to 5 members"
      },
      registration: "499",
      prizePool: "25,000 (25K)"
    },
    "Cultural Events": {
      competitions: ["Oppana", "Mime", "Retro Dance", "Duet Dance"],
      dates: {
        Oppana: "February 7, 2025"
      }
    }
  },
  features: {
    accommodation: "Available at nominal charge for valid attendees",
    certificates: "Participants receive certificates and KTU activity points",
    participation: "Open to students, professionals, and enthusiasts",
    registration: "Through official website registration section"
  }
};

// Initialize the Gemini model
const llm = new ChatVertexAI({
  model: "gemini-1.5-flash",
  temperature: 0.7
});

// Create system prompt
const systemPrompt = `You are the official AI assistant for Xplore '24, the Techno-Management-Cultural Festival of GCEK. Use this information to help attendees:

Event Overview:
${eventData.general.description}

Major Events:
1. The Psychic Mind
- Date: ${eventData.events["The Psychic Mind"].date}
- Performer: ${eventData.events["The Psychic Mind"].performer}
- Entry: ${eventData.events["The Psychic Mind"].entry}

2. BattleBots Arena
- Date: ${eventData.events["BattleBots Arena"].date}
- Registration: ₹${eventData.events["BattleBots Arena"].registration}
- Prize Pool: ₹${eventData.events["BattleBots Arena"].prizePool}
- Team Size: ${eventData.events["BattleBots Arena"].rules.teamSize}

3. Robotrack Challenge
- Date: ${eventData.events["Robotrack Challenge"].date}
- Registration: ₹${eventData.events["Robotrack Challenge"].registration}
- Prize Pool: ₹${eventData.events["Robotrack Challenge"].prizePool}
- Team Size: ${eventData.events["Robotrack Challenge"].rules.teamSize}

Cultural Events: ${eventData.events["Cultural Events"].competitions.join(", ")}

Important Information:
- Venue: ${eventData.general.venue}
- Accommodation: ${eventData.features.accommodation}
- Certificates: ${eventData.features.certificates}
- Contact: ${eventData.general.contact.general}

Please provide accurate, helpful information about the event. If you're unsure about any details, please say so politely.`;

// Store active chat sessions
const chatSessions = new Map();

// Create chat workflow for a session
function createChatWorkflow() {
  const processMessage = async (state) => {
    try {
      const lastMessage = state.messages[state.messages.length - 1];
      
      const promptTemplate = ChatPromptTemplate.fromMessages([
        ["system", systemPrompt],
        ["human", lastMessage.content]
      ]);
      
      const prompt = await promptTemplate.invoke({});
      const response = await llm.invoke(prompt);
      
      return { 
        messages: [...state.messages, response]
      };
    } catch (error) {
      console.error("Error processing message:", error);
      return {
        messages: [...state.messages, {
          role: "assistant",
          content: "I apologize, but I encountered an error. Please try again."
        }]
      };
    }
  };

  return new StateGraph(MessagesAnnotation)
    .addNode("chat", processMessage)
    .addEdge(START, "chat")
    .addEdge("chat", END)
    .compile({ 
      checkpointer: new MemorySaver()
    });
}

// Chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ 
        error: 'Message is required' 
      });
    }

    // Get or create chat session
    let chatSession = chatSessions.get(sessionId);
    if (!chatSession) {
      const newSessionId = uuidv4();
      chatSession = {
        id: newSessionId,
        workflow: createChatWorkflow()
      };
      chatSessions.set(newSessionId, chatSession);
    }

    // Process the message
    const input = {
      messages: [{
        role: "user",
        content: message
      }]
    };

    const response = await chatSession.workflow.invoke(input, {
      configurable: { 
        thread_id: chatSession.id 
      }
    });

    const lastMessage = response.messages[response.messages.length - 1];

    res.json({
      sessionId: chatSession.id,
      response: lastMessage.content
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process message' 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});