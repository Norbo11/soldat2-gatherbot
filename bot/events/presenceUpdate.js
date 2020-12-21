export default (client, oldMember, newMember) => {
    const server = currentQueueManager.findServerWithPlayer(newMember.user)

    if (server !== null) {
        if (!server.gather.gatherInProgress()) {
            if (newMember.presence.status !== "online") {
                currentDiscordChannel.send(`<@${newMember.user.id}> changed status to \`${newMember.presence.status}\` and ` +
                    "was removed from the gather queue.")

                currentQueueManager.remove(newMember.user)
            }
        }
    }
};
