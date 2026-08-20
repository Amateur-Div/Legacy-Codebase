"use client";

import React, { memo, useCallback, useState } from "react";
import { Folder, FileText, ChevronDown, ChevronRight } from "lucide-react";

type FileNode = {
  name: string;
  type: "file" | "folder";
  fullPath?: string;
  children?: FileNode[];
};

interface TreeNodeProps {
  node: FileNode;
  onFileClick: (path: string) => void;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  selectedPath?: string | null;
  depth?: number;
}

const TreeNode = memo(function TreeNode({
  node,
  onFileClick,
  expandedFolders,
  toggleFolder,
  selectedPath,
  depth = 0,
}: TreeNodeProps) {
  const isFolder = node.type === "folder";
  const folderPath = node.fullPath || `${depth}-${node.name}`;
  const expanded = expandedFolders.has(folderPath);
  const isSelected = node.fullPath === selectedPath;

  const handleClick = () => {
    if (isFolder) {
      toggleFolder(folderPath);
    } else if (node.fullPath) {
      onFileClick(node.fullPath);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <div className="min-w-0">
      <div
        role="treeitem"
        aria-expanded={isFolder ? expanded : undefined}
        aria-selected={isSelected}
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={[
          "group",
          "flex min-w-0 items-center gap-1.5",
          "min-h-9 rounded-md",
          "px-2 py-1.5",
          "cursor-pointer select-none",
          "transition-colors duration-150",
          "focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-primary/50",
          isSelected ? "bg-primary/10 text-primary" : "hover:bg-accent",
        ].join(" ")}
        style={{
          paddingLeft: `clamp(6px, ${depth * 12 + 8}px, 120px)`,
        }}
      >
        <div className="flex h-5 w-5 shrink-0 items-center justify-center">
          {isFolder ? (
            expanded ? (
              <ChevronDown
                size={15}
                className="text-muted-foreground transition-transform"
              />
            ) : (
              <ChevronRight
                size={15}
                className="text-muted-foreground transition-transform"
              />
            )
          ) : (
            <FileText size={15} className="text-muted-foreground" />
          )}
        </div>

        {isFolder && (
          <div className="flex h-5 w-5 shrink-0 items-center justify-center">
            <Folder
              size={16}
              className="text-yellow-500 dark:text-yellow-400"
            />
          </div>
        )}

        <span
          className={[
            "min-w-0 flex-1 truncate text-sm",
            isFolder ? "font-medium text-primary" : "text-muted-foreground",
          ].join(" ")}
          title={node.name}
        >
          {node.name}
        </span>
      </div>

      {expanded && node.children?.length ? (
        <div role="group">
          {node.children.map((child) => (
            <TreeNode
              key={child.fullPath || child.name}
              node={child}
              onFileClick={onFileClick}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              selectedPath={selectedPath}
              depth={depth + 1}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
});

interface ProjectTreeProps {
  fileTree: FileNode[];
  onFileClick: (path: string) => void;
  selectedPath?: string | null;
}

export default function ProjectTree({
  fileTree,
  onFileClick,
  selectedPath,
}: ProjectTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () =>
      new Set(
        fileTree
          .filter((node) => node.type === "folder")
          .slice(0, 3)
          .map((node) => node.fullPath || node.name),
      ),
  );

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);

      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }

      return next;
    });
  }, []);

  return (
    <div
      role="tree"
      aria-label="Project file tree"
      className="
        min-h-0
        flex-1
        overflow-auto
        rounded-xl
        border
        bg-background
      "
    >
      <div className="min-w-0 space-y-0.5 p-2">
        {fileTree.map((node) => (
          <TreeNode
            key={node.fullPath || node.name}
            node={node}
            onFileClick={onFileClick}
            expandedFolders={expandedFolders}
            toggleFolder={toggleFolder}
            selectedPath={selectedPath}
          />
        ))}
      </div>
    </div>
  );
}
