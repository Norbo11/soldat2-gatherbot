import dotenv from 'dotenv'
import Discord from 'discord.js';
import fs from 'fs';
import ini from 'ini';

import logger from './utils/logger';
import message from './events/message';
import ready from './events/ready';
import presenceUpdate from './events/presenceUpdate';
import child_process from 'child_process';

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

const setUpServer = webrconCredentials => {
    const configFilename = `${process.env.SERVER_FOLDER}/autoconfig.ini`

    // Trim the beginning of the file because there's some weird character there that messes up the parsing
    const configContents = fs.readFileSync(configFilename, "utf-8").trimStart()
    const config = ini.parse(configContents)
    config.WebRcon.cKey = webrconCredentials.cKey

    logger.log.info(`Modifying ${configFilename} with cKey ${webrconCredentials.cKey}`)
    fs.writeFileSync(configFilename, ini.stringify(config, { whitespace: true }))

    logger.log.info("Launching Soldat 2 process...")

    // https://nodejs.org/api/child_process.html
    const child = child_process.spawn(`${process.env.SERVER_FOLDER}/soldat2`, [], {

        // Can use "true" if we want the S2 server to continue running after we shut down the bot
        detached: false,

        // stdin, stdout, stderr are all ignored; server logs should be tailed via Logs/console.txt
        stdio: ['ignore', 'ignore', 'ignore']
    });

    logger.log.info(`Spawned process with PID ${child.pid}`)
}

(async () => {
    await setUpCommands()
    setUpEvents();
    await client.login(process.env.BOT_TOKEN);
})();



