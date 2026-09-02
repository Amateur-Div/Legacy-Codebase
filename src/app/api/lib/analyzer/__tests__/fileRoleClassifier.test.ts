import { describe, expect, it } from "vitest";
import {
  analyzeEntrypoint,
  classifyRepositoryFile,
} from "../fileRoleClassifier";

describe("classifyRepositoryFile", () => {
  it("does not classify markdown containing listener text as an entry", () => {
    const result = classifyRepositoryFile(
      "docs/example.md",
      "app.listen(3000)",
    );

    expect(result.role).toBe("documentation");
    expect(result.entry.isLikelyEntry).toBe(false);
  });

  it("does not classify lockfiles as executable entries", () => {
    const result = classifyRepositoryFile(
      "pnpm-lock.yaml",
      "process.argv commander",
    );

    expect(result.role).toBe("config");
    expect(result.entry.isLikelyEntry).toBe(false);
  });

  it("detects nested Next.js App Router entries", () => {
    const result = classifyRepositoryFile(
      "src/app/(storefront)/[locale]/[channel]/products/page.tsx",
      "export default function Page() {}",
    );

    expect(result.role).toBe("framework-entry");
    expect(result.entry.isLikelyEntry).toBe(true);
    expect(result.entry.kind).toBe("framework");
    expect(result.entry.framework).toBe("nextjs");
  });

  it("detects Next.js route handlers", () => {
    const result = classifyRepositoryFile(
      "src/app/api/auth/login/route.ts",
      "export async function POST() {}",
    );

    expect(result.role).toBe("framework-entry");
    expect(result.entry.isLikelyEntry).toBe(true);
  });

  it("detects a React bootstrap as runtime entry", () => {
    const result = classifyRepositoryFile(
      "src/main.tsx",
      "createRoot(document.getElementById('root')!).render(<App />)",
    );

    expect(result.role).toBe("runtime-entry");
    expect(result.entry.kind).toBe("runtime");
    expect(result.entry.isLikelyEntry).toBe(true);
  });

  it("detects a CLI only in script-like paths", () => {
    const result = classifyRepositoryFile(
      "scripts/generate.mjs",
      "process.argv.slice(2)",
    );

    expect(result.role).toBe("cli-entry");
    expect(result.entry.kind).toBe("cli");
    expect(result.entry.isLikelyEntry).toBe(true);
  });

  it("does not turn an arbitrary source helper into a CLI entry", () => {
    const result = classifyRepositoryFile(
      "src/lib/process-helper.ts",
      "const args = process.argv;",
    );

    expect(result.role).toBe("source");
    expect(result.entry.isLikelyEntry).toBe(false);
  });

  it("does not classify an ordinary component as an entry", () => {
    const result = classifyRepositoryFile(
      "src/components/ProductCard.tsx",
      "export function ProductCard() {}",
    );

    expect(result.role).toBe("source");
    expect(result.entry.isLikelyEntry).toBe(false);
  });
});

describe("analyzeEntrypoint", () => {
  it("returns a stable non-entry result for unsupported files", () => {
    expect(analyzeEntrypoint("README.md", "createServer()")).toEqual({
      isLikelyEntry: false,
      score: 0,
      reasons: [],
      kind: "none",
    });
  });
});
