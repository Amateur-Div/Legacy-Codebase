"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImpactDetailsDrawer } from "./ImpactDetailsDrawer";
import type { FlowGraph } from "@/app/api/lib/analyzer/types";

type Props = {
  graph: FlowGraph;
  onFileChange: any;
};

export function ImpactSummaryCard({ graph, onFileChange }: Props) {
  const intelligence = graph?.meta?.intelligence;
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  if (!intelligence) return null;

  const topFiles = intelligence.importanceRanking?.slice(0, 5) || [];
  const deadCount = intelligence.deadFiles?.length || 0;
  const circularCount = intelligence.circularDependencies?.length || 0;

  const riskLevel =
    circularCount > 0 ? "High" : deadCount > 10 ? "Medium" : "Low";

  return (
    <>
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Impact Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <span className="font-semibold">Risk Level:</span> {riskLevel}
          </div>

          <div>
            <span className="font-semibold">Dead Files:</span> {deadCount}
            <div className="overflow-auto h-36">
              {intelligence.deadFiles
                .map((file, i) => (
                  <div
                    key={i}
                    className="hover:underline hover:text-blue-500 hover:cursor-pointer"
                    onClick={() => onFileChange(file.replace(/^file::/, ""))}
                  >
                    {file.replace(/^file::/, "")}
                  </div>
                ))
                .slice(0, 30)}
            </div>
          </div>

          <div>
            <span className="font-semibold">Circular Dependencies:</span>{" "}
            {circularCount}
          </div>

          <div>
            <span className="font-semibold">Top Critical Files:</span>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {topFiles.map((f) => (
                <li
                  key={f.fileId}
                  className="cursor-pointer hover:underline text-blue-600"
                  onClick={() => setSelectedFile(f.fileId)}
                >
                  {f.fileId.replace(/^file::/, "")} (score: {f.score})
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {selectedFile && (
        <ImpactDetailsDrawer
          graph={graph}
          fileId={selectedFile}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </>
  );
}
