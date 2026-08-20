"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Folder, CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type ProjectCardProps = {
  _id: string;
  projectName: string;
  createdAt: string;
};

export default function ProjectCard({
  _id,
  projectName,
  createdAt,
}: ProjectCardProps) {
  const router = useRouter();

  const handleOpenProject = useCallback(() => {
    router.push(`/projects/${_id}`);
  }, [_id, router]);

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={handleOpenProject}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleOpenProject();
        }
      }}
      className="
        group
        active:scale-[0.98]
        border-border
        transition-all
        duration-200
        hover:border-primary/40
        hover:shadow-md
        hover:bg-muted/30
        focus-visible:ring-2
        focus-visible:ring-primary
        focus-visible:ring-offset-2
      "
    >
      <CardContent className="p-5 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="mt-0.5 shrink-0">
            <Folder
              size={20}
              className="text-primary transition-transform duration-200 group-hover:scale-110"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold leading-6 line-clamp-2 break-all">
              {projectName}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarClock size={14} className="shrink-0" />

          <span suppressHydrationWarning>
            {new Date(createdAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
