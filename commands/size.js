export default {
    aliases: ["size"],
    description: "Get or set the gather size.",
    execute(client, message, args) {
        if (args.length === 0) {
            message.channel.send(`The current gather size is ${currentGather.currentSize}`)
            return
        }

        if (currentGather.gatherInProgress()) {
            message.channel.send("A gather is currently in progress.")
            return
        }

        const newSize = parseInt(args[0])

        if (newSize % 2 !== 0) {
            message.channel.send(`The gather size must be a multiple of 2.`)
            return
        }

        if (newSize > 10) {
            message.channel.send(`The gather size can be a max of 10!`)
            return
        }

        currentGather.changeSize(newSize)
    },
};
