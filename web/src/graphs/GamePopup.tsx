import {UserCache, UserCacheContext} from "../App";
import {Game, Round} from "../util/api";
import * as React from "react";
import {useEffect} from "react";
import {Grid, Popup} from "semantic-ui-react";
import _ from "lodash"
import "./GamePopup.css"
import moment from "moment";
import {PlayersColumn, TeamInfo} from "./PlayersColumn";
import {ResultColumn} from "./ResultColumn";

interface GamePopupContentsProps {
    game: Game,
    userCache: UserCache,
    fetchNewUser: (discordId: string) => void,
}

export const GamePopupContents = ({userCache, fetchNewUser, game}: GamePopupContentsProps) => {
    useEffect(() => {
        const fetchUsers = async () => {
            for (let discordId of [...game.bluePlayers, ...game.redPlayers]) {
                if (!_.includes(_.keys(userCache), discordId)) {
                    await fetchNewUser(discordId)
                }
            }
        }

        fetchUsers().then().catch(e => console.log("Error"))
    }, [])

    const bluePlayers = game.bluePlayers.map(discordId => userCache[discordId])
    const redPlayers = game.redPlayers.map(discordId => userCache[discordId])
    const teams = {
        Blue: {
            teamName: "Blue",
            players: bluePlayers,
            color: "rgb(13, 33, 161, 0.6)",
            winProbability: game.blueWinProbability,
            floated: "left"
        } as TeamInfo,
        Red: {
            teamName: "Red",
            players: redPlayers,
            color: "rgb(224, 54, 22, 0.6)",
            winProbability: game.redWinProbability,
            floated: "right"
        } as TeamInfo
    }

    return (
        <Grid
            columns={"equal"}
            // divided
            // style={{width: "600px"}}
            // container // Provide a fixed-width container
            padded
            textAlign={"center"}
        >
            <Grid.Row>
                <PlayersColumn team={teams.Blue} playerKillsAndDeaths={game.playerKillsAndDeaths} />
                <ResultColumn
                    blueColor={teams.Blue.color}
                    redColor={teams.Red.color}
                    blueScore={game.blueRoundWins}
                    redScore={game.redRoundWins}
                    winner={game.winner}
                    rounds={game.rounds}
                />
                <PlayersColumn team={teams.Red} playerKillsAndDeaths={game.playerKillsAndDeaths} />
            </Grid.Row>
        </Grid>
    )
}

interface RoundPopupProps {
    round: Round,
    userCache: UserCache,
    fetchNewUser: (discordId: string) => void,
}

export const RoundPopupContents = ({userCache, fetchNewUser, round}: RoundPopupProps) => {
    useEffect(() => {
        const fetchUsers = async () => {
            for (let discordId of [...round.bluePlayers, ...round.redPlayers]) {
                await fetchNewUser(discordId)
            }
        }

        fetchUsers().then().catch(e => console.log("Error"))
    }, [])

    const bluePlayers = round.bluePlayers.map(discordId => userCache[discordId])
    const redPlayers = round.redPlayers.map(discordId => userCache[discordId])
    const teams = {
        Blue: {
            teamName: "Blue",
            players: bluePlayers,
            color: `rgb(61, 102, 198)`,
            floated: "left"
        } as TeamInfo,
        Red: {
            teamName: "Red",
            players: redPlayers,
            color: `rgb(224, 54, 22, 1.0)`,
            floated: "right"
        } as TeamInfo
    }

    return (
        <Grid
            columns={"equal"}
            // divided
            // style={{width: "600px"}}
            // container // Provide a fixed-width container
            padded
            textAlign={"center"}
        >
            <Grid.Row>
                <PlayersColumn team={teams.Blue} playerKillsAndDeaths={round.playerKillsAndDeaths} />
                <ResultColumn
                    blueColor={teams.Blue.color}
                    redColor={teams.Red.color}
                    blueScore={round.blueCaps}
                    redScore={round.redCaps}
                    winner={round.winner}
                    rounds={[round]}
                />
                <PlayersColumn team={teams.Red} playerKillsAndDeaths={round.playerKillsAndDeaths} />
            </Grid.Row>
        </Grid>
    )
}


interface GamePopupProps {
    game: Game,
    userCache: UserCache,
    fetchNewUser: (discordId: string) => void,
    children: React.ReactNode,
}

export const GamePopup = ({children, game, userCache, fetchNewUser}: GamePopupProps) => {

    return (
        <Popup
            flowing
            // Content is in a separate component in order only trigger loading of user data once someone
            // hovers over the popup
            content={
                <GamePopupContents
                    game={game}
                    userCache={userCache}
                    fetchNewUser={fetchNewUser}
                />
            }
            mouseEnterDelay={500}
            mouseLeaveDelay={250}
            // open={true} // Useful for debugging, must hover over before changing this to avoid portal error
            key={game.startTime}
            header={<div className={"header"} style={{textAlign: "center"}}>Game #{game.gameNumberForPlayer} played on {moment(game.startTime).format("DD-MM-YYYY HH:mm:ss")} ({moment.duration(moment().valueOf() - game.startTime).humanize()} ago)</div>}
            trigger={children}
            style={{
                width: "700px"
            }}
        />
    )
}