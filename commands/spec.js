import discord from '../utils/discord';

export default {
    aliases: ["spec"],
    description: "Spectate the current gather.",
    execute(client, message, args) {
        if (!currentGather.gatherInProgress()) {
            message.reply("a gather is not currently in progress.")
            return
        }

        if (currentGather.currentQueue.includes(message.author)) {
            message.reply("you are in the current gather - go play.")
            return
        }

        message.author.send({
            embed: {
                title: "Join as Spectator",
                color: 0xff0000,
                fields: [discord.getServerLinkField(currentGather.password)]
            }
        })
    },
};
