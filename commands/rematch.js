export default {
    aliases: ["rematch"],
    description: "Add yourself to the rematch queue.",
    execute(client, message, args) {
        if (currentGather.gatherInProgress()) {
            message.channel.send("A gather is currently in progress.")
            return
        }

        currentGather.playerRematchAdd(message.author)
    },
};
