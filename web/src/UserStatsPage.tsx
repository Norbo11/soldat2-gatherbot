import * as React from "react"
import {useHistory, useParams} from "react-router";
import {UserCache} from "./App";
import {useEffect} from "react";
import {RatingModal} from "./graphs/RatingModal";
import {Dimmer} from "semantic-ui-react";
import Loader from "semantic-ui-react/dist/commonjs/elements/Loader";


interface Params {
    discordId: string
}

interface Props {
    userCache: UserCache,
    fetchNewUser: (discordId: string) => void
}

export const UserStatsPage = ({userCache, fetchNewUser}: Props) => {

    const { discordId } = useParams<Params>()
    const history = useHistory()

    useEffect(() => {
        fetchNewUser(discordId)
    })

    const user = userCache[discordId]

    return (
        user !== undefined
        ?
            <RatingModal
                user={user}
                userCache={userCache}
                onClose={() => history.push("/")}
                fetchNewUser={fetchNewUser}
            />
        :
            <Dimmer active inverted>
                <Loader inverted>Loading...</Loader>
            </Dimmer>
    )
}