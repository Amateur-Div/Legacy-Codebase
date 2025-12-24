"use client";

import React from "react";
import { FolderSearch, FolderInput, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ProjectTree from "@/components/ProjectTree";
import GlobalSearch from "./GlobalSearch";
import { BreadcrumbNavigator } from "./Breadcrumbs";

interface ProjectFilesPanelProps {
  project: any;
  searchTerm: string;
  fileTree: any;
  handleFileClick: (path: string) => void;
  setSelectedPath: any;
  setLine: any;
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
  setSelectedPath,
  entryPoints,
  selectedPath,
}: ProjectFilesPanelProps) {
  const pathParts = selectedPath
    ? selectedPath.split("\\").map((name, index, arr) => {
        const fullPath = arr.slice(0, index + 1).join("\\");
        return {
          name,
          fullPath,
          clickable: index !== arr.length - 1,
        };
      })
    : [];

  return (
    <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <FolderSearch className="w-4 h-4 text-primary" />
        <span>Project Files</span>
      </div>

      <Input
        type="text"
        placeholder="Search files by name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full max-w-md"
      />

      {entryPoints?.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
            <FolderInput className="w-4 h-4 text-primary" />
            Entry Points
          </div>
          <div className="flex flex-wrap gap-2">
            {entryPoints.map((entry, i) => (
              <Badge
                key={i}
                variant="outline"
                className="bg-muted text-muted-foreground text-xs font-medium hover:bg-accent"
              >
                {entry}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {selectedPath && (
        <BreadcrumbNavigator
          fileTree={fileTree}
          selectedPath={selectedPath}
          onFileClick={handleFileClick}
        />
      )}

      <GlobalSearch
        projectId={project.projectId}
        setFile={setSelectedPath}
        setLine={setLine}
        handleFileClick={handleFileClick}
      />

      <ProjectTree
        fileTree={fileTree || project.fileTree}
        onFileClick={handleFileClick}
      />
    </div>
  );
}
