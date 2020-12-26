import {Card, Grid, Icon, Image, List, Loader} from "semantic-ui-react";
import moment from "moment";
import Dimmer from "semantic-ui-react/dist/commonjs/modules/Dimmer";
import React from "react";
import {UserResponse} from "../util/api";
import _ from "lodash"
import "./RatingCard.css";
import Input from "semantic-ui-react/dist/commonjs/elements/Input";
import {GamePopup} from "./GamePopup";
import {UserCache} from "../App";


interface Props {
    user: UserResponse,
    interactive: boolean,
    numLastGames: number,
    setNumLastGames: (numLastGames: number) => void,
    userCache: UserCache,
    fetchNewUser: (discordId: string) => void
}

export const RatingCard = ({userCache, fetchNewUser, user, interactive, numLastGames, setNumLastGames}: Props) => {

    return (
        <div
            className={"rating-card"}
            style={{margin: "5px", height: "95%"}}
        >
            {user !== undefined ? <Card style={{height: "100%"}} fluid>
                <Card.Content>
                    <Card.Header>
                        <Image src={user.avatarUrl} wrapped ui={false} avatar/>
                        {user.displayName}
                    </Card.Header>
                    <Card.Meta>
                        <span
                            className='date'>First Gather: {moment(user.playerStats.firstGameTimestamp).format("DD-MM-YYYY")}</span>
                    </Card.Meta>
                    <Card.Content>
                        <br />
                        <p><b>Stats</b></p>
                        <List className={"stats-list"}>
                            <List.Item>
                                <List.Icon name={"gamepad"} fitted/>
                                <List.Content>
                                    <b>Games Played</b>: {user.playerStats.totalGames}
                                </List.Content>
                            </List.Item>
                            <List.Item>
                                <List.Icon name={"gamepad"} fitted/>
                                <List.Content>
                                    <b>Rounds Played</b>: {user.playerStats.totalRounds}
                                </List.Content>
                            </List.Item>
                            <List.Item>
                                <List.Icon name={"trophy"} fitted/>
                                <List.Content>
                                    <b>CTF W-T-L</b>: {user.playerStats.gameModeStats.CaptureTheFlag.wonGames}-{user.playerStats.gameModeStats.CaptureTheFlag.tiedGames}-{user.playerStats.gameModeStats.CaptureTheFlag.lostGames}
                                </List.Content>
                            </List.Item>
                            <List.Item>
                                <List.Icon name={"trophy"} fitted/>
                                <List.Content>
                                    <b>CTB W-T-L</b>: {user.playerStats.gameModeStats.CaptureTheBases.wonGames}-{user.playerStats.gameModeStats.CaptureTheBases.tiedGames}-{user.playerStats.gameModeStats.CaptureTheBases.lostGames}
                                </List.Content>
                            </List.Item>
                            <List.Item>
                                <List.Icon name={"crosshairs"} fitted/>
                                <List.Content>
                                    <b>Kills/Deaths</b>: {user.playerStats.totalKills}/{user.playerStats.totalDeaths} ({(user.playerStats.totalKills / user.playerStats.totalDeaths).toFixed(2)})
                                </List.Content>
                            </List.Item>
                        </List>
                        {
                            interactive ?
                                <p><b>Last <Input
                                    size={"mini"}
                                    // value={numLastGames}
                                    onChange={(e) => {
                                        const newValue = parseInt(e.target.value)
                                        if (!isNaN(newValue)) {
                                            setNumLastGames(Math.max(1, newValue))
                                        }
                                    }}
                                /> Games</b></p>
                                :
                                <p><b>Last Games</b></p>
                        }
                        <List className={"games-list"} divided>
                            {_.take(user.sortedGames, numLastGames).map(game => {
                                const teamName = _.includes(game.redPlayers, user.discordId) ? "Red" : "Blue"
                                const won = game.winner === teamName
                                const winProbability = teamName === "Red" ? game.redWinProbability : game.blueWinProbability
                                const color = won ? "rgb(161, 239, 139, 0.6)" : "rgb(224, 54, 22, 0.6)"
                                const kd = game.playerKillsAndDeaths[user.discordId]

                                return (
                                    <GamePopup
                                        game={game}
                                        userCache={userCache}
                                        fetchNewUser={fetchNewUser}
                                    >
                                        <List.Item
                                            style={{backgroundColor: color}}
                                            // className={"monospaced"}
                                        >
                                            <Grid columns="equal">
                                                <Grid.Row>
                                                    <Grid.Column>
                                                        <Icon name={"flag"} fitted/>
                                                    </Grid.Column>
                                                    <Grid.Column>
                                                        {game.blueRoundWins} - {game.redRoundWins}
                                                    </Grid.Column>
                                                    <Grid.Column width={4}>
                                                        {(kd.kills / kd.deaths).toFixed(2)} K/D
                                                    </Grid.Column>
                                                    <Grid.Column>
                                                        {(winProbability * 100).toFixed(1)}%
                                                    </Grid.Column>
                                                    <Grid.Column width={5}>
                                                        {moment.duration(moment().valueOf() - game.startTime).humanize()} ago
                                                    </Grid.Column>
                                                </Grid.Row>
                                            </Grid>
                                        </List.Item>
                                    </GamePopup>
                                )
                            })}
                        </List>
                    </Card.Content>
                </Card.Content>
                {/*<Card.Content extra>*/}
                {/*    <a>*/}
                {/*        <Icon name='user'/>*/}
                {/*        22 Friends*/}
                {/*    </a>*/}
                {/*</Card.Content>*/}
            </Card> : (
                <Dimmer active inverted>
                    <Loader inverted>Loading player...</Loader>
                </Dimmer>
            )}
        </div>
    )
}