"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractHighlights = extractHighlights;
exports.isBinaryFile = isBinaryFile;
exports.analyzeEntrypoint = analyzeEntrypoint;
exports.calculateRepositoryInsights = calculateRepositoryInsights;
exports.detectPackageManager = detectPackageManager;
exports.detectTags = detectTags;
exports.buildFileTree = buildFileTree;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const babelParser = __importStar(require("@babel/parser"));
const language_1 = require("./language");
const extractStructureBable_1 = require("./extractStructureBable");
const MAX_FILE_SIZE_BYTES = 1024 * 1024;
function extractHighlights(code) {
    const ast = babelParser.parse(code, {
        sourceType: "unambiguous",
        plugins: ["jsx", "typescript", "decorators-legacy"],
        attachComment: true,
    });
    const todos = [];
    const fixmes = [];
    const notes = [];
    const comments = (ast.comments || []).map((c) => c.value.trim());
    comments.forEach((comment) => {
        const content = comment.toLowerCase();
        if (content.includes("todo"))
            todos.push(comment);
        if (content.includes("fixme"))
            fixmes.push(comment);
        if (content.includes("note"))
            notes.push(comment);
    });
    return { todos, fixmes, notes };
}
function isBinaryFile(buffer) {
    return buffer.includes(0);
}
function analyzeEntrypoint(filePath, content) {
    let score = 0;
    const reasons = [];
    const lower = filePath.toLowerCase();
    if (lower.includes(".spec.") ||
        lower.includes(".test.") ||
        lower.includes("/__tests__/") ||
        lower.includes("/e2e/")) {
        return {
            isLikelyEntry: false,
            score: 0,
            reasons: [],
        };
    }
    const strongNames = [
        "main.ts",
        "main.js",
        "server.ts",
        "server.js",
        "cli.ts",
        "cli.js",
    ];
    if (strongNames.some((n) => lower.endsWith(n))) {
        score += 30;
        reasons.push("strong filename");
    }
    const weakNames = ["index.ts", "index.js", "app.ts", "app.js"];
    if (weakNames.some((n) => lower.endsWith(n))) {
        score += 10;
        reasons.push("common entry filename");
    }
    if (content.includes("NestFactory.create")) {
        score += 70;
        reasons.push("nestjs bootstrap");
    }
    if (content.includes(".listen(") || content.includes("createServer(")) {
        score += 50;
        reasons.push("http listener");
    }
    if (content.includes("createRoot(") || content.includes("ReactDOM.render(")) {
        score += 60;
        reasons.push("react bootstrap");
    }
    if (content.includes("process.argv") || content.includes("commander")) {
        score += 40;
        reasons.push("cli runtime");
    }
    if (lower.includes("/app/layout.") ||
        lower.includes("/app/page.") ||
        lower.includes("/middleware.")) {
        score += 35;
        reasons.push("nextjs app entry");
    }
    if (lower.includes("/components/") ||
        lower.includes("/hooks/") ||
        lower.includes("/utils/")) {
        score -= 25;
        reasons.push("utility/component file");
    }
    if (content.split("\n").length < 5) {
        score -= 10;
    }
    return {
        isLikelyEntry: score >= 40,
        score,
        reasons,
    };
}
const CATEGORY_MAP = {
    ts: "code",
    tsx: "code",
    js: "code",
    jsx: "code",
    json: "config",
    yaml: "config",
    yml: "config",
    env: "config",
    toml: "config",
    ini: "config",
    md: "docs",
    mdx: "docs",
    svg: "asset",
    png: "asset",
    jpg: "asset",
    jpeg: "asset",
    gif: "asset",
    webp: "asset",
    dockerfile: "infra",
    tf: "infra",
    sh: "script",
    bat: "script",
    graphql: "schema",
    gql: "schema",
    prisma: "schema",
    proto: "schema",
};
function getCategory(extension) {
    return CATEGORY_MAP[extension] || "other";
}
function getExtension(fileName) {
    var _a;
    const ext = (_a = fileName.split(".").pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    if (!ext || ext === fileName.toLowerCase()) {
        return "unknown";
    }
    return ext;
}
function calculateRepositoryInsights(tree) {
    let totalLOC = 0;
    let totalFiles = 0;
    let totalFolders = 0;
    let largestFile = {
        name: "",
        loc: 0,
    };
    const compositionMap = {};
    const walk = (nodes) => {
        for (const node of nodes) {
            if (node.type === "folder") {
                totalFolders++;
                if (node.children) {
                    walk(node.children);
                }
                continue;
            }
            totalFiles++;
            const loc = node.loc || 0;
            totalLOC += loc;
            if (loc > largestFile.loc) {
                largestFile = {
                    name: node.name,
                    loc,
                };
            }
            const extension = getExtension(node.name);
            const category = getCategory(extension);
            if (!compositionMap[extension]) {
                compositionMap[extension] = {
                    extension,
                    category,
                    files: 0,
                    loc: 0,
                };
            }
            compositionMap[extension].files += 1;
            if (category === "code" ||
                category === "docs" ||
                category === "schema" ||
                category === "script") {
                compositionMap[extension].loc += loc;
            }
        }
    };
    walk(tree);
    const composition = Object.values(compositionMap)
        .map((entry) => ({
        ...entry,
        filePercent: totalFiles > 0
            ? Number(((entry.files / totalFiles) * 100).toFixed(1))
            : 0,
        locPercent: totalLOC > 0 ? Number(((entry.loc / totalLOC) * 100).toFixed(1)) : 0,
    }))
        .sort((a, b) => {
        if (b.loc !== a.loc) {
            return b.loc - a.loc;
        }
        return b.files - a.files;
    });
    return {
        totalLOC,
        totalFiles,
        totalFolders,
        largestFile,
        repositoryComposition: composition,
    };
}
function detectPackageManager(dir) {
    if (fs_1.default.existsSync(path_1.default.join(dir, "pnpm-lock.yaml")))
        return "pnpm";
    if (fs_1.default.existsSync(path_1.default.join(dir, "yarn.lock")))
        return "yarn";
    if (fs_1.default.existsSync(path_1.default.join(dir, "package-lock.json")))
        return "npm";
    return "unknown";
}
function detectTags(packageInfo, fileTree) {
    const tags = new Set();
    const deps = Object.keys({
        ...packageInfo === null || packageInfo === void 0 ? void 0 : packageInfo.dependencies,
        ...packageInfo === null || packageInfo === void 0 ? void 0 : packageInfo.devDependencies,
    }).map((d) => d.toLowerCase());
    const filenames = [];
    const walk = (nodes) => {
        for (const node of nodes) {
            if (node.type === "file") {
                filenames.push(node.name.toLowerCase());
            }
            else if (node.children) {
                walk(node.children);
            }
        }
    };
    walk(fileTree);
    const techMap = {
        react: ["react", "react-dom"],
        nextjs: ["next"],
        express: ["express"],
        nestjs: ["@nestjs/core"],
        mongodb: ["mongodb", "mongoose"],
        firebase: ["firebase", "firebase-admin"],
        prisma: ["prisma"],
        tailwind: ["tailwindcss"],
        redux: ["redux", "@reduxjs/toolkit"],
        typescript: ["typescript"],
    };
    for (const [tag, matchers] of Object.entries(techMap)) {
        if (matchers.some((m) => deps.some((d) => d.includes(m)))) {
            tags.add(tag);
        }
    }
    if (filenames.includes("tailwind.config.js") ||
        filenames.includes("tailwind.config.ts")) {
        tags.add("tailwind");
    }
    if (filenames.includes("tsconfig.json")) {
        tags.add("typescript");
    }
    if (filenames.includes("docker-compose.yml")) {
        tags.add("docker");
    }
    return Array.from(tags);
}
async function buildFileTree(files, rootDir) {
    var _a;
    const tree = [];
    for (const file of files) {
        if (file.includes(".spec.") ||
            file.includes(".test.") ||
            file.includes("/e2e/") ||
            file.includes("/__tests__/")) {
            continue;
        }
        const normalizedFile = file.endsWith("/") ? file.slice(0, -1) : file;
        const parts = normalizedFile.split("/");
        let current = tree;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isFile = i === parts.length - 1 && !file.endsWith("/");
            const fullPath = parts.slice(0, i + 1).join("/");
            let existing = current.find((item) => item.name === part);
            if (!existing) {
                let size, loc, highlights;
                let imports = [];
                let functions = [];
                let classes = [];
                let components = [];
                let exports = [];
                let blocks = [];
                let apis = [];
                let schemas = [];
                let entryAnalysis = {
                    isLikelyEntry: false,
                    score: 0,
                    reasons: [],
                };
                if (isFile) {
                    const absolutePath = path_1.default.join(rootDir, fullPath);
                    try {
                        const stats = fs_1.default.statSync(absolutePath);
                        size = stats.size;
                        if (size <= MAX_FILE_SIZE_BYTES) {
                            const buffer = fs_1.default.readFileSync(absolutePath);
                            if (!isBinaryFile(buffer)) {
                                const content = buffer.toString("utf-8");
                                loc = content.split("\n").length;
                                entryAnalysis = analyzeEntrypoint(file, content);
                                const ext = (_a = part.split(".").pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
                                if (["js", "ts", "jsx", "tsx"].includes(ext || "")) {
                                    highlights = extractHighlights(content);
                                    const symbols = (0, extractStructureBable_1.extractStructureBabel)(fullPath, content);
                                    imports = symbols.imports;
                                    functions = symbols.functions;
                                    classes = symbols.classes;
                                    components = symbols.components;
                                    exports = symbols.exports;
                                    apis = symbols.apis;
                                    schemas = symbols.schemas;
                                    blocks = symbols.blocks;
                                }
                            }
                        }
                    }
                    catch (err) {
                        console.warn("Failed to read file:", fullPath);
                        console.log("Error reading files : ", err);
                    }
                }
                const language = (0, language_1.detectLanguage)(fullPath);
                const languageColor = (0, language_1.getLanguageColor)(language);
                existing = {
                    name: part,
                    type: isFile ? "file" : "folder",
                    fullPath: isFile ? fullPath : undefined,
                    size,
                    loc,
                    language,
                    languageColor,
                    imports,
                    highlights,
                    functions,
                    classes,
                    blocks,
                    components,
                    exports,
                    apis,
                    schemas,
                    entry: entryAnalysis,
                    children: isFile ? undefined : [],
                };
                current.push(existing);
            }
            if (!isFile)
                current = existing.children;
        }
    }
    return tree;
}
