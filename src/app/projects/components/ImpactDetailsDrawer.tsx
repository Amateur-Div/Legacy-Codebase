"use client";

import { useMemo } from "react";
import type { FlowGraph } from "@/app/api/lib/analyzer/types";

import {
  findApiImpactFromFile,
  findFileImpact,
} from "@/app/api/lib/impactEngine";

import { AlertTriangle, FileCode2, Network, PlugZap, X } from "lucide-react";

type Props = {
  graph: FlowGraph;
  fileId: string;
  onClose: () => void;
};

export function ImpactDetailsDrawer({ graph, fileId, onClose }: Props) {
  const impactedFiles = useMemo(
    () => findFileImpact(graph, fileId).filter((f) => f !== fileId),
    [graph, fileId],
  );

  const impactedApis = useMemo(
    () => findApiImpactFromFile(graph, fileId),
    [graph, fileId],
  );

  const importance = useMemo(
    () =>
      graph.meta?.intelligence?.importanceRanking?.find(
        (f) => f.fileId === fileId,
      )?.score || 0,
    [graph, fileId],
  );

  const isInCycle = useMemo(
    () =>
      graph.meta?.intelligence?.circularDependencies?.some((cycle) =>
        cycle.includes(fileId),
      ) || false,
    [graph, fileId],
  );

  const cleanFileName = fileId.replace(/^file::/, "");

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] border-l bg-background shadow-2xl">
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3 border-b px-6 py-5">
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-lg font-semibold">Impact Details</h2>

            <p className="text-xs text-muted-foreground break-all">
              {cleanFileName}
            </p>
          </div>

          <button
            onClick={onClose}
            className="shrink-0 rounded-md p-2 hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <InfoCard
              icon={<Network className="h-4 w-4" />}
              label="Importance"
              value={importance}
            />

            <InfoCard
              icon={<AlertTriangle className="h-4 w-4" />}
              label="Circular"
              value={isInCycle ? "Yes" : "No"}
            />
          </div>

          <SectionCard
            title="Impacted Files"
            icon={<FileCode2 className="h-4 w-4" />}
          >
            {impactedFiles.length === 0 ? (
              <EmptyState text="No impacted files found" />
            ) : (
              <ul className="space-y-2">
                {impactedFiles.map((file) => (
                  <li
                    key={file}
                    className="rounded-lg border bg-muted/30 px-3 py-2 text-sm break-all"
                  >
                    {file.replace(/^file::/, "")}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard
            title="Impacted APIs"
            icon={<PlugZap className="h-4 w-4" />}
          >
            {impactedApis.length === 0 ? (
              <EmptyState text="No impacted APIs found" />
            ) : (
              <ul className="space-y-2">
                {impactedApis.map((api) => (
                  <li
                    key={api}
                    className="rounded-lg border bg-muted/30 px-3 py-2 text-sm break-all"
                  >
                    {api}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}

        <span className="text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>

      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        {icon}

        <h3 className="font-semibold text-sm">{title}</h3>
      </div>

      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
