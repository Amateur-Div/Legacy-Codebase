import { describe, expect, it } from "vitest";
import { resolveModule } from "../../buildCrossFileImpactMap";

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

  it("resolves an explicitly specified .ts extension", () => {
    const result = resolveModule(
      "repo/src/page.tsx",
      "./foo.ts",
      fileLookup,
      repoRoot,
      baseUrlResolverConfig,
    );

    expect(result).toEqual({
      kind: "internal",
      path: "repo/src/foo.ts",
      source: "./foo.ts",
    });
  });

  it("resolves an explicitly specified .tsx extension", () => {
    const result = resolveModule(
      "repo/src/page.tsx",
      "./bar.tsx",
      fileLookup,
      repoRoot,
      baseUrlResolverConfig,
    );

    expect(result).toEqual({
      kind: "internal",
      path: "repo/src/bar.tsx",
      source: "./bar.tsx",
    });
  });

  it("resolves an explicitly specified .js extension", () => {
    const result = resolveModule(
      "repo/src/page.tsx",
      "../lib/helper.js",
      fileLookup,
      repoRoot,
      baseUrlResolverConfig,
    );

    expect(result).toEqual({
      kind: "internal",
      path: "repo/lib/helper.js",
      source: "../lib/helper.js",
    });
  });

  it("resolves an explicitly specified .jsx extension", () => {
    const result = resolveModule(
      "repo/src/page.tsx",
      "../components/Card/index.jsx",
      fileLookup,
      repoRoot,
      baseUrlResolverConfig,
    );

    expect(result).toEqual({
      kind: "internal",
      path: "repo/components/Card/index.jsx",
      source: "../components/Card/index.jsx",
    });
  });

  it("does not replace an explicit .ts extension with another source extension", () => {
    const lookup = new Map<string, string>([
      ["repo/src/foo.tsx", "repo/src/foo.tsx"],
    ]);

    const result = resolveModule(
      "repo/src/page.tsx",
      "./foo.ts",
      lookup,
      repoRoot,
      baseUrlResolverConfig,
    );

    expect(result).toEqual({
      kind: "unresolved",
      source: "./foo.ts",
    });
  });

  it("resolves a path alias", () => {
    const resolverConfig = {
      baseUrl: ".",
      paths: [
        {
          pattern: "@/*",
          targets: ["src/*"],
        },
      ],
    };

    const result = resolveModule(
      "repo/src/page.tsx",
      "@/foo",
      fileLookup,
      repoRoot,
      resolverConfig,
    );

    expect(result).toEqual({
      kind: "internal",
      path: "repo/src/foo.ts",
      source: "@/foo",
    });
  });

  it("resolves a path alias to an index file", () => {
    const resolverConfig = {
      baseUrl: ".",
      paths: [
        {
          pattern: "@components/*",
          targets: ["src/components/*"],
        },
      ],
    };

    const lookup = new Map<string, string>([
      [
        "repo/src/components/Button/index.ts",
        "repo/src/components/Button/index.ts",
      ],
    ]);

    const result = resolveModule(
      "repo/src/page.tsx",
      "@components/Button",
      lookup,
      repoRoot,
      resolverConfig,
    );

    expect(result).toEqual({
      kind: "internal",
      path: "repo/src/components/Button/index.ts",
      source: "@components/Button",
    });
  });

  it("tries multiple path alias targets in order", () => {
    const resolverConfig = {
      baseUrl: ".",
      paths: [
        {
          pattern: "@shared/*",
          targets: ["src/shared/*", "generated/shared/*"],
        },
      ],
    };

    const lookup = new Map<string, string>([
      ["repo/generated/shared/foo.ts", "repo/generated/shared/foo.ts"],
    ]);

    const result = resolveModule(
      "repo/src/page.tsx",
      "@shared/foo",
      lookup,
      repoRoot,
      resolverConfig,
    );

    expect(result).toEqual({
      kind: "internal",
      path: "repo/generated/shared/foo.ts",
      source: "@shared/foo",
    });
  });

  it("prefers the first matching path alias target", () => {
    const resolverConfig = {
      baseUrl: ".",
      paths: [
        {
          pattern: "@shared/*",
          targets: ["src/shared/*", "generated/shared/*"],
        },
      ],
    };

    const lookup = new Map<string, string>([
      ["repo/src/shared/foo.ts", "repo/src/shared/foo.ts"],
      ["repo/generated/shared/foo.ts", "repo/generated/shared/foo.ts"],
    ]);

    const result = resolveModule(
      "repo/src/page.tsx",
      "@shared/foo",
      lookup,
      repoRoot,
      resolverConfig,
    );

    expect(result).toEqual({
      kind: "internal",
      path: "repo/src/shared/foo.ts",
      source: "@shared/foo",
    });
  });

  it("returns unresolved when a path alias matches but none of its targets resolve", () => {
    const resolverConfig = {
      baseUrl: ".",
      paths: [
        {
          pattern: "@shared/*",
          targets: ["src/shared/*", "generated/shared/*"],
        },
      ],
    };

    const result = resolveModule(
      "repo/src/page.tsx",
      "@shared/missing",
      fileLookup,
      repoRoot,
      resolverConfig,
    );

    expect(result).toEqual({
      kind: "unresolved",
      source: "@shared/missing",
    });
  });

  it("resolves a path alias without a wildcard", () => {
    const resolverConfig = {
      baseUrl: ".",
      paths: [
        {
          pattern: "@config",
          targets: ["src/config/index.ts"],
        },
      ],
    };

    const lookup = new Map<string, string>([
      ["repo/src/config/index.ts", "repo/src/config/index.ts"],
    ]);

    const result = resolveModule(
      "repo/src/page.tsx",
      "@config",
      lookup,
      repoRoot,
      resolverConfig,
    );

    expect(result).toEqual({
      kind: "internal",
      path: "repo/src/config/index.ts",
      source: "@config",
    });
  });

  it("does not partially match a wildcard path alias", () => {
    const resolverConfig = {
      baseUrl: ".",
      paths: [
        {
          pattern: "@/*",
          targets: ["src/*"],
        },
      ],
    };

    const lookup = new Map<string, string>([
      ["repo/src/foo.ts", "repo/src/foo.ts"],
    ]);

    const result = resolveModule(
      "repo/src/page.tsx",
      "@foo",
      lookup,
      repoRoot,
      resolverConfig,
    );

    expect(result).toEqual({
      kind: "external",
      source: "@foo",
    });
  });

  it("resolves a nested path through a wildcard alias", () => {
    const resolverConfig = {
      baseUrl: ".",
      paths: [
        {
          pattern: "@features/*",
          targets: ["src/features/*"],
        },
      ],
    };

    const lookup = new Map<string, string>([
      ["repo/src/features/auth/login.ts", "repo/src/features/auth/login.ts"],
    ]);

    const result = resolveModule(
      "repo/src/page.tsx",
      "@features/auth/login",
      lookup,
      repoRoot,
      resolverConfig,
    );

    expect(result).toEqual({
      kind: "internal",
      path: "repo/src/features/auth/login.ts",
      source: "@features/auth/login",
    });
  });

  it("does not append alternate extensions to an alias target with an explicit extension", () => {
    const resolverConfig = {
      baseUrl: ".",
      paths: [
        {
          pattern: "@config",
          targets: ["src/config.ts"],
        },
      ],
    };

    const lookup = new Map<string, string>([
      ["repo/src/config.tsx", "repo/src/config.tsx"],
    ]);

    const result = resolveModule(
      "repo/src/page.tsx",
      "@config",
      lookup,
      repoRoot,
      resolverConfig,
    );

    expect(result).toEqual({
      kind: "unresolved",
      source: "@config",
    });
  });
});
