"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectCachePath = getProjectCachePath;
exports.ensureCacheRoot = ensureCacheRoot;
exports.touchCache = touchCache;
exports.cleanOldCache = cleanOldCache;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const CACHE_ROOT = path_1.default.join(os_1.default.tmpdir(), "repo-cache");
const MAX_CACHE_SIZE = 5;
function getProjectCachePath(projectId) {
    return path_1.default.join(CACHE_ROOT, projectId);
}
function ensureCacheRoot() {
    if (!fs_1.default.existsSync(CACHE_ROOT)) {
        fs_1.default.mkdirSync(CACHE_ROOT, { recursive: true });
    }
}
function touchCache(projectId) {
    const dir = getProjectCachePath(projectId);
    fs_1.default.mkdirSync(dir, { recursive: true });
    const file = path_1.default.join(dir, ".lastAccess");
    fs_1.default.writeFileSync(file, Date.now().toString());
}
function cleanOldCache() {
    ensureCacheRoot();
    const dirs = fs_1.default.readdirSync(CACHE_ROOT);
    const entries = dirs.map((dir) => {
        const full = path_1.default.join(CACHE_ROOT, dir);
        const meta = path_1.default.join(full, ".lastAccess");
        let time = 0;
        if (fs_1.default.existsSync(meta)) {
            time = parseInt(fs_1.default.readFileSync(meta, "utf-8"));
        }
        return { dir, full, time };
    });
    entries.sort((a, b) => a.time - b.time);
    while (entries.length > MAX_CACHE_SIZE) {
        const oldest = entries.shift();
        if (oldest) {
            try {
                fs_1.default.rmSync(oldest.full, { recursive: true, force: true });
            }
            catch (error) {
                console.warn("Cache cleanup skipped : ", oldest.full);
            }
        }
    }
}
