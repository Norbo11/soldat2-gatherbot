export default {
    aliases: ["add"],
    description: "Add yourself to the gather queue.",
    execute(client, message, args) {

        if (args.length === 0) {
            currentAuthenticator.isAuthenticated(message.author.id).then(authenticated => {
                if (!authenticated) {
                    message.reply("you are not authenticated. Type !auth and follow the instructions.")
                } else {
                    currentQueueManager.addToLargestQueue(message.author)
                }
            })
        } else {
            const serverCode = args[0]
            currentQueueManager.addToQueue(message.author, serverCode)
        }
    },
};
