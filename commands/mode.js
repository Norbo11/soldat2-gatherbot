import constants from '../game/constants';

const GAME_MODES = constants.GAME_MODES

export default {
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
            inGameMode = GAME_MODES.CAPTURE_THE_FLAG
        } else if (gameMode === "CTB") {
            inGameMode = GAME_MODES.CAPTURE_THE_BASES
        } else {
            currentDiscordChannel.send("Please choose one of these gamemodes: CTF, CTB")
            return
        }

        currentGather.changeGameMode(inGameMode)
    },
};
