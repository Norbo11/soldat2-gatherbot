import _ from "lodash"

export default {
    aliases: ["status"],
    description: "View the current gather queue.",
    execute(client, message, args) {
        const servers = currentQueueManager.getAllServers()
        _.forEach(servers, server => {
            currentQueueManager.displayQueue(server)
        })
    },
};
