"use client";

import clsx from "clsx";

type View = "overview" | "explorer" | "architecture" | "apis";

interface Props {
  activeView: View;
  setActiveView: (view: View) => void;
}

const tabs: View[] = ["overview", "explorer", "architecture", "apis"];

export default function ProjectWorkspaceTabs({
  activeView,
  setActiveView,
}: Props) {
  return (
    <div className="flex items-center gap-2 border-b pb-3">
      {tabs.map((tab) => {
        const active = activeView === tab;

        return (
          <button
            key={tab}
            onClick={() => setActiveView(tab)}
            className={clsx(
              "px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "hover:bg-muted text-muted-foreground",
            )}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
