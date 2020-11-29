const logger = require("../utils/logger")

module.exports = {
    aliases: ["auth"],
    description: "Authenticate your in-game account with the bot.",
    execute(client, message, args) {

        const authCode = currentGather.authenticator.requestAuthentication(message.author.id)

        const authMessage = `Please copy this line of text:\n\`!auth ${authCode}\`\n` +
            `Now join the server on IP **${process.env.SERVER_IP}** and port **${process.env.SERVER_PORT}**.\n` +
            `Press T to open the chat, then press CTRL+V to paste the text. Press enter to authenticate.\n` +
            `If this is successful, you will receive a confirmation.`

        message.author.send(authMessage)
    },
};
