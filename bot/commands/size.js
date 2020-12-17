export default {
    aliases: ["size"],
    description: "Get or set the gather size.",
    execute(client, message, args) {
        if (args.length !== 2) {
            message.reply("command format: !size [server] [2-10]")
            return
        }

        const serverCode = args[0]
        const server = currentQueueManager.getServer(serverCode)

        if (server === null) {
            message.reply(`There is no server/queue with code ${serverCode}.`)
            return
        }

        const gather = server.gather

        if (gather.gatherInProgress()) {
            message.channel.send("A gather is currently in progress.")
            return
        }

        const newSize = parseInt(args[1])

        if (newSize % 2 !== 0) {
            message.channel.send(`The gather size must be a multiple of 2.`)
            return
        }

        if (newSize > 10) {
            message.channel.send(`The gather size can be a max of 10!`)
            return
        }

        currentQueueManager.changeSize(serverCode, newSize)
    },
};
