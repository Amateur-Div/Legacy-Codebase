"use client";

import React from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Switch } from "@/components/ui/switch";

interface GraphToolbarProps {
  graphScope: "file" | "global";
  setGraphScope: (value: "file" | "global") => void;
  heatmapMode: "none" | "complexity" | "importance";
  setHeatmapMode: (value: "none" | "complexity" | "importance") => void;
  filterType: string | null;
  setFilterType: (value: string | null) => void;
  hideDeadCode: boolean;
  setHideDeadCode: (value: boolean) => void;
  showLegend: boolean;
  setShowLegend: (value: boolean) => void;
  resetGraphState: () => void;
}

export default function GraphToolbar({
  graphScope,
  setGraphScope,
  heatmapMode,
  setHeatmapMode,
  filterType,
  setFilterType,
  hideDeadCode,
  setHideDeadCode,
  showLegend,
  setShowLegend,
  resetGraphState,
}: GraphToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b bg-background px-4 py-3 shrink-0">
      <Select
        value={graphScope}
        onValueChange={(v: any) =>
          setGraphScope(v === "global" ? "global" : "file")
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Scope" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="file">File Level View</SelectItem>

          <SelectItem value="global">Architecture View</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={heatmapMode}
        onValueChange={(v: any) => setHeatmapMode(v as any)}
      >
        <SelectTrigger className="w-[190px]">
          <SelectValue placeholder="Heatmap" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="none">Heatmap: Off</SelectItem>

          <SelectItem value="complexity">Heatmap: Complexity</SelectItem>

          <SelectItem value="importance">Heatmap: Importance</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filterType ?? "all"}
        onValueChange={(v: any) => setFilterType(v === "all" ? null : v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter" />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="all">All Nodes</SelectItem>

          <SelectItem value="function">Functions</SelectItem>

          <SelectItem value="if">If / Branch</SelectItem>

          <SelectItem value="loop">Loops</SelectItem>

          <SelectItem value="statement">Statements</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2 px-2">
        <Switch checked={hideDeadCode} onCheckedChange={setHideDeadCode} />

        <span className="text-sm text-muted-foreground">Hide dead code</span>
      </div>

      <div className="flex-1" />

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLegend(!showLegend)}
            >
              {showLegend ? "Hide Legend" : "Show Legend"}
            </Button>
          </TooltipTrigger>

          <TooltipContent>Toggle graph legend</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Button size="sm" onClick={resetGraphState}>
        Reset
      </Button>
    </div>
  );
}
