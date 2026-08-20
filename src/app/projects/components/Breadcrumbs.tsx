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
              className="
                flex
                min-w-0
                cursor-pointer
                items-center
                gap-2
                rounded-md
                py-2
                focus:bg-accent
              "
              style={{
                paddingLeft: `${Math.min(depth * 14 + 10, 100)}px`,
              }}
            >
              <Folder className="h-4 w-4 shrink-0 text-yellow-500" />

              <span className="min-w-0 flex-1 truncate" title={child.name}>
                {child.name}
              </span>

              {isOpen ? (
                <ChevronUp className="h-3.5 w-3.5 shrink-0 opacity-60" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
              )}
            </DropdownMenuItem>

            {isOpen && child.children && child.children.length > 0 && (
              <div className="ml-3 border-l pl-1">
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
          className="
            flex
            min-w-0
            cursor-pointer
            items-center
            gap-2
            rounded-md
            py-2
            focus:bg-accent
          "
          style={{
            paddingLeft: `${Math.min(depth * 14 + 10, 100)}px`,
          }}
        >
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />

          <span className="min-w-0 flex-1 truncate" title={child.name}>
            {child.name}
          </span>
        </DropdownMenuItem>
      );
    });
  };

  return (
    <div
      className="
        w-full
        overflow-x-auto
        rounded-xl
        border
        bg-muted/30
        px-2
        py-2
        sm:px-3
      "
    >
      <div className="flex min-w-max items-center gap-1 text-sm">
        {pathParts.map((part, index) => {
          const currentPathParts = pathParts.slice(0, index + 1);
          const children = getChildren(currentPathParts);
          const isLast = index === pathParts.length - 1;

          return (
            <React.Fragment key={`${part}-${index}`}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    title={part}
                    className="
                      max-w-[120px]
                      truncate
                      rounded-md
                      px-2
                      py-1.5
                      text-muted-foreground
                      transition-colors
                      hover:bg-accent
                      hover:text-foreground
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-primary/50
                      sm:max-w-[180px]
                    "
                  >
                    {part}
                  </button>
                </DropdownMenuTrigger>

                {children.length > 0 && (
                  <DropdownMenuContent
                    align="start"
                    className="
                      w-[min(18rem,calc(100vw-2rem))]
                      max-h-[min(420px,60vh)]
                      overflow-y-auto
                      rounded-xl
                      border
                      bg-white
                      p-1
                      text-popover-foreground
                      shadow-xl
                    "
                  >
                    {renderMenuItems(children, currentPathParts)}
                  </DropdownMenuContent>
                )}
              </DropdownMenu>

              {!isLast && (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
});
