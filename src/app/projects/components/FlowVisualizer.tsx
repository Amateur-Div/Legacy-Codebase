import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Position,
  MarkerType,
  Node,
  Edge,
  NodeTypes,
  OnInit,
  ReactFlowInstance,
  Handle,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";
import { getAuth } from "firebase/auth";
import { useProjectPresence } from "../context/ProjectPresenceContext";
import { FlowGraph } from "@/app/api/lib/analyzer/types";

type GraphMode = "full" | "disabled";

interface Props {
  graphData: FlowGraph;
  selectedFileNode: any;
  setGraphData: (graphData: {
    nodes: any[];
    edges: any[];
    meta: {
      nodeCount: number;
      edgeCount: number;
      mode: string | null;
      generatedAt: Date;
    };
  }) => void;
  projectId: any;
  id: any;
  project: any;
}

const NODE_W = 240;
const NODE_H = 70;

const tooltipEl =
  document.getElementById("flow-tooltip") ||
  (() => {
    const el = document.createElement("div");
    el.id = "flow-tooltip";
    el.style.position = "fixed";
    el.style.zIndex = "99999";
    el.style.pointerEvents = "none";
    el.style.background = "rgba(0,0,0,0.85)";
    el.style.color = "#fff";
    el.style.padding = "6px 8px";
    el.style.borderRadius = "6px";
    el.style.fontSize = "11px";
    el.style.maxWidth = "480px";
    el.style.whiteSpace = "pre-wrap";
    el.style.display = "none";
    document.body.appendChild(el);
    return el;
  })();

const getDagreGraph = (nodes: Node[], edges: Edge[], direction = "TB") => {
  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 90 });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => {
    if (e.source && e.target) g.setEdge(e.source as string, e.target as string);
  });

  dagre.layout(g);
  return g;
};

const typeColors: Record<string, string> = {
  root: "#F3F4F6",
  function: "#A7F3D0",
  "fn-entry": "#C7D2FE",
  if: "#FCA5A5",
  "if-true": "#FDE68A",
  "if-false": "#FDE68A",
  loop: "#93C5FD",
  "loop-body": "#BFDBFE",
  "after-loop": "#E0E7FF",
  statement: "#E5E7EB",
  error: "#F87171",
  trycatch: "#E9D5FF",
};

const baseNodeStyle: React.CSSProperties = {
  borderRadius: 12,
  padding: "8px 10px",
  fontSize: 12,
  color: "#111827",
  textAlign: "left",
  border: "1px solid #ccc",
  boxShadow: "0 3px 6px rgba(0,0,0,0.08)",
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  display: "flex",
  alignItems: "center",
  transition: "all 0.25s ease",
};

const style = document.createElement("style");
style.innerHTML = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(style);

const CustomNode = ({ data }: any) => {
  const nodeRef = useRef<HTMLDivElement | null>(null);

  const filterOpacity = data?.fadedByFilter ? 0.15 : 1;
  const highlightOpacity = data?.fadedByHighlight ? 0.08 : 1;

  const deadOpacity = data?.fadedByDead ? 0.05 : 1;
  const functionFocusOpacity = data?.fadedByFunctionFocus ? 0.05 : 1;
  const architectureOpacity = data?.architectureDeadOpacity ?? 1;

  const finalOpacity = Math.min(
    filterOpacity,
    highlightOpacity,
    deadOpacity,
    functionFocusOpacity,
    architectureOpacity,
  );

  const isDead = data?.fadedByDead;
  const showTooltip = () => {
    if (!nodeRef.current) return;
    const rect = nodeRef.current.getBoundingClientRect();
    tooltipEl.textContent =
      (data?.raw?.code ?? "No code") +
      (data?.fadedByDead ? "\n⚠ Dead / unreachable code" : "");
    tooltipEl.style.left = `${rect.left + rect.width / 2}px`;
    tooltipEl.style.top = `${rect.bottom + 6}px`;
    tooltipEl.style.transform = "translateX(-50%)";
    tooltipEl.style.display = "block";
  };

  const hideTooltip = () => {
    setTimeout(() => {
      tooltipEl.style.display = "none";
    }, 600);
  };

  return (
    <div
      ref={nodeRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      style={{
        ...baseNodeStyle,
        background: data?.color || "#fff",
        width: NODE_W - 24,
        height: NODE_H - 24,
        opacity: finalOpacity,
        border: isDead ? "1px dashed #9CA3AF" : "1px solid #ccc",
        transform: data?.focused ? "scale(1.08)" : "scale(1)",
        boxShadow: data?.focused
          ? "0 0 0 3px rgba(59,130,246,0.6)"
          : "0 3px 6px rgba(0,0,0,0.08)",
        cursor: data?.fadedByFilter ? "not-allowed" : "default",
        pointerEvents: data?.fadedByFilter ? "none" : "auto",
      }}
      onMouseOver={(e) =>
        (e.currentTarget.style.boxShadow = "0 0 10px rgba(59,130,246,0.4)")
      }
      onMouseOut={(e) =>
        (e.currentTarget.style.boxShadow = "0 3px 6px rgba(0,0,0,0.08)")
      }
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0, pointerEvents: "none" }}
      />

      <div
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          flex: 1,
          paddingRight: 6,
        }}
      >
        {data.label}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, pointerEvents: "none" }}
      />
    </div>
  );
};

export default function FlowVisualizer({
  graphData,
  projectId,
  setGraphData,
  id,
  project,
  selectedFileNode,
}: Props) {
  const { users, channelRef, subscribedRef } = useProjectPresence();
  const [heatmapMode, setHeatmapMode] = useState<
    "none" | "complexity" | "importance"
  >("none");
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [showVisualizer, setShowVisualizer] = useState(true);
  const [hideDeadCode, setHideDeadCode] = useState(false);
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const [nodeCount, setNodeCount] = useState(0);
  const [edgeCount, setEdgeCount] = useState(0);
  const [graphScope, setGraphScope] = useState<"file" | "global">("file");

  useEffect(() => {
    const fetchGraphData = async () => {
      const token = await getAuth().currentUser?.getIdToken();
      const res = await fetch(`/api/projects/${id}/graph`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      console.log(data);

      setGraphData(data.graphs?.[0]?.record);
      setNodeCount(data.graphs?.[0]?.record?.meta?.nodeCount);
      setEdgeCount(data.graphs?.[0]?.record?.meta?.edgeCount);
    };

    fetchGraphData();
  }, []);

  useEffect(() => {
    console.log(graphData);

    console.log(
      "Import edges : ",
      graphData.edges.filter((e) => e.label === "imports").length,
    );

    console.log("Nodes : ", graphData.nodes.length);
    console.log("edges : ", graphData.edges.length);
  }, [graphData]);

  const graphMode: GraphMode =
    nodeCount > 1300 || edgeCount > 2500 ? "disabled" : "full";

  const focusedFunctionId = useMemo(() => {
    if (selectedNode && selectedNode.data?.raw?.type === "function") {
      return selectedNode.id;
    }
    return null;
  }, [selectedNode]);

  function collectSubgraph(start: string, adj: Map<string, string[]>) {
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

  useEffect(() => {
    const uid = getAuth().currentUser?.uid;
    if (!uid) return;

    if (!subscribedRef.current) return;

    if (!selectedNode) return;

    try {
      channelRef.current?.trigger("client-graph-focus", {
        uid,
        nodeId: selectedNode.id,
      });
    } catch (err) {
      console.error("Graph focus trigger failed", err);
    }
  }, [selectedNode]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  function buildFileNodes(fileTree: any[]) {
    const nodes: Node[] = [];

    const walk = (items: any[]) => {
      for (const it of items) {
        if (it.type === "file") {
          nodes.push({
            id: `file::${it.fullPath}`,
            type: "file",
            position: { x: 0, y: 0 },
            data: {
              label: `📄 ${it.name}`,
              raw: it,
              color: "#E5E7EB",
            },
          });
        }
        if (it.children) walk(it.children);
      }
    };

    walk(fileTree);
    return nodes;
  }

  function normalizePath(p?: string) {
    if (!p) return null;
    return p.replace(/^\/+/, "").replace(/\\/g, "/");
  }

  function buildFileImportEdges(fileTree: any[]) {
    const edges: Edge[] = [];

    const walk = (items: any[]) => {
      for (const it of items) {
        if (it.type === "file" && it.impact?.imports) {
          for (const target of it.impact.imports) {
            edges.push({
              id: `file::${it.fullPath}->file::${target}`,
              source: `file::${it.fullPath}`,
              target: `file::${target}`,
              label: "imports",
              style: {
                stroke: "#9CA3AF",
                strokeDasharray: "6 4",
              },
              markerEnd: { type: MarkerType.ArrowClosed },
            });
          }
        }
        if (it.children) walk(it.children);
      }
    };

    walk(fileTree);
    return edges;
  }

  const existingFiles = useMemo(() => {
    const set = new Set<string>();

    const walk = (nodes: any[]) => {
      for (const n of nodes) {
        if (n.type === "file" && n.fullPath) {
          set.add(normalizePath(n.fullPath)!);
        }
        if (n.children) walk(n.children);
      }
    };

    walk(project.fileTree);
    return set;
  }, [project.fileTree]);

  const colorBySemantic = (n: any) => {
    const sem = n.semantic;

    if (heatmapMode === "complexity") {
      const c = sem.complexity ?? 1;
      if (c >= 8) return "#7f1d1d";
      if (c >= 5) return "#c2410c";
      if (c >= 3) return "#f59e0b";
      return "#fde68a";
    }
    if (heatmapMode === "importance") {
      const imp = sem.importance ?? 0;
      if (imp > 0.75) return "#065f46";
      if (imp > 0.4) return "#10b981";
      if (imp > 0.15) return "#34d399";
      return "#bbf7d0";
    }
    return typeColors[n.type] || "#fff";
  };

  function normalizeType(type?: string) {
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

  const selectedFile = selectedFileNode.fullPath || null;
  const isFileView = graphScope === "file";

  const scopedGraph = useMemo(() => {
    if (graphMode === "disabled") {
      return { nodes: [], edges: [] };
    }

    if (!graphData?.nodes) {
      return { nodes: [], edges: [] };
    }

    if (isFileView) {
      const fileNodes = graphData.nodes.filter(
        (n: any) => normalizePath(n.file) === normalizePath(selectedFile),
      );

      const nodeIds = new Set(fileNodes.map((n: any) => n.id));

      const fileEdges = graphData.edges.filter(
        (e: any) => nodeIds.has(e.from) && nodeIds.has(e.to),
      );

      return {
        nodes: fileNodes.map((n: any) => ({
          id: n.id,
          type: "custom",
          position: { x: 0, y: 0 },
          data: { raw: n },
          draggable: false,
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        })),
        edges: fileEdges.map((e: any) => ({
          id: e.id,
          source: e.from,
          target: e.to,
          label: e.label,
          markerEnd: { type: MarkerType.ArrowClosed },
        })),
      };
    }

    const dependencyEdges = graphData.edges.filter(
      (e) => e.label === "imports",
    );

    const connectedFileIds = new Set<string>();
    dependencyEdges.forEach((e) => {
      connectedFileIds.add(e.from);
      connectedFileIds.add(e.to);
    });

    const structuralNodes = graphData.nodes.filter(
      (n) => n.type === "file" && connectedFileIds.has(n.id),
    );

    const nodeIds = new Set(structuralNodes.map((n: any) => n.id));

    const structuralEdges = graphData.edges.filter(
      (e: any) => nodeIds.has(e.from) && nodeIds.has(e.to),
    );

    return {
      nodes: structuralNodes.map((n: any) => ({
        id: n.id,
        type: "custom",
        position: { x: 0, y: 0 },
        data: { raw: n },
        draggable: false,
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      })),
      edges: structuralEdges.map((e: any) => ({
        id: e.id,
        source: e.from,
        target: e.to,
        label: e.label,
        markerEnd: { type: MarkerType.ArrowClosed },
      })),
    };
  }, [graphData, graphScope, selectedFile]);

  const layoutedGraph = useMemo(() => {
    if (graphMode !== "full") {
      return scopedGraph;
    }
    if (!scopedGraph.nodes.length) return scopedGraph;

    const g = getDagreGraph(scopedGraph.nodes, scopedGraph.edges, "TB");

    return {
      nodes: scopedGraph.nodes.map((n) => {
        const p = g.node(n.id);
        return {
          ...n,
          position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 },
        };
      }),
      edges: scopedGraph.edges,
    };
  }, [scopedGraph]);

  const adjacency = useMemo(() => {
    const forward = new Map<string, string[]>();
    const backward = new Map<string, string[]>();

    for (const e of layoutedGraph.edges) {
      if (!forward.has(e.source as string)) forward.set(e.source as string, []);
      if (!backward.has(e.target as string))
        backward.set(e.target as string, []);

      forward.get(e.source as string)!.push(e.target as string);
      backward.get(e.target as string)!.push(e.source as string);
    }

    return { forward, backward };
  }, [layoutedGraph]);

  const functionFocusedNodes = useMemo(() => {
    if (!focusedFunctionId) return null;
    return collectSubgraph(focusedFunctionId, adjacency.forward);
  }, [focusedFunctionId, adjacency]);

  function collectReachable(start: string, adj: Map<string, string[]>) {
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

  const highlightedNodes = useMemo(() => {
    if (!selectedNode) return null;

    const forwardSet = collectReachable(selectedNode.id, adjacency.forward);
    const backwardSet = collectReachable(selectedNode.id, adjacency.backward);

    return new Set([...Array.from(forwardSet), ...Array.from(backwardSet)]);
  }, [selectedNode, adjacency]);

  const circularSet = new Set(
    graphData?.meta?.intelligence?.circularDependencies?.flat() || [],
  );

  const maxFileImportance = useMemo(() => {
    const values = graphData.nodes
      .filter((n) => n.type === "file")
      .map((n) => n.semantic?.importance ?? 0);

    return values.length ? Math.max(...values) : 0;
  }, [graphData]);

  const visualNodes = useMemo(() => {
    return layoutedGraph.nodes.map((n) => {
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
        graphScope === "global" &&
        raw.type === "file" &&
        circularSet.has(raw.id);

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
  }, [layoutedGraph, heatmapMode, filterType, selectedNode, highlightedNodes]);

  const visualEdges = useMemo(() => {
    const hasSelection = !!selectedNode;

    return layoutedGraph.edges.map((e) => {
      const onPath =
        !hasSelection ||
        (highlightedNodes &&
          highlightedNodes.has(e.source as string) &&
          highlightedNodes.has(e.target as string));

      return {
        ...e,
        style: {
          stroke: onPath ? "#2563EB" : "#9CA3AF",
          strokeWidth: onPath ? 2.5 : 1.2,
          opacity: onPath ? 1 : 0.4,
        },
        markerEnd: { type: MarkerType.ArrowClosed },
      };
    });
  }, [layoutedGraph, highlightedNodes, selectedNode]);

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      custom: CustomNode,
      root: CustomNode,
      file: CustomNode,
      function: CustomNode,
      "fn-entry": CustomNode,
      if: CustomNode,
      "if-true": CustomNode,
      "if-false": CustomNode,
      loop: CustomNode,
      "loop-body": CustomNode,
      "after-loop": CustomNode,
      statement: CustomNode,
      trycatch: CustomNode,
      error: CustomNode,
    }),
    [],
  );
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  const onInit: OnInit = useCallback((instance: ReactFlowInstance) => {
    rfInstanceRef.current = instance;

    requestAnimationFrame(() => {
      instance.fitView({ padding: 0.2 });
    });
  }, []);

  const zoomToFit = () => rfInstanceRef.current?.fitView({ padding: 0.2 });

  useEffect(() => {
    if (explanation) {
      const el = document.getElementById("ai-explanation");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, [explanation]);

  const [loadingExplain, setLoadingExplain] = useState(false);

  async function explainNode(node: any) {
    if (!node) return;
    setLoadingExplain(true);
    setExplanation(null);

    try {
      const code = node.data?.raw?.code || "";
      const res = await fetch(`/api/projects/${projectId}/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      console.log(data);
      setExplanation(data?.explanation || "No response");
    } catch (err: any) {
      setExplanation("⚠ Error while fetching explanation: " + err.message);
    } finally {
      setLoadingExplain(false);
    }
  }

  const uid = getAuth().currentUser?.uid;

  const currUsers = useMemo(() => {
    if (!selectedNode) return [];
    return users.filter(
      (u) => u.uid !== uid && u.focusedNodeId === selectedNode.id,
    );
  }, [users, selectedNode]);

  if (graphMode === "disabled") {
    return (
      <div className="p-6 rounded-xl border border-yellow-300 bg-yellow-50">
        <h3 className="font-semibold text-yellow-800 mb-2">
          ⚠ Execution graph disabled
        </h3>

        <p className="text-sm text-yellow-700">
          This project contains <b>{nodeCount}</b> nodes and <b>{edgeCount}</b>{" "}
          edges.
        </p>

        <p className="text-sm text-yellow-700 mt-2">
          Rendering the full execution graph may freeze your browser. Use
          file-level navigation and cross-file impact instead.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex gap-2">
        <select
          value={graphScope}
          onChange={(e) =>
            setGraphScope(e.target.value === "global" ? "global" : "file")
          }
        >
          <option value="file">File Level View</option>
          <option value="global">Architecture View</option>
        </select>
      </div>
      <div
        className="flex items-center justify-between px-4 py-2 bg-gray-100 border border-gray-200 rounded-t-xl cursor-pointer select-none"
        onClick={() => setShowVisualizer((v) => !v)}
      >
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          🧩 Code Flow Visualization
        </h2>
        <span className="text-gray-500 text-sm">
          {showVisualizer ? "Hide ▲" : "Show ▼"}
        </span>
      </div>
      <div
        className={`w-full transition-all duration-300 ease-in-out border-x border-b border-gray-200 rounded-b-xl overflow-hidden ${
          showVisualizer ? "max-h-[85vh]" : "max-h-0"
        }`}
        style={{ height: showVisualizer ? "85vh" : 0 }}
      >
        <div
          style={{
            width: "100%",
            height: "calc(100vh - 100px)",
            display: "flex",
            flexDirection: "column",
            background: "#f9fafb",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              background: "#fff",
              borderBottom: "1px solid #e5e7eb",
              flexShrink: 0,
            }}
          >
            <select
              value={heatmapMode}
              onChange={(e) => setHeatmapMode(e.target.value as any)}
            >
              <option value="none">Heatmap: Off</option>
              <option value="complexity">Heatmap: Complexity</option>
              <option value="importance">Heatmap: Importance</option>
            </select>

            <select
              value={filterType ?? ""}
              onChange={(e) => setFilterType(e.target.value || null)}
            >
              <option value="">Filter: All</option>
              <option value="function">Functions</option>
              <option value="if">If / Branch</option>
              <option value="loop">Loops</option>
              <option value="statement">Statements</option>
            </select>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: "#374151",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={hideDeadCode}
                onChange={(e) => setHideDeadCode(e.target.checked)}
              />
              Hide dead code
            </label>

            <button
              title="legend-panel-toggle-button"
              onClick={() => setShowLegend((s) => !s)}
              style={{
                fontSize: 12,
                padding: "4px 8px",
                borderRadius: 6,
                border: "1px solid #D1D5DB",
                background: "#F9FAFB",
                cursor: "pointer",
              }}
            >
              {showLegend ? "Hide legend" : "Show legend"}
            </button>

            <button
              onClick={() => {
                setHeatmapMode("none");
                setFilterType(null);
                setSelectedNode(null);
              }}
              style={{
                background: "#2563EB",
                color: "white",
                border: "none",
                padding: "4px 10px",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>

          <div
            id="ai-explanation"
            style={{ flex: 1, position: "relative", overflow: "hidden" }}
          >
            <ReactFlow
              nodes={visualNodes}
              edges={visualEdges}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              panOnScroll
              zoomOnPinch
              panOnDrag
              style={{ background: "#ffffff" }}
            >
              <Background color="#e0e0e0" gap={20} />
              {graphMode === "full" && (
                <MiniMap
                  nodeColor={(n: Node) => (n.data?.color as string) || "#ccc"}
                  style={{
                    borderRadius: 12,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                  }}
                />
              )}
              <Controls />
            </ReactFlow>

            {showLegend && (
              <div
                style={{
                  position: "absolute",
                  right: 16,
                  bottom: 16,
                  width: 260,
                  background: "#ffffff",
                  border: "1px solid #E5E7EB",
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 12,
                  color: "#374151",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  zIndex: 50,
                }}
              >
                <strong style={{ fontSize: 13 }}>Graph Legend</strong>

                <div style={{ marginTop: 8 }}>
                  <div>
                    🟢 <b>Function</b> — entry & body
                  </div>
                  <div>
                    🔵 <b>If / Branch</b> — conditional paths
                  </div>
                  <div>
                    🟣 <b>Loop</b> — iterative flow
                  </div>
                  <div>
                    ⚪ <b>Statement</b> — linear execution
                  </div>
                </div>

                <hr style={{ margin: "8px 0" }} />

                <div>
                  <div>
                    🎨 <b>Heatmap</b>
                  </div>
                  <div>• Darker = higher complexity / importance</div>
                </div>

                <hr style={{ margin: "8px 0" }} />

                <div>
                  <div>
                    🌫 <b>Faded nodes</b>
                  </div>
                  <div>• Filtered out</div>
                  <div>• Dead / unreachable</div>
                  <div>• Outside execution path</div>
                </div>

                <hr style={{ margin: "8px 0" }} />

                <div>
                  <div>
                    ➡ <b>Edges</b>
                  </div>
                  <div>• Solid → execution order</div>
                  <div>• Branch → true / false</div>
                  <div>• Loop-back → iteration</div>
                </div>
              </div>
            )}

            <button
              onClick={zoomToFit}
              style={{
                position: "absolute",
                bottom: 16,
                right: 16,
                background: "#2563EB",
                color: "white",
                border: "none",
                borderRadius: "50%",
                width: 44,
                height: 44,
                cursor: "pointer",
                boxShadow: "0 3px 8px rgba(0,0,0,0.25)",
                fontSize: 20,
              }}
            >
              ⤢
            </button>
          </div>

          <div
            style={{
              height: "30vh",
              background: "#fff",
              borderTop: "1px solid #e5e7eb",
              padding: 12,
              overflowY: "auto",
              flexShrink: 0,
            }}
          >
            {selectedNode ? (
              <>
                <h3 style={{ margin: 0, fontSize: 15 }}>
                  {selectedNode.data?.label}
                </h3>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {selectedNode.data?.raw?.file ?? ""} :{" "}
                  {selectedNode.data?.raw?.line ?? ""}
                </div>
                <hr />
                <div style={{ fontSize: 13 }}>
                  <b>Complexity:</b>{" "}
                  {selectedNode.data?.raw?.semantic?.complexity ?? "—"}
                  <br />
                  <b>Importance:</b>{" "}
                  {(
                    (selectedNode.data?.raw?.semantic?.importance ?? 0) * 100
                  ).toFixed(0)}
                  %
                  <br />
                  <b>Reachable:</b>{" "}
                  {selectedNode.data?.raw?.semantic?.dead ? "No" : "Yes"}
                </div>
                <hr />
                <pre
                  style={{
                    maxHeight: "18vh",
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    fontFamily: "monospace",
                    fontSize: 12,
                    background: "#f9fafb",
                    padding: 6,
                    borderRadius: 6,
                  }}
                >
                  {selectedNode.data?.raw?.code}
                </pre>
              </>
            ) : (
              <div style={{ color: "#6b7280", fontSize: 13 }}>
                Click a node to inspect details
              </div>
            )}

            <div
              style={{
                borderTop: "1px solid #e5e7eb",
                marginTop: 8,
                paddingTop: 8,
              }}
            >
              <button
                onClick={() => explainNode(selectedNode)}
                disabled={loadingExplain}
                style={{
                  background: "#10B981",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  padding: "6px 12px",
                  cursor: "pointer",
                }}
              >
                {loadingExplain ? "🧠 Thinking..." : "🧠 Explain this code"}
              </button>

              {explanation && (
                <div
                  style={{
                    marginTop: 10,
                    background: "#F3F4F6",
                    padding: 10,
                    borderRadius: 8,
                    fontSize: 13,
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.5,
                    maxHeight: "18vh",
                    overflowY: "auto",
                  }}
                >
                  {explanation}
                </div>
              )}

              {currUsers.length > 0 && (
                <>
                  <br />
                  <span>Currently inspecting this node :</span>
                  <br />
                  <div className="p-2 ring-2 text-black ring-blue-400 rounded-lg animate-pulse">
                    {currUsers[0].email?.split("@")[0] ?? "user"}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
