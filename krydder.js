const Discord = require('discord.js');

const client = new Discord.Client();

const prefix = '*';

client.once('ready', () => {
    console.log('kryder!');
});


client.on('message', message =>{
    if(!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const command = args.shift().toLowerCase();

    if(command === 'krydder'){
        message.channel.send('nam nam krydder :D');
        
        elseif(command === 'balls'){
               message.channel.send('i like big balls'){
    }
});


client.login('nice try');

