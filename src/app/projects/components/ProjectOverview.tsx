"use client";

import React from "react";
import {
  PackageIcon,
  BarChart3Icon,
  InfoIcon,
  Code2Icon,
  FileCode2Icon,
  FileTextIcon,
  ImageIcon,
  WrenchIcon,
} from "lucide-react";

interface RepositoryComposition {
  extension: string;
  category: string;
  files: number;
  loc: number;
  percent: number;
}

interface Insights {
  totalLOC: number;
  totalFiles: number;
  totalFolders: number;

  largestFile: {
    name: string;
    loc: number;
  };

  repositoryComposition: RepositoryComposition[];
}

interface Props {
  description?: string;
  summary?: string;
  insights: Insights;
  packageInfo?: Record<string, string | number>;

  getLanguageMeta: (ext: string) => {
    name: string;
    color: string;
  };
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  code: <Code2Icon className="w-4 h-4" />,
  docs: <FileTextIcon className="w-4 h-4" />,
  asset: <ImageIcon className="w-4 h-4" />,
  config: <WrenchIcon className="w-4 h-4" />,
  schema: <FileCode2Icon className="w-4 h-4" />,
  script: <FileCode2Icon className="w-4 h-4" />,
};

export default function ProjectOverview({
  description,
  summary,
  insights,
  packageInfo,
  getLanguageMeta,
}: Props) {
  const hasOverview = description || summary;
  const hasInsights = !!insights;
  const hasComposition = insights?.repositoryComposition?.length > 0;
  const hasPackageInfo = packageInfo && Object.keys(packageInfo).length > 0;

  if (!hasOverview && !hasInsights && !hasComposition && !hasPackageInfo) {
    return null;
  }

  const topComposition = insights?.repositoryComposition?.slice(0, 10) || [];

  return (
    <div className="bg-card border border-border/50 shadow-sm rounded-2xl p-6 space-y-8">
      {hasOverview && (
        <Section title="Overview" icon={<InfoIcon className="w-4 h-4" />}>
          <div className="space-y-2">
            {description && (
              <p className="text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            )}

            {summary && (
              <p className="text-sm leading-6 text-muted-foreground">
                {summary}
              </p>
            )}
          </div>
        </Section>
      )}

      {hasInsights && (
        <Section
          title="Repository Summary"
          icon={<BarChart3Icon className="w-4 h-4" />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Stat label="Total Files" value={insights.totalFiles} />

            <Stat label="Total Folders" value={insights.totalFolders} />

            <Stat
              label="Total LOC"
              value={insights.totalLOC.toLocaleString()}
            />

            <Stat
              label="Largest File"
              value={
                <div className="space-y-1">
                  <p className="truncate">{insights.largestFile.name}</p>

                  <p className="text-xs text-muted-foreground font-normal">
                    {insights.largestFile.loc.toLocaleString()} LOC
                  </p>
                </div>
              }
            />
          </div>
        </Section>
      )}

      {hasComposition && (
        <Section
          title="Repository Composition"
          icon={<Code2Icon className="w-4 h-4" />}
        >
          <div className="space-y-5">
            <div className="h-3 rounded-full overflow-hidden bg-muted flex">
              {topComposition.map((item) => (
                <div
                  key={item.extension}
                  className="transition-all duration-500"
                  style={{
                    width: `${item.percent}%`,
                    backgroundColor: getLanguageMeta(item.extension).color,
                  }}
                />
              ))}
            </div>

            <div className="space-y-3">
              {topComposition.map((item) => {
                const meta = getLanguageMeta(item.extension);

                return (
                  <div
                    key={item.extension}
                    className="flex items-center justify-between gap-4 rounded-xl border bg-background px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{
                          backgroundColor: meta.color,
                        }}
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium uppercase">
                            {item.extension}
                          </span>

                          <span className="text-muted-foreground">
                            {CATEGORY_ICONS[item.category] || (
                              <FileCode2Icon className="w-4 h-4" />
                            )}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground capitalize">
                          {item.category}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold">{item.percent}%</p>

                      <p className="text-xs text-muted-foreground">
                        {item.files} files
                      </p>

                      {item.loc > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {item.loc.toLocaleString()} LOC
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>
      )}

      {hasPackageInfo && (
        <Section
          title="Package Info"
          icon={<PackageIcon className="w-4 h-4" />}
        >
          <ul className="space-y-2">
            {Object.entries(packageInfo).map(([key, value]) => (
              <li
                key={key}
                className="flex items-center justify-between rounded-lg border bg-background px-3 py-2"
              >
                <span className="text-sm text-muted-foreground">{key}</span>

                <span className="text-sm font-medium">{String(value)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="text-primary">{icon}</div>

        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      </div>

      <div className="rounded-2xl border bg-muted/20 p-4">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-background px-4 py-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>

      <div className="mt-2 text-lg font-semibold break-words">{value}</div>
    </div>
  );
}
