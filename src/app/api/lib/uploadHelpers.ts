import path from "path";
import fs from "fs";

import * as babelParser from "@babel/parser";
import { detectLanguage, getLanguageColor } from "../lib/language";
import { extractStructureBabel } from "../lib/extractStructureBable";
import { instrumentExecutionBabel } from "../lib/instrumentExecutionBabel";

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

export async function buildFileTree(files: string[], rootDir: string) {
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
