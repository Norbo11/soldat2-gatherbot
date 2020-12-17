import maps from '../utils/maps';

export default {
    aliases: ["map"],
    description: "Change the map on the server",
    execute(client, message, args) {
        if (args.length !== 2) {
            message.reply("command format: !map [server] [map]")
            return
        }

        const serverCode = args[0]
        const server = currentQueueManager.getServer(serverCode)

        if (server === null) {
            message.reply(`There is no server/queue with code ${serverCode}.`)
            return
        }

        const gather = server.gather

        if (gather.gatherInProgress()) {
            message.channel.send("A gather is currently in progress.")
            return
        }

        const mapName = args[1];

        if (!(maps.verifyMap(mapName, gather.gameMode))) {
            message.channel.send(`**${mapName}** is an invalid map for current game mode **${gather.gameMode}**.`)
            return
        }

        gather.soldatClient.changeMap(mapName, gather.gameMode, (result) => {
            if (result === "found") {
                message.channel.send(`Map changed to **${mapName}** (game mode **${gather.gameMode}**).`)
            }

            if (result === "not_found") {
                message.channel.send(`Map **${mapName}** was not found.`)
            }
        })
    },
};
