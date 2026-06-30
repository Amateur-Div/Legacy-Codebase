"use client";

import React, { memo, useCallback, useMemo, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  ChevronRight,
  Folder,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type FileNode = {
  name: string;
  type: "file" | "folder";
  fullPath?: string;
  children?: FileNode[];
};

type Props = {
  fileTree: FileNode[];

  selectedPath: string;

  onFileClick: (fullPath: string) => void;
};

export const BreadcrumbNavigator = memo(function BreadcrumbNavigator({
  fileTree,
  selectedPath,
  onFileClick,
}: Props) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );

  const pathParts = useMemo(
    () => (selectedPath ? selectedPath.split("/") : []),
    [selectedPath],
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

  const getChildren = useCallback(
    (targetPath: string[]): FileNode[] => {
      let current = fileTree;

      for (const part of targetPath) {
        const found = current.find(
          (node) => node.name === part && node.type === "folder",
        );

        if (!found) {
          return [];
        }

        current = found.children || [];
      }

      return current;
    },
    [fileTree],
  );

  const renderMenuItems = (
    children: FileNode[],
    basePath: string[] = [],
    depth = 0,
  ): React.ReactNode => {
    return children.map((child) => {
      const newPath = [...basePath, child.name];

      const pathStr = newPath.join("/");

      if (child.type === "folder") {
        const isOpen = expandedFolders.has(pathStr);

        return (
          <div key={pathStr}>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();

                toggleFolder(pathStr);
              }}
              className="flex items-center gap-2 cursor-pointer"
              style={{
                paddingLeft: `${depth * 16 + 10}px`,
              }}
            >
              <Folder className="w-4 h-4 text-yellow-500" />

              <span className="truncate flex-1">{child.name}</span>

              {isOpen ? (
                <ChevronUp className="w-3 h-3 opacity-60" />
              ) : (
                <ChevronDown className="w-3 h-3 opacity-60" />
              )}
            </DropdownMenuItem>

            {isOpen && child.children && child.children.length > 0 && (
              <div className="border-l ml-4">
                {renderMenuItems(child.children, newPath, depth + 1)}
              </div>
            )}
          </div>
        );
      }

      return (
        <DropdownMenuItem
          key={pathStr}
          onClick={() => {
            if (child.fullPath) {
              onFileClick(child.fullPath);
            }
          }}
          className="flex items-center gap-2 cursor-pointer"
          style={{
            paddingLeft: `${depth * 16 + 10}px`,
          }}
        >
          <FileText className="w-4 h-4 text-muted-foreground" />

          <span className="truncate flex-1">{child.name}</span>
        </DropdownMenuItem>
      );
    });
  };

  return (
    <div className="rounded-xl border bg-muted/30 px-3 py-2 overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max text-sm">
        {pathParts.map((part, index) => {
          const currentPathParts = pathParts.slice(0, index + 1);

          const children = getChildren(currentPathParts);

          return (
            <React.Fragment key={`${part}-${index}`}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="max-w-[180px] truncate rounded-md px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                    {part}
                  </button>
                </DropdownMenuTrigger>

                {children.length > 0 && (
                  <DropdownMenuContent
                    align="start"
                    className="w-72 max-h-[420px] overflow-y-auto p-1 rounded-xl bg-white text-popover-foreground border shadow-xl"
                  >
                    {renderMenuItems(children, currentPathParts)}
                  </DropdownMenuContent>
                )}
              </DropdownMenu>

              {index < pathParts.length - 1 && (
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
});
