import { FlowEdge, FlowGraph } from "../analyzer/types";

export function patchGraphOnFileRename(
  graph: FlowGraph,
  oldPath: string,
  newPath: string
): FlowGraph {
  const oldFileName = oldPath.split("/").pop();
  const newFileName = newPath.split("/").pop();

  const nodes = graph.nodes.map((n) => {
    if (n.type === "file" && n.name === oldPath) {
      return {
        ...n,
        name: newPath,
        file: newPath,
      };
    }

    if (n.file === oldPath) {
      return {
        ...n,
        file: newPath,
        name:
          typeof n.name === "string" && n.name.includes(oldFileName!)
            ? n.name.replace(oldFileName!, newFileName!)
            : n.name,
      };
    }

    return n;
  });

  return {
    ...graph,
    nodes,
  };
}
export function patchGraphOnFileDelete(
  graph: FlowGraph,
  deletedPath: string
): FlowGraph {
  const deletedFile = deletedPath;
  const deletedFileId = `file::${deletedFile}`;

  const removedNodeIds = new Set(
    graph.nodes
      .filter((n) => n.id === deletedFileId || n.file === deletedPath)
      .map((n) => n.id)
  );

  const nodes = [...graph.nodes];
  const edges: FlowEdge[] = [];

  for (const e of graph.edges) {
    if (removedNodeIds.has(e.from)) continue;

    if (removedNodeIds.has(e.to)) {
      const ghostId = `missing::${deletedPath}`;

      if (!nodes.find((n) => n.id === ghostId)) {
        nodes.push({
          id: ghostId,
          type: "missing",
          name: deletedPath,
          meta: { broken: true },
        });
      }

      edges.push({
        ...e,
        to: ghostId,
        label: "brokenImport",
        id: `${e.from}->${ghostId}`,
      });

      continue;
    }

    edges.push(e);
  }

  const filteredNodes = nodes.filter((n) => !removedNodeIds.has(n.id));

  return {
    ...graph,
    nodes: filteredNodes,
    edges,
  };
}
