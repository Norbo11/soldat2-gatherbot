require("dotenv").config()
import util from 'util';
import { MongoClient } from 'mongodb';
import db from '../game/db';
import _ from 'lodash';


const main = (async () => {
    const dbConn = await db.getDbConnection()
    const statsDb = new db.StatsDB(dbConn)

    const discordIds = await statsDb.getAllDiscordIds()
    console.log(util.inspect(discordIds))

    const games = await statsDb.getAllGames()

    games.forEach(game => {
        if (game.redPlayers.length !== game.bluePlayers.length) {
            throw new Error()
        }

        if (game.size !== game.redPlayers.length * 2) {
            throw new Error()
        }

        if (game.events.length < 0) {
            throw new Error()
        }

        if (game.mapName.length === 0) {
            throw new Error()
        }

        if (!(game.size % 2 === 0)) {
            throw new Error()
        }

        game.events.forEach(event => {
            if (event.timestamp < game.startTime) {
                throw new Error()
            }
            if (event.timestamp > game.endTime) {
                throw new Error()
            }
        })
    })

    console.log(`${games.length} games validated.`)
})

(async () => await main())()


