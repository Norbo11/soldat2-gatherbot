import _ from 'lodash';
import logger from '../utils/logger';

export default (client, message) => {
    // Do not process messages that don't start with our prefix, or come from a bot
    if (!message.content.startsWith(process.env.PREFIX) || message.author.bot) return;

    // Do not process messages that don't come from the designated channel
    if (message.channel.id !== currentDiscordChannel.id) return;

    const args = message.content.slice(process.env.PREFIX.length).split(/ +/);
    const commandText = args.shift().toLowerCase();

    const command = _.find(client.commands, (command) => command.aliases.includes((commandText)))

    if (command === undefined) return;

    try {
        logger.log.info(`${message.author.username}: ${message.content}`)
        command.execute(client, message, args);
    } catch (error) {
        console.error(error);
        message.reply("there was an error trying to execute that command!");
    }
};
