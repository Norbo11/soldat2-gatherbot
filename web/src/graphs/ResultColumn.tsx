import * as React from "react";
import {Grid, List} from "semantic-ui-react";
import {Round, Winner} from "../util/api";


interface Props {
    blueColor: string,
    redColor: string
    winner: Winner,
    blueScore: number,
    redScore: number,
    rounds: Round[],
    horizontal: boolean
}

export const ResultColumn = ({blueColor, redColor, winner, blueScore, redScore, rounds, horizontal}: Props) => {
    const getColor = (winner: Winner) => {
        let color

        if (winner === "Blue") {
            color = blueColor
        } else if (winner === "Red") {
            color = redColor
        } else {
            color = "gray"
        }

        return color
    }

    return (
        <Grid.Column
            width={5}
            style={{
                padding: 0,
                margin: 0,
            }}
        >
            <List
                horizontal={horizontal}
                // divided
            >
                <List.Item
                    style={{
                        backgroundColor: getColor(winner),
                        padding: "5px",
                    }}
                >
                    <List.Content>
                        <b>Winner: {winner}</b>
                        {
                            rounds.length > 0 ?
                                <React.Fragment>
                                    <br/>
                                    {blueScore} - {redScore}
                                </React.Fragment>
                                : null
                        }
                    </List.Content>
                </List.Item>
                {
                    rounds.map(round => {
                        return (
                            <List.Item
                                style={{
                                    backgroundColor: getColor(round.winner),
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
    )
}