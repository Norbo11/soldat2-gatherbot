const logger = require("../utils/logger")
const utils = require("../utils/commandUtils")

module.exports = {
    aliases: ["add"],
    description: "Add yourself to the gather queue.",
    execute(client, message, args) {
        if (currentGather.gatherInProgress()) {
            message.channel.send("A gather is currently in progress.")
            return
        }

        currentGather.authenticator.isAuthenticated(message.author.id).then(authenticated => {
            if (!authenticated) {
                message.reply("you are not authenticated. Type !auth and follow the instructions.")
            } else {
                currentGather.playerAdd(message.author)
            }
        })
    },
};
