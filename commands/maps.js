const logger = require("../utils/logger")
const utils = require("../utils/commandUtils")
const maps = require("../utils/maps")
const constants = require("../game/constants")

module.exports = {
    aliases: ["maps"],
    description: "List available maps.",
    execute(client, message, args) {

        const ctf = `**Capture The Flag**: ${maps.getMapsForGameMode(constants.GAME_MODES.CAPTURE_THE_FLAG).join(', ')}`
        const ctb = `**Capture The Bases**: ${maps.getMapsForGameMode(constants.GAME_MODES.CAPTURE_THE_BASES).join(', ')}`

        currentDiscordChannel.send(ctf + "\n" + ctb)
    }
};
