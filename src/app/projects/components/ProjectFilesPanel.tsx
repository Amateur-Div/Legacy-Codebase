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
    <div className="h-10 rounded-md border bg-muted animate-pulse" />
  ),
});

const ProjectTree = dynamic(() => import("@/components/ProjectTree"), {
  ssr: false,
  loading: () => (
    <div className="space-y-2">
      <div className="h-4 w-40 rounded bg-muted animate-pulse" />
      <div className="h-4 w-52 rounded bg-muted animate-pulse" />
      <div className="h-4 w-32 rounded bg-muted animate-pulse" />
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
    <div className="bg-card border rounded-2xl p-6 shadow-sm h-full w-full flex flex-col min-h-0">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <FolderSearch className="w-4 h-4 text-primary" />
        <span>Project Files</span>
      </div>

      <div className="space-y-6 overflow-y-auto pr-1 flex-1 min-h-0">
        <Input
          type="text"
          placeholder="Search files by name..."
          value={localSearch}
          onChange={(e) => {
            const value = e.target.value;
            setLocalSearch(value);
            debouncedSearch(value);
          }}
          className="w-full max-w-md"
        />

        {entryPoints?.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FolderInput className="w-4 h-4 text-primary" />

              <span>Likely Entrypoints</span>

              <span className="text-xs font-normal text-muted-foreground">
                ({entryPoints.length})
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {entryPoints.slice(0, 5).map((entry: any, i: number) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="flex items-center gap-2 bg-muted/50 text-muted-foreground text-xs font-medium hover:bg-accent transition-colors px-3 py-1"
                >
                  <span className="truncate max-w-[180px]">
                    {entry.path || entry}
                  </span>

                  {entry.score && (
                    <span className="text-[10px] rounded-full bg-primary/10 text-primary px-1.5 py-0.5">
                      {entry.score}
                    </span>
                  )}
                </Badge>
              ))}

              {entryPoints.length > 5 && (
                <Badge variant="secondary" className="px-2 py-1">
                  +{entryPoints.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {selectedPath && (
          <BreadcrumbNavigator
            fileTree={resolvedTree}
            selectedPath={selectedPath}
            onFileClick={handleBreadcrumbClick}
          />
        )}

        <GlobalSearch
          projectId={project.projectId}
          setLine={setLine}
          handleFileClick={handleFileClick}
        />

        <ProjectTree
          fileTree={resolvedTree}
          onFileClick={handleFileClick}
          selectedPath={selectedPath}
        />
      </div>
    </div>
  );
}
