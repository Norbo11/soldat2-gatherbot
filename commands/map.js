import maps from '../utils/maps';

export default {
    aliases: ["map"],
    description: "Change the map on the server",
    execute(client, message, args) {
        if (currentGather.gatherInProgress()) {
            message.channel.send("A gather is currently in progress.")
            return
        }

        if (args.length !== 1) {
            message.channel.send("Please specify a map name.")
            return
        }

        const mapName = args[0];

        if (!(maps.verifyMap(mapName, currentGather.gameMode))) {
            message.channel.send(`**${mapName}** is an invalid map for current game mode **${currentGather.gameMode}**.`)
            return
        }

        currentSoldatClient.changeMap(mapName, currentGather.gameMode, (result) => {
            if (result === "found") {
                message.channel.send(`Map changed to **${mapName}** (game mode **${currentGather.gameMode}**).`)
            }

            if (result === "not_found") {
                message.channel.send(`Map **${mapName}** was not found.`)
            }
        })
    },
};
