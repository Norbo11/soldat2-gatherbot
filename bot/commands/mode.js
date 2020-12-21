import {GAME_MODES} from '../game/constants';

export default {
    aliases: ["mode", "gamemode", "game"],
    description: "Change game mode.",
    execute(client, message, args) {
        if (args.length !== 2) {
            message.reply("command format: !mode [server] [CTF|CTB]")
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

        const gameMode = args[1].toUpperCase()
        let inGameMode = undefined

        if (gameMode === "CTF") {
            inGameMode = GAME_MODES.CAPTURE_THE_FLAG
        } else if (gameMode === "CTB") {
            inGameMode = GAME_MODES.CAPTURE_THE_BASES
        } else {
            currentDiscordChannel.send("Please choose one of these gamemodes: CTF, CTB")
            return
        }

        gather.changeGameMode(inGameMode)
    },
};
