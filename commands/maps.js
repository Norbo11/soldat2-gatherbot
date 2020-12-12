import logger from '../utils/logger';
import utils from '../utils/commandUtils';
import maps from '../utils/maps';
import constants from '../game/constants';

export default {
    aliases: ["maps"],
    description: "List available maps.",
    execute(client, message, args) {

        const ctf = `**Capture The Flag**: ${maps.getMapsForGameMode(constants.GAME_MODES.CAPTURE_THE_FLAG).join(', ')}`
        const ctb = `**Capture The Bases**: ${maps.getMapsForGameMode(constants.GAME_MODES.CAPTURE_THE_BASES).join(', ')}`

        currentDiscordChannel.send(ctf + "\n" + ctb)
    }
};
