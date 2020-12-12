import logger from '../utils/logger';
import utils from '../utils/commandUtils';
import stats from '../game/stats';
import statsFormatting from '../game/statsFormatting';


export default {
    aliases: ["gatherstats", "gstats"],
    description: "Show overall gather statistics.",
    execute(client, message, args) {
        stats.getGatherStats(currentStatsDb).then((gatherStats) => {
            message.channel.send(statsFormatting.formatGatherStats(gatherStats))
        })
    },
};
