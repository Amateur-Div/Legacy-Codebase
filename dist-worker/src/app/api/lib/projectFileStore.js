"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCodeFiles = getCodeFiles;
const mongoClient_1 = __importDefault(require("../../../lib/mongoClient"));
async function getCodeFiles(projectId) {
    const db = (await mongoClient_1.default).db();
    return db
        .collection("project_files")
        .find({ projectId, isCode: true })
        .sort({ path: 1 })
        .toArray();
}
