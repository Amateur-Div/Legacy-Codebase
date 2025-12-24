import React, { useState } from "react";
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

export const BreadcrumbNavigator: React.FC<Props> = ({
  fileTree,
  selectedPath,
  onFileClick,
}) => {
  const pathParts = selectedPath ? selectedPath.split("/") : [];

  const getNodeByPath = (
    tree: FileNode[],
    pathParts: string[]
  ): FileNode | null => {
    let currentLevel = tree;
    let currentNode: FileNode | null = null;

    for (const part of pathParts) {
      const found = currentLevel.find((node) => node.name === part);
      if (!found || found.type !== "folder") return null;
      currentNode = found;
      currentLevel = found.children || [];
    }

    return currentNode;
  };

  const getChildren = (pathParts: string[], tree: FileNode[]): FileNode[] => {
    if (pathParts.length === 0) return tree;
    const node = getNodeByPath(tree, pathParts);
    return node?.children || [];
  };

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );

  const toggleFolder = (
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    path: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      newSet.has(path) ? newSet.delete(path) : newSet.add(path);
      return newSet;
    });
  };

  const renderMenuItems = (
    children: FileNode[],
    basePath: string[] = [],
    depth = 0
  ) => {
    return children.map((child) => {
      const newPath = [...basePath, child.name];
      const pathStr = newPath.join("/");
      const indent = { paddingLeft: `${depth * 1.25}rem` };

      if (child.type === "folder") {
        const isOpen = expandedFolders.has(pathStr);

        return (
          <div key={pathStr}>
            <DropdownMenuItem
              onClick={(e) => toggleFolder(e, pathStr)}
              className="flex items-center gap-2 cursor-pointer select-none"
              style={indent}
            >
              <Folder className="w-4 h-4" />
              <span className="truncate">{child.name}</span>
              {isOpen ? (
                <ChevronUp className="w-3 h-3 ml-auto opacity-60" />
              ) : (
                <ChevronDown className="w-3 h-3 ml-auto opacity-60" />
              )}
            </DropdownMenuItem>

            {isOpen && child.children && child.children?.length > 0 && (
              <div className="ml-2 border-l border-muted">
                {renderMenuItems(child.children, newPath, depth + 1)}
              </div>
            )}
          </div>
        );
      }

      return (
        <DropdownMenuItem
          key={pathStr}
          onClick={() => onFileClick(child.fullPath!)}
          className="flex items-center gap-2 cursor-pointer select-none"
          style={indent}
        >
          <FileText className="w-4 h-4" />
          <span className="truncate">{child.name}</span>
        </DropdownMenuItem>
      );
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1 text-sm">
      {pathParts.map((part, index) => {
        const currentPathParts = pathParts.slice(0, index + 1);
        const children = getChildren(currentPathParts, fileTree);

        return (
          <div key={index} className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="font-medium hover:underline outline-none text-muted-foreground truncate max-w-[150px]">
                  {part}
                </button>
              </DropdownMenuTrigger>

              {children.length > 0 && (
                <DropdownMenuContent
                  className="w-64 max-h-[400px] p-2 bg-slate-50 overflow-auto"
                  align="center"
                >
                  {renderMenuItems(children, currentPathParts)}
                </DropdownMenuContent>
              )}
            </DropdownMenu>

            {index < pathParts.length - 1 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        );
      })}
    </div>
  );
};
