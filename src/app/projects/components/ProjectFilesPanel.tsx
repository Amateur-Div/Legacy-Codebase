"use client";

import React, { useCallback, useMemo, useState } from "react";
import { FolderSearch, FolderInput } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNavigator } from "./Breadcrumbs";
import { useDebouncedCallback } from "use-debounce";
import dynamic from "next/dynamic";

const GlobalSearch = dynamic(() => import("./GlobalSearch"), {
  ssr: false,
  loading: () => (
    <div className="h-10 w-full rounded-md border bg-muted animate-pulse" />
  ),
});

const ProjectTree = dynamic(() => import("@/components/ProjectTree"), {
  ssr: false,
  loading: () => (
    <div className="space-y-2">
      <div className="h-4 w-40 rounded bg-muted animate-pulse" />
      <div className="h-4 w-52 rounded bg-muted" />
      <div className="h-4 w-32 rounded bg-muted" />
    </div>
  ),
});

interface ProjectFilesPanelProps {
  project: any;
  searchTerm: string;
  fileTree: any;
  handleFileClick: (path: string) => void;
  setSelectedPath: React.Dispatch<React.SetStateAction<string | null>>;
  setLine: React.Dispatch<React.SetStateAction<number | null>>;
  setSearchTerm: (value: string) => void;
  entryPoints: string[];
  selectedPath?: string | null;
}

export default function ProjectFilesPanel({
  project,
  searchTerm,
  handleFileClick,
  fileTree,
  setSearchTerm,
  setLine,
  entryPoints,
  selectedPath,
}: ProjectFilesPanelProps) {
  const [localSearch, setLocalSearch] = useState(searchTerm);

  const resolvedTree = useMemo(
    () => fileTree || project.fileTree,
    [fileTree, project.fileTree],
  );

  const debouncedSearch = useDebouncedCallback((value: string) => {
    setSearchTerm(value);
  }, 250);

  const handleBreadcrumbClick = useCallback(
    (path: string) => handleFileClick(path),
    [handleFileClick],
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="sticky top-0 z-10 -mx-4 mb-5 flex shrink-0 items-center gap-2 border-b bg-card px-4 pb-4 sm:-mx-6 sm:px-6">
        <FolderSearch className="h-4 w-4 shrink-0 text-primary" />

        <span className="text-sm font-semibold text-foreground">
          Project Files
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1 sm:gap-6">
        <Input
          type="text"
          placeholder="Search files by name..."
          value={localSearch}
          onChange={(e) => {
            const value = e.target.value;

            setLocalSearch(value);
            debouncedSearch(value);
          }}
          className="h-10 w-full"
        />

        {entryPoints?.length > 0 && (
          <div className="min-w-0 space-y-3">
            <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
              <FolderInput className="h-4 w-4 shrink-0 text-primary" />

              <span className="truncate">Likely Entrypoints</span>

              <span className="shrink-0 text-xs font-normal text-muted-foreground">
                ({entryPoints.length})
              </span>
            </div>

            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1 sm:max-h-48">
              {entryPoints.map((entry: any, i: number) => {
                const path = entry.path || entry;

                return (
                  <Badge
                    key={`${path}-${i}`}
                    variant="outline"
                    className="
                      flex
                      min-w-0
                      max-w-full
                      cursor-pointer
                      items-center
                      gap-2
                      bg-muted/50
                      px-3
                      py-1
                      text-xs
                      font-medium
                      text-muted-foreground
                      transition-colors
                      hover:bg-accent
                    "
                    onClick={() => handleFileClick(path)}
                  >
                    <span
                      className="
                        min-w-0
                        max-w-[calc(100vw-9rem)]
                        truncate
                        sm:max-w-[180px]
                      "
                      title={path}
                    >
                      {path}
                    </span>

                    {entry.score != null && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                        {entry.score}%
                      </span>
                    )}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {selectedPath && (
          <div className="min-w-0 overflow-hidden">
            <BreadcrumbNavigator
              fileTree={resolvedTree}
              selectedPath={selectedPath}
              onFileClick={handleBreadcrumbClick}
            />
          </div>
        )}

        <div className="min-w-0">
          <GlobalSearch
            projectId={project.projectId}
            setLine={setLine}
            handleFileClick={handleFileClick}
          />
        </div>

        <div className="min-w-0">
          <ProjectTree
            fileTree={resolvedTree}
            onFileClick={handleFileClick}
            selectedPath={selectedPath}
          />
        </div>
      </div>
    </div>
  );
}
