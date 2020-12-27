import {API_URL} from "./constants";


export type Winner = "Blue" | "Red" | "Tie"


export interface Round {
    startTime: number
    endTime: number
    mapName: string
    blueCaps: number
    redCaps: number
    winner: Winner
    playerKillsAndDeaths: KillsAndDeaths,
    bluePlayers: string[],
    redPlayers: string[]
    ratingUpdate: RatingUpdate
    // events	[…]
}

export interface RatingUpdate {
    gameStartTime: number,
    roundStartTime: number,
    newMu: number,
    newSigma: number,
}

export interface KillsAndDeaths {
    [discordId: string]: {
        kills: number,
        deaths: number
    }
}

export interface Game {
    gameNumberForPlayer: number,
    bluePlayers: string[],
    redPlayers: string[],
    gameMode: string,
    size: number,
    startTime: number,
    endTime: number,
    winner: Winner,
    totalRounds: number,
    redRoundWins: number,
    blueRoundWins: number,
    matchQuality: number,
    blueWinProbability: number,
    redWinProbability: number,
    rounds: Round[],
    playerKillsAndDeaths: KillsAndDeaths
}

export interface RatingResponse {
    discordId: string,
    mu: number,
    sigma: number,
    displayName: string,
    avatarUrl: string
    lastGames: Game[]
}

export interface GameModeStats {
    totalGames: number,
    wonGames: number,
    lostGames: number,
    tiedGames: number,
}

export interface UserResponse {
    discordId: string
    avatarUrl: string,
    displayName: string,
    playerStats: {
        totalGames: number,
        totalRounds: number,
        totalRoundsAfterKillTrackingWasImplemented: number,
        wonGames: number,
        lostGames: number,
        tiedGames: number,
        weaponStats: {
            [weaponName: string]: {
                kills: number,
                deaths: number,
                totalRounds: number,
            }
        },
        firstGameTimestamp: number,
        totalKills: number,
        totalDeaths: number,
        gameModeStats: {
            CaptureTheFlag: GameModeStats,
            CaptureTheBases: GameModeStats,
        }
    },
    ratingUpdates: RatingUpdate[],
    sortedGames: Game[]
}

export const fetchAllRatings = async (): Promise<RatingResponse[]> => {
    return (await fetch(`${API_URL}/ratings/all`)).json()
}

export const fetchUser = async (discordId: string): Promise<UserResponse> => {
    return (await fetch(`${API_URL}/ratings/user/${discordId}`)).json()
}
