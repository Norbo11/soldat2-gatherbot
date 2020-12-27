import React, {useCallback, useEffect, useState} from "react";
import "./App.css";
import {Ratings} from "./graphs/Ratings";
import {fetchAllRatings, fetchUser, RatingResponse, UserResponse} from "./util/api";
import 'semantic-ui-css/semantic.min.css'
import {Container} from "semantic-ui-react";
import _ from "lodash";

export interface UserCache {
    [discordId: string]: UserResponse
}


export const UserCacheContext = React.createContext({} as UserCache)

function App() {
    const [ratings, setRatings] = useState<RatingResponse[]>([])
    const [userCache, setUserCache] = useState<UserCache>({})

    useEffect(() => {
        fetchAllRatings().then(ratings => {
            setRatings(ratings)
        })
    }, [])

    const fetchNewUser = async (discordId: string) => {
        if (!_.includes(_.keys(userCache), discordId)) {
            const user = await fetchUser(discordId)
            console.log(`Fetched user ${user.displayName}`)
            setUserCache(oldCache => {
                return {...oldCache, [discordId]: user}
            })
        }
    }

    return (
        <UserCacheContext.Provider value={userCache}>
            <Container fluid style={{"padding": "50px"}} textAlign={"center"}>
                <Ratings
                    ratings={ratings}
                    userCache={userCache}
                    fetchNewUser={fetchNewUser}
                />
            </Container>
        </UserCacheContext.Provider>
    );
}

export default App;
