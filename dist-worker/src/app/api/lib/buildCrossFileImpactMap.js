"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachCrossFileImpact = attachCrossFileImpact;
const path_1 = __importDefault(require("path"));
function attachCrossFileImpact(fileTree) {
    var _a, _b;
    const files = [];
    const collect = (nodes) => {
        for (const node of nodes) {
            if (!node)
                continue;
            if (node.type === "file") {
                const imports = Array.isArray(node.imports)
                    ? node.imports
                        .map((i) => (typeof i === "string" ? i : i === null || i === void 0 ? void 0 : i.name))
                        .filter((imp) => typeof imp === "string" &&
                        (imp.startsWith("./") || imp.startsWith("../")))
                    : [];
                files.push({
                    relPath: node.fullPath,
                    imports,
                    nodeRef: node,
                });
            }
            else if (Array.isArray(node.children)) {
                collect(node.children);
            }
        }
    };
    collect(fileTree);
    const fileLookup = new Map();
    for (const f of files) {
        const noExt = f.relPath.replace(/\.(js|jsx|ts|tsx)$/, "");
        fileLookup.set(noExt, f.relPath);
        fileLookup.set(f.relPath, f.relPath);
        if (f.relPath.endsWith("/index.ts") || f.relPath.endsWith("/index.tsx")) {
            const dir = f.relPath.replace(/\/index\.(ts|tsx)$/, "");
            fileLookup.set(dir, f.relPath);
        }
    }
    const forwardMap = {};
    const reverseMap = {};
    const resolveImport = (importer, imp) => {
        if (!imp.startsWith("."))
            return null;
        const importerDir = path_1.default.posix.dirname(importer);
        const candidate = path_1.default.posix.normalize(path_1.default.posix.join(importerDir, imp));
        return (fileLookup.get(candidate) ||
            fileLookup.get(candidate.replace(/\.(js|jsx|ts|tsx)$/, "")) ||
            null);
    };
    for (const { relPath, imports } of files) {
        const resolvedImports = [];
        const brokenImports = [];
        for (const imp of imports) {
            const resolved = resolveImport(relPath, imp);
            if (!resolved) {
                brokenImports.push({ source: imp });
                continue;
            }
            if (resolved === relPath)
                continue;
            if (!resolvedImports.includes(resolved)) {
                resolvedImports.push(resolved);
            }
            if (!reverseMap[resolved])
                reverseMap[resolved] = [];
            if (!reverseMap[resolved].includes(relPath)) {
                reverseMap[resolved].push(relPath);
            }
        }
        forwardMap[relPath] = {
            imports: resolvedImports,
            brokenImports,
        };
    }
    for (const { relPath, nodeRef } of files) {
        nodeRef.impact = {
            imports: ((_a = forwardMap[relPath]) === null || _a === void 0 ? void 0 : _a.imports) || [],
            usedBy: reverseMap[relPath] || [],
            brokenImports: ((_b = forwardMap[relPath]) === null || _b === void 0 ? void 0 : _b.brokenImports) || [],
        };
    }
    console.log(`[impact] attached forward=${Object.keys(forwardMap).length}, reverse=${Object.keys(reverseMap).length}`);
    return fileTree;
}
