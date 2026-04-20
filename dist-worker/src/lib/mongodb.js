"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToDatabase = connectToDatabase;
const mongoose_1 = __importDefault(require("mongoose"));
const mongodbURI = process.env.mongodbURI;
if (!mongodbURI) {
    throw new Error("No uri found.");
}
let cached = global.mongooseGlobal;
if (!cached) {
    cached = global.mongooseGlobal = { conn: null, promise: null };
}
async function connectToDatabase() {
    if (cached.conn)
        return cached.conn;
    if (!cached.promise) {
        cached.promise = mongoose_1.default.connect(mongodbURI, {
            bufferCommands: false,
        });
    }
    cached.conn = await (cached === null || cached === void 0 ? void 0 : cached.promise);
    return cached.conn;
}
