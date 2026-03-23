// import clientPromise from "@/lib/mongoClient";
// import { enrichGraphSemantics } from "../analyzer/enrichGraphSemantics";
// import { injectFileDependencyEdges } from "../analyzer/injectFileDependencyEdges";
// import { mergeFileGraphs } from "../analyzer/mergeFileGraph";
// import { instrumentExecutionBabel } from "../instrumentExecutionBabel";
// import { getCodeFiles } from "../projectFileStore";
// import { saveJob } from "./jobStore";
// import { saveGraph } from "../graph/graphStore";
// import { styleGraphEdges } from "../analyzer/styleGraphEdges";
// import {
//   computeFileImportance,
//   findCircularDependencies,
//   findDeadFiles,
// } from "../impactEngine";
// import { attachCrossFileImpact } from "../buildCrossFileImpactMap";
// import { extractProjectZip } from "../jobZipExtractor";

// import fs from "fs";
// import path from "path";

// const CHUNK_SIZE = 10;

// export async function runJobStep(job: any) {
//   if (job.status === "done") return;

//   if (!job.extractedPath) {
//     const root = await extractProjectZip(job.projectId, job.ownerId);

//     const partialDir = path.join(root, "partialGraphs");
//     fs.mkdirSync(partialDir, { recursive: true });

//     await saveJob({
//       id: job.id,
//       extractedPath: root,
//     });

//     return;
//   }

//   if (job.step === "queued") {
//     await saveJob({
//       id: job.id,
//       status: "running",
//       step: "file-analysis",
//       progress: 1,
//       message: "Starting analysis",
//     });
//     return;
//   }

//   if (job.step === "file-analysis") {
//     const files = await getCodeFiles(job.projectId);

//     const slice = files.slice(job.cursor, job.cursor + CHUNK_SIZE);
//     const partialDir = path.join(job.extractedPath, "partialGraphs");

//     for (const file of slice) {
//       let graph;
//       try {
//         graph = await instrumentExecutionBabel(file.content || "");
//       } catch {
//         graph = { nodes: [], edges: [] };
//       }

//       const fileIndex = job.cursor;
//       fs.writeFileSync(
//         path.join(partialDir, `${fileIndex}.json`),
//         JSON.stringify({ file: file.path, graph }),
//       );

//       job.cursor++;
//     }

//     const progress = Math.round((job.cursor / files.length) * 60);

//     await saveJob({
//       id: job.id,
//       cursor: job.cursor,
//       progress,
//       message: `Analyzed ${job.cursor}/${files.length} files`,
//       step: job.cursor >= files.length ? "merge" : "file-analysis",
//     });

//     return;
//   }

//   if (job.step === "merge") {
//     const partialDir = path.join(job.extractedPath, "partialGraphs");

//     const files = fs.readdirSync(partialDir);
//     const graphs = files.map((f) =>
//       JSON.parse(fs.readFileSync(path.join(partialDir, f), "utf-8")),
//     );

//     const merged = mergeFileGraphs(graphs);

//     fs.writeFileSync(
//       path.join(job.extractedPath, "merged.json"),
//       JSON.stringify(merged),
//     );

//     await saveJob({
//       id: job.id,
//       step: "enrich",
//       progress: 70,
//       message: "Merged graphs",
//     });

//     return;
//   }

//   if (job.step === "enrich") {
//     const merged = JSON.parse(
//       fs.readFileSync(path.join(job.extractedPath, "merged.json"), "utf-8"),
//     );

//     const client = await clientPromise;
//     const db = client.db();

//     const project = await db
//       .collection("projects")
//       .findOne({ projectId: job.projectId, members: job.ownerId });

//     const fileTree = project!.fileTree;

//     attachCrossFileImpact(fileTree);

//     const withDeps = injectFileDependencyEdges(merged, fileTree);
//     const enriched = enrichGraphSemantics(withDeps);

//     const styled = {
//       ...enriched,
//       edges: styleGraphEdges(enriched.edges),
//     };

//     const deadFiles = findDeadFiles(styled);
//     const circularDeps = findCircularDependencies(styled);
//     const importanceRanking = computeFileImportance(styled).slice(0, 20);

//     const finalGraph = {
//       ...styled,
//       meta: {
//         nodeCount: styled.nodes.length,
//         edgeCount: styled.edges.length,
//         mode: "execution",
//         intelligence: {
//           deadFiles,
//           circularDependencies: circularDeps,
//           importanceRanking,
//         },
//         generatedAt: new Date(),
//       },
//     };

//     fs.writeFileSync(
//       path.join(job.extractedPath, "final.json"),
//       JSON.stringify(finalGraph),
//     );

//     await saveJob({
//       id: job.id,
//       step: "save",
//       progress: 90,
//       message: "Enriched graph",
//     });

//     return;
//   }

//   if (job.step === "save") {
//     const finalGraph = JSON.parse(
//       fs.readFileSync(path.join(job.extractedPath, "final.json"), "utf-8"),
//     );

//     await saveGraph(job.projectId, finalGraph, job.ownerId);

//     fs.rmSync(job.extractedPath, { recursive: true, force: true });

//     await saveJob({
//       id: job.id,
//       status: "done",
//       step: "done",
//       progress: 100,
//       message: "Completed",
//     });

//     return;
//   }
// }

import fs from "fs";
import path from "path";
import os from "os";
import AdmZip from "adm-zip";
import clientPromise from "@/lib/mongoClient";
import { saveJob } from "./jobStore";
import { downloadZipToPath } from "../gridfs";
import { instrumentExecutionBabel } from "../instrumentExecutionBabel";
import { mergeFileGraphs } from "../analyzer/mergeFileGraph";
import { attachCrossFileImpact } from "../buildCrossFileImpactMap";
import { injectFileDependencyEdges } from "../analyzer/injectFileDependencyEdges";
import { enrichGraphSemantics } from "../analyzer/enrichGraphSemantics";
import { styleGraphEdges } from "../analyzer/styleGraphEdges";
import {
  computeFileImportance,
  findCircularDependencies,
  findDeadFiles,
} from "../impactEngine";
import { detectLanguage } from "../language";
import { saveGraph } from "../graph/graphStore";

const CHUNK_SIZE = 10;

function isBinaryFile(buffer: Buffer) {
  return buffer.includes(0);
}

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  ".cache",
  "partialGraphs",
]);

function walkDir(root: string): string[] {
  const results: string[] = [];

  function walk(dir: string) {
    for (const item of fs.readdirSync(dir)) {
      if (IGNORE_DIRS.has(item)) continue;

      const full = path.join(dir, item);
      const stat = fs.statSync(full);

      if (stat.isDirectory()) {
        walk(full);
      } else {
        results.push(full);
      }
    }
  }

  walk(root);
  return results;
}

export async function runJobStep(job: any) {
  if (job.status === "done") return;

  const db = (await clientPromise).db();

  if (!job.extractedPath) {
    const project = await db
      .collection("projects")
      .findOne({ projectId: job.projectId });

    const root = path.join(os.tmpdir(), job.projectId);
    const extractRoot = path.join(root, "repo");

    fs.mkdirSync(extractRoot, { recursive: true });

    const zipPath = path.join(root, "repo.zip");
    await downloadZipToPath(project?.uploadZipId, zipPath);
    new AdmZip(zipPath).extractAllTo(extractRoot, true);

    fs.mkdirSync(path.join(root, "partialGraphs"), { recursive: true });

    const totalFiles = walkDir(extractRoot).length;

    await saveJob({
      id: job.id,
      extractedPath: root,
      step: "ingestion",
      status: "running",
      cursor: 0,
      totalFiles,
      progress: 1,
      message: "Repository extracted",
    });

    return;
  }

  if (job.step === "ingestion") {
    const root = path.join(job.extractedPath, "repo");
    const allFiles = walkDir(root);

    const BATCH = 40;
    const slice = allFiles.slice(job.cursor, job.cursor + BATCH);

    const docs = [];

    for (const abs of slice) {
      const stat = fs.statSync(abs);
      if (!stat.isFile()) continue;

      let content;
      if (stat.size < 1024 * 1024) {
        const buf = fs.readFileSync(abs);
        if (!isBinaryFile(buf)) content = buf.toString("utf-8");
      }

      docs.push({
        projectId: job.projectId,
        path: path.relative(root, abs).split(path.sep).join("/"),
        size: stat.size,
        language: detectLanguage(abs),
        isCode: /\.(js|ts|jsx|tsx)$/.test(abs),
        content,
        createdAt: new Date(),
      });
    }

    if (docs.length) {
      for (const doc of docs) {
        await db
          .collection("project_files")
          .updateOne(
            { projectId: doc.projectId, path: doc.path },
            { $set: doc },
            { upsert: true },
          );
      }
    }

    const newCursor = job.cursor + slice.length;

    await saveJob({
      id: job.id,
      cursor: newCursor,
      progress: Math.round((newCursor / job.totalFiles) * 20),
      step: newCursor >= job.totalFiles ? "file-analysis" : "ingestion",
      message: `Ingested ${newCursor}/${job.totalFiles}`,
    });

    return;
  }

  if (job.step === "file-analysis") {
    const files = await db
      .collection("project_files")
      .find({ projectId: job.projectId, isCode: true })
      .project({ path: 1 })
      .toArray();

    const paths = files.map((f) => f.path);

    const slice = paths.slice(job.cursor, job.cursor + CHUNK_SIZE);
    const partialDir = path.join(job.extractedPath, "partialGraphs");

    for (const p of slice) {
      const doc = await db
        .collection("project_files")
        .findOne({ projectId: job.projectId, path: p });

      let graph;

      try {
        graph = await instrumentExecutionBabel(doc?.content || "");
      } catch {}

      fs.writeFileSync(
        path.join(partialDir, `${job.cursor}.json`),
        JSON.stringify({ file: p, graph }),
      );

      job.cursor++;
    }

    const total = paths.length;

    await saveJob({
      id: job.id,
      cursor: job.cursor,
      progress: 20 + Math.round((job.cursor / total) * 40),
      step: job.cursor >= total ? "merge" : "file-analysis",
      message: `Analyzed ${job.cursor}/${total}`,
    });

    return;
  }

  if (job.step === "merge") {
    const partialDir = path.join(job.extractedPath, "partialGraphs");

    const files = fs.readdirSync(partialDir);
    const graphs = files.map((f) =>
      JSON.parse(fs.readFileSync(path.join(partialDir, f), "utf-8")),
    );

    const merged = mergeFileGraphs(graphs);

    fs.writeFileSync(
      path.join(job.extractedPath, "merged.json"),
      JSON.stringify(merged),
    );

    await saveJob({
      ...job,
      step: "enrich",
      progress: 70,
      message: "Merged graphs",
    });

    return;
  }

  if (job.step === "enrich") {
    const merged = JSON.parse(
      fs.readFileSync(path.join(job.extractedPath, "merged.json"), "utf-8"),
    );

    const client = await clientPromise;
    const db = client.db();

    const project = await db
      .collection("projects")
      .findOne({ projectId: job.projectId, members: job.ownerId });

    const fileTree = project?.fileTree;

    attachCrossFileImpact(fileTree);

    const withDeps = injectFileDependencyEdges(merged, fileTree);
    const enriched = enrichGraphSemantics(withDeps);

    const styled = {
      ...enriched,
      edges: styleGraphEdges(enriched.edges),
    };

    const deadFiles = findDeadFiles(styled);
    const circularDeps = findCircularDependencies(styled);
    const importanceRanking = computeFileImportance(styled).slice(0, 20);

    const finalGraph = {
      ...styled,
      meta: {
        nodeCount: styled.nodes.length,
        edgeCount: styled.edges.length,
        mode: "execution",
        intelligence: {
          deadFiles,
          circularDependencies: circularDeps,
          importanceRanking,
        },
        generatedAt: new Date(),
      },
    };

    fs.writeFileSync(
      path.join(job.extractedPath, "final.json"),
      JSON.stringify(finalGraph),
    );

    await saveJob({
      ...job,
      step: "save",
      progress: 90,
      message: "Enriched graph",
    });

    return;
  }

  if (job.step === "save") {
    const finalGraph = JSON.parse(
      fs.readFileSync(path.join(job.extractedPath, "final.json"), "utf-8"),
    );

    await saveGraph(job.projectId, finalGraph, job.ownerId);

    fs.rmSync(job.extractedPath, { recursive: true, force: true });

    await saveJob({
      ...job,
      status: "done",
      step: "done",
      progress: 100,
      message: "Completed",
    });

    return;
  }
}
