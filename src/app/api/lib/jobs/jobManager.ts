import { loadJob } from "./jobStore";
import { v4 as uuidv4 } from "uuid";
import type { FlowGraph } from "../analyzer/types";
import { mergeFileGraphs } from "../analyzer/mergeFileGraph";
import { enrichGraphSemantics } from "../analyzer/enrichGraphSemantics";
import { saveJob } from "./jobStore";
import { saveGraph } from "../graph/graphStore";
import { instrumentExecutionBabel } from "../instrumentExecutionBabel";
import { injectFileDependencyEdges } from "../analyzer/injectFileDependencyEdges";
import { styleGraphEdges } from "../analyzer/styleGraphEdges";
import {
  computeFileImportance,
  findCircularDependencies,
  findDeadFiles,
} from "../impactEngine";

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
  // console.log(
  //   "📡 [emitJobUpdate] Emitting job update:",
  //   job.id,
  //   job.status,
  //   job.progress,
  // );
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

async function runAnalysisTask(
  projectId: any,
  files: any[],
  fileTree: any,
  job: Job,
  uid: any,
) {
  try {
    job.status = "running";
    job.progress = 2;
    job.message = "Analyzing files (1/4)";
    emitJobUpdate(job);

    const codeFiles = files.filter(
      (f) => f.isCode && typeof f.content === "string",
    );
    const totalFiles = codeFiles.length || 1;
    const fileGraphs: {
      file: string;
      graph: { nodes: any[]; edges: any[] };
    }[] = [];

    let i = 0;
    for (const fileDoc of codeFiles) {
      const filePath = fileDoc.path;
      const code = fileDoc.content as string;

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

    const withDeps = injectFileDependencyEdges(merged, fileTree);

    const enriched = enrichGraphSemantics(withDeps);

    job.progress = 95;
    job.message = "Saving graph (4/4)";
    emitJobUpdate(job);

    const styleGraph = {
      ...enriched,
      edges: styleGraphEdges(enriched.edges),
    };

    const deadFiles = findDeadFiles(styleGraph);
    const circularDeps = findCircularDependencies(styleGraph);
    const importanceRanking = computeFileImportance(styleGraph).slice(0, 20);

    const graphMeta = {
      nodeCount: styleGraph.nodes.length,
      edgeCount: styleGraph.edges.length,
      mode: "execution",
      intelligence: {
        deadFiles,
        circularDependencies: circularDeps,
        importanceRanking,
      },
      generatedAt: new Date(),
    };

    if (styleGraph.nodes.length > 1500) {
      console.warn(
        `[Graph] execution graph too large (${styleGraph.nodes.length} nodes)`,
      );
    }

    console.log("Dead files :", deadFiles.length);

    console.log("\nCircular count :", circularDeps.length);

    console.log("About to save graph : ", job.projectId);
    await saveGraph(projectId, { ...styleGraph, meta: graphMeta }, uid);

    console.log("Graph saved : ");

    job.status = "done";
    job.progress = 100;
    job.message = "Completed";
    job.result = { graph: styleGraph };
    emitJobUpdate(job);

    await saveJob(job);

    console.log("Job status : ", job);

    return job;
  } catch (err: any) {
    console.log("Error inside job mananger : ", err);
    job.status = "error";
    job.error = String(err?.message ?? err);
    job.message = "Error during analysis";
    emitJobUpdate(job);
    return job;
  }
}

export function enqueueJob(
  projectId: string,
  fileTree: any,
  fileDocs: any[],
  ownerId?: string,
) {
  const job = createJob(projectId, ownerId);
  (async () => {
    try {
      await runAnalysisTask(projectId, fileDocs, fileTree, job, ownerId);
    } catch (err) {
      job.status = "error";
      job.error = String((err as any)?.message ?? err);
      job.message = "Unhandled error";
      emitJobUpdate(job);
    }
  })();
  return job;
}
