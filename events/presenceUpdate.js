const _ = require("lodash")
const logger = require("../utils/logger")

module.exports = (client, oldPresence, newPresence) => {

    if (currentGather.currentQueue.includes(newPresence.user)) {
        if (newPresence.status !== "online") {
            currentDiscordChannel.send(`<@${newPresence.user.id}> changed status to \`${newPresence.status}\` and 
                                       was removed from the gather queue.`)

            _.remove(currentGather.currentQueue, (x) => x === message.author)
        }
    }
}
