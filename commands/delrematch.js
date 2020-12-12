import logger from '../utils/logger';
import utils from '../utils/commandUtils';
import _ from 'lodash';

export default {
    aliases: ["delrematch"],
    description: "Delete yourself from the rematch queue.",
    execute(client, message, args) {
        if (currentGather.gatherInProgress()) {
            message.channel.send("A gather is currently in progress.")
            return
        }

        currentStatsDb.getLastGame().then(lastGame => {
            _.remove(currentGather.rematchQueue, (x) => x === message.author)
            currentGather.displayQueue(lastGame.size, currentGather.rematchQueue, lastGame.mapName, true)
        })
    },
};
