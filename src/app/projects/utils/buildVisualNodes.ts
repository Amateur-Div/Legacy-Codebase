import { Node } from "reactflow";

interface BuildVisualNodesProps {
  nodes: Node[];
  heatmapMode: "none" | "complexity" | "importance";
  filterType: string | null;
  selectedNode: Node | null;
  highlightedNodes: Set<string> | null;
  graphScope: "file" | "global";
  hideDeadCode: boolean;
  functionFocusedNodes: Set<string> | null;
  maxFileImportance: number;
  circularSet: Set<string>;
  normalizeType: (type: string) => string;
  colorBySemantic: (node: any) => string;
}

export function buildVisualNodes({
  nodes,
  heatmapMode,
  filterType,
  selectedNode,
  highlightedNodes,
  graphScope,
  hideDeadCode,
  functionFocusedNodes,
  maxFileImportance,
  circularSet,
  normalizeType,
  colorBySemantic,
}: BuildVisualNodesProps): Node[] {
  return nodes.map((n) => {
    const raw = n.data.raw;

    const matchesFilter =
      !filterType || normalizeType(raw?.type) === filterType;

    const isHighlighted = !selectedNode || highlightedNodes?.has(n.id);

    const isFocused = selectedNode?.id === n.id;

    const isDead = raw?.semantic?.dead == true;

    const fadedByDead = hideDeadCode && isDead;

    const fadedByFunctionFocus =
      functionFocusedNodes && !functionFocusedNodes.has(n.id);

    let label: string;

    let color: string = colorBySemantic(raw);

    if (graphScope == "global" && raw.type === "file") {
      const name = raw.name?.split("/").pop() ?? "File";

      label = `📄 File: ${name}`;

      const importance = raw.importanceScore ?? 0;

      if (importance > 5) {
        color = "#ef4444";
      } else if (importance > 2) {
        color = "#f59e0b";
      } else {
        color = "#22c55e";
      }
    } else if (raw?.type === "root") {
      label = "🔷 Execution Root";
    } else if (raw?.type === "function") {
      label = `🟢 Function: ${raw.name ?? "anonymous"}`;
    } else {
      label = (raw?.code ?? raw?.name ?? raw?.type ?? "")
        .toString()
        .slice(0, 60);
    }

    if (
      graphScope === "global" &&
      heatmapMode === "none" &&
      raw.type === "file"
    ) {
      const imp = raw.importanceScore ?? 0;

      const ratio = maxFileImportance > 0 ? imp / maxFileImportance : 0;

      if (ratio > 0.75) {
        color = "#ef4444";
      } else if (ratio > 0.4) {
        color = "#f59e0b";
      } else if (ratio > 0.15) {
        color = "#22c55e";
      } else {
        color = "#94a3b8";
      }
    }

    const isDeadFile =
      graphScope === "global" && raw.type === "file" && raw.deadCode;

    const architectureDeadOpacity = isDeadFile ? 0.1 : 1;

    const isInCycle =
      graphScope === "global" && raw.type === "file" && circularSet.has(raw.id);

    return {
      ...n,
      data: {
        ...n.data,
        label,
        color,
        border: isInCycle ? "3px solid #7c3aed" : "1px solid #ccc",
        fadedByFilter: !matchesFilter,
        fadedByHighlight: !isHighlighted,
        fadedByDead,
        fadedByFunctionFocus,
        focused: isFocused,
        architectureDeadOpacity,
      },
    };
  });
}
