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

  return (
    <div className="min-w-0">
      <div
        className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer transition-colors min-w-0 ${
          isSelected ? "bg-primary/10 text-primary" : "hover:bg-accent"
        }`}
        style={{
          paddingLeft: `${depth * 14 + 10}px`,
        }}
        onClick={handleClick}
      >
        <div className="w-4 shrink-0 flex justify-center">
          {isFolder ? (
            expanded ? (
              <ChevronDown
                size={14}
                className="text-muted-foreground transition-transform"
              />
            ) : (
              <ChevronRight
                size={14}
                className="text-muted-foreground transition-transform"
              />
            )
          ) : (
            <FileText size={14} className="text-muted-foreground" />
          )}
        </div>

        {isFolder && (
          <div className="w-4 shrink-0 flex justify-center">
            <Folder
              size={16}
              className="text-yellow-500 dark:text-yellow-400"
            />
          </div>
        )}

        <span
          className={`text-sm truncate min-w-0 ${
            isFolder ? "font-medium text-primary" : "text-muted-foreground"
          }`}
        >
          {node.name}
        </span>
      </div>

      {expanded &&
        node.children?.map((child) => (
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
    <div className="rounded-xl border bg-background flex-1 min-h-0 overflow-auto">
      <div className="p-2 space-y-1">
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
