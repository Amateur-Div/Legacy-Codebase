"use client";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { ChevronDown, ChevronRight, PlusIcon } from "lucide-react";

import { atomDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

interface CodeEditorPanelProps {
  fileContent: string;
  selectedPath: string | null;
  showRawData: boolean;
  isLargeFile: boolean;
  lineCount: number;
  codeContainerRef: React.RefObject<HTMLDivElement | null>;
  getLanguageMeta: (filePath: string) => {
    name: string;
    color: string;
  };

  targetLineNumber: number | null;
  comments: Record<number, string[]> | null | undefined;
  hoveredLine: number | null;
  hoveredLinePos: number | null;
  setHoveredLine: React.Dispatch<React.SetStateAction<number | null>>;
  setHoveredLinePos: React.Dispatch<React.SetStateAction<number | null>>;
  openCommentDialog: {
    open: boolean;
    line: number | null;
  };
  commentText: string;

  setCommentText: React.Dispatch<React.SetStateAction<string>>;
  setOpenCommentDialog: React.Dispatch<
    React.SetStateAction<{
      open: boolean;
      line: number | null;
    }>
  >;
  addComment: () => void;

  foldedRanges: Set<string>;
  foldBlocks: any[];
  foldPositions: Record<
    string,
    {
      toggleTop: number;
      placeholderTop: number;
    }
  >;

  toggleFold: (key: string) => void;
  isLineHidden: (line: number) => boolean;
  handleMouseEnterLine: (lineNumber: number, top: number) => void;
  innerScrollLeft: number;
}

export default function CodeEditorPanel({
  fileContent,
  selectedPath,
  showRawData,
  isLargeFile,
  lineCount,
  codeContainerRef,
  getLanguageMeta,
  targetLineNumber,
  comments,
  hoveredLine,
  hoveredLinePos,
  openCommentDialog,
  commentText,
  setCommentText,
  setOpenCommentDialog,
  addComment,
  foldedRanges,
  foldBlocks,
  foldPositions,
  toggleFold,
  isLineHidden,
  handleMouseEnterLine,
  innerScrollLeft,
}: CodeEditorPanelProps) {
  const COMMENT_ROW_HEIGHT = 18;
  const COMMENT_GAP = 6;

  const PRE_PADDING_LEFT = 16;
  const GUTTER_WIDTH = 40;

  return (
    <div className="border rounded-xl overflow-hidden flex-1 min-h-0 h-full">
      <div
        ref={codeContainerRef}
        className="relative rounded-lg border border-border overflow-auto h-full min-h-0"
        style={{ overflowX: "auto" }}
      >
        {showRawData ? (
          <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded max-w-full overflow-auto">
            {fileContent}
          </pre>
        ) : isLargeFile ? (
          <div className="relative">
            <div className="absolute top-2 right-3 text-xs text-yellow-400 bg-black/70 px-2 py-1 rounded">
              Large file detected ({lineCount} lines) — syntax features disabled
            </div>
            <pre
              className="whitespace-pre text-sm bg-background p-4 rounded max-w-full overflow-auto font-mono"
              style={{
                lineHeight: "1.6",
              }}
            >
              {fileContent}
            </pre>
          </div>
        ) : (
          <SyntaxHighlighter
            language={getLanguageMeta(selectedPath!).name.toLocaleLowerCase()}
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
                onMouseMove: (e) => {
                  const rect = (
                    e.currentTarget as HTMLElement
                  ).getBoundingClientRect();

                  const containerRect: DOMRect | undefined =
                    codeContainerRef.current?.getBoundingClientRect();

                  handleMouseEnterLine(
                    lineNumber,
                    rect.top - (containerRect?.top || 0),
                  );
                },
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
        {!isLargeFile &&
          foldBlocks.map((block) => {
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
                  left: PRE_PADDING_LEFT + GUTTER_WIDTH - 10 - innerScrollLeft,
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
        {!isLargeFile &&
          Object.entries(comments ?? {}).map(([lnStr, texts]) => {
            const ln = Number(lnStr);
            const lineEl = codeContainerRef.current?.querySelector(
              `[data-line-number="${ln}"]`,
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

        {/* TODO: Comment hover button occasionally keeps stale position after hovering container. */}
        {/* Needs redesign of hover architecture later.*/}

        {!isLargeFile && hoveredLine !== null && hoveredLinePos !== null && (
          <button
            type="button"
            data-role="comment-button"
            onClick={() =>
              setOpenCommentDialog({
                open: true,
                line: hoveredLine,
              })
            }
            className="comment-button absolute rounded p-1 hover:bg-muted/60"
            style={{
              left: 2,
              top: Math.max(0, hoveredLinePos - 4),
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              padding: "4px",
              pointerEvents: "none",
            }}
            aria-label={`Add comment on line ${hoveredLine}`}
          >
            <PlusIcon
              size={14}
              className="text-gray-400"
              onClick={() =>
                setOpenCommentDialog({
                  open: true,
                  line: hoveredLine,
                })
              }
              pointerEvents={"auto"}
            />
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
                    setOpenCommentDialog({
                      open: false,
                      line: null,
                    })
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
    </div>
  );
}
