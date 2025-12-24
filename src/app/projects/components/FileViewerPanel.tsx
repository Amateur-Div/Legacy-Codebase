"use client";

import React, {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FileText,
  BookText,
  FileWarning,
  ListTodo,
  Badge,
  FileDownIcon,
  MoreVertical,
  Trash2,
  Pencil,
  Clipboard,
  PlusIcon,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { atomDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import RenameFileDialog from "./FileRenameDialog";
import { ObjectId } from "bson";
import { getAuth } from "firebase/auth";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import ProjectAnalyzer from "@/app/projects/components/ProjectAnalyzer";
import { useProjectPresence } from "../context/ProjectPresenceContext";

interface FileViewerPanelProps {
  projectId: number | ObjectId;
  project: JSON | any;
  setProject: (data: JSON) => JSON | void;
  selectedPath: string | null;
  handleFileClick: (path: string) => void;
  setSelectedPath: (filePath: string | null) => string | void;
  fileContent: string;
  fileTree: any[];
  setFilteredFileTree: (tree: any[]) => any[] | void;
  selectedFileNode: any;
  lineNumber: number | null;
  readmeContent: string | null;
  readmeSummary: string | null;
  detectLanguage: (filePath: string) => string;
}

export default function FileViewerPanel({
  projectId,
  selectedPath,
  project,
  fileContent,
  handleFileClick,
  setSelectedPath,
  fileTree,
  setProject,
  selectedFileNode,
  lineNumber,
  readmeContent,
  readmeSummary,
  detectLanguage,
}: FileViewerPanelProps) {
  const { targetLineNumber, setTargetLineNumber } = useAuth();
  const { setActiveFile } = useProjectPresence();
  const [searchTerm, setSearchTerm] = useState<any>("");
  const codeContainerRef = useRef<HTMLDivElement | null>(null);
  const [lastScrolledLine, setLastScrolledLine] = useState<number | null>(null);
  const [renameInputOpen, setRenameInputOpen] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [hoveredLinePos, setHoveredLinePos] = useState<number | null>(null);
  const [openCommentDialog, setOpenCommentDialog] = useState<{
    open: boolean;
    line: number | null;
  }>({
    open: false,
    line: null,
  });
  const [comments, setComments] = useState<Record<number, string[]> | null>();
  const [commentText, setCommentText] = useState("");
  const [commentPositions, setCommentPositions] = useState<
    Record<number, { top: number; left: number }>
  >({});
  const [commentHeights, setCommentHeights] = useState<Record<number, number>>(
    {}
  );
  const commentRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [innerScrollLeft, setInnerScrollLeft] = useState(0);
  const innerPreRef = useRef<HTMLElement | null>(null);
  const [foldedRanges, setFoldedRanges] = useState<Set<string>>(new Set());
  const [foldPositions, setFoldPositions] = useState<
    Record<string, { toggleTop: number; placeholderTop: number }>
  >({});
  const [showDocs, setShowDocs] = useState(false);
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({
    nodes: [],
    edges: [],
  });

  const COMMENT_ROW_HEIGHT = 18;
  const COMMENT_GAP = 6;
  const PRE_PADDING_LEFT = 16;
  const GUTTER_WIDTH = 40;

  useEffect(() => {
    setActiveFile(selectedPath!);
  }, [selectedPath]);

  useEffect(() => {
    const pre = codeContainerRef.current?.querySelector("pre");
    if (pre) {
      innerPreRef.current = pre as HTMLElement;

      const handleScroll = () => {
        setInnerScrollLeft(pre.scrollLeft);
      };

      pre.addEventListener("scroll", handleScroll, { passive: true });
      handleScroll();

      return () => {
        pre.removeEventListener("scroll", handleScroll);
      };
    }
  }, [fileContent]);

  const foldBlocks = useMemo(() => {
    if (!selectedFileNode) return [];
    const candidates: any[] = [];

    [
      "functions",
      "classes",
      "components",
      "exports",
      "blocks",
      "apis",
      "schemas",
    ].forEach((k) => {
      const arr = selectedFileNode[k] || [];
      arr.forEach((it: any) => {
        const start = it.start ?? it.loc ?? null;
        const end = it.end ?? null;
        if (
          typeof start === "number" &&
          typeof end === "number" &&
          end > start
        ) {
          candidates.push({
            name: it.name,
            start,
            end,
            kind: k,
          });
        }
      });
    });

    const map = new Map<string, any>();
    candidates
      .sort((a, b) => a.start - b.start || a.end - b.end)
      .forEach((c) => {
        if (c.end <= c.start) return;

        const existing = Array.from(map.values()).find(
          (b) =>
            (b.start == c.start && b.end === c.end) ||
            (b.end === c.end && b.start < c.start)
        );

        if (!existing) {
          map.set(`${c.start}-${c.end}`, c);
        }
      });

    return Array.from(map.values()).sort((a, b) => a.start - b.start);
  }, [selectedFileNode]);

  useLayoutEffect(() => {
    const container = codeContainerRef.current;
    if (!container) return;

    const compute = () => {
      const next: Record<number, { top: number; left: number }> = {};
      Object.keys(comments ?? {}).forEach((lnStr) => {
        const ln = Number(lnStr);
        const el = container.querySelector(
          `[data-line-number="${ln}"]`
        ) as HTMLElement | null;
        if (!el) return;
        next[ln] = { top: el.offsetTop + el.offsetHeight, left: el.offsetLeft };
      });
      setCommentPositions(next);
    };

    compute();

    const ro = new ResizeObserver(compute);
    ro.observe(container);

    return () => ro.disconnect();
  }, [comments, fileContent, showRawData, selectedPath]);

  useLayoutEffect(() => {
    const next: Record<number, number> = {};
    Object.entries(commentRefs.current).forEach(([ln, node]) => {
      if (node) next[Number(ln)] = node.offsetHeight;
    });
    setCommentHeights(next);
  }, [commentPositions, comments]);

  useLayoutEffect(() => {
    const container = codeContainerRef.current;
    if (!container) return;

    const next: Record<string, { toggleTop: number; placeholderTop: number }> =
      {};

    foldBlocks.forEach((block) => {
      const el = container.querySelector(
        `[data-line-number="${block.start}"]`
      ) as HTMLElement | null;
      if (!el) return;
      const toggleTop =
        el.offsetTop + Math.max(2, Math.round(el.offsetHeight / 6));
      const placeholderTop = el.offsetTop + el.offsetHeight;
      next[`${block.start}-${block.end}`] = { toggleTop, placeholderTop };
    });

    setFoldPositions(next);
  }, [
    foldBlocks,
    comments,
    fileContent,
    showRawData,
    foldedRanges,
    selectedPath,
  ]);

  useEffect(() => {
    const getComment = async () => {
      try {
        const token = await getAuth().currentUser?.getIdToken();

        const res = await fetch(
          `/api/comments?projectId=${projectId}&filePath=${selectedPath}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();
        const grouped: { [line: number]: string[] } = {};
        data.forEach((c: any) => {
          if (!grouped[c.lineNumber]) grouped[c.lineNumber] = [];
          grouped[c.lineNumber].push(c.text);
        });

        setComments(grouped);
      } catch (error) {
        console.log("Error fetching comments : ", error);
      }
    };

    getComment();
  }, [selectedPath]);

  const addComment = async () => {
    if (!openCommentDialog.line) return;
    await fetch("/api/comments", {
      method: "POST",
      body: JSON.stringify({
        projectId,
        filePath: selectedPath,
        lineNumber: openCommentDialog.line,
        text: commentText,
      }),
    });

    setComments((prev) => {
      const copy = { ...(prev ?? {}) };
      const ln = openCommentDialog.line!;
      copy[ln] = copy[ln] ? [...copy[ln], commentText] : [commentText];
      return copy;
    });

    setCommentText("");
    setOpenCommentDialog({ open: false, line: null });
  };

  const downloadFile = () => {
    const blob = new Blob([fileContent], { type: "text/plain; charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedPath?.split("/").pop() || "file.txt";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const debounce = (fn: Function, delay: number) => {
    let timer: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const debouncedScroll = debounce((line: number) => {
    scrollToLine(line);
  }, 200);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);

    if (!term.trim()) {
      setTargetLineNumber(null);
      setLastScrolledLine(null);
      return;
    }

    const lines = fileContent.split("\n");
    const matchIndex = lines.findIndex((line) =>
      line.toLowerCase().includes(term.toLowerCase())
    );

    if (matchIndex !== -1) {
      const newLine = matchIndex + 1;
      setTargetLineNumber(newLine);

      if (newLine !== lastScrolledLine) {
        setLastScrolledLine(newLine);
        debouncedScroll(newLine);
      }
    } else {
      setTargetLineNumber(null);
      setLastScrolledLine(null);
    }
  };

  const scrollToLine = (lineNumber: number) => {
    if (!codeContainerRef.current) return;

    const lineElement = codeContainerRef.current.querySelector(
      `[data-line-number="${lineNumber}"]`
    );

    if (lineElement) {
      (lineElement as HTMLElement).scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  const removeFileFromTree = (nodes: any[], targetPath: string): any[] => {
    return nodes
      .filter((node) => node.fullPath !== targetPath)
      .map((node) =>
        node.children
          ? { ...node, children: removeFileFromTree(node.children, targetPath) }
          : node
      );
  };

  const handleDeleteFile = async () => {
    const token = await getAuth().currentUser?.getIdToken();
    const res = await fetch(`/api/project/file?projectId=${projectId}`, {
      method: "DELETE",
      body: JSON.stringify({ oldPath: selectedPath }),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (data.success) {
      toast.success("file deleted successfully", {
        description: selectedPath?.split("\\").pop(),
      });
      setSelectedPath(null);

      const filteredTree = removeFileFromTree(fileTree, selectedPath!);
      setProject({
        ...project,
        fileTree: filteredTree,
      });
    } else {
      toast.error("Error deleting file", {
        description: data.error || "An error occured.",
      });
      console.log(data.error);
    }
  };

  function updateFileTreeForRename(
    nodes: any[],
    oldPath: string,
    newPath: string
  ): any {
    return nodes.map((node) => {
      if (node.fullPath === oldPath) {
        return { ...node, name: newPath, fullPath: newPath };
      }

      if (node.children) {
        return {
          ...node,
          children: updateFileTreeForRename(node.children, oldPath, newPath),
        };
      }

      return node;
    });
  }

  const handleRenameFile = async (oldPath: string, newName: string) => {
    const token = await getAuth().currentUser?.getIdToken();
    const res = await fetch(`/api/project/file?projectId=${projectId}`, {
      method: "POST",
      body: JSON.stringify({ oldPath, newName }),
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (data.success) {
      const ext = oldPath.split(".").pop();
      const dir = oldPath.substring(0, oldPath.lastIndexOf("\\"));

      const updatedName = newName.endsWith(`.${ext}`)
        ? newName
        : `${newName}.${ext}`;
      const newPath = `${dir}\\${updatedName}`;

      setSelectedPath(newPath);

      const filteredTree = updateFileTreeForRename(fileTree, oldPath, newPath);
      setProject({
        ...project,
        fileTree: filteredTree,
      });

      toast.success("File renamed.", {
        description: `${newName}`,
      });
    } else {
      toast.error("Rename failed.", {
        description: data.error || "An error occured.",
      });
    }
  };

  const handleMouseEnterLine = (lineNumber: number, top: number) => {
    setHoveredLine(lineNumber);
    setHoveredLinePos(top);
  };

  const handleMouseLeaveLine = (e: React.MouseEvent) => {
    const related = e.relatedTarget as HTMLElement | null;
    if (related?.dataset?.role === "comment-button") return;
    setHoveredLine(null);
    setHoveredLinePos(null);
  };

  useEffect(() => {
    if (lineNumber) {
      scrollToLine(lineNumber);
    }
  }, [fileContent, lineNumber]);

  const toggleFold = (key: string) => {
    setFoldedRanges((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isLineHidden = (ln: number) => {
    for (const key of foldedRanges) {
      const [sStr, eStr] = key.split("-");
      const s = Number(sStr);
      const e = Number(eStr);
      if (ln > s && ln < e) return true;
    }
    return false;
  };

  return (
    <>
      <div className="bg-card border rounded-2xl p-6 shadow-sm overflow-auto max-h-[650px]">
        {selectedPath ? (
          <>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="font-mono font-medium truncate">
                  {selectedPath}
                </span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <MoreVertical size={16} className="cursor-pointer" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 bg-white">
                  <DropdownMenuItem
                    onClick={downloadFile}
                    className="gap-2 cursor-pointer"
                  >
                    <FileDownIcon size={14} />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <FileDownIcon size={14} />
                    <a
                      href={`/api/project/file/raw?projectId=${
                        project.projectId
                      }&filePath=${encodeURIComponent(selectedPath)}`}
                      download={`/api/project/file/raw?projectId=${
                        project.projectId
                      }&filePath=${encodeURIComponent(selectedPath)}`}
                    >
                      Download Raw
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2 cursor-pointer"
                    onClick={() => {
                      setRenameInputOpen(true);
                    }}
                  >
                    <Pencil size={14} />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2 text-red-600 cursor-pointer"
                    onClick={handleDeleteFile}
                  >
                    <Trash2 size={14} />
                    Delete
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      if (selectedPath) {
                        navigator.clipboard.writeText(selectedPath);
                        toast.success("Path copied", {
                          description: selectedPath,
                        });
                      }
                    }}
                    className="gap-2 cursor-pointer"
                  >
                    <Clipboard size={14} />
                    Copy Path
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <a
                      href={`/api/project/file/raw?projectId=${
                        project.projectId
                      }&filePath=${encodeURIComponent(selectedPath)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open in New Tab
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <RenameFileDialog
                open={renameInputOpen}
                onOpenChange={setRenameInputOpen}
                oldPath={selectedPath}
                onRename={(newName) => {
                  return handleRenameFile(selectedPath, newName);
                }}
              />
            </div>

            <ProjectAnalyzer
              id={project.projectId}
              projectId={projectId}
              graphData={graphData}
              setGraphData={setGraphData}
            />

            {selectedFileNode?.language && (
              <>
                <div className="flex items-stretch gap-3">
                  <div className="flex items-baseline gap-2 text-sm text-muted-foreground mb-4">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor:
                          selectedFileNode.languageColor || "#6b7280",
                      }}
                    />
                    <span className="font-medium text-foreground">
                      {selectedFileNode.language}
                    </span>
                  </div>
                  {selectedFileNode.entry && (
                    <abbr title="Entry point">
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"></Badge>
                    </abbr>
                  )}
                </div>
              </>
            )}
            {selectedFileNode?.tags?.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs mb-4">
                {selectedFileNode?.tags?.map((tag: string, index: number) => (
                  <Badge
                    key={index}
                    className="bg-muted text-muted-foreground hover:bg-accent"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
            <div className="mb-4 flex justify-between">
              <input
                type="text"
                placeholder="Search in file..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e)}
                className="w-80 text-sm p-2 outline-none border-2 border-gray-400 rounded-lg bg-background text-foreground"
              />
              <button
                type="button"
                className="text-xs text-muted-foreground underline"
                onClick={() => setShowRawData((prev) => !prev)}
              >
                {showRawData ? "View Syntax Highlighted" : "View Raw"}
              </button>
            </div>
            <Button onClick={() => setShowDocs((prev) => !prev)}>Docs</Button>
            {selectedFileNode && (
              <details className="mb-4 border rounded-lg p-3 text-sm bg-muted">
                <summary className="cursor-pointer font-medium text-foreground">
                  Jump to...
                </summary>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  {[
                    { title: "Imports", data: selectedFileNode.imports },
                    { title: "Functions", data: selectedFileNode.functions },
                    { title: "Classes", data: selectedFileNode.classes },
                    { title: "Components", data: selectedFileNode.components },
                    { title: "Exports", data: selectedFileNode.exports },
                  ].map(
                    ({ title, data }) =>
                      data?.length > 0 && (
                        <div key={title}>
                          <h4 className="font-semibold text-muted-foreground mb-1">
                            {title}
                          </h4>
                          <ul className="space-y-1 text-muted-foreground">
                            {data.map((item: any, i: number) => (
                              <li key={i}>
                                <button
                                  onClick={() => scrollToLine(item.start)}
                                  className="hover:underline"
                                >
                                  {item.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                  )}
                </div>
              </details>
            )}

            <div>
              <Card className="mt-3 mb-3 rounded-2xl shadow-sm border border-gray-200 bg-white/60 backdrop-blur">
                <CardHeader className="pb-1">
                  <h3 className="text-base font-semibold">Cross-File Impact</h3>
                </CardHeader>

                <CardContent className="text-sm space-y-2">
                  <div>
                    <span className="font-medium text-gray-700">Imports:</span>
                    {selectedFileNode.impact.imports.length ? (
                      <ul className="list-disc ml-5 mt-1 text-gray-600">
                        {selectedFileNode.impact.imports.map((imp: string) => (
                          <li
                            className="cursor-pointer hover:underline hover:text-gray-800"
                            key={imp}
                            onClick={() => setSelectedPath(imp)}
                          >
                            {imp}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-400 ml-2">None</p>
                    )}
                  </div>

                  <div>
                    <span className="font-medium text-gray-700">Used By:</span>
                    {selectedFileNode.impact.usedBy.length ? (
                      <ul className="list-disc ml-5 mt-1 text-gray-600">
                        {selectedFileNode.impact.usedBy.map((file: string) => (
                          <li
                            className="cursor-pointer hover:underline hover:text-gray-800"
                            key={file}
                            onClick={() => setSelectedPath(file)}
                          >
                            {file}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-400 ml-2">None</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div
              ref={codeContainerRef}
              className="relative rounded-lg border max-h-[800px] border-border overflow-auto"
              style={{ overflowX: "auto" }}
              onMouseLeave={() => {
                setHoveredLine(null);
                setHoveredLinePos(null);
              }}
            >
              {showRawData ? (
                <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded max-w-full overflow-auto">
                  {fileContent}
                </pre>
              ) : (
                <SyntaxHighlighter
                  language={detectLanguage(selectedPath)}
                  style={atomDark}
                  showLineNumbers
                  wrapLines
                  lineProps={(lineNumber) => {
                    if (isLineHidden(lineNumber)) {
                      return {
                        "data-line-number": lineNumber,
                        style: {
                          display: "none",
                        },
                      };
                    }

                    const padBottom =
                      comments && comments[lineNumber]?.length > 0
                        ? comments[lineNumber].length * COMMENT_ROW_HEIGHT +
                          COMMENT_GAP
                        : 0;

                    return {
                      "data-line-number": lineNumber,
                      onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
                        if (!codeContainerRef.current) return;

                        const lineRect = (
                          e.currentTarget as HTMLElement
                        ).getBoundingClientRect();
                        const containerRect =
                          codeContainerRef.current.getBoundingClientRect();
                        const top =
                          lineRect.top -
                          containerRect.top +
                          codeContainerRef.current.scrollTop;

                        handleMouseEnterLine(lineNumber, top);
                      },
                      onMouseLeave: handleMouseLeaveLine,
                      className: "group",
                      style: {
                        display: "block",
                        width: "100%",
                        position: "relative",
                        paddingRight: "2rem",
                        caretColor: "transparent",
                        paddingBottom: padBottom,
                        backgroundColor:
                          typeof targetLineNumber === "number" &&
                          lineNumber === targetLineNumber
                            ? "rgba(255,255,0,0.3)"
                            : "transparent",
                      },
                    };
                  }}
                  customStyle={{
                    fontSize: "0.85rem",
                    margin: 0,
                    padding: "1rem",
                    borderRadius: "0.5rem",
                    lineHeight: "1.6",
                    position: "relative",
                  }}
                  lineNumberStyle={{
                    minWidth: `${GUTTER_WIDTH}px`,
                    marginRight: "0.8rem",
                  }}
                >
                  {fileContent}
                </SyntaxHighlighter>
              )}

              {foldBlocks.map((block) => {
                const key = `${block.start}-${block.end}`;
                const pos = foldPositions[key];
                if (!pos) return null;
                const isFolded = foldedRanges.has(key);

                return (
                  <button
                    key={`fold-toggle-${key}`}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFold(key);
                    }}
                    className="absolute rounded pl-1 pt-0.5 opacity-0 hover:opacity-100 transition-opacity"
                    style={{
                      left:
                        PRE_PADDING_LEFT + GUTTER_WIDTH - 10 - innerScrollLeft,
                      top: pos.toggleTop,
                      zIndex: 40,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      pointerEvents: "auto",
                      background: "transparent",
                      border: "none",
                    }}
                    aria-label={`Fold toggle for ${block.name}`}
                  >
                    {isFolded ? (
                      <ChevronRight className="w-3 h-3 text-gray-300" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-gray-300" />
                    )}
                  </button>
                );
              })}

              {Object.entries(comments ?? {}).map(([lnStr, texts]) => {
                const ln = Number(lnStr);
                const lineEl = codeContainerRef.current?.querySelector(
                  `[data-line-number="${ln}"]`
                ) as HTMLElement | null;
                if (!lineEl) return null;

                const count = texts.length;
                const reserved = count * COMMENT_ROW_HEIGHT + COMMENT_GAP;

                return (
                  <div
                    key={ln}
                    className="absolute"
                    style={{
                      top: lineEl.offsetTop + lineEl.offsetHeight - reserved,
                      left: PRE_PADDING_LEFT * 3 + GUTTER_WIDTH + 8,
                      right: PRE_PADDING_LEFT,
                      pointerEvents: "none",
                    }}
                  >
                    {texts.map((t, i) => (
                      <div
                        key={i}
                        className="font-mono text-xs italic text-gray-400 whitespace-pre-wrap"
                        style={{ height: COMMENT_ROW_HEIGHT }}
                      >
                        <span>// {t}</span>
                      </div>
                    ))}
                  </div>
                );
              })}

              {hoveredLine !== null && hoveredLinePos !== null && (
                <button
                  type="button"
                  data-role="comment-button"
                  onMouseLeave={() => {
                    setHoveredLine(null);
                    setHoveredLinePos(null);
                  }}
                  onClick={() =>
                    setOpenCommentDialog({ open: true, line: hoveredLine })
                  }
                  className="absolute rounded p-1 hover:bg-muted/60"
                  style={{
                    right: 8,
                    top: Math.max(0, hoveredLinePos - 6),
                    zIndex: 30,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "auto",
                  }}
                  aria-label={`Add comment on line ${hoveredLine}`}
                >
                  <PlusIcon size={14} className="text-gray-400" />
                </button>
              )}

              {openCommentDialog && (
                <Dialog
                  open={openCommentDialog.open}
                  onOpenChange={(o) =>
                    setOpenCommentDialog({
                      open: o,
                      line: openCommentDialog.line,
                    })
                  }
                >
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        Add comment - Line {openCommentDialog.line}
                      </DialogTitle>
                    </DialogHeader>
                    <textarea
                      className="w-full p-2 border rounded bg-gray-900 text-white"
                      rows={4}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Type your comment here ..."
                    />
                    <DialogFooter>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setOpenCommentDialog({ open: false, line: null })
                        }
                      >
                        Cancel
                      </Button>
                      <Button onClick={addComment}>Add</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            {showDocs && (
              <div className="w-80 border-l bg-gray-50 overflow-y-auto">
                <details open>
                  <summary className="p-2 font-bold cursor-pointer">
                    API Endpoints
                  </summary>
                  <ul className="px-4">
                    {selectedFileNode.apis?.map((api: any, i: number) => (
                      <li
                        key={i}
                        className="py-1 cursor-pointer"
                        onClick={() => scrollToLine(api.start)}
                      >
                        <code className="font-mono text-green-600">
                          {api.method.toUpperCase()}
                        </code>
                        <span className="ml-2">{api.path}</span>
                        {api.framework && (
                          <span className="ml-2 text-xs text-gray-500">
                            [{api.framework}]
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
                <details open>
                  <summary className="p-2 font-bold cursor-pointer">
                    Schemas
                  </summary>
                  <ul className="px-4">
                    {selectedFileNode.schemas?.map((schema: any, i: number) => (
                      <li key={i} className="py-2">
                        <span className="font-semibold">{schema.name}</span>
                        <ul className="ml-4 text-sm text-gray-700">
                          {schema.fields?.map((f: any, j: number) => (
                            <li key={j}>
                              <code className="text-purple-600">{f.name}</code>
                              {f.type && (
                                <span className="ml-1 text-xs text-gray-500">
                                  : {f.type}
                                </span>
                              )}
                              {f.subFields && f.subFields.length > 0 && (
                                <ul className="ml-4 text-xs text-gray-500">
                                  {f.subFields.map((sf: any, k: number) => (
                                    <li key={k}>
                                      {sf.name}
                                      {sf.type && `: ${sf.type}`}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            )}
            {selectedFileNode?.highlights && (
              <div className="mt-6 space-y-6">
                {[
                  {
                    title: "TODOs",
                    icon: <ListTodo className="w-4 h-4 text-yellow-600" />,
                    color: "text-yellow-700",
                    items: selectedFileNode.highlights.todos,
                  },
                  {
                    title: "FIXMEs",
                    icon: <FileWarning className="w-4 h-4 text-red-600" />,
                    color: "text-red-700",
                    items: selectedFileNode.highlights.fixmes,
                  },
                  {
                    title: "Notes",
                    icon: <BookText className="w-4 h-4 text-blue-600" />,
                    color: "text-blue-700",
                    items: selectedFileNode.highlights.notes,
                  },
                ].map(
                  ({ title, icon, color, items }) =>
                    items?.length > 0 && (
                      <div key={title}>
                        <div
                          className={`flex items-center gap-2 mb-1 font-semibold ${color.replace(
                            "700",
                            "600"
                          )}`}
                        >
                          {icon}
                          {title}
                        </div>
                        <ul
                          className={`list-disc ml-6 text-sm ${color} space-y-1`}
                        >
                          {items.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )
                )}
              </div>
            )}
          </>
        ) : readmeContent ? (
          <>
            {readmeSummary && (
              <div className="bg-muted border border-border rounded-lg p-4 mb-6">
                <h2 className="text-base font-semibold mb-2 flex items-center gap-1">
                  <BookText className="w-4 h-4 text-primary" />
                  README Summary
                </h2>
                <p className="text-sm text-muted-foreground">{readmeSummary}</p>
              </div>
            )}

            <h2 className="text-base font-bold mb-2">README.md</h2>
            <div className="prose prose-sm max-w-none text-foreground prose-headings:mb-2 prose-p:mb-1">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {readmeContent}
              </ReactMarkdown>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-20">
            Select a file to preview its content.
          </p>
        )}
      </div>
    </>
  );
}
