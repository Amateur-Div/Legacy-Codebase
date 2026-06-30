"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb_1 = require("mongodb");
if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in environment variables.");
}
const uri = process.env.MONGODB_URI;
const options = {
    tls: true,
    monitorCommands: process.env.NODE_ENV === "development",
    tlsAllowInvalidCertificates: false,
};
let client;
let clientPromise;
async function ensureIndexes(db) {
    await db
        .collection("project_files")
        .createIndex({ projectId: 1, path: 1 }, { unique: true });
    await db.collection("project_files").createIndex({ projectId: 1 });
    db.collection("project_files").createIndex({
        content: "text",
    }, {
        default_language: "english",
        language_override: "none",
    });
    db.collection("project_files").createIndex({
        projectId: 1,
        "functions.name": 1,
    });
    db.collection("project_files").createIndex({
        projectId: 1,
        "classes.name": 1,
    });
    db.collection("project_files").createIndex({
        projectId: 1,
        "exports.name": 1,
    });
    db.collection("project_files").createIndex({
        projectId: 1,
        "components.name": 1,
    });
    await db.collection("comments").createIndex({
        projectId: 1,
        filePath: 1,
        lineNumber: 1,
    });
}
if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
        client = new mongodb_1.MongoClient(uri, options);
        global._mongoClientPromise = client.connect().then(async (c) => {
            const db = c.db();
            await ensureIndexes(db);
            return c;
        });
    }
    clientPromise = global._mongoClientPromise;
}
else {
    client = new mongodb_1.MongoClient(uri, options);
    clientPromise = client.connect().then(async (c) => {
        const db = c.db();
        await ensureIndexes(db);
        return c;
    });
}
exports.default = clientPromise;
