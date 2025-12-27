// import { NextRequest, NextResponse } from "next/server";
// import path from "path";
// import fs, { existsSync } from "fs";
// import { v4 as uuid } from "uuid";
// import AdmZip from "adm-zip";
// import { globSync } from "glob";

// import { authMiddleware } from "@/lib/auth-server";
// import clientPromise from "@/lib/mongoClient";

// import * as babelParser from "@babel/parser";
// import { detectLanguage, getLanguageColor } from "../lib/language";
// import { extractStructureBabel } from "../lib/extractStructureBable";
// import { instrumentExecutionBabel } from "../lib/instrumentExecutionBabel";
// import { attachCrossFileImpact } from "../lib/buildCrossFileImpactMap";
// import { mergeFileGraphs } from "../lib/analyzer/mergeFileGraph";
// import { enrichGraphSemantics } from "../lib/analyzer/enrichGraphSemantics";
// import { saveGraph } from "../lib/graph/graphStore";
// import { enqueueJob } from "../lib/jobs/jobManager";

// function extractHighlights(code: string): {
//   todos: string[];
//   fixmes: string[];
//   notes: string[];
// } {
//   const ast = babelParser.parse(code, {
//     sourceType: "unambiguous",
//     plugins: ["jsx", "typescript", "decorators-legacy"],
//     attachComment: true,
//   });

//   const todos: string[] = [];
//   const fixmes: string[] = [];
//   const notes: string[] = [];

//   const comments = (ast.comments || []).map((c) => c.value.trim());

//   comments.forEach((comment) => {
//     const content = comment.toLowerCase();
//     if (content.includes("todo")) todos.push(comment);
//     if (content.includes("fixme")) fixmes.push(comment);
//     if (content.includes("note")) notes.push(comment);
//   });

//   return { todos, fixmes, notes };
// }

// function isEntryFile(name: string, content: string): boolean {
//   const lower = name.toLowerCase();

//   const likelyNames = [
//     "index.js",
//     "index.ts",
//     "main.js",
//     "main.ts",
//     "app.js",
//     "app.ts",
//     "cli.js",
//     "cli.ts",
//     "server.js",
//     "server.ts",
//   ];

//   const bootKeywords = [
//     "listen(",
//     "createRoot(",
//     "ReactDOM.render(",
//     "process.argv",
//     "app.use(",
//     "render(",
//     "nextApp.prepare(",
//   ];

//   if (likelyNames.includes(lower)) return true;

//   return bootKeywords.some((kw) => content.includes(kw));
// }

// function detectTags(packageInfo: any, fileTree: any[]): string[] {
//   const tags = new Set<string>();

//   const deps = Object.keys({
//     ...packageInfo?.dependencies,
//     ...packageInfo?.devDependencies,
//   });

//   const allFilenames: string[] = [];

//   const walk = (nodes: any[]) => {
//     for (const node of nodes) {
//       if (node.type === "file") {
//         allFilenames.push(node.name.toLowerCase());
//         if (node.fullPath?.endsWith(".ts") || node.fullPath?.endsWith(".tsx")) {
//           tags.add("typescript");
//         }
//       } else if (node.children) {
//         walk(node.children);
//       }
//     }
//   };

//   walk(fileTree);

//   const techKeywords: Record<string, string[]> = {
//     react: ["react", "react-dom"],
//     nextjs: ["next"],
//     express: ["express"],
//     tailwind: ["tailwindcss", "tailwind.config.js"],
//     typescript: ["typescript", ".ts", ".tsx"],
//     prisma: ["prisma", "prisma/schema.prisma"],
//     firebase: ["firebase", "firebase-admin", "firebaseConfig"],
//     eslint: ["eslint", ".eslintrc", "@eslint"],
//     mongodb: ["mongodb", "mongoose", "mongoClient"],
//   };

//   for (const [tag, matchers] of Object.entries(techKeywords)) {
//     for (const keyword of matchers) {
//       const kw = keyword.toLowerCase();

//       if (deps.some((d) => d.toLowerCase().includes(kw))) {
//         tags.add(tag);
//         break;
//       }

//       if (allFilenames.some((f) => f.includes(kw))) {
//         tags.add(tag);
//         break;
//       }
//     }
//   }

//   return Array.from(tags);
// }

// async function buildFileTree(
//   files: string[],
//   rootDir: string,
//   perFileGraphs: any[]
// ) {
//   const tree: any[] = [];

//   for (const file of files) {
//     const normalizedFile = file.endsWith("/") ? file.slice(0, -1) : file;
//     const parts = normalizedFile.split("/");

//     let current = tree;

//     for (let i = 0; i < parts.length; i++) {
//       const part = parts[i];
//       const isFile = i === parts.length - 1 && !file.endsWith("/");
//       const fullPath = parts.slice(0, i + 1).join("/");

//       let existing = current.find((item) => item.name === part);

//       interface SymbolInfo {
//         name: string;
//         start: number;
//         end: number | null;
//       }

//       if (!existing) {
//         let size = undefined;
//         let loc = undefined;
//         let functions: SymbolInfo[] = [];
//         let classes: SymbolInfo[] = [];
//         let components: SymbolInfo[] = [];
//         let exports: SymbolInfo[] = [];
//         let imports: SymbolInfo[] = [];
//         let blocks: any[] = [];
//         let apis: any[] = [];
//         let schemas: any[] = [];
//         let trackExecution: any;
//         let highlights;
//         let entry;

//         if (isFile) {
//           const absolutePath = path.join(rootDir, fullPath);

//           try {
//             const stats = fs.statSync(absolutePath);
//             size = stats.size;

//             const content = fs.readFileSync(absolutePath, "utf-8");
//             loc = content.split("\n").length;

//             entry = isEntryFile(file, content);

//             const ext = part.split(".").pop()?.toLowerCase();
//             if (["js", "ts", "jsx", "tsx"].includes(ext || "")) {
//               try {
//                 trackExecution = instrumentExecutionBabel(content);
//                 perFileGraphs.push({ file: fullPath, graph: trackExecution });
//                 highlights = extractHighlights(content);
//                 const symbols = extractStructureBabel(fullPath, content);
//                 imports = symbols.imports;
//                 functions = symbols.functions;
//                 classes = symbols.classes;
//                 components = symbols.components;
//                 exports = symbols.exports;
//                 apis = symbols.apis;
//                 schemas = symbols.schemas;
//                 blocks = symbols.blocks;
//               } catch (error) {
//                 console.log("AST error : ", error);
//               }
//             }
//           } catch (err) {
//             console.warn("Failed to read file:", fullPath);
//           }
//         }

//         const language = detectLanguage(fullPath);
//         const languageColor = getLanguageColor(language);

//         existing = {
//           name: part,
//           type: isFile ? "file" : "folder",
//           fullPath: isFile ? fullPath : undefined,
//           size,
//           loc,
//           language,
//           languageColor,
//           imports,
//           highlights,
//           functions,
//           classes,
//           blocks,
//           components,
//           exports,
//           apis,
//           schemas,
//           trackExecution,
//           entry,
//           children: isFile ? undefined : [],
//         };

//         current.push(existing);
//       }

//       if (!isFile) {
//         current = existing.children!;
//       }
//     }
//   }

//   return tree;
// }

// function detectPackageManager(dir: string): string {
//   if (fs.existsSync(path.join(dir, "pnpm-lock.yaml"))) return "pnpm";
//   if (fs.existsSync(path.join(dir, "yarn.lock"))) return "yarn";
//   if (fs.existsSync(path.join(dir, "package-lock.json"))) return "npm";
//   return "unknown";
// }

// export async function POST(req: NextRequest) {
//   try {
//     const authHeader = req.headers.get("Authorization") || "";
//     const token = authHeader.replace("Bearer ", "");

//     const { uid } = await authMiddleware(token);

//     if (!uid) {
//       return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
//         status: 401,
//       });
//     }

//     const formData = await req.formData();
//     const file = formData.get("file") as File;

//     if (!file || file.type !== "application/x-zip-compressed") {
//       return NextResponse.json({ error: "Invalid ZIP file" }, { status: 400 });
//     }

//     const bytes = await file.arrayBuffer();
//     const buffer = Buffer.from(bytes);

//     fs.mkdirSync(path.join(process.cwd(), "project_uploads"), {
//       recursive: true,
//     });

//     const projectId = uuid();
//     const zipPath = path.join(
//       process.cwd(),
//       "project_uploads",
//       `${projectId}.zip`
//     );
//     const extractPath = path.join(process.cwd(), "project_uploads", projectId);

//     fs.writeFileSync(zipPath, buffer);

//     const zip = new AdmZip(zipPath);
//     zip.extractAllTo(extractPath, true);

//     const packageJsonMatches = globSync(`${extractPath}/**/package.json`, {
//       nodir: true,
//     });

//     let packageInfo: any = null;

//     if (packageJsonMatches.length > 0) {
//       const packageJsonPath = packageJsonMatches[0];
//       try {
//         const content = fs.readFileSync(packageJsonPath, "utf-8");
//         const parsed = JSON.parse(content);

//         packageInfo = {
//           name: parsed.name,
//           version: parsed.version,
//           scripts: parsed.scripts || {},
//           dependencies: parsed.dependencies || {},
//           devDependencies: parsed.devDependencies || {},
//           manager: detectPackageManager(path.dirname(packageJsonPath)),
//           path: packageJsonPath.replace(extractPath + "/", ""),
//         };
//       } catch (err) {
//         console.warn("Failed to parse package.json:", err);
//       }
//     }

//     const walk = (dir: string): string[] => {
//       let results: string[] = [];

//       const list = fs.readdirSync(dir);
//       list.forEach((item) => {
//         const fullPath = path.join(dir, item);
//         const stat = fs.statSync(fullPath);

//         const relative = path.relative(extractPath, fullPath);
//         const normalized = relative.split(path.sep).join("/");

//         if (stat.isDirectory()) {
//           results.push(normalized + "/");
//           results = results.concat(walk(fullPath));
//         } else {
//           results.push(normalized);
//         }
//       });

//       return results;
//     };

//     const perFileGraphs: any = [];
//     const allFiles = walk(extractPath);
//     const fileTree = await buildFileTree(allFiles, extractPath, perFileGraphs);

//     const mergedGraph = mergeFileGraphs(perFileGraphs);
//     const enrichedGraph = enrichGraphSemantics(mergedGraph);
//     await saveGraph(projectId, enrichedGraph, uid);

//     const filesMap: Record<string, string> = {};
//     for (const file of allFiles) {
//       const absolutePath = path.join(extractPath, file);

//       if (
//         (existsSync(absolutePath) && absolutePath.endsWith(".js")) ||
//         absolutePath.endsWith(".jsx") ||
//         absolutePath.endsWith(".ts") ||
//         absolutePath.endsWith(".tsx")
//       ) {
//         try {
//           const code = fs.readFileSync(absolutePath, "utf-8");
//           filesMap[file] = code;
//         } catch (error) {
//           console.warn("Failed to read file : ", file);
//         }
//       }
//     }
//     const job = await enqueueJob(projectId, filesMap, uid);

//     const entryPoints: string[] = [];

//     const walkTree = (nodes: any[]) => {
//       for (const node of nodes) {
//         if (node.type === "file" && node.entry) {
//           entryPoints.push(node.fullPath);
//         } else if (node.children) {
//           walkTree(node.children);
//         }
//       }
//     };

//     walkTree(fileTree);

//     const mongoClient = await clientPromise;
//     const db = mongoClient.db();
//     const projectName = file.name.replace(/\.zip$/, "");

//     let totalFiles = 0;
//     let totalFolders = 0;
//     const langMap: Record<string, number> = {};

//     const countStats = (nodes: any[]) => {
//       for (const node of nodes) {
//         if (node.type === "file") {
//           totalFiles++;
//           const ext = node.name.split(".").pop()?.toLowerCase();
//           if (ext) langMap[ext] = (langMap[ext] || 0) + 1;
//         } else if (node.type === "folder" && node.children) {
//           totalFolders++;
//           countStats(node.children);
//         }
//       }
//     };

//     countStats(fileTree);

//     const tags = detectTags(packageInfo, fileTree);

//     attachCrossFileImpact(fileTree, extractPath);
//     await db.collection("projects").insertOne({
//       ownerId: uid,
//       members: [uid],
//       roles: { [uid]: "owner" },
//       pendingInvites: [],
//       projectName,
//       createdAt: new Date(),
//       fileTree,
//       projectId,
//       stats: {
//         totalFiles,
//         totalFolders,
//         topLanguages: Object.entries(langMap)
//           .sort((a, b) => b[1] - a[1])
//           .map(([ext, count]) => ({ ext, count }))
//           .slice(0, 5),
//       },
//       packageInfo: packageInfo,
//       entryPoints,
//       tags,
//     });

//     return NextResponse.json({
//       message: "Project saved",
//       projectName,
//       jobId: job.id,
//     });
//   } catch (err) {
//     console.error("[UPLOAD_ERROR]", err);
//     return NextResponse.json(
//       { error: "Something went wrong" },
//       { status: 500 }
//     );
//   }
// }

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
import { mergeFileGraphs } from "../lib/analyzer/mergeFileGraph";
import { enrichGraphSemantics } from "../lib/analyzer/enrichGraphSemantics";
import { saveGraph } from "../lib/graph/graphStore";
import { enqueueJob } from "../lib/jobs/jobManager";

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

async function buildFileTree(
  files: string[],
  rootDir: string,
  perFileGraphs: any[]
) {
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

            const content = fs.readFileSync(absolutePath, "utf-8");
            loc = content.split("\n").length;

            entry = isEntryFile(file, content);

            const ext = part.split(".").pop()?.toLowerCase();
            if (["js", "ts", "jsx", "tsx"].includes(ext || "")) {
              trackExecution = instrumentExecutionBabel(content);
              perFileGraphs.push({ file: fullPath, graph: trackExecution });
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
          } catch {
            console.warn("Failed to read file:", fullPath);
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

    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Invalid ZIP file" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const projectId = uuid();
    extractPath = path.join(os.tmpdir(), projectId);
    fs.mkdirSync(extractPath, { recursive: true });

    const zipPath = path.join(extractPath, "project.zip");
    fs.writeFileSync(zipPath, buffer);

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);

    let packageInfo = null;
    const matches = globSync(`${extractPath}/**/package.json`, { nodir: true });

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
        path: p.replace(extractPath + "/", ""),
      };
    }

    const walk = (dir: string): string[] => {
      let results: string[] = [];
      for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item);
        const rel = path.relative(extractPath!, full).split(path.sep).join("/");
        if (fs.statSync(full).isDirectory()) {
          results.push(rel + "/");
          results = results.concat(walk(full));
        } else results.push(rel);
      }
      return results;
    };

    const perFileGraphs: any[] = [];
    const allFiles = walk(extractPath);
    const fileTree = await buildFileTree(allFiles, extractPath, perFileGraphs);

    const mergedGraph = mergeFileGraphs(perFileGraphs);
    const enrichedGraph = enrichGraphSemantics(mergedGraph);
    await saveGraph(projectId, enrichedGraph, uid);

    const filesMap: Record<string, string> = {};
    for (const f of allFiles) {
      const abs = path.join(extractPath, f);
      if (existsSync(abs) && abs.match(/\.(js|jsx|ts|tsx)$/)) {
        filesMap[f] = fs.readFileSync(abs, "utf-8");
      }
    }

    const job = await enqueueJob(projectId, filesMap, uid);

    const entryPoints: string[] = [];
    const walkTree = (nodes: any[]) =>
      nodes.forEach((n) =>
        n.type === "file" && n.entry
          ? entryPoints.push(n.fullPath)
          : n.children && walkTree(n.children)
      );

    walkTree(fileTree);

    const mongoClient = await clientPromise;
    const db = mongoClient.db();

    const tags = detectTags(packageInfo, fileTree);
    attachCrossFileImpact(fileTree, extractPath);

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

    return NextResponse.json({
      message: "Project saved",
      jobId: job.id,
    });
  } catch (err) {
    console.error("[UPLOAD_ERROR]", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  } finally {
    if (extractPath && fs.existsSync(extractPath)) {
      fs.rmSync(extractPath, { recursive: true, force: true });
    }
  }
}
