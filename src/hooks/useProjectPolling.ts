import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";

export function useProjectPolling(projectId: string) {
  const [jobStatus, setJobStatus] = useState<
    "idle" | "running" | "done" | "error"
  >("idle");
  const [jobProgress, setJobProgress] = useState(0);
  const [jobMessage, setJobMessage] = useState("");
  const [graphReady, setGraphReady] = useState(false);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const pollJob = async () => {
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) return false;

      try {
        const res = await fetch(
          `/api/projects/${projectId}/latest-job?token=${encodeURIComponent(token)}`,
        );

        if (!res.ok) return false;

        const job = await res.json();

        if (!job) {
          setJobStatus("done");
          setGraphReady(true);
          return true;
        }

        setJobStatus(job.status);
        setJobProgress(job.progress || 0);
        setJobMessage(job.message || "Processing...");

        if (job.status === "done") {
          setGraphReady(true);
          return true;
        }

        if (job.status === "error") {
          setJobStatus("error");
          return true;
        }
      } catch (err) {
        console.error("Polling error", err);
      }

      return false;
    };

    const interval = setInterval(async () => {
      const done = await pollJob();
      if (done) clearInterval(interval);
    }, 2000);

    return () => clearInterval(interval);
  }, [projectId]);

  return {
    jobStatus,
    jobProgress,
    jobMessage,
    graphReady,
  };
}
