import dotenv from 'dotenv'
dotenv.config()

import Discord from 'discord.js';
import fs from 'fs';
import ini from 'ini';

import logger from './utils/logger';
import message from './events/message';
import ready from './events/ready';
import presenceUpdate from './events/presenceUpdate';
import webrcon from './utils/webrcon';
import child_process from 'child_process';

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

const setUpEvents = (webrconCredentials) => {
    client.on("message", (...args) => message(client, ...args))
    client.once("ready", (...args) => ready(client, webrconCredentials, ...args))
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
    const afterServerSetup = async (webrconCredentials) => {
        await setUpCommands();
        setUpEvents(webrconCredentials);

        await client.login(process.env.BOT_TOKEN);
    };

    if (process.env.WEBRCON_CKEY_ID === "" || process.env.WEBRCON_SESSION_ID === "")  {
        const webrconCredentials = await webrcon.fetchNewWebrconCredentials();
        setUpServer(webrconCredentials);

        // After 10 seconds, resume bot initialization. This is to prevent us from connecting to WebRcon too soon (before
        // the server is up), etc.
        setTimeout(() => afterServerSetup(webrconCredentials), 10000);
    } else {
        const webrconCredentials = {
            cKey: process.env.WEBRCON_CKEY_ID,
            sessionId: process.env.WEBRCON_SESSION_ID
        }
        await afterServerSetup(webrconCredentials);
    }
})();



