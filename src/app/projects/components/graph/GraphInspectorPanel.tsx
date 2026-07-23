"use client";

import React from "react";
import { Node } from "reactflow";

interface GraphInspectorPanelProps {
  selectedNode: Node | null;
  explanation: string | null;
  loadingExplain: boolean;
  explainNode: (node: any) => Promise<void>;
}

export default function GraphInspectorPanel({
  selectedNode,
  explanation,
  loadingExplain,
  explainNode,
}: GraphInspectorPanelProps) {
  return (
    <div className="h-[30vh] bg-white border-t border-gray-200 p-3 overflow-y-auto shrink-0">
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
      </div>
    </div>
  );
}
