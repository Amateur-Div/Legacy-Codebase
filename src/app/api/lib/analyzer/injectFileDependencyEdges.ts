export function injectFileDependencyEdges(
  merged: { mergedNodes: any[]; mergedEdges: any[] },
  fileTree: any[]
) {
  const { mergedNodes, mergedEdges } = merged;

  const fileRootMap = new Map<string, string>();

  for (const n of mergedNodes) {
    if (n.type === "file" && n.file) {
      fileRootMap.set(n.file, n.id);
    }
  }

  const collect = (nodes: any[]) => {
    for (const node of nodes) {
      if (node.type === "file" && node.impact) {
        const from = fileRootMap.get(node.fullPath);
        if (!from) continue;

        for (const imp of node.impact.imports || []) {
          const to = fileRootMap.get(imp);
          if (!to) continue;

          mergedEdges.push({
            id: `${from}->${to}`,
            from,
            to,
            label: "imports",
          });
        }

        for (const b of node.impact.brokenImports || []) {
          const ghostId = `missing::${node.fullPath}::${b.source}`;

          if (!mergedNodes.find((n) => n.id === ghostId)) {
            mergedNodes.push({
              id: ghostId,
              type: "missing",
              name: b.source,
              file: node.fullPath,
              meta: { broken: true },
            });
          }

          mergedEdges.push({
            id: `${from}->${ghostId}`,
            from,
            to: ghostId,
            label: "brokenImport",
          });
        }
      }

      if (node.children) collect(node.children);
    }
  };

  collect(fileTree);

  return { mergedNodes, mergedEdges };
}
