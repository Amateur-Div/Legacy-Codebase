import type { FlowNode, FlowEdge, FlowGraph } from "./types";

function detectLayer(filePath: string): string {
  const p = filePath.toLowerCase();

  if (p.includes("/controller")) return "controller";
  if (p.includes("/route")) return "controller";
  if (p.includes("/service")) return "service";
  if (p.includes("/repository")) return "repository";
  if (p.includes("/model")) return "model";
  if (p.includes("/schema")) return "model";
  if (p.includes("/util")) return "utility";
  if (p.includes("/helper")) return "utility";
  if (p.includes("/lib")) return "library";

  return "module";
}

export function enrichGraphSemantics(graph: FlowGraph): FlowGraph {
  const mergedNodes = graph.nodes;
  const mergedEdges = graph.edges;

  const nodes = mergedNodes.map(
    (n) => ({ ...n, semantic: { ...(n.semantic || {}) } }) as FlowNode,
  );

  const edges = mergedEdges.map((e) => ({ ...e }) as FlowEdge);

  const outAdj = new Map<string, string[]>();
  const inAdj = new Map<string, string[]>();

  for (const n of nodes) {
    outAdj.set(n.id, []);
    inAdj.set(n.id, []);
  }

  for (const e of edges) {
    if (!outAdj.has(e.from)) outAdj.set(e.from, []);
    if (!inAdj.has(e.to)) inAdj.set(e.to, []);

    outAdj.get(e.from)!.push(e.to);
    inAdj.get(e.to)!.push(e.from);
  }

  for (const node of nodes) {
    if (node.type !== "file") continue;

    const filePath = node.file || node.name || "";
    const layer = detectLayer(filePath);

    node.meta = {
      ...(node.meta || {}),
      layer,
    };
  }

  let maxDegree = 0;
  const degrees = new Map<string, number>();

  for (const n of nodes) {
    const deg =
      (inAdj.get(n.id) || []).length + (outAdj.get(n.id) || []).length;

    degrees.set(n.id, deg);
    if (deg > maxDegree) maxDegree = deg;
  }

  function estimateComplexity(n: FlowNode) {
    if (!n.code) return 1;

    const code = n.code;
    let c = 1;

    const matchesIf = (code.match(/\bif\b/g) || []).length;
    const matchesFor = (code.match(/\bfor\b/g) || []).length;
    const matchesWhile = (code.match(/\bwhile\b/g) || []).length;
    const matchesSwitch = (code.match(/\bswitch\b/g) || []).length;
    const matchesTry = (code.match(/\btry\b/g) || []).length;
    const matchesReturn = (code.match(/\breturn\b/g) || []).length;

    c +=
      matchesIf * 1.5 +
      matchesFor * 1.4 +
      matchesWhile * 1.4 +
      matchesSwitch * 2 +
      matchesTry * 1.8 +
      Math.min(matchesReturn, 3) * 0.5;

    const nest = Math.max(
      0,
      (code.match(/{/g) || []).length - (code.match(/}/g) || []).length,
    );

    c += Math.max(0, Math.min(5, nest)) * 0.6;

    return Math.max(1, Math.round(c));
  }

  for (const n of nodes) {
    const deg = degrees.get(n.id) || 0;

    const importance = maxDegree > 0 ? deg / maxDegree : 0;

    const complexity = estimateComplexity(n);

    n.semantic = {
      ...(n.semantic || {}),
      importance,
      complexity,
    };

    (n as any).importanceScore = importance;
    (n as any).complexityScore = complexity;
  }

  const enrichedGraph: FlowGraph = {
    nodes,
    edges,
    meta: {
      ...(graph.meta || {}),
    },
  };

  return enrichedGraph;
}
