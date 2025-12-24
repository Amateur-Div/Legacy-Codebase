"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function GlobalSearch({
  projectId,
  setLine,
  handleFileClick,
}: any) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (val: string) => {
    setQuery(val);
    if (!val.trim()) return setResults([]);

    setLoading(true);
    try {
      const res = await fetch("/api/project/search", {
        method: "POST",
        body: JSON.stringify({ projectId, query: val }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error("Search failed:", err);
    }
    setLoading(false);
  };

  return (
    <div className="mb-4 p-3 border rounded-xl shadow-sm bg-muted/50">
      <Input
        placeholder="🔍 Global search (across all files)..."
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full"
      />

      {loading && (
        <p className="text-sm text-muted-foreground mt-2">Searching...</p>
      )}

      {!loading && results.length > 0 && (
        <ScrollArea className="max-h-64 mt-2 rounded border bg-background">
          {results.map((r, i) => (
            <div
              key={i}
              onClick={() => {
                return handleFileClick(r.path), setLine(r.line);
              }}
              className="p-2 border-b hover:bg-muted cursor-pointer transition text-sm"
            >
              <p className="font-semibold">{r.path}</p>
              <p className="text-xs text-muted-foreground italic truncate">
                Line {r.line}: {r.snippet}
              </p>
            </div>
          ))}
        </ScrollArea>
      )}
    </div>
  );
}
