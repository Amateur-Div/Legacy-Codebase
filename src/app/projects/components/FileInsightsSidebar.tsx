"use client";

import React, { useEffect } from "react";
import { Badge, BookText, FileWarning, ListTodo } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { ImpactSummaryCard } from "./ImpactSummaryCard";
import { FlowGraph } from "@/app/api/lib/analyzer/types";

interface Props {
  selectedFileNode: any;
  graphData: FlowGraph;
  setSelectedPath: (path: string) => void;
  setShowDocs: React.Dispatch<React.SetStateAction<boolean>>;
  showDocs: boolean;
  scrollToLine: (line: number) => void;
}

export default function FileInsightsSidebar({
  selectedFileNode,
  graphData,
  setSelectedPath,
  setShowDocs,
  showDocs,
  scrollToLine,
}: Props) {
  return (
    <div className="w-[380px] shrink-0 overflow-y-auto pr-1 min-w-0">
      <div className="space-y-4 pt-1">
        {graphData.meta?.intelligence ? (
          <div className="bg-card border rounded-xl p-3">
            <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Impact Analysis
            </h3>
            <ImpactSummaryCard
              graph={graphData}
              onFileChange={setSelectedPath}
            />
          </div>
        ) : null}

        {selectedFileNode?.language && (
          <>
            <div className="border rounded-xl p-3 bg-background">
              <div className="flex items-center gap-2">
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
            </div>
          </>
        )}

        {selectedFileNode?.tags?.length > 0 && (
          <div className="border rounded-xl p-3 bg-background">
            <div className="flex flex-wrap gap-2 text-xs">
              {selectedFileNode?.tags?.map((tag: string, index: number) => (
                <Badge
                  key={index}
                  className="bg-muted text-muted-foreground hover:bg-accent"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="border rounded-xl p-3 bg-background space-y-3">
          <Button
            className="w-full"
            variant="outline"
            onClick={() => setShowDocs((prev) => !prev)}
          >
            Docs
          </Button>
          {showDocs && (
            <div className="bg-card border rounded-xl p-3">
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
        </div>

        {selectedFileNode && (
          <div className="border rounded-xl p-3 bg-background">
            <details open className="text-sm">
              <summary className="cursor-pointer font-medium text-foreground">
                Jump to...
              </summary>

              <div className="grid grid-cols-2 gap-4 mt-3">
                {[
                  {
                    title: "Imports",
                    data: selectedFileNode.imports,
                  },
                  {
                    title: "Functions",
                    data: selectedFileNode.functions,
                  },
                  {
                    title: "Classes",
                    data: selectedFileNode.classes,
                  },
                  {
                    title: "Components",
                    data: selectedFileNode.components,
                  },
                  {
                    title: "Exports",
                    data: selectedFileNode.exports,
                  },
                ].map(
                  ({ title, data }) =>
                    data?.length > 0 && (
                      <div key={title} className="min-w-0">
                        <h4 className="font-semibold text-muted-foreground mb-1">
                          {title}
                        </h4>

                        <ul className="space-y-1 text-muted-foreground">
                          {data.map((item: any, i: number) => (
                            <li key={i} className="truncate">
                              <button
                                onClick={() => scrollToLine(item.start)}
                                className="hover:underline truncate text-left w-full"
                              >
                                {item.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ),
                )}
              </div>
            </details>
          </div>
        )}

        <Card className="rounded-xl border bg-background">
          <CardHeader className="pb-2">
            <h3 className="text-base font-semibold">Cross-File Impact</h3>
          </CardHeader>

          <CardContent className="space-y-4 text-sm">
            <div>
              <div className="font-medium text-gray-700 mb-1">Imports</div>
              {selectedFileNode.impact?.imports?.length ? (
                <ul className="ml-4 list-disc space-y-1 text-gray-600 break-all">
                  {selectedFileNode.impact.imports.map((imp: string) => (
                    <li
                      key={imp}
                      className="cursor-pointer hover:text-gray-900 hover:underline"
                      onClick={() => setSelectedPath(imp)}
                    >
                      {imp}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ml-2 text-gray-400">None</p>
              )}
            </div>

            <div>
              <div className="font-medium text-gray-700 mb-1">Used By</div>
              {selectedFileNode.impact?.usedBy.length ? (
                <ul className="ml-4 list-disc space-y-1 text-gray-600 break-all">
                  {selectedFileNode.impact.usedBy.map((file: string) => (
                    <li
                      key={file}
                      className="cursor-pointer hover:text-gray-900 hover:underline"
                      onClick={() => setSelectedPath(file)}
                    >
                      {file}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ml-2 text-gray-400">None</p>
              )}
            </div>

            {selectedFileNode.impact?.brokenImports?.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <div className="flex items-center gap-2 font-medium text-red-700 mb-1">
                  ⚠ Broken Imports
                </div>

                <ul className="ml-4 list-disc space-y-1 text-red-600">
                  {selectedFileNode.impact.brokenImports.map(
                    (b: { source: string }, i: number) => (
                      <li key={i} className="font-mono text-xs">
                        {b.source}
                      </li>
                    ),
                  )}
                </ul>

                <p className="mt-2 text-xs text-red-500">
                  These imports no longer resolve to any file in the project.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedFileNode?.highlights &&
          (selectedFileNode.highlights.todos?.length > 0 ||
            selectedFileNode.highlights.fixmes?.length > 0 ||
            selectedFileNode.highlights.notes?.length > 0) && (
            <div className="border rounded-xl p-3 bg-background">
              {selectedFileNode?.highlights && (
                <div className="space-y-4">
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
                              "600",
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
                      ),
                  )}
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}
