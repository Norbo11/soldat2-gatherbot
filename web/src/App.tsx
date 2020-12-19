import React, {useEffect, useState} from "react";
import "./App.css";
import {Ratings} from "./graphs/Ratings";
import {fetchAllRatings, fetchUser, RatingResponse, UserResponse} from "./util/api";
import 'semantic-ui-css/semantic.min.css'
import {Container} from "semantic-ui-react";

export interface UserCache {
    [discordId: string]: UserResponse
}


function App() {
    const [ratings, setRatings] = useState<RatingResponse[]>([])
    const [userCache, setUserCache] = useState<UserCache>({})

    useEffect(() => {
        fetchAllRatings().then(ratings => {
            setRatings(ratings)
        })
    }, [])

    const fetchNewUser = async (discordId: string) => {
        const cache = {...userCache}
        cache[discordId] = await fetchUser(discordId)
        setUserCache(cache)
    }

    return (
        <Container fluid style={{"padding": "50px"}} textAlign={"center"}>
            <Ratings
                ratings={ratings}
                userCache={userCache}
                fetchNewUser={fetchNewUser}
            />
        </Container>
    );
}

export default App;
