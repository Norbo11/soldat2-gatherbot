import {API_URL} from "./constants";




interface Round {
    startTime: number
    endTime: number
    mapName: string
    blueCaps: number
    redCaps: number
    winner: string
    // events	[…]
}


export interface Game {
    gameMode: string,
    size: number,
    startTime: number,
    endTime: number,
    winner: string,
    totalRounds: number,
    redRoundWins: number,
    blueRoundWins: number,
    matchQuality: number,
    blueWinProbability: number,
    redWinProbability: number,
    rounds: Round[]
}


export interface RatingResponse {
    discordId: string,
    mu: number,
    sigma: number,
    lastGames: Game[]
}


export const fetchAllRatings = async (): Promise<RatingResponse[]> => {
    return (await fetch(`${API_URL}/ratings/all`)).json()
}