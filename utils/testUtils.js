import chai from "chai";
import chaiSubset from 'chai-subset';
import db from "../game/db";
import mongodb from "mongodb";

chai.use(chaiSubset)

const MongoClient = mongodb.MongoClient;


export const getTestStatsDb = async () => {
    const mongoClient = await MongoClient.connect("mongodb://localhost:27017")
    const mongoConn = mongoClient.db("testDb")
    const statsDb = new db.StatsDB(mongoConn)
    return statsDb
}
