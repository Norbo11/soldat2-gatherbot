import React, {useEffect, useState} from "react";
import "./App.css";
import {Ratings} from "./graphs/Ratings";
import {fetchAllRatings, RatingResponse} from "./util/api";
import 'semantic-ui-css/semantic.min.css'
import {Container} from "semantic-ui-react";

function App() {
    const [ratings, setRatings] = useState<RatingResponse[]>([])

    useEffect(() => {
        fetchAllRatings().then(ratings => {
            setRatings(ratings)
        })
    }, [])

    return (
        <Container fluid style={{"padding": "50px"}} textAlign={"center"}>
            <Ratings ratings={ratings}/>
        </Container>
    );
}

export default App;
