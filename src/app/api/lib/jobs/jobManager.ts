import { v4 as uuidv4 } from "uuid";
import { saveJob, loadJob } from "./jobStore";

type JobStatus = "queued" | "running" | "done" | "error" | "cancelled";

type JobStep =
  | "queued"
  | "ingestion"
  | "file-analysis"
  | "merge"
  | "enrich"
  | "save"
  | "done"
  | "error";

export type Job = {
  id: string;
  projectId: string;
  ownerId?: string;
  createdAt: number;

  status: JobStatus;

  extractedPath?: string;
  step: JobStep;

  cursor: number;
  totalFiles: number;

  progress: number;
  message?: string;

  locked?: boolean;
  totalStoredBytes?: number;

  ingestFiles?: string[];
  ingestCursor?: number;

  analysisFiles?: string[];

  result?: any;
  error?: string | null;
};

export function createJob(projectId: string, ownerId?: string, totalFiles = 0) {
  const id = uuidv4();

  const job: Job = {
    id,
    projectId,
    ownerId,
    createdAt: Date.now(),

    status: "queued",
    step: "queued",

    cursor: 0,
    totalFiles,

    progress: 0,
    message: "Queued",
  };

  saveJob(job).catch(console.error);

  return job;
}

export async function getJob(jobId: string): Promise<Job | null> {
  return loadJob(jobId);
}
