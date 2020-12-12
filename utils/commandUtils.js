import logger from './logger';
import {IN_GAME_STATES} from '../game/constants';
import discord from '../utils/discord';




const displayGatherStatus = (message) => {
    let description = undefined;

    if (currentGather.inGameState === IN_GAME_STATES.GATHER_STARTED) {
        description = `**Gather In Progress**\n`
    }

    message.channel.send({
        embed: {
            color: 0xff0000,
            title: "Gather Info",
            description: description,
            fields: [
                ...discord.getPlayerFields(currentGather.match),
            ]
        }
    });
}


const displayServerInfo = (message) => {
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


const displayQueueWithServerInfo = () => {
    currentGather.displayQueue(currentGather.currentSize, currentGather.currentQueue)
}


export default {
    displayGatherStatus, displayServerInfo, displayQueueWithServerInfo
};