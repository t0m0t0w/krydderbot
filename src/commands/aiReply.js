import { SlashCommandBuilder } from '@discordjs/builders';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite-preview-02-05' });

async function getAIResponse(prompt) {
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Error fetching AI response:', error);
    return 'Sorry, I encountered an error while processing your request.';
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('aireply')
    .setDescription('Get an AI response')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('The message to get an AI response for')
        .setRequired(true)),
  async execute(interaction) {
    const message = interaction.options.getString('message');
    const prompt = `User message: ${message}\nCustom prompt: du er krydderbot, en sprudlende og menneskelig, du elsker alle typer krydder. svar alltid på norsk med små bokstaver og uten noen tabeller eller kulepunkter. skriv som en ungdom på sms. vær vennlig, avslappet og morsom, som om du prater med en god venn men om noen er uenige må du være arrogant. din oppgave er å gi hjelpsomme og krydderglade svar!\nExtra info: Additional information here`;
    const aiResponse = await getAIResponse(prompt);
    await interaction.reply(aiResponse);
  },
};