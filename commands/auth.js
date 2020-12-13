export default {
    aliases: ["auth"],
    description: "Authenticate your in-game account with the bot.",
    execute(client, message, args) {

        // We ask the player to authenticate using the server with the smallest queue to reduce the chance of a
        // gather starting while they are in the middle of authenticating
        const server = currentQueueManager.getServerWithSmallestQueue()

        // Disallow authenticating during a game. This is so that players don't get disturbed by people
        // authing while a gather is in progress, as well as so that we don't somehow get arbitrary
        // playfab ID mapping changes while a gather is in progress.
        if (server === null) {
            message.reply("sorry! Gathers are being played on all available servers. Please wait for one of them " +
                "to finish and !auth again.")
            return
        }

        const authCode = server.gather.authenticator.requestAuthentication(message.author.id)

        const authMessage = `Please copy this line of text:\n\`!auth ${authCode}\`\n` +
            `Now join the server on IP **${server.ip}** and port **${server.port}**.\n` +
            `Press T to open the chat, then press CTRL+V to paste the text. Press enter to authenticate.\n` +
            `If this is successful, you will receive a confirmation via Discord PM.`

        message.author.send(authMessage)
    },
};
