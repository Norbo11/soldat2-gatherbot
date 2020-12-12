require("dotenv").config()
import util from 'util';
import { MongoClient } from 'mongodb';
import db from '../game/db';
import _ from 'lodash';
import Discord from 'discord.js';

const guild = "761205877432385567"
const channel = "761314449532387368"

const dbUrl = "check_env_file"

const main = (async () => {
    const client = new Discord.Client()
    console.log(process.env.BOT_TOKEN)
    client.login(process.env.BOT_TOKEN)

    client.on("ready", async () => {
        const dbConn = await db.getDbConnection(dbUrl, "Soldat2Stats")
        const statsDb = new db.StatsDB(dbConn)
        const games = await statsDb.getGameByStartTime(1601736591631)
        // const games = await statsDb.getGameByStartTime(1601737855586)
        // const games = await statsDb.getGameByStartTime(1601738725363one https://github.com/romanmikh/Momentum_Trading_Backtest)
        const game = games[0]

        const teams = ["redPlayers", "bluePlayers"]

        console.log(game)

        for (let team of teams) {
            console.log(team)
            for (let discordId of game[team]) {
                const user = await client.fetchUser(discordId);
                console.log(`${user.id}: ${user.username}`);

                // blue ["711593758092689459", "739181658778894336", "203189073924325378"]
                // red  ["122766322739314688", "192415806938677249", "154344848881614848"]
            }
        }
    })
})

(async () => await main())()


