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
    <div className="border rounded-2xl bg-card shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/40">
        <SearchIcon className="w-4 h-4 text-muted-foreground" />

        <span className="text-sm font-medium text-muted-foreground">
          Global Search
        </span>
      </div>

      <div className="p-3">
        <Input
          placeholder="Search across all project files..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full"
        />
      </div>

      {(loading || results.length > 0 || query.trim()) && (
        <div className="border-t">
          <ScrollArea className="h-72 w-full">
            <div className="p-2 pr-4 space-y-2">
              {loading && (
                <div className="px-3 py-6 text-sm text-center text-muted-foreground">
                  Searching large repository...
                </div>
              )}

              {!loading && hasSearched && results.length === 0 && (
                <div className="px-3 py-6 text-sm text-center text-muted-foreground">
                  No matches found
                </div>
              )}

              {!loading &&
                results.map((result) => (
                  <button
                    key={`${result.path}-${result.line}`}
                    onClick={() => {
                      handleFileClick(result.path);

                      setLine(result.line);
                    }}
                    className="w-full max-w-full overflow-hidden text-left rounded-xl border bg-background px-3 py-2 hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-sm break-all text-left flex-1">
                        {result.path}
                      </p>

                      <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
                        Line {result.line}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1 break-words line-clamp-2 text-left">
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
