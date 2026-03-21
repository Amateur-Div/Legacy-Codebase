"use client";

import React, { useState, useEffect } from "react";
import FlowVisualizer from "./FlowVisualizer";
import { ReactFlowProvider } from "reactflow";
import { useAuth } from "@/context/AuthContext";
import { getAuth } from "firebase/auth";
import { FlowGraph } from "@/app/api/lib/analyzer/types";

export default function ProjectAnalyzer({
  id,
  projectId,
  graphData,
  setGraphData,
  project,
  selectedFileNode,
}: {
  id: string;
  projectId: any;
  graphData: FlowGraph;
  setGraphData: (graphData: FlowGraph) => void;
  project: any;
  selectedFileNode: any;
}) {
  const { jobId, setJobId } = useAuth();

  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">(
    "idle",
  );

  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>("");

  const fetchGraph = async () => {
    try {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) return;

      const res = await fetch(`/api/projects/${id}/graph`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) return;

      const data = await res.json();
      const graph = data.graphs?.[0]?.record;
      setGraphData(graph);
    } catch (err) {
      console.error("Graph fetch failed", err);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [projectId]);

  useEffect(() => {
    if (graphData?.nodes?.length > 0) {
      setStatus("done");
      return;
    }

    if (!jobId) {
      return;
    }

    setStatus("running");

    let pollingTimer: number | null = null;

    const fetchJobStatus = async () => {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) return null;

      try {
        const res = await fetch(
          `/api/projects/${projectId}/jobs/${jobId}?token=${encodeURIComponent(token)}`,
        );

        if (!res.ok) return null;

        const data = await res.json();
        return data;
      } catch (err) {
        console.error("[poll] job status error", err);
        return null;
      }
    };

    pollingTimer = window.setInterval(async () => {
      try {
        await fetch("/api/worker/process", { method: "POST" });

        const job = await fetchJobStatus();
        if (!job) return;

        setProgress(job.progress ?? 0);
        setMessage(job.message ?? "Processing...");

        if (job.status === "done") {
          setStatus("done");
          setJobId(null);

          await fetchGraph();

          if (pollingTimer) {
            window.clearInterval(pollingTimer);
            pollingTimer = null;
          }
        }

        if (job.status === "error") {
          setStatus("error");

          if (pollingTimer) {
            window.clearInterval(pollingTimer);
            pollingTimer = null;
          }
        }
      } catch (err) {
        console.error("Worker polling error", err);
      }
    }, 2000);

    return () => {
      if (pollingTimer) {
        window.clearInterval(pollingTimer);
      }
    };
  }, [jobId, projectId, graphData]);

  if (status === "running") {
    return (
      <div className="flex flex-col items-center mt-20">
        <p className="text-lg font-medium mb-3">{message}</p>
        <div className="w-80 bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-blue-500 h-3 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-gray-500 mt-2">{progress}% complete</p>
      </div>
    );
  }

  if (status === "done" && graphData?.nodes?.length > 0) {
    console.log("Flow Visualizer rendered ...");
    return (
      <ReactFlowProvider>
        <FlowVisualizer
          projectId={projectId}
          id={id}
          graphData={graphData}
          setGraphData={setGraphData}
          project={project}
          selectedFileNode={selectedFileNode}
        />
      </ReactFlowProvider>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center mt-20 text-red-600">
        <p className="text-lg font-semibold">Analysis Failed</p>
        <p className="text-sm">{message}</p>
      </div>
    );
  }

  return null;
}
