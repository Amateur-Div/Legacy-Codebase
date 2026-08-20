"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({
    path: ".env.local",
});
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const jobWorker_1 = require("../src/app/api/lib/jobs/jobWorker");
const jobStore_1 = require("../src/app/api/lib/jobs/jobStore");
const connection = new ioredis_1.default(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});
new bullmq_1.Worker("analysis", async (bullJob) => {
    let job = await (0, jobStore_1.loadJob)(bullJob.data.jobId);
    if (!job || job.status === "done" || job.error)
        return;
    await (0, jobStore_1.saveJob)({
        id: job.id,
        status: "running",
        step: "initializing",
        progress: 1,
        message: "Worker started",
    });
    while (job && job.status !== "done") {
        try {
            await (0, jobWorker_1.runJobStep)(job);
        }
        catch (error) {
            console.error("Worker step failed : ", error);
            await (0, jobStore_1.saveJob)({
                id: job.id,
                status: "error",
                message: error.message,
                error: {
                    message: error.message,
                    stack: error.stack,
                    time: Date.now(),
                },
            });
            throw error;
        }
        await new Promise((r) => setImmediate(r));
        job = await (0, jobStore_1.loadJob)(job.id);
    }
}, {
    connection,
    concurrency: 1,
    lockDuration: 60000,
});
