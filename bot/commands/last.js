import discord from '../utils/discord';

export default {
    aliases: ["last", "lastgather"],
    description: "View details of the last played gather.",
    execute(client, message, args) {
        currentStatsDb.getLastGame().then(game => {
            if (game === undefined) {
                currentDiscordChannel.send("No games played yet.")
            } else {
                currentDiscordChannel.send({
                    embed: {
                        title: "Last Gather",
                        color: 0xff0000,
                        fields: [
                            ...discord.getGatherEndFields(game)
                        ]
                    }
                })
            }
        })
    },
};
