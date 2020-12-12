import _ from 'lodash';
import logger from '../utils/logger';
import utils from '../utils/commandUtils';

export default {
    aliases: ["del", "remove"],
    description: "Remove yourself from the gather queue.",
    execute(client, message, args) {
        currentQueueManager.remove(message.author)
    },
};
