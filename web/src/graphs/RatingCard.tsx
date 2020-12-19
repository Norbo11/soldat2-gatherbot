import {Card, Image, List, Loader} from "semantic-ui-react";
import moment from "moment";
import Dimmer from "semantic-ui-react/dist/commonjs/modules/Dimmer";
import React from "react";
import {UserResponse} from "../util/api";
import _ from "lodash"
import * as d3 from "d3";


interface Props {
    user: UserResponse
}


// const onCloseClick = (e, d) => {
//     console.log("clicked")
//     d3.select(`#playerStatsDrawing${d.i}`)
//         .remove()
    // .transition()
    // .duration(1000)
    // .attr("width", statsBoxWidth)
    // .attr("height", statsBoxHeight)
// }

export const RatingCard = ({user}: Props) => {

    return (
        <div style={{margin: "5px", height: "95%"}}>
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
                        <List>
                            <List.Item>
                                <List.Icon name={"gamepad"}/>
                                <List.Content>
                                    Games Played: {user.playerStats.totalGames}
                                </List.Content>
                            </List.Item>
                            <List.Item>
                                <List.Icon name={"gamepad"}/>
                                <List.Content>
                                    Rounds Played: {user.playerStats.totalRounds}
                                </List.Content>
                            </List.Item>
                            <List.Item>
                                <List.Icon name={"trophy"}/>
                                <List.Content>
                                    Games Won: {user.playerStats.wonGames}
                                </List.Content>
                            </List.Item>
                        </List>
                        <List divided relaxed>
                            <p>Last 5 Games</p>
                            {_.take(user.sortedGames, 5).map(game => {
                                return (
                                    <List.Item key={game.startTime}>
                                        <List.Content>
                                            <List.Description as='a'>
                                                {game.blueRoundWins} - {game.redRoundWins} ({moment.duration(moment().valueOf() - game.startTime).humanize()} ago)
                                            </List.Description>
                                        </List.Content>
                                    </List.Item>
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