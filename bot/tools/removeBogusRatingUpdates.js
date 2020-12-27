import dotenv from 'dotenv'
dotenv.config()
import db from '../game/db';
import _ from 'lodash';
import Discord from 'discord.js';

const guild = "761205877432385567"
const channel = "761314449532387368"


const removeBogusUpdates = async () => {

    const dbConn = await db.getDbConnection()
    const statsDb = new db.StatsDB(dbConn)


    const discordIds = await statsDb.getAllDiscordIds()

    for (let discordId of discordIds) {
        console.log(`Considering discord ID ${discordId}`)

        const ratingUpdates = await statsDb.getRatingUpdates(discordId)
        const games = await statsDb.getGamesWithPlayer(discordId)
        const startTimeToGame = _.groupBy(games, game => game.startTime)

        for (let ratingUpdate of ratingUpdates) {
            const game = startTimeToGame[ratingUpdate.gameStartTime]

            if (game === undefined) {
                // If we get here, we've found a rating update that points to a game which doesn't exist

                console.log(`Bogus update ${ratingUpdate.discordId}, ${ratingUpdate.gameStartTime}, ${ratingUpdate.newMu}, ${ratingUpdate.newSigma}`)
                statsDb.db.collection("RatingUpdates").deleteOne({
                    $and: [
                        {discordId: ratingUpdate.discordId},
                        {gameStartTime: ratingUpdate.gameStartTime},
                    ]
                })
            }
        }
    }

    console.log(`Finished`)
}

(async () => {
    await removeBogusUpdates()
})()
