"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveGraph = saveGraph;
exports.getGraph = getGraph;
exports.listGraphs = listGraphs;
const mongoClient_1 = __importDefault(require("../../../../lib/mongoClient"));
const COLLECTION = "graphs";
async function saveGraph(projectId, record, ownerId) {
    const client = await mongoClient_1.default;
    const db = client.db();
    const col = db.collection(COLLECTION);
    await col.insertOne({
        projectId,
        ownerId,
        createdAt: new Date(),
        record,
    });
}
async function getGraph(projectId, ownerId) {
    const client = await mongoClient_1.default;
    const db = client.db();
    const col = db.collection(COLLECTION);
    const graphs = await col
        .find({ projectId })
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray();
    return graphs || { nodes: [], edges: [] };
}
async function listGraphs(limit = 10) {
    const client = await mongoClient_1.default;
    const db = client.db();
    const col = db.collection(COLLECTION);
    const docs = await col
        .find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
    return docs.map((d) => {
        var _a, _b, _c, _d, _e, _f;
        return ({
            projectId: d.projectId,
            createdAt: d.createdAt,
            nodeCount: (_c = (_b = (_a = d.record) === null || _a === void 0 ? void 0 : _a.nodes) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 0,
            edgeCount: (_f = (_e = (_d = d.record) === null || _d === void 0 ? void 0 : _d.edges) === null || _e === void 0 ? void 0 : _e.length) !== null && _f !== void 0 ? _f : 0,
        });
    });
}
