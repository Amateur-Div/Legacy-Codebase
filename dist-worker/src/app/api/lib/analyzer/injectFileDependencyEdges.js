"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.injectFileDependencyEdges = injectFileDependencyEdges;
exports.injectApiNodes = injectApiNodes;
function injectFileDependencyEdges(merged, fileTree) {
    const mergedNodes = merged.nodes;
    const mergedEdges = merged.edges;
    const fileRootMap = new Map();
    const existingEdgeIds = new Set(mergedEdges.map((e) => e.id));
    for (const n of mergedNodes) {
        if (n.type === "file" && n.file) {
            fileRootMap.set(normalizePath(n.file), n.id);
        }
    }
    const collect = (nodes) => {
        var _a, _b;
        for (const node of nodes) {
            if (node.type === "file" && node.fullPath) {
                const fromPath = normalizePath(node.fullPath);
                const fromId = fileRootMap.get(fromPath);
                if (!fromId)
                    continue;
                const imports = ((_a = node.impact) === null || _a === void 0 ? void 0 : _a.imports) || [];
                for (const resolvedPath of imports) {
                    const toId = fileRootMap.get(normalizePath(resolvedPath));
                    if (!toId)
                        continue;
                    const edgeId = `dep::${fromId}->${toId}`;
                    if (!existingEdgeIds.has(edgeId)) {
                        mergedEdges.push({
                            id: edgeId,
                            from: fromId,
                            to: toId,
                            label: "imports",
                        });
                        existingEdgeIds.add(edgeId);
                    }
                }
                const broken = ((_b = node.impact) === null || _b === void 0 ? void 0 : _b.brokenImports) || [];
                for (const b of broken) {
                    const ghostId = `missing::${fromPath}::${b.source}`;
                    if (!mergedNodes.find((n) => n.id === ghostId)) {
                        mergedNodes.push({
                            id: ghostId,
                            type: "missing",
                            name: b.source,
                            file: fromPath,
                            meta: { broken: true },
                        });
                    }
                    const edgeId = `broken::${fromId}->${ghostId}`;
                    if (!existingEdgeIds.has(edgeId)) {
                        mergedEdges.push({
                            id: edgeId,
                            from: fromId,
                            to: ghostId,
                            label: "brokenImport",
                        });
                        existingEdgeIds.add(edgeId);
                    }
                }
            }
            if (node.children)
                collect(node.children);
        }
    };
    collect(fileTree);
    return { nodes: mergedNodes, edges: mergedEdges };
}
function injectApiNodes(merged, fileTree) {
    const { mergedNodes, mergedEdges } = merged;
    const existingIds = new Set(mergedNodes.map((n) => n.id));
    const collect = (nodes) => {
        var _a;
        for (const node of nodes) {
            if (node.type === "file" && ((_a = node.apis) === null || _a === void 0 ? void 0 : _a.length)) {
                const fileRootId = `file::${node.fullPath}`;
                for (const api of node.apis) {
                    const apiId = `api::${api.method}::${api.path}`;
                    if (!existingIds.has(apiId)) {
                        mergedNodes.push({
                            id: apiId,
                            type: "api",
                            name: `${api.method} ${api.path}`,
                            file: node.fullPath,
                            meta: {
                                framework: api.framework,
                                method: api.method,
                                path: api.path,
                            },
                        });
                        existingIds.add(apiId);
                    }
                    mergedEdges.push({
                        id: `api-link::${fileRootId}->${apiId}`,
                        from: fileRootId,
                        to: apiId,
                        label: "defines",
                    });
                }
            }
            if (node.children)
                collect(node.children);
        }
    };
    collect(fileTree);
    return { mergedNodes, mergedEdges };
}
function normalizePath(p) {
    return p.replace(/\\/g, "/");
}
