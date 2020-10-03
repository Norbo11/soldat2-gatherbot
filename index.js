require("dotenv").config()
const logger = require("./utils/logger")
const Discord = require("discord.js")
const fs = require("fs")
const message = require("./events/message")
const ready = require("./events/ready")
const presenceUpdate = require("./events/presenceUpdate")

const client = new Discord.Client()


setUpCommands = () => {
    client.commands = []

    const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));

    for (const file of commandFiles) {
        const command = require(`./commands/${file}`);
        client.commands.push(command);
    }
}

cleanUp =  () => {
}

setUpEvents = () => {
    client.on("message", (...args) => message(client, ...args))
    client.once("ready", (...args) => ready(client, ...args))
    client.on("presenceUpdate", (...args) => presenceUpdate(client, ...args))
    process.on("SIGINT", cleanUp)
}

setUpCommands();
setUpEvents();
client.login(process.env.BOT_TOKEN)


