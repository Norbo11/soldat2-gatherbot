const logger = require("../utils/logger")

module.exports = {
    aliases: ["help"],
    description: "Show a help message.",
    execute(client, message, args) {
        const helpMessage = "To play a a gather, 6 people must !add. You will then be put into random teams and " +
            "receive the server IP via private message. There is a player limit of 6 on the server as there is no " +
            "password protection yet. We are currently playing single-round games on random CTF maps.\n\n" +

            "**Getting into teams**: when the server is full, 1 person from team A leaves and 1 person from team B " +
            "switches teams.\n\n" +

            "**Starting the game**: ask if everyone is ready. If they are, cap 10 times to start the game.\n\n" +

            "**Ending the game**: when the game finishes, exit the server and end the gather with !endgame " +
            "[map played] [alpha score] [bravo score].\n\n" +

            "All of this will soon be automated as Soldat 2 server features get added. Use !commands for a list of " +
            "commands."
        message.channel.send(helpMessage)
    },
};
