import React, {useEffect, useState} from "react";
import "./App.css";
import {Ratings} from "./graphs/Ratings";
import {fetchAllRatings, RatingResponse} from "./util/api";

function App() {
    const [ratings, setRatings] = useState<RatingResponse[]>([])

    useEffect(() => {
        fetchAllRatings().then(ratings => {
            setRatings(ratings)
        })
    }, [fetchAllRatings])

    return (
        <Ratings ratings={ratings}/>
    );
}

export default App;
