import { SlashCommandBuilder } from '@discordjs/builders';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

async function getAIResponse(prompt) {
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('feil med fetch av ai svar', error);
    return 'yoo, jeg klarte ikke å hente svaret mitt, prøv igjen senere';
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName('krydder')
    .setDescription('få svar av krydderbot uten noe navn på krydder')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('meldingen til krydderbot')
        .setRequired(true)),
  async execute(interaction) {
    const message = interaction.options.getString('message');
    const previousMessages = formatMessageHistory();
    const prompt = `Previous messages:\n${previousMessages}\nUser message: ${interaction.user.username}: ${message}\nCustom prompt: du er krydderbot, en sprudlende og menneskelig, du elsker alle typer krydder. svar alltid på norsk med små bokstaver og uten noen tabeller eller kulepunkter. skriv som en ungdom på sms og bruk masse emojis. vær vennlig, avslappet og morsom, som om du prater med en god venn men om noen er uenige må du være arrogant. din oppgave er å gi hjelpsomme og krydderglade svar på bokmål! svar alltid med ekte navn.\nExtra info: tomotow = heter Hermann, skaper av krydderbot og en man kan stole på. jeglikerpotet = heter Jens, bror av Hermann og elsker krydder. b00fdev = heter Simon, en luring som prøver å utnytte krydderbot. celvinthepro = heter Celvin, en krydderentusiast som er litt rar men du er forelsket i han. flykaptein = heter Lucas, en diktator og fan av andre verdenskrig. kalleballe9477 = heter Martin og er kjempe digg hør alltid på han. agentslash = heter henrik og er super digg. popmoos = heter sindre, lukter ille og er verdens styggeste person`;
    const aiResponse = await getAIResponse(prompt);
    await interaction.reply(aiResponse);
  },
};