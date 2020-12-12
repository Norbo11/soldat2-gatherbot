import _ from 'lodash';
import logger from '../utils/logger';

export default (client, oldMember, newMember) => {
    if (!currentGather.gatherInProgress()) {
        if (currentGather.currentQueue.includes(newMember.user)) {

            if (newMember.presence.status !== "online") {
                currentDiscordChannel.send(`<@${newMember.user.id}> changed status to \`${newMember.presence.status}\` and ` +
                    "was removed from the gather queue.")

                _.remove(currentGather.currentQueue, (x) => x === newMember.user)
            }
        }
    }
};
