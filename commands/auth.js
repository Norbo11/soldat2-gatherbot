export default {
    aliases: ["auth"],
    description: "Authenticate your in-game account with the bot.",
    execute(client, message, args) {

        // Disallow authenticating during the game. This is so that players don't get disturbed by people
        // authing while a gather is in progress, as well as so that we don't somehow get arbitrary
        // playfab ID mapping changes while a gather is in progress.
        if (currentGather.gatherInProgress()) {
            message.channel.send("A gather is currently in progress.")
            return
        }

        const authCode = currentGather.authenticator.requestAuthentication(message.author.id)

        const authMessage = `Please copy this line of text:\n\`!auth ${authCode}\`\n` +
            `Now join the server on IP **${process.env.SERVER_IP}** and port **${process.env.SERVER_PORT}**.\n` +
            `Press T to open the chat, then press CTRL+V to paste the text. Press enter to authenticate.\n` +
            `If this is successful, you will receive a confirmation.`

        message.author.send(authMessage)
    },
};
