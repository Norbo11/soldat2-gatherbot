import maps from '../utils/maps';
import {GAME_MODES} from '../game/constants';

export default {
    aliases: ["maps"],
    description: "List available maps.",
    execute(client, message, args) {

        const ctf = `**Capture The Flag**: ${maps.getMapsForGameMode(GAME_MODES.CAPTURE_THE_FLAG).join(', ')}`
        const ctb = `**Capture The Bases**: ${maps.getMapsForGameMode(GAME_MODES.CAPTURE_THE_BASES).join(', ')}`

        currentDiscordChannel.send(ctf + "\n" + ctb)
    }
};
