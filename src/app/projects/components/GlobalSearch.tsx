"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SearchResult {
  path: string;
  line: number;
  snippet: string;
}

interface GlobalSearchProps {
  projectId: string;
  setLine: React.Dispatch<React.SetStateAction<number | null>>;
  handleFileClick: (path: string) => void;
}

export default function GlobalSearch({
  projectId,
  setLine,
  handleFileClick,
}: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const runSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      abortRef.current?.abort();

      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);

      try {
        const res = await fetch("/api/project/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            projectId,
            query: searchQuery,
          }),
          signal: controller.signal,
        });

        const data = await res.json();

        setResults(data.results || []);
        setHasSearched(true);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Search failed:", err);
        }
      } finally {
        setLoading(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      runSearch(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, runSearch]);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b bg-muted/40 px-3 py-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />

          <span className="truncate text-sm font-medium text-muted-foreground">
            Global Search
          </span>
        </div>

        {results.length > 0 && !loading && (
          <span className="shrink-0 text-xs text-muted-foreground">
            {results.length} {results.length === 1 ? "match" : "matches"}
          </span>
        )}
      </div>

      <div className="p-3">
        <Input
          placeholder="Search across all project files..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 w-full"
        />
      </div>

      {/* Results */}
      {(loading || results.length > 0 || query.trim()) && (
        <div className="border-t">
          <ScrollArea className="h-64 max-h-[40vh] w-full sm:h-72">
            <div className="space-y-2 p-2">
              {loading && (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  Searching large repository...
                </div>
              )}

              {!loading && hasSearched && results.length === 0 && (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No matches found
                </div>
              )}

              {!loading &&
                results.map((result) => (
                  <button
                    key={`${result.path}-${result.line}`}
                    type="button"
                    onClick={() => {
                      handleFileClick(result.path);
                      setLine(result.line);
                    }}
                    className="
                      w-full
                      min-w-0
                      overflow-hidden
                      rounded-xl
                      border
                      bg-background
                      px-3
                      py-2.5
                      text-left
                      transition-colors
                      hover:bg-muted/60
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-primary/50
                      focus-visible:ring-offset-1
                    "
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <p
                        className="
                          min-w-0
                          flex-1
                          truncate
                          text-sm
                          font-medium
                        "
                        title={result.path}
                      >
                        {result.path}
                      </p>

                      <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                        L{result.line}
                      </span>
                    </div>

                    <p
                      className="
                        mt-1.5
                        line-clamp-2
                        break-words
                        text-xs
                        text-muted-foreground
                      "
                    >
                      {result.snippet}
                    </p>
                  </button>
                ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
