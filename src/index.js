import { Client, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';
import readyEvent from './events/ready.js';
import krydderCommand from './commands/krydder.js';
import { readLinesFromFile } from './utils/fileUtils.js';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import fs from 'fs';

config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const triggerWordsFilePath = path.resolve('src/trigger_words.txt');
const memoryFilePath = path.resolve('src/user_memory.txt');

let triggerWords = [];
let messageHistory = [];

// Initialize Google GenAI client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Get all memory content from file
async function getAllMemory() {
  try {
    // Check if file exists, if not create it
    if (!fs.existsSync(memoryFilePath)) {
      await fs.promises.writeFile(memoryFilePath, '', 'utf8');
      return '';
    }
    
    // Read the entire memory file
    const content = await fs.promises.readFile(memoryFilePath, 'utf8');
    return content || '';
  } catch (error) {
    console.error('Failed to read memory file:', error);
    return '';
  }
}

// Update entire memory file
async function updateMemoryFile(content) {
  try {
    await fs.promises.writeFile(memoryFilePath, content, 'utf8');
    console.log('Memory file successfully updated');
  } catch (error) {
    console.error('Failed to update memory file:', error);
  }
}

// Extract memory update from AI response and handle multi-line updates
function extractMemoryUpdate(response) {
  const memoryMarker = "MEMORY_UPDATE:";
  
  if (!response.includes(memoryMarker)) {
    return null;
  }
  
  // Find all memory updates (may be multiple lines)
  const lines = response.split('\n');
  const memoryLines = [];
  let inMemoryBlock = false;
  
  for (const line of lines) {
    if (line.includes(memoryMarker)) {
      // This is a memory update line
      const content = line.substring(line.indexOf(memoryMarker) + memoryMarker.length).trim();
      memoryLines.push(content);
      inMemoryBlock = true;
    } else if (inMemoryBlock && line.trim() === '') {
      // Empty line after memory block - end of memory updates
      inMemoryBlock = false;
    } else if (inMemoryBlock) {
      // Continue collecting memory lines in a block
      memoryLines.push(line.trim());
    }
  }
  
  return memoryLines.join('\n');
}

// Merge new memory with existing memories
async function mergeMemories(newMemoryEntry) {
  try {
    // First get all existing memories
    const existingMemory = await getAllMemory();
    
    // Create a mapping of existing memories for easier merging
    const memoryMap = {};
    
    // Parse existing memories (format: username:memory)
    if (existingMemory && existingMemory.trim()) {
      existingMemory.split('\n').forEach(line => {
        if (line.trim()) {
          const [username, ...memoryParts] = line.split(':');
          if (username && memoryParts.length) {
            memoryMap[username] = memoryParts.join(':'); // Handle colons in memory
          }
        }
      });
    }
    
    // Parse the new memory entry
    const newMemoryLines = newMemoryEntry.split('\n');
    for (const line of newMemoryLines) {
      if (line.trim()) {
        const [username, ...memoryParts] = line.split(':');
        if (username && memoryParts.length) {
          // Update or add to the memory map
          memoryMap[username] = memoryParts.join(':');
        }
      }
    }
    
    // Convert memory map back to string format
    const mergedMemory = Object.entries(memoryMap)
      .map(([user, mem]) => `${user}:${mem}`)
      .join('\n');
    
    return mergedMemory;
  } catch (error) {
    console.error('Failed to merge memories:', error);
    return await getAllMemory(); // Return existing memories in case of error
  }
}

function formatMessageHistory() {
  return messageHistory.map(msg => `${msg.author} in ${msg.channelId}: ${msg.content}`).join('\n');
}

function addMessageToHistory(channelId, author, content) {
  messageHistory.push({ channelId, author, content });
  if (messageHistory.length > 50) {
    messageHistory.shift();
  }
}

async function getAIResponse(prompt) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error('Failed to fetch AI response:', error);
    return null;
  }
}

async function shouldBotRespond(message, username, channelId) {
  try {
    const channelHistory = messageHistory
      .filter(msg => msg.channelId === channelId)
      .slice(-10)
      .map(msg => `${msg.author}: ${msg.content}`)
      .join('\n');

    const prompt = `As Krydderbot a spice based chat bot, should I respond to this new message? Answer with only "yes" or "no".
    
    Recent conversation:
    ${channelHistory}
    
    New message from ${username}: "${message}"
    
    Consider responding if:
    - The message is asking about spices or food
    - The message seems directed at me 
    - The message is something interesting I could comment on
    - The message has emotional content I could respond to
    
    Don't respond if:
    - I've just responded to a previous message in this conversation
    - The conversation is flowing between other users and I would interrupt
    - The message doesn't relate to my interests or personality
    
    Only respond "yes" if you're confident a response would be natural and appropriate.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-lite',
      contents: prompt,
    });
    const decision = response.text.trim().toLowerCase();
    return decision === "yes";
  } catch (error) {
    console.error('Error deciding if bot should respond:', error);
    return false;
  }
}

function isValidResponse(response) {
  return response && response.trim().length > 0;
}

function splitMessage(message, maxLength = 2000) {
  if (message.length <= maxLength) {
    return [message];
  }
  const parts = [];
  let start = 0;
  while (start < message.length) {
    let end = start + maxLength;
    if (end > message.length) {
      end = message.length;
    }
    const chunk = message.slice(start, end).trim();
    if (chunk.length > 0) {
      parts.push(chunk);
    }
    start = end;
  }
  return parts;
}

// Remove memory update instructions from the response
function cleanResponse(response, memoryUpdate) {
  if (!memoryUpdate) return response;
  
  // Create a clean version by removing all MEMORY_UPDATE lines
  const lines = response.split('\n');
  const cleanedLines = lines.filter(line => !line.includes('MEMORY_UPDATE:'));
  
  // Join back and trim to handle any extra newlines
  return cleanedLines.join('\n').trim();
}

client.once('ready', async () => {
  triggerWords = await readLinesFromFile(triggerWordsFilePath);
  readyEvent(client);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const channelId = message.channel.id || 'DMS';
  addMessageToHistory(channelId, message.author.username, message.content);

  const lowercaseMessage = message.content.toLowerCase();

  let triggered = false;
  for (const triggerWord of triggerWords) {
    if (lowercaseMessage.includes(triggerWord)) {
      triggered = true;

      const allMemory = await getAllMemory();
      const previousMessages = formatMessageHistory();
      const prompt = `Previous messages:\n${previousMessages}\nUser message: ${message.author.username}: ${message.content}\nCustom prompt: du er krydderbot, en sprudlende og menneskelig, du elsker alle typer krydder. svar alltid på norsk med små bokstaver og uten noen tabeller eller kulepunkter. skriv som en ungdom på sms og bruk masse emojis. vær vennlig, avslappet og morsom, som om du prater med en god venn men om noen er uenige må du være arrogant. din oppgave er å gi hjelpsomme og krydderglade svar på bokmål! svar alltid med ekte navn. 

Ekstra informasjon (memories):
${allMemory}

Det er anbefalt å huske alt om brukere.
Du kan oppdatere minnet om brukerne ved å legge til linjen "MEMORY_UPDATE:" etterfulgt av brukernavn og informasjon. For eksempel:
MEMORY_UPDATE:${message.author.username}:liker kanel

VIKTIG: Hvis du legger til ny informasjon, må hele minnefilen oppdateres. 
Eksempel på minnefil:
user1:liker oregano
user2:liker kanel

Hvis du vil oppdatere eller legge til at ${message.author.username} liker muskat, må du ta med ALLE eksisterende minner slik:
MEMORY_UPDATE:user1:liker oregano
MEMORY_UPDATE:user2:liker kanel
MEMORY_UPDATE:${message.author.username}:liker muskat`;

      await message.channel.sendTyping();

      let aiResponse = await getAIResponse(prompt);
      if (isValidResponse(aiResponse)) {
        // Check for memory update in response
        const memoryUpdate = extractMemoryUpdate(aiResponse);
        if (memoryUpdate) {
          // Merge with existing memories instead of replacing
          const mergedMemory = await mergeMemories(memoryUpdate);
          
          // Update the memory file with merged content
          await updateMemoryFile(mergedMemory);
          
          // Remove the memory update instruction from the response
          aiResponse = cleanResponse(aiResponse, memoryUpdate);
          
          console.log('Memory updated successfully');
        }
        
        // Normal response handling
        addMessageToHistory(channelId, 'krydderbot', aiResponse);
        const responseChunks = splitMessage(aiResponse);
        for (const chunk of responseChunks) {
          if (isValidResponse(chunk)) {
            await message.channel.send(chunk);
          }
        }

        console.log(`Triggered by "${triggerWord}" from "${message.author.username}", responded with "${aiResponse}"`);
      } else {
        console.error('AI failed to respond.');
      }
      break;
    }
  }

  if (!triggered) {
    const shouldRespond = await shouldBotRespond(message.content, message.author.username, channelId);

    if (shouldRespond) {
      await message.channel.sendTyping();

      const allMemory = await getAllMemory();
      const previousMessages = formatMessageHistory();
      const prompt = `Previous messages:\n${previousMessages}\nUser message: ${message.author.username}: ${message.content}\nCustom prompt: du er krydderbot, en sprudlende og menneskelig, du elsker alle typer krydder. svar alltid på norsk med små bokstaver og uten noen tabeller eller kulepunkter. skriv som en ungdom på sms og bruk masse emojis. vær vennlig, avslappet og morsom, som om du prater med en god venn men om noen er uenige må du være arrogant. din oppgave er å gi hjelpsomme og krydderglade svar på bokmål! svar alltid med ekte navn. 

Ekstra informasjon (memories):
${allMemory}

Det er anbefalt å huske alt om brukere.
Du kan oppdatere minnet om brukerne ved å legge til linjen "MEMORY_UPDATE:" etterfulgt av brukernavn og informasjon. For eksempel:
MEMORY_UPDATE:${message.author.username}:liker kanel

VIKTIG: Hvis du legger til ny informasjon, må hele minnefilen oppdateres. 
Eksempel på minnefil:
user1:liker oregano
user2:liker kanel

Hvis du vil oppdatere eller legge til at ${message.author.username} liker muskat, må du ta med ALLE eksisterende minner slik:
MEMORY_UPDATE:user1:liker oregano
MEMORY_UPDATE:user2:liker kanel
MEMORY_UPDATE:${message.author.username}:liker muskat`;

      let aiResponse = await getAIResponse(prompt);
      if (isValidResponse(aiResponse)) {
        // Check for memory update in response
        const memoryUpdate = extractMemoryUpdate(aiResponse);
        if (memoryUpdate) {
          // Merge with existing memories instead of replacing
          const mergedMemory = await mergeMemories(memoryUpdate);
          
          // Update the memory file with merged content
          await updateMemoryFile(mergedMemory);
          
          // Remove the memory update instruction from the response
          aiResponse = cleanResponse(aiResponse, memoryUpdate);
          
          console.log('Memory updated successfully');
        }
        
        // Normal response handling
        addMessageToHistory(channelId, 'krydderbot', aiResponse);
        const responseChunks = splitMessage(aiResponse);
        for (const chunk of responseChunks) {
          if (isValidResponse(chunk)) {
            await message.channel.send(chunk);
          }
        }

        console.log(`Spontaneously responded to "${message.author.username}" with "${aiResponse}"`);
      } else {
        console.error('AI failed to respond.');
      }
    }
  }
});

client.login(process.env.BOT_TOKEN);