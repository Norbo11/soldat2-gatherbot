import React, {useEffect, useState} from "react";
import "./App.css";
import {Ratings} from "./graphs/Ratings";
import {fetchAllRatings, fetchUser, fetchWeaponStats, RatingResponse, UserResponse, WeaponStatsPoint} from "./util/api";
import 'semantic-ui-css/semantic.min.css'
import {Container} from "semantic-ui-react";
import _ from "lodash";
import {BrowserRouter as Router, Route, Switch} from "react-router-dom";
import {UserStatsPage} from "./UserStatsPage";
import {WeaponsGraph} from "./graphs/WeaponsGraph";

export interface UserCache {
    [discordId: string]: UserResponse
}


export const UserCacheContext = React.createContext({} as UserCache)

function App() {
    const [ratings, setRatings] = useState<RatingResponse[]>([])
    const [userCache, setUserCache] = useState<UserCache>({})
    const [weaponStats, setWeaponStats] = useState<WeaponStatsPoint[]>([])

    useEffect(() => {
        fetchAllRatings().then(ratings => {
            setRatings(ratings)
        })

        fetchWeaponStats().then(weaponStats => {
            setWeaponStats(weaponStats)
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
                <Router>
                    <Switch>
                        <Route exact path={"/"}>
                            <Ratings
                                ratings={ratings}
                                userCache={userCache}
                                fetchNewUser={fetchNewUser}
                            />
                        </Route>
                        <Route path={"/stats/:discordId"}>
                            <UserStatsPage
                                userCache={userCache}
                                fetchNewUser={fetchNewUser}
                            />
                        </Route>
                        <Route path={"/weapons"}>
                            <WeaponsGraph
                                weaponStats={weaponStats}
                            />
                        </Route>
                    </Switch>
                </Router>
            </Container>
        </UserCacheContext.Provider>
    );
}

export default App;
