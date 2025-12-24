import type { FlowGraph, FlowNode, FlowEdge } from "./types";

export function enrichGraphSemantics(graph: {
  mergedNodes: any[];
  mergedEdges: any[];
}) {
  const nodes = graph.mergedNodes.map(
    (n) => ({ ...n, semantic: { ...(n.semantic || {}) } } as FlowNode)
  );
  const edges = graph.mergedEdges.map((e) => ({ ...e } as FlowEdge));

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

  const entryPoints: string[] = [];
  for (const n of nodes) {
    if (n.type === "file") entryPoints.push(n.id);
    if (n.type === "function" && n.name) entryPoints.push(n.id);
  }

  const reachable = new Set<string>();
  const q: string[] = [...entryPoints];
  while (q.length) {
    const cur = q.shift()!;
    if (reachable.has(cur)) continue;
    reachable.add(cur);
    const neighbors = outAdj.get(cur) || [];
    for (const nb of neighbors) if (!reachable.has(nb)) q.push(nb);
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

    const matchesIf = (code.match(/if/g) || []).length;
    const matchesFor = (code.match(/for/g) || []).length;
    const matchesWhile = (code.match(/while/g) || []).length;
    const matchesSwitch = (code.match(/switch/g) || []).length;
    const matchesTry = (code.match(/try/g) || []).length;
    const matchesReturn = (code.match(/return/g) || []).length;
    c +=
      matchesIf * 1.5 +
      matchesFor * 1.4 +
      matchesWhile * 1.4 +
      matchesSwitch * 2 +
      matchesTry * 1.8 +
      Math.min(matchesReturn, 3) * 0.5;

    const nest = Math.max(
      0,
      (code.match(/\{/g) || []).length - (code.match(/\}/g) || []).length
    );
    c += Math.max(0, Math.min(5, nest)) * 0.6;
    return Math.max(1, Math.round(c));
  }

  for (const n of nodes) {
    const deg = degrees.get(n.id) || 0;
    const importance = maxDegree > 0 ? deg / maxDegree : 0;
    const complexity = estimateComplexity(n);
    const dead = !reachable.has(n.id);

    n.semantic = { ...(n.semantic || {}), importance, complexity, dead };

    (n as any).importanceScore = importance;
    (n as any).complexityScore = complexity;
    (n as any).deadCode = dead;
  }

  return { nodes, edges };
}
