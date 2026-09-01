import { describe, expect, it } from "vitest";
import { resolveModule } from "../app/api/lib/buildCrossFileImpactMap";

const repoRoot = "repo";

const baseUrlResolverConfig = {
  baseUrl: ".",
  paths: [],
};

const fileLookup = new Map<string, string>([
  ["repo/src/foo.ts", "repo/src/foo.ts"],
  ["repo/src/foo", "repo/src/foo.ts"],

  ["repo/src/bar.tsx", "repo/src/bar.tsx"],
  ["repo/src/bar", "repo/src/bar.tsx"],

  ["repo/utils/bem.ts", "repo/utils/bem.ts"],
  ["repo/utils/bem", "repo/utils/bem.ts"],

  ["repo/components/Button/index.ts", "repo/components/Button/index.ts"],
  ["repo/components/Button/index", "repo/components/Button/index.ts"],

  ["repo/lib/helper.js", "repo/lib/helper.js"],
  ["repo/lib/helper", "repo/lib/helper.js"],

  ["repo/components/Card/index.jsx", "repo/components/Card/index.jsx"],
  ["repo/components/Card/index", "repo/components/Card/index.jsx"],
]);

describe("resolveModule", () => {
  it("resolves a relative TypeScript import", () => {
    const result = resolveModule(
      "repo/src/page.tsx",
      "./foo",
      fileLookup,
      repoRoot,
      baseUrlResolverConfig,
    );

    expect(result).toEqual({
      kind: "internal",
      path: "repo/src/foo.ts",
      source: "./foo",
    });
  });

  it("resolves a parent-relative import", () => {
    const result = resolveModule(
      "repo/src/page.tsx",
      "../utils/bem",
      fileLookup,
      repoRoot,
      baseUrlResolverConfig,
    );

    expect(result).toEqual({
      kind: "internal",
      path: "repo/utils/bem.ts",
      source: "../utils/bem",
    });
  });

  it("resolves a baseUrl root import", () => {
    const result = resolveModule(
      "repo/src/page.tsx",
      "utils/bem",
      fileLookup,
      repoRoot,
      baseUrlResolverConfig,
    );

    expect(result).toEqual({
      kind: "internal",
      path: "repo/utils/bem.ts",
      source: "utils/bem",
    });
  });

  it("resolves a directory import to index.ts", () => {
    const result = resolveModule(
      "repo/src/page.tsx",
      "components/Button",
      fileLookup,
      repoRoot,
      baseUrlResolverConfig,
    );

    expect(result).toEqual({
      kind: "internal",
      path: "repo/components/Button/index.ts",
      source: "components/Button",
    });
  });

  it("resolves a directory import to index.jsx", () => {
    const result = resolveModule(
      "repo/src/page.tsx",
      "components/Card",
      fileLookup,
      repoRoot,
      baseUrlResolverConfig,
    );

    expect(result).toEqual({
      kind: "internal",
      path: "repo/components/Card/index.jsx",
      source: "components/Card",
    });
  });

  it("classifies an external package as external", () => {
    const result = resolveModule(
      "repo/src/page.tsx",
      "react",
      fileLookup,
      repoRoot,
      baseUrlResolverConfig,
    );

    expect(result).toEqual({
      kind: "external",
      source: "react",
    });
  });

  it("classifies a missing relative import as unresolved", () => {
    const result = resolveModule(
      "repo/src/page.tsx",
      "./does-not-exist",
      fileLookup,
      repoRoot,
      baseUrlResolverConfig,
    );

    expect(result).toEqual({
      kind: "unresolved",
      source: "./does-not-exist",
    });
  });
});
