"use client";

import { Globe, Lock, Route } from "lucide-react";

interface Props {
  fileTree: any[];
}

type ApiItem = {
  path?: string;
  method?: string;
  file?: string;
};

export default function APIsWorkspace({ fileTree }: Props) {
  const apis: ApiItem[] = [];

  const walk = (nodes: any[]) => {
    for (const node of nodes) {
      if (node.type === "file") {
        if (Array.isArray(node.apis)) {
          for (const api of node.apis) {
            apis.push({
              ...api,
              file: node.fullPath,
            });
          }
        }
      }

      if (node.children) {
        walk(node.children);
      }
    }
  };

  walk(fileTree);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">API Explorer</h2>

        <p className="text-sm text-muted-foreground mt-1">
          Explore detected backend routes and endpoints.
        </p>
      </div>

      <div className="rounded-2xl border bg-card overflow-hidden">
        {apis.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">
            No APIs detected.
          </div>
        ) : (
          <div className="divide-y">
            {apis.map((api, index) => (
              <div
                key={`${api.path}-${index}`}
                className="p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Route className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-medium">
                          {api.path || "/unknown"}
                        </span>

                        {api.method && (
                          <span className="text-xs rounded-md border px-2 py-0.5 bg-background">
                            {api.method}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground mt-1">
                        {api.file}
                      </p>
                    </div>
                  </div>

                  <div className="text-muted-foreground">
                    {api.method?.includes("AUTH") ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <Globe className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
