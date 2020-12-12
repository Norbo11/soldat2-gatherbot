import _ from 'lodash';
import logger from '../utils/logger';
import utils from '../utils/commandUtils';

export default {
    aliases: ["del", "remove"],
    description: "Remove yourself from the gather queue.",
    execute(client, message, args) {
        if (currentGather.gatherInProgress()) {
            message.channel.send("A gather is currently in progress.")
            return
        }

        _.remove(currentGather.currentQueue, (x) => x === message.author)
        utils.displayQueueWithServerInfo(message)
    },
};
