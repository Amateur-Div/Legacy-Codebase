import path from "path";

type ForwardImpact = {
  imports: string[];
  brokenImports: { source: string }[];
};

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
                (imp: string) =>
                  typeof imp === "string" &&
                  (imp.startsWith("./") || imp.startsWith("../"))
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

  const resolveImport = (importer: string, imp: string): string | null => {
    if (!imp.startsWith(".")) return null;

    const importerDir = path.posix.dirname(importer);
    const candidate = path.posix.normalize(path.posix.join(importerDir, imp));

    return (
      fileLookup.get(candidate) ||
      fileLookup.get(candidate.replace(/\.(js|jsx|ts|tsx)$/, "")) ||
      null
    );
  };

  for (const { relPath, imports } of files) {
    const resolvedImports: string[] = [];
    const brokenImports: { source: string }[] = [];

    for (const imp of imports) {
      const resolved = resolveImport(relPath, imp);

      if (!resolved) {
        brokenImports.push({ source: imp });
        continue;
      }

      if (resolved === relPath) continue;

      if (!resolvedImports.includes(resolved)) {
        resolvedImports.push(resolved);
      }

      if (!reverseMap[resolved]) reverseMap[resolved] = [];
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
    }`
  );

  return fileTree;
}
