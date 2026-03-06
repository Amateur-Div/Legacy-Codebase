import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs, { existsSync } from "fs";
import os from "os";
import { v4 as uuid } from "uuid";
import AdmZip from "adm-zip";
import { globSync } from "glob";

import { authMiddleware } from "@/lib/auth-server";
import clientPromise from "@/lib/mongoClient";

import * as babelParser from "@babel/parser";
import { detectLanguage, getLanguageColor } from "../lib/language";
import { extractStructureBabel } from "../lib/extractStructureBable";
import { instrumentExecutionBabel } from "../lib/instrumentExecutionBabel";
import { attachCrossFileImpact } from "../lib/buildCrossFileImpactMap";
import { enqueueJob } from "../lib/jobs/jobManager";

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

const MAX_FILE_SIZE_BYTES = 1024 * 1024;
const MAX_STORE_SIZE_BYTES = 15 * 1024 * 1024;

function extractHighlights(code: string) {
  const ast = babelParser.parse(code, {
    sourceType: "unambiguous",
    plugins: ["jsx", "typescript", "decorators-legacy"],
    attachComment: true,
  });

  const todos: string[] = [];
  const fixmes: string[] = [];
  const notes: string[] = [];

  const comments = (ast.comments || []).map((c) => c.value.trim());

  comments.forEach((comment) => {
    const content = comment.toLowerCase();
    if (content.includes("todo")) todos.push(comment);
    if (content.includes("fixme")) fixmes.push(comment);
    if (content.includes("note")) notes.push(comment);
  });

  return { todos, fixmes, notes };
}

function isBinaryFile(buffer: Buffer) {
  return buffer.includes(0);
}

function isEntryFile(name: string, content: string): boolean {
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

  if (likelyNames.includes(lower)) return true;
  return bootKeywords.some((kw) => content.includes(kw));
}

function detectPackageManager(dir: string): string {
  if (fs.existsSync(path.join(dir, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(dir, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(dir, "package-lock.json"))) return "npm";
  return "unknown";
}

function detectTags(packageInfo: any, fileTree: any[]): string[] {
  const tags = new Set<string>();

  const deps = Object.keys({
    ...packageInfo?.dependencies,
    ...packageInfo?.devDependencies,
  });

  const allFilenames: string[] = [];

  const walk = (nodes: any[]) => {
    for (const node of nodes) {
      if (node.type === "file") {
        allFilenames.push(node.name.toLowerCase());
        if (node.fullPath?.endsWith(".ts") || node.fullPath?.endsWith(".tsx")) {
          tags.add("typescript");
        }
      } else if (node.children) {
        walk(node.children);
      }
    }
  };

  walk(fileTree);

  const techKeywords: Record<string, string[]> = {
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

async function buildFileTree(files: string[], rootDir: string) {
  const tree: any[] = [];

  for (const file of files) {
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
        let imports: any[] = [];
        let functions: any[] = [];
        let classes: any[] = [];
        let components: any[] = [];
        let exports: any[] = [];
        let blocks: any[] = [];
        let apis: any[] = [];
        let schemas: any[] = [];
        let trackExecution: any;

        if (isFile) {
          const absolutePath = path.join(rootDir, fullPath);

          try {
            const stats = fs.statSync(absolutePath);
            size = stats.size;

            if (size <= MAX_FILE_SIZE_BYTES) {
              const buffer = fs.readFileSync(absolutePath);

              if (!isBinaryFile(buffer)) {
                const content = buffer.toString("utf-8");
                loc = content.split("\n").length;

                entry = isEntryFile(file, content);

                const ext = part.split(".").pop()?.toLowerCase();
                if (["js", "ts", "jsx", "tsx"].includes(ext || "")) {
                  trackExecution = instrumentExecutionBabel(content);
                  highlights = extractHighlights(content);
                  const symbols = extractStructureBabel(fullPath, content);
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
          } catch (err: any) {
            console.warn("Failed to read file:", fullPath);
            console.log("Error reading files : ", err);
          }
        }

        const language = detectLanguage(fullPath);
        const languageColor = getLanguageColor(language);

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

      if (!isFile) current = existing.children!;
    }
  }

  return tree;
}

export async function POST(req: NextRequest) {
  let extractPath: string | null = null;

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const { uid } = await authMiddleware(token);

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Invalid ZIP file" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const projectId = uuid();
    extractPath = path.join(os.tmpdir(), projectId);
    const extractRoot = path.join(extractPath, "repo");
    fs.mkdirSync(extractRoot, { recursive: true });

    const zipPath = path.join(extractPath, "project.zip");
    fs.writeFileSync(zipPath, buffer);

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractRoot, true);

    let packageInfo = null;
    const matches = globSync(`${extractRoot}/**/package.json`, { nodir: true });

    if (matches.length) {
      const p = matches[0];
      const parsed = JSON.parse(fs.readFileSync(p, "utf-8"));
      packageInfo = {
        name: parsed.name,
        version: parsed.version,
        scripts: parsed.scripts || {},
        dependencies: parsed.dependencies || {},
        devDependencies: parsed.devDependencies || {},
        manager: detectPackageManager(path.dirname(p)),
        path: p.replace(extractRoot + "/", ""),
      };
    }

    const walk = (dir: string): string[] => {
      let results: string[] = [];

      for (const item of fs.readdirSync(dir)) {
        if (IGNORE_DIRS.has(item)) continue;

        const full = path.join(dir, item);
        const rel = path.relative(extractRoot!, full).split(path.sep).join("/");

        const stat = fs.statSync(full);

        if (stat.isDirectory()) {
          results.push(rel + "/");
          results = results.concat(walk(full));
        } else {
          results.push(rel);
        }
      }

      return results;
    };

    const allFiles = walk(extractRoot);
    const fileTree = await buildFileTree(allFiles, extractRoot);

    const fileDocs: any[] = [];
    let totalStoredBytes = 0;

    for (const f of allFiles) {
      const abs = path.join(extractRoot, f);
      if (!existsSync(abs)) continue;

      const stats = fs.statSync(abs);
      if (!stats.isFile()) continue;

      const size = stats.size;

      const ext = f.split(".").pop()?.toLowerCase();
      const isCode = ["js", "jsx", "ts", "tsx"].includes(ext || "");

      let content: string | undefined = undefined;

      if (size <= MAX_FILE_SIZE_BYTES) {
        const buffer = fs.readFileSync(abs);
        if (!isBinaryFile(buffer)) {
          const text = buffer.toString("utf-8");

          if (isCode) {
            totalStoredBytes += Buffer.byteLength(text);
            if (totalStoredBytes <= MAX_STORE_SIZE_BYTES) {
              content = text;
            }
          } else {
            content = text;
          }
        }
      }

      fileDocs.push({
        projectId,
        path: f,
        content,
        size,
        language: detectLanguage(f),
        isCode,
        createdAt: new Date(),
      });
    }

    console.log("Stored JS/TS bytes:", totalStoredBytes);

    attachCrossFileImpact(fileTree);
    const job = await enqueueJob(projectId, fileTree, fileDocs, uid);

    const entryPoints: string[] = [];
    const walkTree = (nodes: any[]) =>
      nodes.forEach((n) =>
        n.type === "file" && n.entry
          ? entryPoints.push(n.fullPath)
          : n.children && walkTree(n.children),
      );

    walkTree(fileTree);

    const mongoClient = await clientPromise;
    const db = mongoClient.db();

    const tags = detectTags(packageInfo, fileTree);

    await db.collection("projects").insertOne({
      ownerId: uid,
      members: [uid],
      roles: { [uid]: "owner" },
      pendingInvites: [],
      projectName: file.name.replace(/\.zip$/, ""),
      createdAt: new Date(),
      fileTree,
      projectId,
      packageInfo,
      entryPoints,
      tags,
    });

    if (fileDocs.length) {
      await db.collection("project_files").insertMany(fileDocs);
    }

    return NextResponse.json({
      message: "Project saved",
      jobId: job.id,
    });
  } catch (err) {
    console.error("[UPLOAD_ERROR]", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  } finally {
    if (extractPath && fs.existsSync(extractPath)) {
      fs.rmSync(extractPath, { recursive: true, force: true });
    }
  }
}
