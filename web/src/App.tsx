import React, {useEffect, useState} from "react";
import "./App.css";
import {Ratings} from "./graphs/Ratings";
import {fetchAllRatings, fetchUser, fetchWeaponStats, RatingResponse, UserResponse, WeaponStatsPoint} from "./util/api";
import 'semantic-ui-css/semantic.min.css'
import {Container, Menu} from "semantic-ui-react";
import _ from "lodash";
import {BrowserRouter as Router, Route, Switch, useLocation, useHistory} from "react-router-dom";
import {UserStatsPage} from "./UserStatsPage";
import {WeaponsGraph} from "./graphs/WeaponsGraph";
import logo from './images/s2_gather.png'
export interface UserCache {
    [discordId: string]: UserResponse
}

function App() {
    const history = useHistory();
    const location = useLocation();

    const [ratings, setRatings] = useState<RatingResponse[]>([]);
    const [userCache, setUserCache] = useState<UserCache>({});
    const [weaponStats, setWeaponStats] = useState<WeaponStatsPoint[]>([]);

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
        <div>
            <Menu fixed={"top"}>
                <Menu.Item>
                    <img src={logo}/>
                </Menu.Item>
                <Menu.Item
                    name='ratings'
                    active={location.pathname === '/'}
                    onClick={() => history.push("/")}
                >
                    Ratings
                </Menu.Item>
                <Menu.Item
                    name='weapons'
                    active={location.pathname === '/weapons'}
                    onClick={() => history.push("/weapons")}
                >
                    Weapons
                </Menu.Item>
            </Menu>
            <Container fluid style={{padding: "50px", marginTop: "50px"}} textAlign={"center"}>
                <Switch>
                    <Route exact path={"/"} key={"ratings"}>
                        <Ratings
                            ratings={ratings}
                            userCache={userCache}
                            fetchNewUser={fetchNewUser}
                        />
                    </Route>
                    <Route path={"/stats/:discordId"} key={"userStats"}>
                        <UserStatsPage
                            userCache={userCache}
                            fetchNewUser={fetchNewUser}
                        />
                    </Route>
                    <Route path={"/weapons"} key={"weapons"}>
                        <WeaponsGraph
                            weaponStats={weaponStats}
                        />
                    </Route>
                </Switch>
            </Container>
        </div>
    );
}

export default App;
