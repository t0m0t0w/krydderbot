const fs = require('fs'); // We'll need the fs module to read the file

const { Client } = require('discord.js');
const client = new Client();

client.once('ready', () => {
  console.log('kryder!');
});

// Read in the list of sentences from the file
const sentences = fs.readFileSync('sentences.txt', 'utf8').split('\n');

// Read in the list of trigger words from the file
const triggerWords = fs.readFileSync('trigger_words.txt', 'utf8').split('\n');


client.on('message', message => {
  // Ignore messages sent by the bot itself
  if (message.author.bot) return;

  // Convert the message to lowercase for easier comparison
  const lowercaseMessage = message.content.toLowerCase();

  // Check if the message includes any of the trigger words
  for (const triggerWord of triggerWords) {
    if (lowercaseMessage.includes(triggerWord)) {

      // Get a random sentence from the list of sentences
      const randomSentence = sentences[Math.floor(Math.random() * sentences.length)];

      message.channel.send(`${randomSentence}`);
      console.log(`noen sa noe med ${triggerWord} så jeg svarte med ${randomSentence}`);
      break; // We only want to send one response, so we can exit the loop after finding a trigger word
    }
  }
});

client.login('bot-token');