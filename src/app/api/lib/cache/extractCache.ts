import fs from "fs";
import path from "path";
import os from "os";

const CACHE_ROOT = path.join(os.tmpdir(), "repo-cache");
const MAX_CACHE_SIZE = 5;

export function getProjectCachePath(projectId: string) {
  return path.join(CACHE_ROOT, projectId);
}

export function ensureCacheRoot() {
  if (!fs.existsSync(CACHE_ROOT)) {
    fs.mkdirSync(CACHE_ROOT, { recursive: true });
  }
}

export function touchCache(projectId: string) {
  const dir = getProjectCachePath(projectId);

  fs.mkdirSync(dir, { recursive: true });

  const file = path.join(dir, ".lastAccess");
  fs.writeFileSync(file, Date.now().toString());
}

export function cleanOldCache() {
  ensureCacheRoot();

  const dirs = fs.readdirSync(CACHE_ROOT);

  const entries = dirs.map((dir) => {
    const full = path.join(CACHE_ROOT, dir);
    const meta = path.join(full, ".lastAccess");

    let time = 0;
    if (fs.existsSync(meta)) {
      time = parseInt(fs.readFileSync(meta, "utf-8"));
    }

    return { dir, full, time };
  });

  entries.sort((a, b) => a.time - b.time);

  while (entries.length > MAX_CACHE_SIZE) {
    const oldest = entries.shift();
    if (oldest) {
      try {
        fs.rmSync(oldest.full, { recursive: true, force: true });
      } catch (error) {
        console.warn("Cache cleanup skipped : ", oldest.full);
      }
    }
  }
}
