export type FileRole =
  | "source"
  | "framework-entry"
  | "runtime-entry"
  | "cli-entry"
  | "test"
  | "config"
  | "documentation"
  | "generated"
  | "static"
  | "unknown";

export type EntryPointKind = "framework" | "runtime" | "cli" | "none";

export type EntrypointAnalysis = {
  isLikelyEntry: boolean;
  score: number;
  reasons: string[];
  kind: EntryPointKind;
  framework?: string;
};

export type FileClassification = {
  role: FileRole;
  entry: EntrypointAnalysis;
};

const ANALYZABLE_SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);

const EXECUTABLE_EXTENSIONS = new Set([
  ...ANALYZABLE_SOURCE_EXTENSIONS,
  ".mjs",
  ".cjs",
]);

const TEST_PATTERNS = [/\.spec\./i, /\.test\./i, /\/__tests__\//i, /\/e2e\//i];

const DOCUMENTATION_EXTENSIONS = new Set([
  ".md",
  ".mdx",
  ".txt",
  ".adoc",
  ".rst",
]);

const STATIC_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".avif",
  ".bmp",
  ".mp4",
  ".webm",
  ".mp3",
  ".wav",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".css",
  ".scss",
  ".sass",
  ".less",
]);

const CONFIG_FILE_PATTERNS = [
  /(^|\/)package\.json$/i,
  /(^|\/)(pnpm|yarn|npm)-lock\.yaml$/i,
  /(^|\/)package-lock\.json$/i,
  /(^|\/)tsconfig(?:\..*)?\.json$/i,
  /(^|\/)jsconfig(?:\..*)?\.json$/i,
  /(^|\/).*\.config\.(js|cjs|mjs|ts)$/i,
  /(^|\/)\.graphqlrc\.(js|cjs|mjs|ts)$/i,
  /(^|\/)\.npmrc$/i,
  /(^|\/)\.nvmrc$/i,
  /(^|\/)docker-compose\.ya?ml$/i,
  /(^|\/)Dockerfile$/i,
];

const GENERATED_PATH_PATTERNS = [
  /\/generated\//i,
  /\/__generated__\//i,
  /\.generated\./i,
];

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").toLowerCase();
}

function getExtension(filePath: string): string {
  const normalized = normalizePath(filePath);
  const lastDot = normalized.lastIndexOf(".");
  const lastSlash = normalized.lastIndexOf("/");

  if (lastDot === -1 || lastDot < lastSlash) {
    return "";
  }

  return normalized.slice(lastDot);
}

function isTestPath(filePath: string): boolean {
  const normalized = normalizePath(filePath);
  return TEST_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isExecutablePath(filePath: string): boolean {
  return EXECUTABLE_EXTENSIONS.has(getExtension(filePath));
}

function isAnalyzableSourcePath(filePath: string): boolean {
  return ANALYZABLE_SOURCE_EXTENSIONS.has(getExtension(filePath));
}

function isDocumentationPath(filePath: string): boolean {
  const normalized = normalizePath(filePath);

  if (normalized.includes("/docs/") || normalized.startsWith("docs/")) {
    return true;
  }

  return DOCUMENTATION_EXTENSIONS.has(getExtension(normalized));
}

function isStaticPath(filePath: string): boolean {
  const normalized = normalizePath(filePath);

  return (
    normalized.includes("/public/") ||
    STATIC_EXTENSIONS.has(getExtension(normalized))
  );
}

function isConfigPath(filePath: string): boolean {
  const normalized = normalizePath(filePath);

  return CONFIG_FILE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isGeneratedPath(filePath: string): boolean {
  const normalized = normalizePath(filePath);

  return GENERATED_PATH_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isComponentLikePath(filePath: string): boolean {
  const normalized = normalizePath(filePath);

  return (
    normalized.includes("/components/") ||
    normalized.includes("/hooks/") ||
    normalized.includes("/utils/")
  );
}

type FrameworkEntrySignal = {
  kind: "framework";
  framework: string;
  reasons: string[];
  score: number;
};

function detectNextJsEntry(filePath: string): FrameworkEntrySignal | null {
  const normalized = normalizePath(filePath);

  const nextAppConvention =
    /(^|\/)app(?:\/[^/]+)*\/(page|layout|loading|error|not-found|global-error|template|default|route|sitemap|robots|manifest)\.(js|jsx|ts|tsx)$/i;

  if (nextAppConvention.test(normalized)) {
    return {
      kind: "framework",
      framework: "nextjs",
      reasons: ["nextjs framework entry", "nextjs app-router entry"],
      score: 100,
    };
  }

  const nextPagesConvention = /(^|\/)pages(?:\/.+)?\/[^/]+\.(js|jsx|ts|tsx)$/i;

  if (nextPagesConvention.test(normalized)) {
    return {
      kind: "framework",
      framework: "nextjs",
      reasons: ["nextjs framework entry", "nextjs app-router entry"],
      score: 100,
    };
  }

  const basename = normalized.split("/").pop() ?? "";

  if (
    (basename === "middleware.ts" ||
      basename === "middleware.js" ||
      basename === "middleware.mjs" ||
      basename === "instrumentation.ts" ||
      basename === "instrumentation.js") &&
    (normalized.split("/").length <= 3 || normalized.includes("/src/"))
  ) {
    return {
      kind: "framework",
      framework: "nextjs",
      reasons: ["nextjs framework entry", "nextjs app-router entry"],
      score: 100,
    };
  }

  return null;
}

const frameworkDetectors = [detectNextJsEntry];

function detectFrameworkEntry(filePath: string): FrameworkEntrySignal | null {
  if (!isExecutablePath(filePath)) {
    return null;
  }

  for (const detector of frameworkDetectors) {
    const result = detector(filePath);

    if (result) {
      return result;
    }
  }

  return null;
}

function looksLikeScriptPath(filePath: string): boolean {
  const normalized = normalizePath(filePath);

  return (
    /(^|\/)scripts\//i.test(normalized) ||
    /(^|\/)bin\//i.test(normalized) ||
    /(^|\/)cli\//i.test(normalized) ||
    /(^|\/)cli\.(js|ts|jsx|tsx|mjs|cjs)$/i.test(normalized)
  );
}

function analyzeExecutableEntrypoint(
  filePath: string,
  content: string,
): EntrypointAnalysis {
  let score = 0;
  const reasons: string[] = [];

  const normalized = normalizePath(filePath);
  const basename = normalized.split("/").pop() ?? "";

  const frameworkEntry = detectFrameworkEntry(filePath);

  if (frameworkEntry) {
    return {
      isLikelyEntry: true,
      score: frameworkEntry.score,
      reasons: frameworkEntry.reasons,
      kind: frameworkEntry.kind,
      framework: frameworkEntry.framework,
    };
  }

  const strongNames = new Set([
    "main.js",
    "main.jsx",
    "main.ts",
    "main.tsx",
    "server.js",
    "server.jsx",
    "server.ts",
    "server.tsx",
    "worker.js",
    "worker.ts",
    "cli.js",
    "cli.ts",
    "cli.mjs",
    "cli.cjs",
  ]);

  if (strongNames.has(basename)) {
    score += 30;
    reasons.push("strong filename");
  }

  const weakNames = new Set([
    "index.js",
    "index.jsx",
    "index.ts",
    "index.tsx",
    "app.js",
    "app.jsx",
    "app.ts",
    "app.tsx",
  ]);

  if (weakNames.has(basename)) {
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

  if (
    looksLikeScriptPath(filePath) &&
    (content.includes("process.argv") ||
      content.includes("commander") ||
      content.includes("yargs"))
  ) {
    score += 60;
    reasons.push("cli runtime");
  }

  if (isComponentLikePath(filePath)) {
    score -= 25;
    reasons.push("utility/component file");
  }

  if (content.split("\n").length < 5) {
    score -= 10;
  }

  if (score < 40) {
    return {
      isLikelyEntry: false,
      score,
      reasons,
      kind: "none",
    };
  }

  const kind = reasons.includes("cli runtime") ? "cli" : "runtime";

  return {
    isLikelyEntry: true,
    score,
    reasons,
    kind,
  };
}

export function analyzeEntrypoint(
  filePath: string,
  content: string,
): EntrypointAnalysis {
  if (isTestPath(filePath)) {
    return {
      isLikelyEntry: false,
      score: 0,
      reasons: [],
      kind: "none",
    };
  }

  if (!isExecutablePath(filePath)) {
    return {
      isLikelyEntry: false,
      score: 0,
      reasons: [],
      kind: "none",
    };
  }

  return analyzeExecutableEntrypoint(filePath, content);
}

export function classifyRepositoryFile(
  filePath: string,
  content = "",
): FileClassification {
  if (isTestPath(filePath)) {
    return {
      role: "test",
      entry: {
        isLikelyEntry: false,
        score: 0,
        reasons: [],
        kind: "none",
      },
    };
  }

  if (isDocumentationPath(filePath)) {
    return {
      role: "documentation",
      entry: {
        isLikelyEntry: false,
        score: 0,
        reasons: [],
        kind: "none",
      },
    };
  }

  if (isStaticPath(filePath)) {
    return {
      role: "static",
      entry: {
        isLikelyEntry: false,
        score: 0,
        reasons: [],
        kind: "none",
      },
    };
  }

  if (isGeneratedPath(filePath)) {
    return {
      role: "generated",
      entry: {
        isLikelyEntry: false,
        score: 0,
        reasons: ["generated path"],
        kind: "none",
      },
    };
  }

  if (isConfigPath(filePath)) {
    return {
      role: "config",
      entry: {
        isLikelyEntry: false,
        score: 0,
        reasons: ["configuration file"],
        kind: "none",
      },
    };
  }

  if (!isExecutablePath(filePath)) {
    return {
      role: "unknown",
      entry: {
        isLikelyEntry: false,
        score: 0,
        reasons: [],
        kind: "none",
      },
    };
  }

  const entry = analyzeEntrypoint(filePath, content);

  if (entry.isLikelyEntry) {
    return {
      role:
        entry.kind === "framework"
          ? "framework-entry"
          : entry.kind === "cli"
            ? "cli-entry"
            : "runtime-entry",
      entry,
    };
  }

  return {
    role: "source",
    entry,
  };
}

export function isDeadFileCandidateRole(role: FileRole): boolean {
  return role === "source";
}
