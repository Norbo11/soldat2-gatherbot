import dotenv from 'dotenv'
dotenv.config()
import db from '../game/db';
import _ from 'lodash';
import Discord from 'discord.js';

const backloadDisplayNames = async () => {

    const client = new Discord.Client()

    client.on("ready", async () => {
        const channel = client.channels.get(process.env.DISCORD_CHANNEL_ID)

        const dbConn = await db.getDbConnection()
        const statsDb = new db.StatsDB(dbConn)

        const discordIds = await statsDb.getAllDiscordIds()

        for (let discordId of discordIds) {
            const user = await client.fetchUser(discordId)
            const member = await channel.guild.member(user)
            const displayName = member !== null ? member.displayName : user.username

            await statsDb.cacheDiscordUser(discordId, displayName, user.avatarURL)
        }

    })

    await client.login(process.env.BOT_TOKEN)
}


(async () => {
    await backloadDisplayNames()
})()
