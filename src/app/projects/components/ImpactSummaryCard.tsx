"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, FileWarning, Flame, GitBranch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImpactDetailsDrawer } from "./ImpactDetailsDrawer";
import type { FlowGraph } from "@/app/api/lib/analyzer/types";

type Props = {
  graph: FlowGraph;
  onFileChange: (path: string) => void;
};

export function ImpactSummaryCard({ graph, onFileChange }: Props) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const intelligence = graph?.meta?.intelligence;

  const topFiles = useMemo(
    () => intelligence?.importanceRanking?.slice(0, 5) || [],
    [intelligence],
  );

  const deadFiles = useMemo(
    () => intelligence?.deadFiles || [],
    [intelligence],
  );

  const deadCount = deadFiles.length;

  const circularCount = intelligence?.circularDependencies?.length || 0;

  const riskLevel = useMemo(() => {
    if (circularCount > 0) {
      return {
        label: "High",
        className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
      };
    }

    if (deadCount > 10) {
      return {
        label: "Medium",
        className:
          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
      };
    }

    return {
      label: "Low",
      className:
        "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    };
  }, [circularCount, deadCount]);

  if (!intelligence) {
    return null;
  }

  return (
    <>
      <Card className="rounded-2xl shadow-sm border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-4 h-4 text-primary" />

            <span>Impact Summary</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <InfoStat
              icon={<AlertTriangle className="w-4 h-4" />}
              label="Risk"
              value={
                <Badge className={riskLevel.className}>{riskLevel.label}</Badge>
              }
            />

            <InfoStat
              icon={<FileWarning className="w-4 h-4" />}
              label="Dead Files"
              value={deadCount}
            />

            <InfoStat
              icon={<GitBranch className="w-4 h-4" />}
              label="Cycles"
              value={circularCount}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Flame className="w-4 h-4 text-orange-500" />

              <span>Critical Files</span>
            </div>

            <div className="space-y-2">
              {topFiles.map((file) => (
                <button
                  key={file.fileId}
                  onClick={() => setSelectedFile(file.fileId)}
                  className="w-full rounded-xl border bg-muted/30 px-3 py-2 text-left hover:bg-muted transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium break-all">
                      {file.fileId.replace(/^file::/, "")}
                    </p>

                    <Badge variant="secondary" className="shrink-0">
                      {file.score}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {deadFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FileWarning className="w-4 h-4 text-red-500" />

                <span>Dead Files</span>
              </div>

              <ScrollArea className="h-40 rounded-xl border bg-muted/20">
                <div className="p-2 space-y-2">
                  {deadFiles.slice(0, 30).map((file) => {
                    const cleanPath = file.replace(/^file::/, "");

                    return (
                      <button
                        key={file}
                        onClick={() => onFileChange(cleanPath)}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-muted transition-colors break-all"
                      >
                        {cleanPath}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
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

function InfoStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-muted/20 px-3 py-3">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}

        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>

      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
