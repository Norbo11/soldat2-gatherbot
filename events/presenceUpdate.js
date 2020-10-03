const _ = require("lodash")
const logger = require("../utils/logger")

module.exports = (client, oldMember, newMember) => {
    if (!currentGather.gatherInProgress()) {
        if (currentGather.currentQueue.includes(newMember.user)) {

            if (newMember.presence.status !== "online") {
                currentDiscordChannel.send(`<@${newMember.user.id}> changed status to \`${newMember.presence.status}\` and ` +
                    "was removed from the gather queue.")

                _.remove(currentGather.currentQueue, (x) => x === newMember.user)
            }
        }
    }
}
