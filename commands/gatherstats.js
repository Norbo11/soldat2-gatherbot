const logger = require("../utils/logger")
const utils = require("../utils/commandUtils")
const stats = require("../game/stats")
const statsFormatting = require("../game/statsFormatting")


module.exports = {
    aliases: ["gatherstats", "gstats"],
    description: "Show overall gather statistics.",
    execute(client, message, args) {
        stats.getGatherStats(currentStatsDb).then((gatherStats) => {
            message.channel.send(statsFormatting.formatGatherStats(gatherStats))
        })
    },
};
