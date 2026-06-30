export function collectSubgraph(start: string, adj: Map<string, string[]>) {
  const visited = new Set<string>();
  const queue = [start];

  while (queue.length) {
    const cur = queue.shift()!;
    if (visited.has(cur)) continue;
    visited.add(cur);

    for (const next of adj.get(cur) || []) {
      queue.push(next);
    }
  }

  return visited;
}

export function collectReachable(start: string, adj: Map<string, string[]>) {
  const visited = new Set<string>();
  const q = [start];

  while (q.length) {
    const cur = q.shift()!;
    if (visited.has(cur)) continue;
    visited.add(cur);

    for (const next of adj.get(cur) || []) {
      if (!visited.has(next)) q.push(next);
    }
  }

  return visited;
}

export function normalizePath(p?: string) {
  if (!p) return null;
  return p.replace(/^\/+/, "").replace(/\\/g, "/");
}

export function normalizeType(type?: string) {
  if (!type) return "statement";
  const t = type.toLowerCase();

  if (t.includes("function")) return "function";
  if (t.includes("if")) return "if";
  if (t.includes("loop") || t.includes("for") || t.includes("while"))
    return "loop";
  if (t.includes("switch") || t.includes("case")) return "if";
  if (t.includes("return")) return "statement";
  return t;
}
