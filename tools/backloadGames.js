require("dotenv").config()
const fs = require("fs")
const moment = require("moment")
const util = require("util")
const _ = require("lodash")
const sinon = require("sinon")
const events = require("events")
const MongoClient = require('mongodb').MongoClient;

const gather = require("../game/gather")
const soldat = require("../utils/soldat")
const logger = require("../utils/logger")
const soldatEvents = require("../game/soldatEvents")
const db = require("../game/db")

function getDiscordUser(hwidToDiscordId, playerNameToHwid, name) {
    if (!(name in playerNameToHwid)) {
        throw new Error(`${name} not found in playerNameToHwid map`)
    }

    const hwid = playerNameToHwid[name]

    if (!(hwid in hwidToDiscordId)) {
        throw new Error(`${name} not found in hwidToDiscordId map`)
    }

    return {id: hwidToDiscordId[hwid]}
}

const backloadGames = async () => {
    const dbConn = await db.getDbConnection()
    const statsDb = new db.StatsDB(dbConn)

    const netClient = new events.EventEmitter()
    netClient.write = (data) => {
        logger.log.info(`Wrote to server: ${data.trim()}`)
    }

    const discordChannel = sinon.stub()
    discordChannel.send = (data) => {
        logger.log.info(`Wrote to discord channel: ${data}`)
    }
    discordChannel.client = sinon.stub()
    discordChannel.client.fetchUser = async _ => {
        return {username: "TestDiscordUser"}
    }

    const hwidToPlayerName = {}
    const playerNameToHwid = {}

    let currentTimestamp = 0

    // Take this from hwidToDiscordId.json which shouldn't be committed
    const hwidToDiscordId = {
        '3FB9882DB49': "531450590505730049", // '[WP] NamelessWolf',
        '7150942A522': "672507205295276043", // 'Janusz Korwin-Mikke',
        '7E70F684F34': "122766322739314688", // 'Norbo11',
        '1C4A7D823EF': "695187087145566238", // 'oy',
        '1412F48F843': "449626154320789524", // 'Universal Soldier',
        '382B16F8746': "449626154320789524", // 'Universal Soldier',
        '7855C05A03C': "432994416710516758", // 'pavliko',
        // '4FE6652D1B2': "705422144787578980", // 'Formax',
        '4FE6652D1B2': "721704244172029952", // 'Formax',
        '19DB190DE95': "203907267924328448", // 'hs|McWise',
        '2EC8430D647': "124290386452545537", // 'Deide',
        '731C872E6BC': "449626154320789524", // 'Universal Soldier',
        '1C30F5F39F3': "71993252328247296",  // '_North',
        '68EAF77CA53': "428568369655054359", // 'Isojoenrannan hurja',
        '50EFFC48B92': "302151016600567808", // 'SethGecko',
        '451934B9692': "456828341555560458", // '[WP]-//power\\\\-',
        '2131DC7CC8C': "432994416710516758", // 'pavliko',
        '5A19489A1FD': "229683777935376384", // 'Lets_Twist',
        '7666259E411': "432994416710516758", // 'pavliko'
        '152A53F5036': "292100010882105346", // 'Mojo'
        "1DD9AF92030": "432994416710516758", // 'pavliko'
        "448A6CCBB03": "302151016600567808",
        "13A578A4C34": "302411535911747594",
        "1507AC6C6AA": "355427527121960961",
        "310DC7F8CB7": "366657110206971906",
        "4B1CC341852": "449626154320789524",
        "64962BF5AA3": "500660222797414400",
        "6D633BBD9FF": "500660222797414400",
    }

    const soldatClient = new soldat.SoldatClient(netClient)
    const currentGather = new gather.Gather(soldatClient, discordChannel, statsDb, hwidToDiscordId, () => currentTimestamp)
    soldatEvents.registerSoldatEventListeners(currentGather, netClient)

    const directory = "/home/norbz/gatherserverlogs"

    const fileNames = fs.readdirSync(directory)
    const fileNamePattern = /consolelog-(?<date>\d\d-\d\d-\d\d)-(\d+)\.txt/
    const logLinePattern = /^(?<timestamp>\d\d-\d\d-\d\d \d\d:\d\d:\d\d) (?<message>.*?)$/gm
    const playerJoinPattern = /(?<playerName>.*?) has joined (?<teamName>.*?) team/
    const playerLeavePattern = /(?<playerName>.*?) has left (?<teamName>.*?) team/
    const playerKickPattern = /(?<playerName>.*?) has been kicked/
    const playerJoinSpectatorsPattern = /(?<playerName>.*?) has joined spectators/
    const gatherStartPattern = /--- gatherstart (?<mapName>.*?) (?<numberOfBunkers>\d*)/
    const joiningGamePattern = /(?<playerName>.*) joining game .*? HWID:(?<hwid>.*)/
    const loadConPattern = /^\/loadcon.*$/m

    const playersPerTeam = {
        red: [],
        blue: []
    }

    let sortedFileNames = []

    fileNames.forEach(fileName => {
        const fileNameMatch = fileName.match(fileNamePattern)
        if (fileNameMatch !== null) {
            const fileDate = moment(fileNameMatch.groups["date"], "YY-MM-DD", true)
            if (fileDate.isAfter(moment("2020-05-24"))) {
                sortedFileNames.push({
                    fileName,
                    fileTimestamp: fileDate.valueOf()
                })
            }

        }
    })

    sortedFileNames = _.sortBy(sortedFileNames, file => file.fileTimestamp)
    sortedFileNames = sortedFileNames.map(file => file.fileName)

    // sortedFileNames = ["consolelog-20-05-31-03.txt"]

    sortedFileNames.forEach(fileName => {
        console.log(`Reading ${fileName}`)

        const contents = fs.readFileSync(directory + "/" + fileName).toString()

        let match = logLinePattern.exec(contents)
        while (match != null) {
            const logTimestamp = moment(match.groups["timestamp"], "YY-MM-DD HH:mm:ss", true)
            currentTimestamp = logTimestamp.valueOf()

            const message = match.groups["message"]

            const playerJoinMatch = message.match(playerJoinPattern)

            if (playerJoinMatch !== null) {
                _.remove(playersPerTeam["blue"], elem => elem === playerJoinMatch.groups["playerName"])
                _.remove(playersPerTeam["red"], elem => elem === playerJoinMatch.groups["playerName"])

                if (playerJoinMatch.groups["teamName"] === "red") {
                    playersPerTeam["red"].push(playerJoinMatch.groups["playerName"])
                }

                if (playerJoinMatch.groups["teamName"] === "blue") {
                    playersPerTeam["blue"].push(playerJoinMatch.groups["playerName"])
                }
            }

            const playerLeaveMatch = message.match(playerLeavePattern)
            if (playerLeaveMatch !== null) {
                _.remove(playersPerTeam["blue"], elem => elem === playerLeaveMatch.groups["playerName"])
                _.remove(playersPerTeam["red"], elem => elem === playerLeaveMatch.groups["playerName"])
            }

            const playerKickedMatch = message.match(playerKickPattern)
            if (playerKickedMatch !== null) {
                _.remove(playersPerTeam["blue"], elem => elem === playerKickedMatch.groups["playerName"])
                _.remove(playersPerTeam["red"], elem => elem === playerKickedMatch.groups["playerName"])
            }

            const playerJoinedSpectatorsMatch = message.match(playerJoinSpectatorsPattern)
            if (playerJoinedSpectatorsMatch !== null) {
                _.remove(playersPerTeam["blue"], elem => elem === playerJoinedSpectatorsMatch.groups["playerName"])
                _.remove(playersPerTeam["red"], elem => elem === playerJoinedSpectatorsMatch.groups["playerName"])
            }

            const gatherStartMatch = message.match(gatherStartPattern)
            if (gatherStartMatch !== null) {
                currentGather.currentSize = playersPerTeam["red"].length * 2
                currentGather.currentQueue = [...playersPerTeam["red"], ...playersPerTeam["blue"]].map(name => {
                    return getDiscordUser(hwidToDiscordId, playerNameToHwid, name);
                })

                currentGather.inGameState = gather.IN_GAME_STATES["GATHER_PRE_RESET"]

                currentGather.redTeam = [...playersPerTeam["red"]].map(name => {
                    return getDiscordUser(hwidToDiscordId, playerNameToHwid, name);
                })
                currentGather.blueTeam = [...playersPerTeam["blue"]].map(name => {
                    return getDiscordUser(hwidToDiscordId, playerNameToHwid, name);
                })
                currentGather.playerNameToHwid = playerNameToHwid
            }

            const joiningGameMatch = message.match(joiningGamePattern)

            if (joiningGameMatch !== null) {
                hwidToPlayerName[joiningGameMatch.groups["hwid"]] = joiningGameMatch.groups["playerName"]
                playerNameToHwid[joiningGameMatch.groups["playerName"]] = joiningGameMatch.groups["hwid"]
            }

            const loadConMatch = message.match(loadConPattern)
            if (loadConMatch !== null) {
                playersPerTeam.red = []
                playersPerTeam.blue = []
            }

            netClient.emit("data", message)

            match = logLinePattern.exec(contents)
        }

        console.log(`Finished reading ${fileName}`)
    })

    console.log(util.inspect(hwidToPlayerName))
}

(async () => await backloadGames())()