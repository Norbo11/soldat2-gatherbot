const logger = require("../utils/logger")
const discord = require("../utils/discord")

module.exports = {
    aliases: ["mode", "gamemode", "game"],
    description: "Change game mode.",
    execute(client, message, args) {
        if (currentGather.gatherInProgress()) {
            message.channel.send("A gather is currently in progress.")
            return
        }

        if (args.length !== 1) {
            currentDiscordChannel.send("Please choose one of these gamemodes: CTF, CTB")
            return
        }

        const gameMode = args[0].toUpperCase()
        let inGameMode = undefined

        if (gameMode === "CTF") {
            inGameMode = "CaptureTheFlag"
        } else if (gameMode === "CTB") {
            inGameMode = "CaptureTheBases"
        } else {
            currentDiscordChannel.send("Please choose one of these gamemodes: CTF, CTB")
            return
        }

        currentGather.changeGameMode(inGameMode)
    },
};
