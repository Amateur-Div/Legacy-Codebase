"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runJobStep = runJobStep;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const mongoClient_1 = __importDefault(require("../../../../lib/mongoClient"));
const jobStore_1 = require("./jobStore");
const instrumentExecutionBabel_1 = require("../instrumentExecutionBabel");
const mergeFileGraph_1 = require("../analyzer/mergeFileGraph");
const buildCrossFileImpactMap_1 = require("../buildCrossFileImpactMap");
const injectFileDependencyEdges_1 = require("../analyzer/injectFileDependencyEdges");
const enrichGraphSemantics_1 = require("../analyzer/enrichGraphSemantics");
const styleGraphEdges_1 = require("../analyzer/styleGraphEdges");
const impactEngine_1 = require("../impactEngine");
const language_1 = require("../language");
const graphStore_1 = require("../graph/graphStore");
const uploadHelpers_1 = require("../uploadHelpers");
const extractCache_1 = require("../cache/extractCache");
const CHUNK_SIZE = 20;
function isBinaryFile(buffer) {
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
function walkDir(root) {
    const results = [];
    function walk(dir) {
        for (const item of fs_1.default.readdirSync(dir)) {
            if (IGNORE_DIRS.has(item))
                continue;
            const full = path_1.default.join(dir, item);
            const stat = fs_1.default.statSync(full);
            if (stat.isDirectory()) {
                walk(full);
            }
            else {
                results.push(full);
            }
        }
    }
    walk(root);
    return results;
}
function withTimeout(promise, ms = 5000) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms)),
    ]);
}
async function runJobStep(job) {
    var _a;
    if (job.status === "done")
        return;
    const db = (await mongoClient_1.default).db();
    if (!job.extractedPath) {
        const project = await db
            .collection("projects")
            .findOne({ projectId: job.projectId });
        (0, extractCache_1.ensureCacheRoot)();
        const root = (0, extractCache_1.getProjectCachePath)(job.projectId);
        fs_1.default.mkdirSync(root, { recursive: true });
        const extractRoot = path_1.default.join(root, "repo");
        (0, extractCache_1.touchCache)(job.projectId);
        fs_1.default.mkdirSync(extractRoot, { recursive: true });
        const zipPath = project === null || project === void 0 ? void 0 : project.uploadPath;
        let lastSize = -1;
        let stableCount = 0;
        for (let i = 0; i < 60; i++) {
            if (zipPath && fs_1.default.existsSync(zipPath)) {
                const size = fs_1.default.statSync(zipPath).size;
                if (size === lastSize) {
                    stableCount++;
                    if (stableCount >= 3)
                        break;
                }
                else {
                    stableCount = 0;
                    lastSize = size;
                }
            }
            await new Promise((r) => setTimeout(r, 500));
        }
        if (!zipPath || !fs_1.default.existsSync(zipPath)) {
            throw new Error("zip not ready");
        }
        new adm_zip_1.default(zipPath).extractAllTo(extractRoot, true);
        (0, extractCache_1.cleanOldCache)();
        fs_1.default.mkdirSync(path_1.default.join(root, "partialGraphs"), { recursive: true });
        await (0, jobStore_1.saveJob)({
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
        const root = path_1.default.join(job.extractedPath, "repo");
        if (!job.scanFiles) {
            const scanFiles = walkDir(root);
            await (0, jobStore_1.saveJob)({
                id: job.id,
                scanFiles,
                scanCursor: 0,
                totalFiles: scanFiles.length,
                progress: 5,
                message: "Scanning repository",
            });
            return;
        }
        await (0, jobStore_1.saveJob)({
            id: job.id,
            step: "metadata",
            progress: 8,
            message: "Scan complete",
        });
        return;
    }
    if (job.step === "metadata") {
        const root = path_1.default.join(job.extractedPath, "repo");
        const allFiles = job.scanFiles.map((abs) => path_1.default.relative(root, abs).split(path_1.default.sep).join("/"));
        const fileTree = await (0, uploadHelpers_1.buildFileTree)(allFiles, root);
        const insights = (0, uploadHelpers_1.calculateRepositoryInsights)(fileTree);
        let packageInfo = null;
        const pkgPath = allFiles.find((f) => f.endsWith("package.json"));
        if (pkgPath) {
            try {
                const abs = path_1.default.join(root, pkgPath);
                const parsed = JSON.parse(fs_1.default.readFileSync(abs, "utf-8"));
                packageInfo = {
                    name: parsed.name,
                    version: parsed.version,
                    scripts: parsed.scripts || {},
                    dependencies: parsed.dependencies || {},
                    devDependencies: parsed.devDependencies || {},
                };
            }
            catch { }
        }
        const entryPoints = [];
        const walkTree = (nodes) => {
            for (const n of nodes) {
                if (n.type === "file" && n.entry.isLikelyEntry) {
                    entryPoints.push(n.fullPath);
                }
                if (n.children)
                    walkTree(n.children);
            }
        };
        walkTree(fileTree);
        const tags = (0, uploadHelpers_1.detectTags)(packageInfo, fileTree);
        await db.collection("projects").updateOne({ projectId: job.projectId }, {
            $set: {
                fileTree,
                insights,
                packageInfo,
                entryPoints,
                tags,
            },
        });
        await (0, jobStore_1.saveJob)({
            id: job.id,
            step: "file-analysis",
            cursor: 0,
            progress: 12,
            message: "Metadata extracted",
        });
        return;
    }
    if (job.step === "file-analysis") {
        const cursor = (_a = job.cursor) !== null && _a !== void 0 ? _a : 0;
        const files = job.scanFiles || [];
        const project = await db.collection("projects").findOne({
            projectId: job.projectId,
        });
        const fileTree = (project === null || project === void 0 ? void 0 : project.fileTree) || [];
        const fileMetadataMap = new Map();
        function flattenTree(nodes) {
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
        const partialDir = path_1.default.join(job.extractedPath, "partialGraphs");
        const MAX_DB_FILE_SIZE = 100 * 1024;
        const PARALLEL = 5;
        for (let i = 0; i < slice.length; i += PARALLEL) {
            const batch = slice.slice(i, i + PARALLEL);
            const results = await Promise.all(batch.map(async (absPath, idx) => {
                const index = cursor + i + idx;
                const outputPath = path_1.default.join(partialDir, `${index}.json`);
                if (fs_1.default.existsSync(outputPath))
                    return null;
                const relPath = path_1.default
                    .relative(path_1.default.join(job.extractedPath, "repo"), absPath)
                    .split(path_1.default.sep)
                    .join("/");
                const fileMeta = fileMetadataMap.get(relPath);
                let content = "";
                try {
                    const buf = fs_1.default.readFileSync(absPath);
                    if (!isBinaryFile(buf)) {
                        content = buf.toString("utf-8");
                    }
                }
                catch { }
                let stat;
                try {
                    stat = fs_1.default.statSync(absPath);
                }
                catch {
                    return null;
                }
                let graph = { nodes: [], edges: [] };
                try {
                    if (/\.(js|ts|jsx|tsx)$/.test(absPath)) {
                        const result = await withTimeout((0, instrumentExecutionBabel_1.instrumentExecutionBabel)(content), 5000);
                        if ((result === null || result === void 0 ? void 0 : result.nodes) && (result === null || result === void 0 ? void 0 : result.edges)) {
                            graph = result;
                        }
                    }
                }
                catch { }
                try {
                    fs_1.default.writeFileSync(outputPath, JSON.stringify({ file: relPath, graph }));
                }
                catch { }
                return {
                    relPath,
                    stat,
                    content,
                    absPath,
                    functions: (fileMeta === null || fileMeta === void 0 ? void 0 : fileMeta.functions) || [],
                    classes: (fileMeta === null || fileMeta === void 0 ? void 0 : fileMeta.classes) || [],
                    imports: (fileMeta === null || fileMeta === void 0 ? void 0 : fileMeta.imports) || [],
                    exports: (fileMeta === null || fileMeta === void 0 ? void 0 : fileMeta.exports) || [],
                    components: (fileMeta === null || fileMeta === void 0 ? void 0 : fileMeta.components) || [],
                };
            }));
            const docs = results.filter(Boolean).map((r) => ({
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
                            language: (0, language_1.detectLanguage)(r.relPath),
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
        await (0, jobStore_1.saveJob)({
            id: job.id,
            cursor: newCursor,
            progress,
            step: newCursor >= total ? "merge" : "file-analysis",
            message: `Analyzed ${newCursor}/${total}`,
        });
        return;
    }
    if (job.step === "merge") {
        const mergedPath = path_1.default.join(job.extractedPath, "merged.json");
        if (fs_1.default.existsSync(mergedPath)) {
            await (0, jobStore_1.saveJob)({
                ...job,
                step: "enrich",
                progress: 70,
                message: "Merged graphs (cached)",
            });
            return;
        }
        const partialDir = path_1.default.join(job.extractedPath, "partialGraphs");
        const files = fs_1.default
            .readdirSync(partialDir)
            .sort((a, b) => Number(a.split(".")[0]) - Number(b.split(".")[0]));
        const fileGraphs = files
            .map((f) => {
            try {
                return JSON.parse(fs_1.default.readFileSync(path_1.default.join(partialDir, f), "utf-8"));
            }
            catch {
                return null;
            }
        })
            .filter(Boolean);
        const merged = (0, mergeFileGraph_1.mergeFileGraphs)(fileGraphs);
        fs_1.default.writeFileSync(path_1.default.join(job.extractedPath, "merged.json"), JSON.stringify(merged));
        await (0, jobStore_1.saveJob)({
            ...job,
            step: "enrich",
            progress: 70,
            message: "Merged graphs",
        });
        return;
    }
    if (job.step === "enrich") {
        const merged = JSON.parse(fs_1.default.readFileSync(path_1.default.join(job.extractedPath, "merged.json"), "utf-8"));
        const client = await mongoClient_1.default;
        const db = client.db();
        const project = await db
            .collection("projects")
            .findOne({ projectId: job.projectId, members: job.ownerId });
        const fileTree = (project === null || project === void 0 ? void 0 : project.fileTree) || [];
        (0, buildCrossFileImpactMap_1.attachCrossFileImpact)(fileTree);
        await db.collection("projects").updateOne({
            projectId: job.projectId,
            members: job.ownerId,
        }, {
            $set: {
                fileTree,
            },
        });
        const withDeps = (0, injectFileDependencyEdges_1.injectFileDependencyEdges)(merged, fileTree);
        const enriched = (0, enrichGraphSemantics_1.enrichGraphSemantics)(withDeps);
        const styled = {
            ...enriched,
            edges: (0, styleGraphEdges_1.styleGraphEdges)(enriched.edges),
        };
        const deadFiles = (0, impactEngine_1.findDeadFiles)(styled);
        const circularDeps = (0, impactEngine_1.findCircularDependencies)(styled);
        const importanceRanking = (0, impactEngine_1.computeFileImportance)(styled).slice(0, 20);
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
        fs_1.default.writeFileSync(path_1.default.join(job.extractedPath, "final.json"), JSON.stringify(finalGraph));
        await (0, jobStore_1.saveJob)({
            ...job,
            step: "save",
            progress: 90,
            message: "Enriched graph",
        });
        return;
    }
    if (job.step === "save") {
        const finalGraph = JSON.parse(fs_1.default.readFileSync(path_1.default.join(job.extractedPath, "final.json"), "utf-8"));
        const existing = await db
            .collection("graphs")
            .findOne({ projectId: job.projectId });
        if (existing) {
            await (0, jobStore_1.saveJob)({
                ...job,
                status: "done",
                step: "done",
                progress: 100,
                message: "Already processed",
            });
            return;
        }
        await (0, graphStore_1.saveGraph)(job.projectId, finalGraph, job.ownerId);
        await (0, jobStore_1.saveJob)({
            ...job,
            status: "done",
            step: "done",
            progress: 100,
            message: "Completed",
        });
        await db.collection("projects").updateOne({ projectId: job.projectId }, {
            $set: {
                analysisComplete: true,
            },
        });
        return;
    }
}
