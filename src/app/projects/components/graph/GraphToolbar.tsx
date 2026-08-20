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

import { BookOpen, Flame, RotateCcw } from "lucide-react";

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
    <div className="flex flex-wrap items-center gap-2 border-b bg-background px-3 py-3 sm:px-4 shrink-0">
      <Select
        value={graphScope}
        onValueChange={(v: any) =>
          setGraphScope(v === "global" ? "global" : "file")
        }
      >
        <SelectTrigger className="w-full sm:w-[180px] lg:w-[200px]">
          <SelectValue placeholder="Scope" />
        </SelectTrigger>

        <SelectContent className="z-50 bg-white text-popover-foreground border shadow-lg">
          <SelectItem value="file">File Level</SelectItem>

          <SelectItem value="global">Architecture View</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={heatmapMode}
        onValueChange={(v: any) => setHeatmapMode(v as any)}
      >
        <SelectTrigger className="w-full sm:w-[180px] lg:w-[200px]">
          <div className="flex min-w-0 items-center gap-2">
            <Flame className="h-4 w-4 shrink-0" />
            <span className="truncate text-muted-foreground">Heatmap:</span>
            <SelectValue />
          </div>
        </SelectTrigger>

        <SelectContent className="z-50 bg-white text-popover-foreground border shadow-lg">
          <SelectItem value="none">Off</SelectItem>

          <SelectItem value="complexity">Complexity</SelectItem>

          <SelectItem value="importance">Importance</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filterType ?? "all"}
        onValueChange={(v: any) => setFilterType(v === "all" ? null : v)}
      >
        <SelectTrigger className="w-full sm:w-[180px] lg:w-[200px]">
          <SelectValue placeholder="Filter" />
        </SelectTrigger>

        <SelectContent className="z-50 bg-white text-popover-foreground border shadow-lg">
          <SelectItem value="all">All Nodes</SelectItem>

          <SelectItem value="function">Functions</SelectItem>

          <SelectItem value="if">Branches</SelectItem>

          <SelectItem value="loop">Loops</SelectItem>

          <SelectItem value="statement">Statements</SelectItem>
        </SelectContent>
      </Select>

      {/* TODO: fix deadcode functionality later*/}
      {/* <div className="flex items-center gap-2 px-2">
        <span className="text-sm text-muted-foreground">
          Hide unreachable code
        </span>
        <Switch
          className={`${hideDeadCode ? "border border-black bg-neutral-600" : "bg-slate-200"}`}
          checked={hideDeadCode}
          onCheckedChange={setHideDeadCode}
        />
      </div> */}

      <div className="ml-auto flex w-full items-center justify-end gap-2 sm:w-auto">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLegend(!showLegend)}
              >
                <BookOpen size={16} className="mr-2 h-4 w-4" /> Legend
              </Button>
            </TooltipTrigger>

            <TooltipContent>Toggle graph legend</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button size="sm" onClick={resetGraphState}>
          <RotateCcw className="mr-1 h-4 w-4" /> Reset
        </Button>
      </div>
    </div>
  );
}
