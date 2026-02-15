"use client";

import type { FlowGraph } from "@/app/api/lib/analyzer/types";
import {
  findApiImpactFromFile,
  findFileImpact,
} from "@/app/api/lib/impactEngine";

type Props = {
  graph: FlowGraph;
  fileId: string;
  onClose: () => void;
};

export function ImpactDetailsDrawer({ graph, fileId, onClose }: Props) {
  const impactedFiles = findFileImpact(graph, fileId);
  const impactedApis = findApiImpactFromFile(graph, fileId);

  const importance =
    graph.meta?.intelligence?.importanceRanking?.find(
      (f) => f.fileId === fileId,
    )?.score || 0;

  const isInCycle =
    graph.meta?.intelligence?.circularDependencies?.some((cycle) =>
      cycle.includes(fileId),
    ) || false;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-2xl border-l z-50 p-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Impact Details</h2>
        <button onClick={onClose} className="text-sm text-gray-500">
          Close
        </button>
      </div>

      <div className="space-y-4 text-sm">
        <div>
          <span className="font-semibold">File:</span>
          <div className="break-all">{fileId.replace(/^file::/, "")}</div>
        </div>

        <div>
          <span className="font-semibold">Importance Score:</span> {importance}
        </div>

        <div>
          <span className="font-semibold">Circular Involvement:</span>{" "}
          {isInCycle ? "Yes ⚠" : "No"}
        </div>

        <div>
          <span className="font-semibold">Impacted Files:</span>
          <ul className="list-disc pl-5 mt-2">
            {impactedFiles
              .filter((f) => f !== fileId)
              .map((f) => (
                <li key={f}>{f.replace(/^file::/, "")}</li>
              ))}
          </ul>
        </div>

        <div>
          <span className="font-semibold">Impacted APIs:</span>
          <ul className="list-disc pl-5 mt-2">
            {impactedApis.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
