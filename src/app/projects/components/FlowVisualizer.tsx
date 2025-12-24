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
  useNodesState,
  useEdgesState,
  addEdge,
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

interface Props {
  graphData: { nodes: any[]; edges: any[] };
  setGraphData: (graphData: { nodes: any[]; edges: any[] }) => void;
  projectId: any;
  id: any;
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
  opacity: 0,
  animation: "fadeIn 0.4s ease forwards",
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

  const showTooltip = () => {
    if (!nodeRef.current) return;
    const rect = nodeRef.current.getBoundingClientRect();
    tooltipEl.textContent = data?.tooltip ?? "No code snippet";
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
        position: "relative",
        cursor: "default",
        pointerEvents: "auto",
        transformOrigin: "center",
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
}: Props) {
  const { users, channelRef, subscribedRef } = useProjectPresence();
  const [heatmapMode, setHeatmapMode] = useState<
    "none" | "complexity" | "importance"
  >("none");
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [showVisualizer, setShowVisualizer] = useState(true);

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
    };

    fetchGraphData();
  }, []);

  useEffect(() => {
    console.log(graphData);
  }, [graphData]);

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

  function colorByType(type: string) {
    const t = normalizeType(type);
    if (t === "function") return "#d97706";
    if (t === "loop") return "#3b82f6";
    if (t === "if") return "#10b981";
    return "#6b7280";
  }

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

  const nodesFromData = useMemo(() => {
    if (!graphData?.nodes) return [];

    return graphData.nodes
      .filter((n: any) => {
        const type = normalizeType(n.type);
        if (!filterType || filterType === "all") return true;
        return type === filterType;
      })
      .map((n) => {
        const shortLabel = (() => {
          switch (n.type) {
            case "function":
              return `🟢 Function: ${n.name ?? "anonymous"}`;
            case "if":
              return `🔸 If (${(n.code ?? "").slice(0, 40)})`;
            case "if-true":
              return `🟡 If True`;
            case "if-false":
              return `🟡 If False`;
            case "loop":
              return `🔵 Loop (${(n.code ?? "").slice(0, 40)})`;
            case "fn-entry":
              return `▶ FN ENTRY`;
            case "loop-body":
              return `▶ LOOP BODY`;
            case "after-loop":
              return `▶ AFTER LOOP`;
            case "trycatch":
              return `🟣 Try/Catch`;
            case "error":
              return `⚠ ERROR`;
            default:
              return (n.code ?? "").slice(0, 60) || n.type.toUpperCase();
          }
        })();

        return {
          id: n.id,
          type: normalizeType(n.type) || "custom",
          position: { x: 0, y: 0 },
          background: colorByType(n.type),
          data: {
            id: n.id,
            name: n.name,
            code: n.code ?? "",
            label: shortLabel,
            tooltip: n.code ?? "No code",
            color: colorBySemantic(n),
            raw: n,
            type: n.type,
            semantic: n.semantic,
            importanceScore: n.semantic?.importance,
            complexityScore: n.semantic?.complexity,
            deadCode: n.semantic?.dead,
          },
          draggable: false,
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        } as Node;
      });
  }, [graphData, filterType, heatmapMode]);

  const edgesFromData = useMemo(() => {
    const existingNodeIds = new Set((nodesFromData || []).map((n) => n.id));
    return (graphData?.edges || [])
      .filter(
        (e) =>
          e.from &&
          e.to &&
          existingNodeIds.has(e.from) &&
          existingNodeIds.has(e.to)
      )
      .map((e) => {
        const isNext = e.label === "next";
        return {
          id: e.id,
          source: e.from,
          target: e.to,
          label: e.label,
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: {
            stroke: isNext ? "#60A5FA" : "#34D399",
            strokeWidth: isNext ? 1.6 : 2.2,
            strokeDasharray: isNext ? "6 4" : undefined,
            opacity: 0.95,
            transition: "stroke 0.3s ease, opacity 0.3s ease",
          },
        } as Edge;
      });
  }, [graphData, filterType, heatmapMode]);

  const [nodes, setNodes, onNodesChange] = useNodesState(nodesFromData);
  const [edges, setEdges, onEdgesChange] = useEdgesState(edgesFromData);
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      custom: CustomNode,
      root: CustomNode,
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
    []
  );
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  const onInit: OnInit = useCallback((instance: ReactFlowInstance) => {
    rfInstanceRef.current = instance;
  }, []);

  const lastPosRef = useRef<Record<string, { x: number; y: number }>>({});
  const fitTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!nodesFromData.length) {
      setNodes([]);
      setEdges(edgesFromData);
      lastPosRef.current = {};
      return;
    }

    const g = getDagreGraph(nodesFromData, edgesFromData, "TB");
    const positioned = nodesFromData.map((n) => {
      const nd = g.node(n.id);
      if (!nd) return n;
      return { ...n, position: { x: nd.x - NODE_W / 2, y: nd.y - NODE_H / 2 } };
    });

    lastPosRef.current = Object.fromEntries(
      positioned.map((p) => [p.id, p.position])
    );
    setNodes(positioned);
    setEdges(edgesFromData);

    if (fitTimeoutRef.current) window.clearTimeout(fitTimeoutRef.current);
    fitTimeoutRef.current = window.setTimeout(() => {
      try {
        rfInstanceRef.current?.fitView({ padding: 0.2 });
      } catch {}
    }, 150);

    return () => {
      if (fitTimeoutRef.current) {
        window.clearTimeout(fitTimeoutRef.current);
        fitTimeoutRef.current = null;
      }
    };
  }, [graphData, nodesFromData, edgesFromData]);

  useEffect(() => {
    if (explanation) {
      const el = document.getElementById("ai-explanation");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }, [explanation]);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  const zoomToFit = () => {
    rfInstanceRef.current?.fitView({ padding: 0.2 });
  };

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
      setExplanation(data || "No response");
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
      (u) => u.uid !== uid && u.focusedNodeId === selectedNode.id
    );
  }, [users, selectedNode]);

  return (
    <div className="mb-6">
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
              key={filterType + heatmapMode}
              nodes={nodes}
              edges={edges}
              onNodeClick={onNodeClick}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              panOnScroll
              zoomOnPinch
              panOnDrag
              style={{ background: "#ffffff" }}
            >
              <Background color="#e0e0e0" gap={20} />
              <MiniMap
                nodeColor={(n: Node) => (n.data?.color as string) || "#ccc"}
                style={{
                  borderRadius: 12,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                }}
              />
              <Controls />
            </ReactFlow>

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
