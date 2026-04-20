import { v4 as uuidv4 } from "uuid";
import { saveJob, loadJob } from "./jobStore";

type JobStatus = "initialized" | "running" | "done" | "error" | "cancelled";

type JobStep =
  | "initializing"
  | "extract"
  | "scan"
  | "metadata"
  | "ingest"
  | "file-analysis"
  | "analyze"
  | "merge"
  | "enrich"
  | "save"
  | "done";

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

  scanFiles?: string[];
  scanCursor?: number;

  progress: number;
  message?: string;

  locked?: boolean;
  totalStoredBytes?: number;

  ingestCursor?: number;
  ingestFiles?: string[];

  analysisCursor?: number;
  analysisFiles?: string[];

  result?: any;
  error?: any;
};

export function createJob(projectId: string, ownerId?: string, totalFiles = 0) {
  const id = uuidv4();

  const job: Job = {
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

  saveJob(job).catch(console.error);

  return job;
}

export async function getJob(jobId: string): Promise<Job | null> {
  return loadJob(jobId);
}
