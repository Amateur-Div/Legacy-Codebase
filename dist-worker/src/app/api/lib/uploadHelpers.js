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
exports.isEntryFile = isEntryFile;
exports.detectPackageManager = detectPackageManager;
exports.detectTags = detectTags;
exports.buildFileTreeLight = buildFileTreeLight;
exports.buildFileTree = buildFileTree;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const babelParser = __importStar(require("@babel/parser"));
const language_1 = require("../lib/language");
const extractStructureBable_1 = require("../lib/extractStructureBable");
const instrumentExecutionBabel_1 = require("../lib/instrumentExecutionBabel");
const MAX_FILE_SIZE_BYTES = 1024 * 1024;
const MAX_STORE_SIZE_BYTES = 15 * 1024 * 1024;
const IGNORE_DIRS = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    "coverage",
    ".next",
    ".turbo",
    ".cache",
]);
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
function isEntryFile(name, content) {
    const lower = name.toLowerCase();
    const likelyNames = [
        "index.js",
        "index.ts",
        "main.js",
        "main.ts",
        "app.js",
        "app.ts",
        "cli.js",
        "cli.ts",
        "server.js",
        "server.ts",
    ];
    const bootKeywords = [
        "listen(",
        "createRoot(",
        "ReactDOM.render(",
        "process.argv",
        "app.use(",
        "render(",
        "nextApp.prepare(",
    ];
    if (likelyNames.includes(lower))
        return true;
    return bootKeywords.some((kw) => content.includes(kw));
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
    });
    const allFilenames = [];
    const walk = (nodes) => {
        var _a, _b;
        for (const node of nodes) {
            if (node.type === "file") {
                allFilenames.push(node.name.toLowerCase());
                if (((_a = node.fullPath) === null || _a === void 0 ? void 0 : _a.endsWith(".ts")) || ((_b = node.fullPath) === null || _b === void 0 ? void 0 : _b.endsWith(".tsx"))) {
                    tags.add("typescript");
                }
            }
            else if (node.children) {
                walk(node.children);
            }
        }
    };
    walk(fileTree);
    const techKeywords = {
        react: ["react", "react-dom"],
        nextjs: ["next"],
        express: ["express"],
        tailwind: ["tailwindcss", "tailwind.config.js"],
        typescript: ["typescript", ".ts", ".tsx"],
        prisma: ["prisma", "prisma/schema.prisma"],
        firebase: ["firebase", "firebase-admin", "firebaseConfig"],
        eslint: ["eslint", ".eslintrc", "@eslint"],
        mongodb: ["mongodb", "mongoose", "mongoClient"],
    };
    for (const [tag, matchers] of Object.entries(techKeywords)) {
        for (const keyword of matchers) {
            const kw = keyword.toLowerCase();
            if (deps.some((d) => d.toLowerCase().includes(kw))) {
                tags.add(tag);
                break;
            }
            if (allFilenames.some((f) => f.includes(kw))) {
                tags.add(tag);
                break;
            }
        }
    }
    return Array.from(tags);
}
function buildFileTreeLight(files) {
    const tree = [];
    for (const file of files) {
        const parts = file.split("/");
        let current = tree;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isFile = i === parts.length - 1;
            let existing = current.find((n) => n.name === part);
            if (!existing) {
                existing = {
                    name: part,
                    type: isFile ? "file" : "folder",
                    fullPath: isFile ? file : undefined,
                    language: isFile ? (0, language_1.detectLanguage)(file) : undefined,
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
                let size, loc, highlights, entry;
                let imports = [];
                let functions = [];
                let classes = [];
                let components = [];
                let exports = [];
                let blocks = [];
                let apis = [];
                let schemas = [];
                let trackExecution;
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
                                entry = isEntryFile(file, content);
                                const ext = (_a = part.split(".").pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
                                if (["js", "ts", "jsx", "tsx"].includes(ext || "")) {
                                    trackExecution = (0, instrumentExecutionBabel_1.instrumentExecutionBabel)(content);
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
                    trackExecution,
                    entry,
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
