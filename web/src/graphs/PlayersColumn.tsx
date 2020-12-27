import * as React from "react";
import {Grid, List} from "semantic-ui-react";
import {KillsAndDeaths, UserResponse} from "../util/api";


export interface TeamInfo {
    teamName: string,
    players: UserResponse[],
    color: string,
    winProbability?: number,
    floated: "right" | "left"
}

interface Props {
    team: TeamInfo,
    playerKillsAndDeaths: KillsAndDeaths
}

export const PlayersColumn = ({team, playerKillsAndDeaths}: Props) => {
    return (
        <Grid.Column
            // width={6}
            floated={team.floated}
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
                        <b>{team.teamName} Team<br />{team.winProbability !== undefined ? `(${(team.winProbability * 100).toFixed(1)}% chance to win)` : null}</b>
                    </List.Content>
                </List.Item>
                {
                    team.players.map((player, i) => {
                        let contents

                        if (player !== undefined) {
                            const kd = playerKillsAndDeaths[player.discordId]
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
                                key={i}
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
