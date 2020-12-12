import logger from '../utils/logger';
import utils from '../utils/commandUtils';

export default {
    aliases: ["status"],
    description: "View the current gather queue.",
    execute(client, message, args) {
        if (currentGather.gatherInProgress()) {
            utils.displayGatherStatus(message)
        } else {
            utils.displayQueueWithServerInfo(message)
        }
    },
};
