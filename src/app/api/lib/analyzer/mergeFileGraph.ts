import { FlowGraph, FlowNode, FlowEdge } from "./types";
import path from "path";
import fs from "fs";

/**
 * IMPORTANT:
 * - This function MUST NOT mutate input graphs.
 * - Node / edge IDs are assumed to be non-normalized at this stage.
 * - normalizeGraphIds.ts MUST run immediately after this step.
 *
 * Semantics:
 * - Each file gets a synthetic "file root" node.
 * - No execution order is implied between files.
 * - Cross-file relationships are added later by injectFileDependencyEdges.ts
 */

export function mergeFileGraphs(
  fileGraphs: Array<{
    file: string;
    graph: FlowGraph;
  }>,
): FlowGraph {
  const mergedNodes: FlowNode[] = [];
  const mergedEdges: FlowEdge[] = [];

  for (const { file, graph } of fileGraphs) {
    const { nodes, edges } = graph;

    const fileRootId = `file::${file}`;

    const fileRootNode: FlowNode = {
      id: fileRootId,
      type: "file",
      name: file,
      file,
    };

    mergedNodes.push(fileRootNode);

    const incomingCount = new Map<string, number>();
    for (const e of edges) {
      incomingCount.set(e.to, (incomingCount.get(e.to) || 0) + 1);
    }

    for (const node of nodes) {
      mergedNodes.push(node);

      const isEntryNode = node.type !== "file" && !incomingCount.has(node.id);

      if (isEntryNode) {
        mergedEdges.push({
          id: `file-edge::${fileRootId}->${node.id}`,
          from: fileRootId,
          to: node.id,
          label: "contains",
        });
      }
    }

    for (const edge of edges) {
      mergedEdges.push(edge);
    }
  }

  return {
    nodes: mergedNodes,
    edges: mergedEdges,
  };
}
