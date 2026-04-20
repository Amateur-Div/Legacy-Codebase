"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createJob = createJob;
exports.getJob = getJob;
const uuid_1 = require("uuid");
const jobStore_1 = require("./jobStore");
function createJob(projectId, ownerId, totalFiles = 0) {
    const id = (0, uuid_1.v4)();
    const job = {
        id,
        projectId,
        ownerId,
        createdAt: Date.now(),
        status: "initialized",
        step: "initializing",
        cursor: 0,
        totalFiles,
        progress: 0,
        message: "initialized",
    };
    (0, jobStore_1.saveJob)(job).catch(console.error);
    return job;
}
async function getJob(jobId) {
    return (0, jobStore_1.loadJob)(jobId);
}
