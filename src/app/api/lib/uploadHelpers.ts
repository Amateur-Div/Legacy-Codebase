import path from "path";
import fs from "fs";

import * as babelParser from "@babel/parser";
import { detectLanguage, getLanguageColor } from "../lib/language";
import { extractStructureBabel } from "../lib/extractStructureBable";

const MAX_FILE_SIZE_BYTES = 1024 * 1024;

type FileNode = {
  type: "file" | "folder";
  name: string;
  loc?: number;
  children?: FileNode[];
};

type CompositionEntry = {
  extension: string;
  category: string;
  files: number;
  loc: number;
  percent: number;
};

export function extractHighlights(code: string) {
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

export function isBinaryFile(buffer: Buffer) {
  return buffer.includes(0);
}

type EntrypointAnalysis = {
  isLikelyEntry: boolean;
  score: number;
  reasons: string[];
};

export function analyzeEntrypoint(
  filePath: string,
  content: string,
): EntrypointAnalysis {
  let score = 0;
  const reasons: string[] = [];
  const lower = filePath.toLowerCase();

  if (
    lower.includes(".spec.") ||
    lower.includes(".test.") ||
    lower.includes("/__tests__/") ||
    lower.includes("/e2e/")
  ) {
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

  if (
    lower.includes("/app/layout.") ||
    lower.includes("/app/page.") ||
    lower.includes("/middleware.")
  ) {
    score += 35;

    reasons.push("nextjs app entry");
  }

  if (
    lower.includes("/components/") ||
    lower.includes("/hooks/") ||
    lower.includes("/utils/")
  ) {
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

const CATEGORY_MAP: Record<string, string> = {
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

function getCategory(extension: string) {
  return CATEGORY_MAP[extension] || "other";
}

function getExtension(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (!ext || ext === fileName.toLowerCase()) {
    return "unknown";
  }

  return ext;
}

export function calculateRepositoryInsights(tree: FileNode[]) {
  let totalLOC = 0;
  let totalFiles = 0;
  let totalFolders = 0;

  let largestFile = {
    name: "",
    loc: 0,
  };

  const compositionMap: Record<
    string,
    {
      extension: string;
      category: string;
      files: number;
      loc: number;
    }
  > = {};

  const walk = (nodes: FileNode[]) => {
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

      if (
        category === "code" ||
        category === "docs" ||
        category === "schema" ||
        category === "script"
      ) {
        compositionMap[extension].loc += loc;
      }
    }
  };

  walk(tree);

  const composition: CompositionEntry[] = Object.values(compositionMap)
    .map((entry) => ({
      ...entry,

      percent:
        totalLOC > 0 ? Number(((entry.loc / totalLOC) * 100).toFixed(1)) : 0,
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

export function detectPackageManager(dir: string): string {
  if (fs.existsSync(path.join(dir, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(dir, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(dir, "package-lock.json"))) return "npm";
  return "unknown";
}

export function detectTags(packageInfo: any, fileTree: any[]): string[] {
  const tags = new Set<string>();

  const deps = Object.keys({
    ...packageInfo?.dependencies,
    ...packageInfo?.devDependencies,
  }).map((d) => d.toLowerCase());

  const filenames: string[] = [];

  const walk = (nodes: any[]) => {
    for (const node of nodes) {
      if (node.type === "file") {
        filenames.push(node.name.toLowerCase());
      } else if (node.children) {
        walk(node.children);
      }
    }
  };

  walk(fileTree);

  const techMap: Record<string, string[]> = {
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

  if (
    filenames.includes("tailwind.config.js") ||
    filenames.includes("tailwind.config.ts")
  ) {
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

export async function buildFileTree(files: string[], rootDir: string) {
  const tree: any[] = [];

  for (const file of files) {
    if (
      file.includes(".spec.") ||
      file.includes(".test.") ||
      file.includes("/e2e/") ||
      file.includes("/__tests__/")
    ) {
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
        let entryAnalysis: EntrypointAnalysis = {
          isLikelyEntry: false,
          score: 0,
          reasons: [],
        };
        let imports: any[] = [];
        let functions: any[] = [];
        let classes: any[] = [];
        let components: any[] = [];
        let exports: any[] = [];
        let blocks: any[] = [];
        let apis: any[] = [];
        let schemas: any[] = [];

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

                entryAnalysis = analyzeEntrypoint(file, content);

                const ext = part.split(".").pop()?.toLowerCase();
                if (["js", "ts", "jsx", "tsx"].includes(ext || "")) {
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
          entry: entryAnalysis,
          children: isFile ? undefined : [],
        };

        current.push(existing);
      }

      if (!isFile) current = existing.children!;
    }
  }

  return tree;
}
