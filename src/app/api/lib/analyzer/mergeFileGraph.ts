export type FileGraphs = {
  file: string;
  graph: { nodes: any[]; edges: any[] };
}[];

export function mergeFileGraphs(fileGraphs: FileGraphs) {
  let mergedNodes: any[] = [];
  let mergedEdges: any[] = [];

  for (const graphs of fileGraphs) {
    const { file, graph } = graphs;
    const { nodes, edges } = graph;

    const fileRootId = `file::${file}`;
    nodes.push({ id: fileRootId, type: "file", name: file, file });

    for (const n of nodes) {
      mergedNodes.push(n);
    }
    for (const e of edges) {
      mergedEdges.push(e);
    }

    for (const n of graph.nodes) {
      mergedEdges.push({
        id: `${fileRootId}->${n.id}`,
        from: fileRootId,
        to: n.id,
        label: "belongsTo",
      });
    }
  }

  return { mergedNodes, mergedEdges };
}
