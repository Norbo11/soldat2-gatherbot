import {UserCache} from "../App";
import {Game} from "../util/api";
import * as React from "react";
import {Grid, List, Popup} from "semantic-ui-react";
import _ from "lodash"
import {useEffect} from "react";
import useDeepCompareEffect from "use-deep-compare-effect";
import "./GamePopup.css"
import moment from "moment";

interface Props {
    game: Game,
    userCache: UserCache,
    fetchNewUser: (discordId: string) => void,
    children: React.ReactNode,
}


interface Props2 {
    game: Game,
    userCache: UserCache,
    fetchNewUser: (discordId: string) => void,
}


export const PopupContents = ({userCache, fetchNewUser, game}: Props2) => {
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
        },
        Red: {
            teamName: "Red",
            players: redPlayers,
            color: "rgb(224, 54, 22, 0.6)",
            winProbability: game.redWinProbability,
            floated: "right"
        }
    }

    const displayTeam = (team: typeof teams.Blue) => {
        return (
            <Grid.Column
                // width={6}
                floated={team.floated as "left" | "right"}
                style={{
                    padding: 0,
                    margin: 0,
                }}
            >
                <List
                    className={"player-list"}
                    // divided
                >
                    <List.Item
                        style={{
                            backgroundColor: team.color,
                            padding: "5px"
                        }}
                    >
                        <List.Content>
                            <b>{team.teamName} Team<br />({(team.winProbability * 100).toFixed(1)}% chance to win)</b>
                        </List.Content>
                    </List.Item>
                    {
                        team.players.map(player => {
                            let contents

                            if (player !== undefined) {
                                const kd = game.playerKillsAndDeaths[player.discordId]
                                contents = (
                                    <span>
                                        <b>{player.displayName}</b>: {kd.kills}/{kd.deaths} ({(kd.kills / kd.deaths).toFixed(2)})
                                    </span>
                                )
                            } else {
                                contents = "Loading..."
                            }

                            return (
                                <List.Item
                                    style={{
                                        backgroundColor: team.color,
                                        padding: "5px",
                                    }}
                                >
                                    <List.Content>
                                        { contents }
                                    </List.Content>
                                </List.Item>
                            )
                        })
                    }
                </List>
            </Grid.Column>
        )
    }

    const team = teams[game.winner as "Blue" | "Red"]
    const color = team !== undefined ? team.color : "gray" // Handle ties

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
                {displayTeam(teams.Blue)}
                <Grid.Column
                    width={5}
                    style={{
                        padding: 0,
                        margin: 0,
                    }}
                >
                    <List
                        // divided
                    >
                        <List.Item
                            style={{
                                backgroundColor: color,
                                padding: "5px",
                            }}
                        >
                            <List.Content>
                                <b>Winner: {game.winner}</b>
                                <br />
                                {game.blueRoundWins} - {game.redRoundWins}
                            </List.Content>
                        </List.Item>
                        {
                            game.rounds.map(round => {
                                const team = teams[round.winner as "Blue" | "Red"]
                                const color = team !== undefined ? team.color : "gray" // Handle ties

                                return (
                                    <List.Item
                                        style={{
                                            backgroundColor: color,
                                            padding: "5px",
                                        }}
                                    >
                                        <List.Content>
                                            <b>{round.mapName}</b>: {round.blueCaps} - {round.redCaps}
                                        </List.Content>
                                    </List.Item>
                                )
                            })
                        }
                    </List>
                </Grid.Column>
                {displayTeam(teams.Red)}
            </Grid.Row>
        </Grid>
    )
}

export const GamePopup = ({children, game, userCache, fetchNewUser}: Props) => {

    return (
        <Popup
            flowing
            // Content is in a separate component in order only trigger loading of user data once someone
            // hovers over the popup
            content={
                <PopupContents
                    game={game}
                    userCache={userCache}
                    fetchNewUser={fetchNewUser}/>
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