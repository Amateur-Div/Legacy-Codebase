import { loadJob } from "./jobStore";
import { v4 as uuidv4 } from "uuid";
import type { FlowGraph } from "../analyzer/types";
import { scanImports } from "../analyzer/scanImports";
import { mergeFileGraphs } from "../analyzer/mergeFileGraph";
import { enrichGraphSemantics } from "../analyzer/enrichGraphSemantics";
import { saveJob } from "./jobStore";
import { saveGraph } from "../graph/graphStore";
import { instrumentExecutionBabel } from "../instrumentExecutionBabel";

type JobStatus = "queued" | "running" | "done" | "error" | "cancelled";

export type Job = {
  id: string;
  projectId: string;
  ownerId?: string;
  createdAt: number;
  status: JobStatus;
  progress: number;
  message?: string;
  result?: { graph: FlowGraph } | null;
  error?: string | null;
};

const JOBS = new Map<string, Job>();
const JOB_PROGRESS_CALLBACKS = new Map<string, Set<(job: Job) => void>>();

function emitJobUpdate(job: Job) {
  console.log(
    "📡 [emitJobUpdate] Emitting job update:",
    job.id,
    job.status,
    job.progress
  );
  const set = JOB_PROGRESS_CALLBACKS.get(job.id);
  if (!set) return;
  for (const cb of set) {
    try {
      cb(job);
    } catch (e) {
      console.error("emitJobUpdate callback error:", e);
    }
  }
  saveJob(job).catch(console.error);
}

export function onJobUpdate(jobId: string, cb: (job: Job) => void) {
  const set = JOB_PROGRESS_CALLBACKS.get(jobId) ?? new Set();
  set.add(cb);
  JOB_PROGRESS_CALLBACKS.set(jobId, set);
  return () => {
    const s = JOB_PROGRESS_CALLBACKS.get(jobId);
    if (!s) return;
    s.delete(cb);
    if (s.size === 0) JOB_PROGRESS_CALLBACKS.delete(jobId);
  };
}

export function createJob(projectId: string, ownerId?: string) {
  const id = uuidv4();
  const job: Job = {
    id,
    projectId,
    ownerId,
    createdAt: Date.now(),
    status: "queued",
    progress: 0,
    message: "Job created",
    result: null,
    error: null,
  };
  JOBS.set(id, job);
  saveJob(job).catch(console.error);
  return job;
}

export async function getJob(jobId: string): Promise<Job | null> {
  const memJob = JOBS.get(jobId);
  if (memJob) return memJob;

  const dbJob = await loadJob(jobId);
  if (dbJob) {
    JOBS.set(jobId, dbJob);
  }

  return dbJob;
}

export function listJobsForProject(projectId: string) {
  return Array.from(JOBS.values()).filter((j) => j.projectId === projectId);
}

async function runAnalysisTask(files: Record<string, string>, job: Job) {
  try {
    job.status = "running";
    job.progress = 2;
    job.message = "Analyzing files (1/4)";
    emitJobUpdate(job);

    const fileEntries = Object.entries(files);
    const totalFiles = fileEntries.length || 1;
    const fileGraphs: {
      file: string;
      graph: { nodes: any[]; edges: any[] };
    }[] = [];

    let i = 0;
    for (const [filePath, code] of fileEntries) {
      i++;
      try {
        job.progress = Math.round(2 + (i / totalFiles) * 50);
        job.message = `Analyzing file ${i}/${totalFiles}: ${filePath}`;
        emitJobUpdate(job);

        const graph = await instrumentExecutionBabel(code);

        fileGraphs.push({ file: filePath, graph });
      } catch (err: any) {
        console.error("Error analyzing file:", filePath, err);
        fileGraphs.push({
          file: filePath,
          graph: { nodes: [], edges: [] },
        });
      }
    }

    job.progress = 60;
    job.message = "Merging file graphs (2/4)";
    emitJobUpdate(job);

    const merged = mergeFileGraphs(fileGraphs);

    job.progress = 80;
    job.message = "Enriching semantics (3/4)";
    emitJobUpdate(job);

    const enriched = enrichGraphSemantics(merged);

    job.progress = 95;
    job.message = "Saving graph (4/4)";
    emitJobUpdate(job);

    console.log("About to save graph : ", job.projectId);
    await saveGraph(job.projectId, enriched);

    console.log("Graph saved : ");

    job.status = "done";
    job.progress = 100;
    job.message = "Completed";
    job.result = { graph: enriched };

    await saveJob(job);
    emitJobUpdate(job);

    console.log("Job status : ", job);

    return job;
  } catch (err: any) {
    job.status = "error";
    job.error = String(err?.message ?? err);
    job.message = "Error during analysis";
    emitJobUpdate(job);
    return job;
  }
}

export function enqueueJob(
  projectId: string,
  files: Record<string, string>,
  ownerId?: string
) {
  const job = createJob(projectId, ownerId);
  (async () => {
    try {
      await runAnalysisTask(files, job);
    } catch (err) {
      job.status = "error";
      job.error = String((err as any)?.message ?? err);
      job.message = "Unhandled error";
      emitJobUpdate(job);
    }
  })();
  return job;
}
