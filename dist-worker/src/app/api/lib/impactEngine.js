"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findFileImpact = findFileImpact;
exports.findApiImpactFromFile = findApiImpactFromFile;
exports.findSchemaImpact = findSchemaImpact;
exports.findCircularDependencies = findCircularDependencies;
exports.findDeadFiles = findDeadFiles;
exports.computeFileImportance = computeFileImportance;
function buildFileToApiMap(graph) {
    const fileToApis = new Map();
    for (const edge of graph.edges) {
        if (edge.label === "defines") {
            if (!fileToApis.has(edge.from)) {
                fileToApis.set(edge.from, new Set());
            }
            fileToApis.get(edge.from).add(edge.to);
        }
    }
    return fileToApis;
}
function buildReverseImportMap(graph) {
    const reverse = new Map();
    for (const edge of graph.edges) {
        if (edge.label === "imports") {
            if (!reverse.has(edge.to)) {
                reverse.set(edge.to, new Set());
            }
            reverse.get(edge.to).add(edge.from);
        }
    }
    return reverse;
}
function findFileImpact(graph, fileNodeId) {
    const reverse = buildReverseImportMap(graph);
    const visited = new Set();
    const stack = [fileNodeId];
    while (stack.length) {
        const current = stack.pop();
        if (visited.has(current))
            continue;
        visited.add(current);
        const dependents = reverse.get(current);
        if (dependents) {
            for (const d of dependents) {
                stack.push(d);
            }
        }
    }
    return Array.from(visited);
}
function findApiImpactFromFile(graph, fileNodeId) {
    const impactedFiles = findFileImpact(graph, fileNodeId);
    const fileToApis = buildFileToApiMap(graph);
    const impactedApis = new Set();
    for (const fileId of impactedFiles) {
        const apis = fileToApis.get(fileId);
        if (!apis)
            continue;
        for (const apiId of apis) {
            impactedApis.add(apiId);
        }
    }
    return Array.from(impactedApis);
}
function buildSchemaToFileMap(graph) {
    const schemaToFile = new Map();
    for (const edge of graph.edges) {
        if (edge.label === "definesSchema") {
            schemaToFile.set(edge.to, edge.from);
        }
    }
    return schemaToFile;
}
function findSchemaImpact(graph, schemaId) {
    const schemaToFile = buildSchemaToFileMap(graph);
    const definingFile = schemaToFile.get(schemaId);
    if (!definingFile) {
        return { files: [], apis: [] };
    }
    const impactedFiles = findFileImpact(graph, definingFile);
    const impactedApis = findApiImpactFromFile(graph, definingFile);
    return {
        files: impactedFiles,
        apis: impactedApis,
    };
}
function buildImportAdjacency(graph) {
    const adj = new Map();
    for (const edge of graph.edges) {
        if (edge.label === "imports") {
            if (!adj.has(edge.from)) {
                adj.set(edge.from, []);
            }
            adj.get(edge.from).push(edge.to);
        }
    }
    return adj;
}
function findCircularDependencies(graph) {
    const adj = buildImportAdjacency(graph);
    const visited = new Set();
    const stack = new Set();
    const cycles = [];
    function dfs(node, path) {
        if (stack.has(node)) {
            const cycleStartIndex = path.indexOf(node);
            if (cycleStartIndex !== -1) {
                cycles.push([...path.slice(cycleStartIndex), node]);
            }
            return;
        }
        if (visited.has(node))
            return;
        visited.add(node);
        stack.add(node);
        const neighbors = adj.get(node) || [];
        for (const next of neighbors) {
            dfs(next, [...path, next]);
        }
        stack.delete(node);
    }
    for (const node of adj.keys()) {
        dfs(node, [node]);
    }
    return cycles;
}
function buildIncomingImportCount(graph) {
    const incoming = new Map();
    for (const edge of graph.edges) {
        if (edge.label === "imports") {
            incoming.set(edge.to, (incoming.get(edge.to) || 0) + 1);
        }
    }
    return incoming;
}
function isNonRuntimeFile(filePath) {
    const p = filePath.replace(/\\/g, "/").toLowerCase();
    const patterns = [
        "/test/",
        "/tests/",
        "/spec/",
        "/perf/",
        "/benchmark/",
        "/bench/",
        "/scripts/",
        "/build/",
        "/tools/",
        "/examples/",
        "/docs/",
        "/vendor/",
    ];
    return patterns.some((pattern) => p.includes(pattern));
}
function findDeadFiles(graph, entryFileIds = new Set()) {
    const incoming = buildIncomingImportCount(graph);
    const deadFiles = [];
    for (const node of graph.nodes) {
        if (node.type !== "file")
            continue;
        const hasIncoming = incoming.has(node.id);
        if (!hasIncoming && !entryFileIds.has(node.id)) {
            if (!isNonRuntimeFile(node.id)) {
                deadFiles.push(node.id);
            }
        }
    }
    return deadFiles;
}
function countIncomingImports(graph) {
    const counts = new Map();
    for (const edge of graph.edges) {
        if (edge.label === "imports") {
            counts.set(edge.to, (counts.get(edge.to) || 0) + 1);
        }
    }
    return counts;
}
function countApisPerFile(graph) {
    const counts = new Map();
    for (const edge of graph.edges) {
        if (edge.label === "defines") {
            counts.set(edge.from, (counts.get(edge.from) || 0) + 1);
        }
    }
    return counts;
}
function countExecutionDegree(graph) {
    const counts = new Map();
    for (const edge of graph.edges) {
        if (edge.label !== "imports" &&
            edge.label !== "defines" &&
            edge.label !== "definesSchema" &&
            edge.label !== "contains") {
            counts.set(edge.from, (counts.get(edge.from) || 0) + 1);
        }
    }
    return counts;
}
function computeFileImportance(graph) {
    const importCounts = countIncomingImports(graph);
    const apiCounts = countApisPerFile(graph);
    const execCounts = countExecutionDegree(graph);
    const results = [];
    for (const node of graph.nodes) {
        if (node.type !== "file")
            continue;
        const importScore = (importCounts.get(node.id) || 0) * 3;
        const apiScore = (apiCounts.get(node.id) || 0) * 5;
        const execScore = (execCounts.get(node.id) || 0) * 1;
        const total = importScore + apiScore + execScore;
        results.push({
            fileId: node.id,
            score: total,
        });
    }
    return results.sort((a, b) => b.score - a.score);
}
