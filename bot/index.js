import dotenv from 'dotenv'
import Discord from 'discord.js';
import fs from 'fs';

import logger from './utils/logger';
import message from './events/message';
import ready from './events/ready';
import presenceUpdate from './events/presenceUpdate';

import express from "express"
import cors from "cors"

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
    client.once("ready", (...args) => {
        client.on("message", (...args) => message(client, ...args))
        client.on("presenceUpdate", (...args) => presenceUpdate(client, ...args))
        ready(client, ...args)
    })
    process.on("SIGINT", cleanUp)
    process.on("SIGTERM", cleanUp)
}

const setUpApi = async () => {
    const app = express()
    const endpointFiles = fs.readdirSync("./api").filter(file => file.endsWith(".js"));

    app.use(cors())

    for (const file of endpointFiles) {
        const module = await import(`./api/${file}`);
        for (const route of module.default.routes) {
            app[route.method](route.path, route.handler)
        }
    }

    app.listen(process.env.API_PORT, () => {
        logger.log.info(`Gather Bot API listening on port ${process.env.API_PORT}`)
    })
}

(async () => {
    await setUpCommands()
    setUpEvents();
    await client.login(process.env.BOT_TOKEN);
    await setUpApi();
})();
