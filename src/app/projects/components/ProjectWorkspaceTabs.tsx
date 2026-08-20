"use client";

import clsx from "clsx";
import { FolderTree, LayoutDashboard } from "lucide-react";

type View = "overview" | "explorer";

interface Props {
  activeView: View;
  setActiveView: (view: View) => void;
}

const tabs: {
  value: View;
  label: string;
  icon: typeof LayoutDashboard;
}[] = [
  {
    value: "overview",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    value: "explorer",
    label: "Explorer",
    icon: FolderTree,
  },
];

export default function ProjectWorkspaceTabs({
  activeView,
  setActiveView,
}: Props) {
  return (
    <div className="w-full border-b">
      <div className="flex w-full gap-1 pb-2 sm:w-fit sm:gap-2">
        {tabs.map(({ value, label, icon: Icon }) => {
          const active = activeView === value;

          return (
            <button
              key={value}
              type="button"
              onClick={() => setActiveView(value)}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "relative flex flex-1 items-center justify-center gap-2",
                "rounded-lg px-3 py-2 text-sm font-medium",
                "transition-all duration-200",
                "sm:flex-none sm:px-4",

                "focus-visible:outline-none",
                "focus-visible:ring-2",
                "focus-visible:ring-primary",
                "focus-visible:ring-offset-2",

                active
                  ? [
                      "bg-primary",
                      "text-primary-foreground",
                      "font-semibold",
                      "shadow-sm",
                    ]
                  : [
                      "text-muted-foreground",
                      "hover:bg-muted",
                      "hover:text-foreground",
                    ],
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />

              <span>{label}</span>

              {active && (
                <span
                  className="
                    absolute
                    -bottom-[9px]
                    left-1/2
                    h-0.5
                    w-11
                    -translate-x-1/2
                    rounded-full
                    bg-black
                  "
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
