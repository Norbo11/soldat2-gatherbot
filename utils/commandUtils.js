const logger = require("./logger")
const constants = require("../game/constants")
const discord = require("../utils/discord")


displayServerInfo = (message) => {
    currentSoldatClient.getServerInfo(serverInfo => {
        const redPlayerStrings = []
        const bluePlayerStrings = []

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
                redPlayerStrings.push(`**${playerName}** (${playerPing}ms): ${playerKills}/${playerDeaths}`)
            }
            if (playerTeam === 2) {
                bluePlayerStrings.push(`**${playerName}** (${playerPing}ms): ${playerKills}/${playerDeaths}`)
            }
        }

        logger.log.info(redPlayerStrings.join("\n"))
        logger.log.info(bluePlayerStrings.join("\n"))

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
                        name: `Red Team`,
                        value: redPlayerStrings.length > 0 ? redPlayerStrings.join("\n") : "No players",
                        inline: true
                    },
                    {
                        name: `Blue Team`,
                        value: bluePlayerStrings.length > 0 ? bluePlayerStrings.join("\n") : "No players",
                        inline: true
                    },
                ]
            }
        }).catch(ex => logger.log.error(ex.response))
    })
}


displayQueueWithServerInfo = () => {
    currentGather.displayQueue(currentGather.currentSize, currentGather.currentQueue)
}


module.exports = {
    displayGatherStatus, displayServerInfo, displayQueueWithServerInfo
}