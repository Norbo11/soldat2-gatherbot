import dotenv from 'dotenv'
import Discord from 'discord.js';
import fs from 'fs';

import logger from './utils/logger';
import message from './events/message';
import ready from './events/ready';
import presenceUpdate from './events/presenceUpdate';

dotenv.config()

const client = new Discord.Client()


const setUpCommands = async () => {
    client.commands = []

    const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {
        const module = await import(`./commands/${file}`);
        const command = module.default
        client.commands.push(command);
    }
}

const cleanUp = () => {
    logger.log.info("GatherBot and Soldat 2 server are shutting down...")
    process.exit(0)
}

const setUpEvents = () => {
    client.on("message", (...args) => message(client, ...args))
    client.once("ready", (...args) => ready(client, ...args))
    client.on("presenceUpdate", (...args) => presenceUpdate(client, ...args))
    process.on("SIGINT", cleanUp)
    process.on("SIGTERM", cleanUp)
}

(async () => {
    await setUpCommands()
    setUpEvents();
    await client.login(process.env.BOT_TOKEN);
})();



