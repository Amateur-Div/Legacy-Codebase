"use client";

import ProjectTree from "@/components/ProjectTree";
import FlowVisualizer from "./FlowVisualizer";

interface Props {
  graphData: any;
  project: any;
  setGraphData: React.Dispatch<React.SetStateAction<any>>;
  projectId: string;
  selectedFileNode: any;
}

export default function ArchitectureWorkspace({
  graphData,
  project,
  setGraphData,
  projectId,
  selectedFileNode,
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Architecture</h2>

        <p className="text-sm text-muted-foreground mt-1">
          Explore dependency flow and repository structure.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-4">
        <FlowVisualizer
          graphData={graphData}
          projectId={projectId}
          setGraphData={setGraphData}
          id={project.projectId}
          selectedFileNode={selectedFileNode}
        />
      </div>
    </div>
  );
}
