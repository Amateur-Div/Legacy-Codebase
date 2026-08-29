import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import clientPromise from "../../../../lib/mongoClient";
import { saveJob } from "./jobStore";
import { instrumentExecutionBabel } from "../instrumentExecutionBabel";
import { mergeFileGraphs } from "../analyzer/mergeFileGraph";
import { normalizeGraphIds } from "../analyzer/normalizeGraphIds";
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
import {
  buildFileTree,
  calculateRepositoryInsights,
  detectTags,
} from "../uploadHelpers";
import {
  cleanOldCache,
  ensureCacheRoot,
  getProjectCachePath,
  touchCache,
} from "../cache/extractCache";
import { normalizeGraphIds } from "../analyzer/normalizeGraphIds";

const CHUNK_SIZE = 50;

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

function withTimeout(promise: any, ms = 5000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms),
    ),
  ]);
}

export async function runJobStep(job: any) {
  if (job.status === "done") return;

  const db = (await clientPromise).db();

  if (!job.extractedPath) {
    const project = await db
      .collection("projects")
      .findOne({ projectId: job.projectId });

    ensureCacheRoot();

    const root = getProjectCachePath(job.projectId);

    fs.mkdirSync(root, { recursive: true });

    const extractRoot = path.join(root, "repo");

    touchCache(job.projectId);

    fs.mkdirSync(extractRoot, { recursive: true });

    const zipPath = project?.uploadPath;

    let lastSize = -1;
    let stableCount = 0;

    for (let i = 0; i < 60; i++) {
      if (zipPath && fs.existsSync(zipPath)) {
        const size = fs.statSync(zipPath).size;

        if (size === lastSize) {
          stableCount++;

          if (stableCount >= 3) break;
        } else {
          stableCount = 0;
          lastSize = size;
        }
      }

      await new Promise((r) => setTimeout(r, 500));
    }

    if (!zipPath || !fs.existsSync(zipPath)) {
      throw new Error("zip not ready");
    }

    new AdmZip(zipPath).extractAllTo(extractRoot, true);

    cleanOldCache();
    fs.mkdirSync(path.join(root, "partialGraphs"), { recursive: true });

    await saveJob({
      id: job.id,
      extractedPath: root,
      step: "scan",
      status: "running",
      progress: 2,
      message: "Repository extracted",
    });

    return;
  }

  if (job.step === "scan") {
    const root = path.join(job.extractedPath, "repo");

    if (!job.scanFiles) {
      const scanFiles = walkDir(root);

      await saveJob({
        id: job.id,
        scanFiles,
        scanCursor: 0,
        totalFiles: scanFiles.length,
        progress: 5,
        message: "Scanning repository",
      });

      return;
    }

    await saveJob({
      id: job.id,
      step: "metadata",
      progress: 8,
      message: "Scan complete",
    });

    return;
  }

  if (job.step === "metadata") {
    const root = path.join(job.extractedPath, "repo");

    const allFiles = job.scanFiles.map((abs: string) =>
      path.relative(root, abs).split(path.sep).join("/"),
    );

    const fileTree = await buildFileTree(allFiles, root);
    const insights = calculateRepositoryInsights(fileTree);

    let packageInfo = null;

    const pkgPath = allFiles.find((f: string) => f.endsWith("package.json"));

    if (pkgPath) {
      try {
        const abs = path.join(root, pkgPath);
        const parsed = JSON.parse(fs.readFileSync(abs, "utf-8"));

        packageInfo = {
          name: parsed.name,
          version: parsed.version,
          scripts: parsed.scripts || {},
          dependencies: parsed.dependencies || {},
          devDependencies: parsed.devDependencies || {},
        };
      } catch {}
    }

    const entryPoints: string[] = [];

    const walkTree = (nodes: any[]) => {
      for (const n of nodes) {
        if (n.type === "file" && n.entry.isLikelyEntry) {
          entryPoints.push(n.fullPath);
        }
        if (n.children) walkTree(n.children);
      }
    };

    walkTree(fileTree);

    const tags = detectTags(packageInfo, fileTree);

    await db.collection("projects").updateOne(
      { projectId: job.projectId },
      {
        $set: {
          fileTree,
          insights,
          packageInfo,
          entryPoints,
          tags,
        },
      },
    );

    await saveJob({
      id: job.id,
      step: "file-analysis",
      cursor: 0,
      progress: 12,
      message: "Metadata extracted",
    });

    return;
  }

  if (job.step === "file-analysis") {
    const cursor = job.cursor ?? 0;

    const files = job.scanFiles || [];
    const project = await db.collection("projects").findOne({
      projectId: job.projectId,
    });

    const fileTree = project?.fileTree || [];

    const fileMetadataMap = new Map();

    function flattenTree(nodes: any[]) {
      for (const node of nodes) {
        if (node.type === "file" && node.fullPath) {
          fileMetadataMap.set(node.fullPath, {
            functions: node.functions || [],
            classes: node.classes || [],
            imports: node.imports || [],
            exports: node.exports || [],
            components: node.components || [],
          });
        }

        if (node.children) {
          flattenTree(node.children);
        }
      }
    }

    flattenTree(fileTree);

    const slice = files.slice(cursor, cursor + CHUNK_SIZE);
    const partialDir = path.join(job.extractedPath, "partialGraphs");

    const MAX_DB_FILE_SIZE = 100 * 1024;

    const PARALLEL = 5;

    for (let i = 0; i < slice.length; i += PARALLEL) {
      const batch = slice.slice(i, i + PARALLEL);

      const results = await Promise.all(
        batch.map(async (absPath: any, idx: any) => {
          const index = cursor + i + idx;

          const outputPath = path.join(partialDir, `${index}.json`);

          if (fs.existsSync(outputPath)) return null;

          const relPath = path
            .relative(path.join(job.extractedPath, "repo"), absPath)
            .split(path.sep)
            .join("/");

          const fileMeta = fileMetadataMap.get(relPath);

          let content = "";

          try {
            const buf = fs.readFileSync(absPath);
            if (!isBinaryFile(buf)) {
              content = buf.toString("utf-8");
            }
          } catch {}

          let stat;
          try {
            stat = fs.statSync(absPath);
          } catch {
            return null;
          }

          let graph: any = { nodes: [], edges: [] };

          try {
            if (/\.(js|ts|jsx|tsx)$/.test(absPath)) {
              const result = await withTimeout(
                instrumentExecutionBabel(content),
                5000,
              );

              if (result?.nodes && result?.edges) {
                graph = normalizeGraphIds(result, relPath);
              }
            }
          } catch {}

          try {
            fs.writeFileSync(
              outputPath,
              JSON.stringify({ file: relPath, graph }),
            );
          } catch {}

          return {
            relPath,
            stat,
            content,
            absPath,
            functions: fileMeta?.functions || [],
            classes: fileMeta?.classes || [],
            imports: fileMeta?.imports || [],
            exports: fileMeta?.exports || [],
            components: fileMeta?.components || [],
          };
        }),
      );

      const docs = results.filter(Boolean).map((r: any) => ({
        updateOne: {
          filter: {
            projectId: job.projectId,
            path: r.relPath,
          },
          update: {
            $set: {
              projectId: job.projectId,
              path: r.relPath,
              size: r.stat.size,
              language: detectLanguage(r.relPath),
              isCode: /\.(js|ts|jsx|tsx)$/.test(r.absPath),
              content: r.stat.size <= MAX_DB_FILE_SIZE ? r.content : undefined,
              functions: r.functions,
              classes: r.classes,
              imports: r.imports,
              exports: r.exports,
              components: r.components,
            },
          },
          upsert: true,
        },
      }));

      if (docs.length) {
        await db.collection("project_files").bulkWrite(docs);
      }
    }

    const newCursor = Math.min(cursor + CHUNK_SIZE, files.length);

    const total = files.length;
    const progress = Math.round((newCursor / total) * 60);

    await saveJob({
      id: job.id,
      cursor: newCursor,
      progress,
      step: newCursor >= total ? "merge" : "file-analysis",
      message: `Analyzed ${newCursor}/${total}`,
    });

    return;
  }

  if (job.step === "merge") {
    const mergedPath = path.join(job.extractedPath, "merged.json");

    if (fs.existsSync(mergedPath)) {
      await saveJob({
        ...job,
        step: "enrich",
        progress: 70,
        message: "Merged graphs (cached)",
      });
      return;
    }

    const partialDir = path.join(job.extractedPath, "partialGraphs");

    const files = fs
      .readdirSync(partialDir)
      .sort((a, b) => Number(a.split(".")[0]) - Number(b.split(".")[0]));
    const fileGraphs = files
      .map((f) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(partialDir, f), "utf-8"));
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const merged = mergeFileGraphs(fileGraphs);

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

    const fileTree = project?.fileTree || [];

    attachCrossFileImpact(fileTree);

    await db.collection("projects").updateOne(
      {
        projectId: job.projectId,
        members: job.ownerId,
      },
      {
        $set: {
          fileTree,
        },
      },
    );

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

    const existing = await db
      .collection("graphs")
      .findOne({ projectId: job.projectId });

    if (existing) {
      await saveJob({
        ...job,
        status: "done",
        step: "done",
        progress: 100,
        message: "Already processed",
      });
      return;
    }

    console.log("[save] Graph size:", {
      nodes: finalGraph.nodes.length,
      edges: finalGraph.edges.length,
    });

    const graphJson = JSON.stringify(finalGraph);
    console.log("[save] Graph JSON size:", {
      bytes: Buffer.byteLength(graphJson, "utf-8"),
      mb: (Buffer.byteLength(graphJson, "utf-8") / 1024 / 1024).toFixed(2),
    });

    await saveGraph(job.projectId, finalGraph, job.ownerId);

    await saveJob({
      ...job,
      status: "done",
      step: "done",
      progress: 100,
      message: "Completed",
    });

    await db.collection("projects").updateOne(
      { projectId: job.projectId },
      {
        $set: {
          analysisComplete: true,
        },
      },
    );

    return;
  }
}
