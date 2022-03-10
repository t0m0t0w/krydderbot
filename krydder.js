const Discord = require('discord.js');

const client = new Discord.Client();

const prefix = 'k';

client.once('ready', () => {
    console.log('kryder!');
});


client.on('message', message =>{
    if(!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    if(command === 'rydder'){
        message.channel.send('nam nam krydder :D');
    }
});

client.login('nice try');

