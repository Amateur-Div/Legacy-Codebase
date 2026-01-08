import type { FlowEdge } from "./types";

export function styleGraphEdges(edges: FlowEdge[]): FlowEdge[] {
  return edges.map((e) => {
    if (e.label === "brokenImport") {
      return {
        ...e,
        animated: true,
        style: {
          stroke: "#f59e0b",
          strokeWidth: 2,
          strokeDasharray: "6 4",
        },
      };
    }

    if (e.label === "imports") {
      return {
        ...e,
        style: {
          stroke: "#6b7280",
          strokeWidth: 1.5,
        },
      };
    }

    return e;
  });
}
