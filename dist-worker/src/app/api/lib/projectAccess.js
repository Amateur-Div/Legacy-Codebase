"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertProjectAccess = assertProjectAccess;
const mongoClient_1 = __importDefault(require("../../../lib/mongoClient"));
const bson_1 = require("bson");
async function assertProjectAccess(projectId, uid, requiredRole) {
    const db = (await mongoClient_1.default).db();
    const col = db.collection("projects");
    const project = await col.findOne({ _id: new bson_1.ObjectId(projectId) });
    if (!project) {
        const err = new Error("Project not found");
        err.status = 404;
        throw err;
    }
    const members = project.members;
    console.log("Members : ", members);
    console.log("Uid : ", uid);
    if (!members.includes(uid)) {
        const err = new Error("Forbidden: not a project member");
        err.status = 403;
        throw err;
    }
    if (requiredRole) {
        const roles = project.roles || {};
        const role = roles[uid];
        const rank = { viewer: 0, editor: 1, owner: 2 };
        console.log("Role : ", role);
        console.log("\nRequired : ", requiredRole);
        console.log("Role rank : ", rank[role], " Required role rank : ", rank[requiredRole]);
        if (!role || rank[role] < rank[requiredRole]) {
            const err = new Error("Forbidden: insufficient role");
            err.status = 403;
            throw err;
        }
    }
    return project;
}
