import dotenv from "dotenv";

dotenv.config({
  path: ".env.local",
});

import { Worker } from "bullmq";
import IORedis from "ioredis";

import { runJobStep } from "../src/app/api/lib/jobs/jobWorker";
import { loadJob, saveJob } from "../src/app/api/lib/jobs/jobStore";

const connection = new IORedis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

new Worker(
  "analysis",
  async (bullJob) => {
    let job = await loadJob(bullJob.data.jobId);

    if (!job || job.status === "done") return;

    await saveJob({
      id: job.id,
      status: "running",
      step: "initializing",
      progress: 1,
      message: "Worker started",
    });

    while (job && job.status !== "done") {
      try {
        await runJobStep(job);
      } catch (error: any) {
        console.error("Worker step failed : ", error);

        await saveJob({
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

      job = await loadJob(job.id);
    }
  },
  {
    connection,
    concurrency: 1,
    lockDuration: 60000,
  },
);
