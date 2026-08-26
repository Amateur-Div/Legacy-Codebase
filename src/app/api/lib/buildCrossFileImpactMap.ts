import path from "path";

type ForwardImpact = {
  imports: string[];
  brokenImports: { source: string }[];
};

export type ModuleResolution =
  | {
      kind: "internal";
      path: string;
      source: string;
    }
  | {
      kind: "external";
      source: string;
    }
  | {
      kind: "unresolved";
      source: string;
    };

export function resolveModule(
  importer: string,
  specifier: string,
  fileLookup: Map<string, string>,
  repoRoot: string,
): ModuleResolution {
  const importerDir = path.posix.dirname(importer);

  const candidate = specifier.startsWith(".")
    ? path.posix.normalize(path.posix.join(importerDir, specifier))
    : path.posix.normalize(path.posix.join(repoRoot, specifier));

  const direct = fileLookup.get(candidate);

  if (direct) {
    return {
      kind: "internal",
      path: direct,
      source: specifier,
    };
  }

  const extensionless = candidate.replace(/\.(js|jsx|ts|tsx)$/, "");

  const withoutExtension = fileLookup.get(extensionless);

  if (withoutExtension) {
    return {
      kind: "internal",
      path: withoutExtension,
      source: specifier,
    };
  }

  const indexCandidates = [
    `${candidate}/index.ts`,
    `${candidate}/index.tsx`,
    `${candidate}/index.js`,
    `${candidate}/index.jsx`,
  ];

  for (const indexCandidate of indexCandidates) {
    const resolvedIndex = fileLookup.get(indexCandidate);

    if (resolvedIndex) {
      return {
        kind: "internal",
        path: resolvedIndex,
        source: specifier,
      };
    }
  }

  if (!specifier.startsWith(".")) {
    return {
      kind: "external",
      source: specifier,
    };
  }

  return {
    kind: "unresolved",
    source: specifier,
  };
}

export function attachCrossFileImpact(fileTree: any[]) {
  const files: {
    relPath: string;
    imports: string[];
    nodeRef: any;
  }[] = [];

  const collect = (nodes: any[]) => {
    for (const node of nodes) {
      if (!node) continue;
      if (node.type === "file") {
        const imports = Array.isArray(node.imports)
          ? node.imports
              .map((i: any) => (typeof i === "string" ? i : i?.name))
              .filter(
                (imp: string) => typeof imp === "string" && imp.length > 0,
              )
          : [];
        files.push({
          relPath: node.fullPath,
          imports,
          nodeRef: node,
        });
      } else if (Array.isArray(node.children)) {
        collect(node.children);
      }
    }
  };
  collect(fileTree);

  const repoRoot = files.length ? files[0].relPath.split("/")[0] : "";

  const fileLookup = new Map<string, string>();

  for (const f of files) {
    const noExt = f.relPath.replace(/\.(js|jsx|ts|tsx)$/, "");
    fileLookup.set(noExt, f.relPath);
    fileLookup.set(f.relPath, f.relPath);

    if (f.relPath.endsWith("/index.ts") || f.relPath.endsWith("/index.tsx")) {
      const dir = f.relPath.replace(/\/index\.(ts|tsx)$/, "");
      fileLookup.set(dir, f.relPath);
    }
  }

  const forwardMap: Record<string, ForwardImpact> = {};
  const reverseMap: Record<string, string[]> = {};

  for (const { relPath, imports } of files) {
    const resolvedImports: string[] = [];
    const brokenImports: { source: string }[] = [];

    for (const imp of imports) {
      const resolution = resolveModule(relPath, imp, fileLookup, repoRoot);

      if (resolution.kind === "external") {
        continue;
      }

      if (resolution.kind === "unresolved") {
        brokenImports.push({
          source: imp,
        });
        continue;
      }

      const resolved = resolution.path;

      if (!resolved || resolved === relPath) {
        continue;
      }

      if (!resolvedImports.includes(resolved)) {
        resolvedImports.push(resolved);
      }

      if (!reverseMap[resolved]) {
        reverseMap[resolved] = [];
      }

      if (!reverseMap[resolved].includes(relPath)) {
        reverseMap[resolved].push(relPath);
      }
    }

    forwardMap[relPath] = {
      imports: resolvedImports,
      brokenImports,
    };
  }

  for (const { relPath, nodeRef } of files) {
    nodeRef.impact = {
      imports: forwardMap[relPath]?.imports || [],
      usedBy: reverseMap[relPath] || [],
      brokenImports: forwardMap[relPath]?.brokenImports || [],
    };
  }

  console.log(
    `[impact] attached forward=${Object.keys(forwardMap).length}, reverse=${
      Object.keys(reverseMap).length
    }`,
  );

  return fileTree;
}
