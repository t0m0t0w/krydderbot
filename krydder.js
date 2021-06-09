const Discord = require('discord.js');

const client = new Discord.Client();

const prefix = 'k';

client.once('ready', () => {
    console.log('your bot name is online!');
});


client.on('message', message =>{
    if(!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    if(command === 'rydder'){
        message.channel.send('Krydder C:');
    }
});

client.login('NzYwOTE0Mzg4MTA5NzU0NDA5.X3S-vw.iyheaAnZRGn1cg8SKx7RgUYiabM');

