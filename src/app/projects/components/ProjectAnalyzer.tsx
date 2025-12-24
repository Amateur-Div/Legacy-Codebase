"use client";
import React, { useState, useEffect } from "react";
import FlowVisualizer from "./FlowVisualizer";
import { ReactFlowProvider } from "reactflow";
import { useAuth } from "@/context/AuthContext";
import { getAuth } from "firebase/auth";

export default function ProjectAnalyzer({
  id,
  projectId,
  graphData,
  setGraphData,
}: {
  id: string;
  projectId: any;
  graphData: { nodes: any[]; edges: any[] };
  setGraphData: (graphData: { nodes: any[]; edges: any[] }) => void;
}) {
  const { jobId, setJobId } = useAuth();
  const [status, setStatus] = useState<
    "idle" | "uploading" | "running" | "done" | "error"
  >("idle");
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>("");
  useEffect(() => {
    if (!jobId || graphData.nodes.length > 0) {
      setStatus("done");
      return;
    }

    let evt: EventSource | null = null;
    let pollingTimer: number | null = null;
    let sseConnected = false;
    let abortedByClient = false;

    const connectSSE = async () => {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) return;
      const url = `/api/projects/${projectId}/jobs/${jobId}/events?token=${encodeURIComponent(
        token!
      )}`;

      console.log("[SSE] connecting to", url);
      try {
        evt = new EventSource(url);

        evt.onopen = () => {
          console.log("[SSE] connected");
          sseConnected = true;

          if (pollingTimer) {
            window.clearInterval(pollingTimer);
            pollingTimer = null;
          }
        };

        evt.onerror = (e: any) => {
          console.error("[SSE] error", e);
          if (evt) {
            try {
              evt.close();
            } catch {}
            evt = null;
          }
          if (!abortedByClient) startPolling();
        };

        evt.addEventListener("job:update", (e: MessageEvent) => {
          console.log("Data :", e.data);
          const data = JSON.parse(e.data);
          console.log("[SSE] job:update", data);
          setProgress(data.progress ?? 0);
          setMessage(data.message ?? "Processing...");
        });

        evt.addEventListener("job:complete", async (e: MessageEvent) => {
          const data = JSON.parse(e.data);
          console.log("[SSE] job:complete", data);
          setProgress(100);
          setMessage("Finalizing...");
          setStatus("done");
          setJobId(null);
          console.log("Job Id set to null");
          if (evt) {
            try {
              evt.close();
            } catch {}
            evt = null;
          }
        });

        evt.addEventListener("ping", () => {
          console.log("ping");
        });
      } catch (err) {
        console.error("[SSE] exception while creating EventSource:", err);
        startPolling();
      }
    };

    const fetchJobStatus = async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/jobs/${jobId}`);
        if (!res.ok) return null;
        return await res.json();
      } catch (err) {
        console.error("[poll] job status fetch error", err);
        return null;
      }
    };

    const startPolling = () => {
      if (pollingTimer) return;
      console.log("[poll] starting fallback polling every 2000ms");
      pollingTimer = window.setInterval(async () => {
        const job = await fetchJobStatus();
        if (!job) return;
        console.log("[poll] job", job.status, job.progress);
        setProgress(job.progress ?? 0);
        setMessage(job.message ?? "Processing...");
        if (job.status === "done") {
          if (pollingTimer) {
            window.clearInterval(pollingTimer);
            pollingTimer = null;
          }
        } else if (job.status === "error" || job.status === "cancelled") {
          if (pollingTimer) {
            window.clearInterval(pollingTimer);
            pollingTimer = null;
          }
          setStatus("error");
          setMessage("Analysis failed");
        }
      }, 2000);
    };

    setTimeout(() => connectSSE(), 300);

    return () => {
      abortedByClient = true;
      if (evt) {
        try {
          evt.close();
        } catch {}
        evt = null;
      }
      if (pollingTimer) {
        window.clearInterval(pollingTimer);
        pollingTimer = null;
      }
    };
  }, [jobId, projectId]);

  if (status === "uploading" || status === "running") {
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

  if (status === "done" && graphData) {
    return (
      <ReactFlowProvider>
        <FlowVisualizer
          projectId={projectId}
          id={id}
          graphData={graphData}
          setGraphData={setGraphData}
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
