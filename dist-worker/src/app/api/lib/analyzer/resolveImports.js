"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPathResolver = createPathResolver;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const typescript_1 = __importDefault(require("typescript"));
function createPathResolver({ projectRoot, tsconfigPath, }) {
    let compilerOptions = {
        moduleResolution: typescript_1.default.ModuleResolutionKind.NodeNext,
    };
    if (tsconfigPath && fs_1.default.existsSync(tsconfigPath)) {
        const parsed = typescript_1.default.readConfigFile(tsconfigPath, typescript_1.default.sys.readFile);
        if (!parsed.error && parsed.config.compilerOptions) {
            compilerOptions = {
                ...compilerOptions,
                ...parsed.config.compilerOptions,
            };
        }
    }
    const host = typescript_1.default.createCompilerHost(compilerOptions, false);
    function resolveImport(importSource, fromFile) {
        var _a;
        try {
            if (importSource.startsWith(".") || importSource.startsWith("/")) {
                const abs = path_1.default.resolve(path_1.default.dirname(fromFile), importSource);
                const candidates = [
                    abs,
                    `${abs}.ts`,
                    `${abs}.tsx`,
                    `${abs}.js`,
                    `${abs}.jsx`,
                    path_1.default.join(abs, "index.ts"),
                    path_1.default.join(abs, "index.js"),
                ];
                for (const c of candidates)
                    if (fs_1.default.existsSync(c))
                        return path_1.default.relative(projectRoot, c);
            }
            const resolved = typescript_1.default.resolveModuleName(importSource, fromFile, compilerOptions, host);
            const file = (_a = resolved === null || resolved === void 0 ? void 0 : resolved.resolvedModule) === null || _a === void 0 ? void 0 : _a.resolvedFileName;
            if (file && fs_1.default.existsSync(file))
                return path_1.default.relative(projectRoot, file);
            return null;
        }
        catch {
            return null;
        }
    }
    return resolveImport;
}
