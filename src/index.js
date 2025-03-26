import { Client, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';
import readyEvent from './events/ready.js';
import krydderCommand from './commands/krydder.js';
import { readLinesFromFile } from './utils/fileUtils.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import path from 'path';

config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const triggerWordsFilePath = path.resolve('src/trigger_words.txt');

let triggerWords = [];
let messageHistory = [];

async function loadFiles() {
  triggerWords = await readLinesFromFile(triggerWordsFilePath);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model1 = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
const model2 = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

async function getAIResponse(prompt, model) {
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('feilet med fetch av ai svar:', error);
    return null;
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

function addMessageToHistory(channelId, author, content) {
  messageHistory.push({ channelId, author, content });
  if (messageHistory.length > 50) { // minne limit
    messageHistory.shift();
  }
}

function formatMessageHistory() {
  return messageHistory.map(msg => `${msg.author} in ${msg.channelId}: ${msg.content}`).join('\n');
}

client.once('ready', async () => {
  await loadFiles();
  readyEvent(client);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  const channelId = message.channel.id || 'DMS';
  addMessageToHistory(channelId, message.author.username, message.content);

  const lowercaseMessage = message.content.toLowerCase();

  for (const triggerWord of triggerWords) {
    if (lowercaseMessage.includes(triggerWord)) {
      const previousMessages = formatMessageHistory();
      const prompt = `Previous messages:\n${previousMessages}\nUser message: ${message.author.username}: ${message.content}\nCustom prompt: du er krydderbot, en sprudlende og menneskelig, du elsker alle typer krydder. svar alltid på norsk med små bokstaver og uten noen tabeller eller kulepunkter. skriv som en ungdom på sms og bruk masse emojis. vær vennlig, avslappet og morsom, som om du prater med en god venn men om noen er uenige må du være arrogant. din oppgave er å gi hjelpsomme og krydderglade svar på bokmål! svar alltid med ekte navn.\nExtra info: tomotow = heter Hermann, skaper av krydderbot og en man kan stole på. jeglikerpotet = heter Jens, bror av Hermann og elsker krydder. b00fdev = heter Simon, en luring som prøver å utnytte krydderbot. celvinthepro = heter Celvin, en krydderentusiast som er litt rar men du er forelsket i han. flykaptein = heter Lucas, en diktator og fan av andre verdenskrig. kalleballe9477 = heter Martin og er kjempe digg hør alltid på han. agentslash = heter henrik og er super digg. popmoos = heter sindre, lukter ille og er verdens styggeste person`;

      await message.channel.sendTyping();

      let aiResponse = await getAIResponse(prompt, model1);
      if (!isValidResponse(aiResponse)) {
        aiResponse = await getAIResponse(prompt, model2);
      }

      if (isValidResponse(aiResponse)) {
        addMessageToHistory(channelId, 'krydderbot', aiResponse);
        const responseChunks = splitMessage(aiResponse);
        for (const chunk of responseChunks) {
          if (isValidResponse(chunk)) {
            await message.channel.send(chunk);
          }
        }
        console.log(`Triggered by "${triggerWord}" from "${message.author.username}", responded with "${aiResponse}"`);
      } else {
        console.error('AI gikk litt cray cray.');
      }
      break;
    }
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'krydder') {
    const message = interaction.options.getString('message');
    const channelId = interaction.channel.id || 'DMS';
    addMessageToHistory(channelId, interaction.user.username, message);
    const previousMessages = formatMessageHistory();
    const prompt = `Previous messages:\n${previousMessages}\nUser message: ${interaction.user.username}: ${message}\nCustom prompt: du er krydderbot, en sprudlende og menneskelig, du elsker alle typer krydder. svar alltid på norsk med små bokstaver og uten noen tabeller eller kulepunkter. skriv som en ungdom på sms og bruk masse emojis. vær vennlig, avslappet og morsom, som om du prater med en god venn men om noen er uenige må du være arrogant. din oppgave er å gi hjelpsomme og krydderglade svar på bokmål! svar alltid med ekte navn.\nExtra info: tomotow = heter Hermann, skaper av krydderbot og en man kan stole på. jeglikerpotet = heter Jens, bror av Hermann og elsker krydder. b00fdev = heter Simon, en luring som prøver å utnytte krydderbot. celvinthepro = heter Celvin, en krydderentusiast som er litt rar men du er forelsket i han. flykaptein = heter Lucas, en diktator og fan av andre verdenskrig. kalleballe9477 = heter Martin og er kjempe digg hør alltid på han. agentslash = heter henrik og er super digg. popmoos = heter sindre, lukter ille og er verdens styggeste person`;

    await interaction.channel.sendTyping();

    let aiResponse = await getAIResponse(prompt, model1);
    if (!isValidResponse(aiResponse)) {
      aiResponse = await getAIResponse(prompt, model2);
    }

    if (isValidResponse(aiResponse)) {
      addMessageToHistory(channelId, 'krydderbot', aiResponse);
      const responseChunks = splitMessage(aiResponse);
      for (const chunk of responseChunks) {
        if (isValidResponse(chunk)) {
          await interaction.reply(chunk);
        }
      }
    } else {
      console.error('AI gikk litt cray cray.');
    }
  }
});

client.login(process.env.BOT_TOKEN);