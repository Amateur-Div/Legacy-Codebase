export function injectFileDependencyEdges(
  merged: { mergedNodes: any[]; mergedEdges: any[] },
  fileTree: any[],
) {
  const { mergedNodes, mergedEdges } = merged;

  const fileRootMap = new Map<string, string>();
  const existingEdgeIds = new Set<string>(mergedEdges.map((e) => e.id));

  for (const n of mergedNodes) {
    if (n.type === "file" && n.file) {
      fileRootMap.set(normalizePath(n.file), n.id);
    }
  }

  const collect = (nodes: any[]) => {
    for (const node of nodes) {
      if (node.type === "file" && node.fullPath) {
        const fromPath = normalizePath(node.fullPath);
        const fromId = fileRootMap.get(fromPath);
        if (!fromId) continue;

        const imports = node.imports || [];

        for (const imp of imports) {
          const resolvedPath = resolveRelativeImport(fromPath, imp.name);
          if (!resolvedPath) continue;

          const toId = fileRootMap.get(resolvedPath);
          if (!toId) continue;

          const edgeId = `dep::${fromId}->${toId}`;

          if (!existingEdgeIds.has(edgeId)) {
            mergedEdges.push({
              id: edgeId,
              from: fromId,
              to: toId,
              label: "imports",
            });
            existingEdgeIds.add(edgeId);
          }
        }

        // 🔹 Keep broken import support if exists
        const broken = node.impact?.brokenImports || [];

        for (const b of broken) {
          const ghostId = `missing::${fromPath}::${b.source}`;

          if (!mergedNodes.find((n) => n.id === ghostId)) {
            mergedNodes.push({
              id: ghostId,
              type: "missing",
              name: b.source,
              file: fromPath,
              meta: { broken: true },
            });
          }

          const edgeId = `broken::${fromId}->${ghostId}`;

          if (!existingEdgeIds.has(edgeId)) {
            mergedEdges.push({
              id: edgeId,
              from: fromId,
              to: ghostId,
              label: "brokenImport",
            });
            existingEdgeIds.add(edgeId);
          }
        }
      }

      if (node.children) collect(node.children);
    }
  };

  collect(fileTree);

  return { mergedNodes, mergedEdges };
}

export function injectApiNodes(
  merged: { mergedNodes: any[]; mergedEdges: any[] },
  fileTree: any[],
) {
  const { mergedNodes, mergedEdges } = merged;

  const existingIds = new Set(mergedNodes.map((n) => n.id));

  const collect = (nodes: any[]) => {
    for (const node of nodes) {
      if (node.type === "file" && node.apis?.length) {
        const fileRootId = `file::${node.fullPath}`;

        for (const api of node.apis) {
          const apiId = `api::${api.method}::${api.path}`;

          if (!existingIds.has(apiId)) {
            mergedNodes.push({
              id: apiId,
              type: "api",
              name: `${api.method} ${api.path}`,
              file: node.fullPath,
              meta: {
                framework: api.framework,
                method: api.method,
                path: api.path,
              },
            });

            existingIds.add(apiId);
          }

          mergedEdges.push({
            id: `api-link::${fileRootId}->${apiId}`,
            from: fileRootId,
            to: apiId,
            label: "defines",
          });
        }
      }

      if (node.children) collect(node.children);
    }
  };

  collect(fileTree);

  return { mergedNodes, mergedEdges };
}

function normalizePath(p: string) {
  return p.replace(/\\/g, "/");
}

function resolveRelativeImport(
  fromFile: string,
  importPath: string,
): string | null {
  if (!importPath.startsWith(".")) return null;

  const path = require("path");
  const fs = require("fs");

  const baseDir = path.dirname(fromFile);
  const resolved = path.resolve(baseDir, importPath);

  const candidates = [
    resolved,
    `${resolved}.ts`,
    `${resolved}.tsx`,
    `${resolved}.js`,
    `${resolved}.jsx`,
    path.join(resolved, "index.ts"),
    path.join(resolved, "index.tsx"),
    path.join(resolved, "index.js"),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return normalizePath(c);
    }
  }

  return null;
}
