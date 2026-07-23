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
  NodeTypes,
  OnInit,
  ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";
import { NODE_H, NODE_W, getDagreGraph } from "../utils/graphLayout";
import { getAuth } from "firebase/auth";
import { FlowGraph } from "@/app/api/lib/analyzer/types";
import {
  collectReachable,
  normalizePath,
  normalizeType,
} from "../utils/graphHelpers";
import { typeColors } from "../utils/graphStyles";
import CustomNode from "./graph/CustomNode";
import GraphInspectorPanel from "./graph/GraphInspectorPanel";
import { buildVisualNodes } from "../utils/buildVisualNodes";
import GraphToolbar from "./graph/GraphToolbar";

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
}

const nodeTypes: NodeTypes = {
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
};

export default function FlowVisualizer({
  graphData,
  projectId,
  setGraphData,
  id,
  selectedFileNode,
}: Props) {
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
    let mounted = true;

    const fetchGraphData = async () => {
      try {
        const token = await getAuth().currentUser?.getIdToken();

        const res = await fetch(`/api/projects/${id}/graph`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!mounted) return;

        console.log(data.graphs?.[0]?.record);

        setGraphData(data.graphs?.[0]?.record);
        setNodeCount(data.graphs?.[0]?.record?.meta?.nodeCount);
        setEdgeCount(data.graphs?.[0]?.record?.meta?.edgeCount);
      } catch (err) {
        console.error("Failed to fetch graph", err);
      }
    };

    fetchGraphData();

    return () => {
      mounted = false;
    };
  }, [id, setGraphData]);

  const resetGraphState = useCallback(() => {
    setHeatmapMode("none");
    setFilterType(null);
    setSelectedNode(null);
  }, []);

  const graphMode: GraphMode = useMemo(
    () => (nodeCount > 1300 || edgeCount > 2500 ? "disabled" : "full"),
    [nodeCount, edgeCount],
  );

  const focusedFunctionId = useMemo(() => {
    if (selectedNode && selectedNode.data?.raw?.type === "function") {
      return selectedNode.id;
    }
    return null;
  }, [selectedNode]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
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

  const selectedFile = selectedFileNode?.fullPath || null;
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
  }, [graphData, graphScope, selectedFile, graphMode]);

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
    return collectReachable(focusedFunctionId, adjacency.forward);
  }, [focusedFunctionId, adjacency]);

  const highlightedNodes = useMemo(() => {
    if (!selectedNode) return null;

    const forwardSet = collectReachable(selectedNode.id, adjacency.forward);
    const backwardSet = collectReachable(selectedNode.id, adjacency.backward);

    return new Set([...Array.from(forwardSet), ...Array.from(backwardSet)]);
  }, [selectedNode, adjacency]);

  const circularSet = useMemo(
    () =>
      new Set(
        graphData?.meta?.intelligence?.circularDependencies?.flat() || [],
      ),
    [graphData],
  );

  const maxFileImportance = useMemo(() => {
    const values = (graphData?.nodes ?? [])
      .filter((n) => n.type === "file")
      .map((n) => n.semantic?.importance ?? 0);

    return values.length ? Math.max(...values) : 0;
  }, [graphData]);

  const visualNodes = useMemo(() => {
    return buildVisualNodes({
      nodes: layoutedGraph.nodes,
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
    });
  }, [
    layoutedGraph,
    heatmapMode,
    filterType,
    selectedNode,
    highlightedNodes,
    graphScope,
    hideDeadCode,
    functionFocusedNodes,
    maxFileImportance,
    circularSet,
  ]);

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

  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);

  const onInit: OnInit = useCallback((instance: ReactFlowInstance) => {
    rfInstanceRef.current = instance;

    requestAnimationFrame(() => {
      instance.fitView({ padding: 0.2 });
    });
  }, []);

  const zoomToFit = useCallback(() => {
    rfInstanceRef.current?.fitView({
      padding: 0.2,
    });
  }, []);

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
      setExplanation(data?.explanation || "No response");
    } catch (err: any) {
      setExplanation("⚠ Error while fetching explanation: " + err.message);
    } finally {
      setLoadingExplain(false);
    }
  }

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
            background: "#f9fafb",
            borderRadius: 8,
            overflow: "hidden",
          }}
          className="flex flex-col h-full min-h-0"
        >
          <GraphToolbar
            graphScope={graphScope}
            setGraphScope={setGraphScope}
            heatmapMode={heatmapMode}
            setHeatmapMode={setHeatmapMode}
            filterType={filterType}
            setFilterType={setFilterType}
            hideDeadCode={hideDeadCode}
            setHideDeadCode={setHideDeadCode}
            showLegend={showLegend}
            setShowLegend={setShowLegend}
            resetGraphState={resetGraphState}
          />

          <div
            id="ai-explanation"
            className="flex-1 min-h-0 w-full h-full overflow-hidden"
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
              style={{ background: "#ffffff", height: "100%", width: "100%" }}
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
                bottom: 24,
                right: 24,
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

          <GraphInspectorPanel
            selectedNode={selectedNode}
            explanation={explanation}
            loadingExplain={loadingExplain}
            explainNode={explainNode}
          />
        </div>
      </div>
    </div>
  );
}
