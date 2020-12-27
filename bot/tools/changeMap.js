import dotenv from 'dotenv'
dotenv.config()
import db from '../game/db';
import _ from 'lodash';
import Discord from 'discord.js';
import ratings from '../game/ratings';
import soldat2 from "../game/soldat2"


const changeMap = async () => {

    const client = await soldat2.Soldat2Client.fromWebRcon("blah", "IHU970GW9PDX70WKLD5W", "5VJK6W4LN3")

    client.changeMap("ctf_ash", "CaptureTheFlag", done => {
        console.log("done")
    })

}


(async () => {
    await changeMap()
})()
