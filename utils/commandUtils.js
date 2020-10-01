const logger = require("./logger")
const constants = require("../utils/constants")
const discord = require("../utils/discord")


displayGatherStatus = (message) => {
    let description = undefined;

    if (currentGather.inGameState === constants.IN_GAME_STATES["GATHER_PRE_RESET"]) {
        description = `**Gather Waiting for Reset**`
    } else if (currentGather.inGameState === constants.IN_GAME_STATES["GATHER_STARTED"]) {
        description = `**Gather In Progress**\n`
    }

    const alphaDiscordIds = currentGather.alphaTeam.map(user => user.id)
    const bravoDiscordIds = currentGather.bravoTeam.map(user => user.id)

    message.channel.send({
        embed: {
            color: 0xff0000,
            title: "Gather Info",
            description: description,
            fields: [
                ...discord.getPlayerFields(alphaDiscordIds, bravoDiscordIds),
                discord.getMapField(currentGather.serverInfo["mapName"])
            ]
        }
    });
}


displayServerInfo = (message) => {
    currentSoldatClient.getServerInfo(serverInfo => {
        const alphaPlayerStrings = []
        const bravoPlayerStrings = []

        for (let i = 0; i < 32; i++) {
            const playerNameLength = serverInfo["names"][i]["playerName"]

            if (playerNameLength === 0) {
                continue
            }

            const playerName = serverInfo["names"][i]["playerName"]
            const playerTeam = serverInfo["teams"][i]["playerTeam"]
            const playerKills = serverInfo["kills"][i]["playerKills"]
            const playerDeaths = serverInfo["deaths"][i]["playerDeaths"]
            const playerPing = serverInfo["pings"][i]["playerPing"]

            if (playerTeam === 1) {
                alphaPlayerStrings.push(`**${playerName}** (${playerPing}ms): ${playerKills}/${playerDeaths}`)
            }
            if (playerTeam === 2) {
                bravoPlayerStrings.push(`**${playerName}** (${playerPing}ms): ${playerKills}/${playerDeaths}`)
            }
        }

        logger.log.info(alphaPlayerStrings.join("\n"))
        logger.log.info(bravoPlayerStrings.join("\n"))

        message.channel.send({
            embed: {
                title: "Server Info",
                color: 0xff0000,
                fields: [
                    {
                        name: `Current Map`,
                        value: serverInfo["mapName"],
                    },
                    {
                        name: `Next Map`,
                        value: serverInfo["nextMap"],
                    },
                    {
                        name: `Alpha Team`,
                        value: alphaPlayerStrings.length > 0 ? alphaPlayerStrings.join("\n") : "No players",
                        inline: true
                    },
                    {
                        name: `Bravo Team`,
                        value: bravoPlayerStrings.length > 0 ? bravoPlayerStrings.join("\n") : "No players",
                        inline: true
                    },
                ]
            }
        }).catch(ex => logger.log.error(ex.response))
    })
}


displayQueueWithServerInfo = () => {
    currentGather.displayQueue(currentGather.currentSize, currentGather.currentQueue, currentGather.serverInfo["mapName"])
}


module.exports = {
    displayGatherStatus, displayServerInfo, displayQueueWithServerInfo
}