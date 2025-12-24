// "use client";

// import React, { useEffect } from "react";
// import {
//   PackageIcon,
//   LanguagesIcon,
//   BarChart3Icon,
//   InfoIcon,
// } from "lucide-react";

// interface LanguageUsage {
//   ext: string;
//   loc: number;
//   percent: string;
// }

// interface Insights {
//   totalLOC: number;
//   totalFiles: number;
//   totalFolders: number;
//   largestFile: {
//     name: string;
//     loc: number;
//   };
//   topLanguages: LanguageUsage[];
//   languageUsage: LanguageUsage[];
// }

// interface Props {
//   description?: string;
//   summary?: string;
//   insights?: Insights;
//   packageInfo?: Record<string, string | number>;
//   getLanguageColor: (ext: string) => string;
// }

// export default function ProjectOverview({
//   description,
//   summary,
//   insights,
//   packageInfo,
//   getLanguageColor,
// }: Props) {
//   const hasDescription = description || summary;
//   const hasStats = insights;
//   const hasLanguages =
//     insights?.languageUsage && insights.languageUsage.length > 0;
//   const hasPackageInfo = packageInfo && Object.keys(packageInfo).length > 0;

//   if (!hasDescription && !hasStats && !hasLanguages && !hasPackageInfo)
//     return null;

//   return (
//     <div className="bg-muted border shadow-sm rounded-2xl p-6 space-y-6 transition-all duration-300">
//       {hasDescription && (
//         <Section title="Overview" icon={<InfoIcon className="w-4 h-4" />}>
//           {description && (
//             <p className="text-sm text-muted-foreground">{description}</p>
//           )}
//           {summary && (
//             <p className="text-sm text-muted-foreground mt-1">{summary}</p>
//           )}
//         </Section>
//       )}

//       {hasStats && (
//         <Section
//           title="Project Insights"
//           icon={<BarChart3Icon className="w-4 h-4" />}
//         >
//           <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1">
//             <li>
//               Total LOC:{" "}
//               <span className="font-medium">{insights.totalLOC}</span>
//             </li>
//             <li>
//               Total Files:{" "}
//               <span className="font-medium">{insights.totalFiles}</span>
//             </li>
//             <li>
//               Total Folders:{" "}
//               <span className="font-medium">{insights.totalFolders}</span>
//             </li>
//             <li>
//               Largest File:{" "}
//               <span className="font-medium">{insights.largestFile.name}</span> (
//               {insights.largestFile.loc} LOC)
//             </li>
//           </ul>
//         </Section>
//       )}

//       {hasLanguages && (
//         <Section
//           title="Language Usage"
//           icon={<LanguagesIcon className="w-4 h-4" />}
//         >
//           <div className="flex w-full overflow-hidden rounded-sm h-2 mb-3 border">
//             {insights.languageUsage.map((lang, i) => (
//               <div
//                 key={i}
//                 style={{
//                   width: lang.percent,
//                   backgroundColor: getLanguageColor(lang.ext),
//                 }}
//                 className="transition-all duration-300"
//               />
//             ))}
//           </div>
//           <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1">
//             {insights.languageUsage.map((lang, i) => (
//               <li key={i} className="flex items-center gap-2">
//                 <span
//                   className="inline-block w-3 h-3 rounded-sm"
//                   style={{ backgroundColor: getLanguageColor(lang.ext) }}
//                 ></span>
//                 {lang.ext.toUpperCase()} - {lang.percent}%
//               </li>
//             ))}
//           </ul>
//         </Section>
//       )}

//       {hasPackageInfo && (
//         <Section
//           title="Package Info"
//           icon={<PackageIcon className="w-4 h-4" />}
//         >
//           <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1">
//             {Object.entries(packageInfo).map(([key, value], i) => (
//               <li key={i}>
//                 <span className="font-medium">{key}:</span> {String(value)}
//               </li>
//             ))}
//           </ul>
//         </Section>
//       )}
//     </div>
//   );
// }

// function Section({
//   title,
//   icon,
//   children,
// }: {
//   title: string;
//   icon: React.ReactNode;
//   children: React.ReactNode;
// }) {
//   return (
//     <div className="space-y-2">
//       <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
//         {icon}
//         <span>{title}</span>
//       </h3>
//       <div>{children}</div>
//     </div>
//   );
// }

"use client";

import React from "react";
import {
  PackageIcon,
  LanguagesIcon,
  BarChart3Icon,
  InfoIcon,
  FileTextIcon,
} from "lucide-react";

interface LanguageUsage {
  ext: string;
  loc: number;
  percent: string;
}

interface Insights {
  totalLOC: number;
  totalFiles: number;
  totalFolders: number;
  largestFile: {
    name: string;
    loc: number;
  };
  topLanguages: LanguageUsage[];
  languageUsage: LanguageUsage[];
}

interface Props {
  description?: string;
  summary?: string;
  insights: Insights;
  packageInfo?: Record<string, string | number>;
  getLanguageColor: (ext: string) => string;
}

export default function ProjectOverview({
  description,
  summary,
  insights,
  packageInfo,
  getLanguageColor,
}: Props) {
  const hasOverview = description || summary;
  const hasInsights = !!insights;
  const hasLanguages = insights?.languageUsage?.length > 0;
  const hasPackageInfo = packageInfo && Object.keys(packageInfo).length > 0;

  if (!hasOverview && !hasInsights && !hasLanguages && !hasPackageInfo)
    return null;

  return (
    <div className="bg-muted border shadow-sm rounded-2xl p-6 space-y-8 transition-all duration-300">
      {hasOverview && (
        <Section title="Overview" icon={<InfoIcon className="w-4 h-4" />}>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
          {summary && (
            <p className="text-sm text-muted-foreground mt-1">{summary}</p>
          )}
        </Section>
      )}

      {hasInsights && (
        <Section
          title="Project Summary"
          icon={<BarChart3Icon className="w-4 h-4" />}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-muted-foreground">
            <Stat label="Total Files" value={insights.totalFiles} />
            <Stat label="Total Folders" value={insights.totalFolders} />
            <Stat label="Total LOC" value={insights.totalLOC} />
            <Stat
              label="Largest File"
              value={
                <span>
                  {insights.largestFile.name}
                  <br />
                  <span className="text-xs text-muted-foreground">
                    ({insights.largestFile.loc} LOC)
                  </span>
                </span>
              }
            />
          </div>
        </Section>
      )}

      {hasLanguages && (
        <Section
          title="Language Usage"
          icon={<LanguagesIcon className="w-4 h-4" />}
        >
          <div className="rounded overflow-hidden h-2 bg-border mb-3 flex">
            {insights?.languageUsage.map((lang, i) => (
              <div
                key={i}
                style={{
                  width: lang.percent,
                  backgroundColor: getLanguageColor(lang.ext),
                }}
                className="transition-all"
              />
            ))}
          </div>
          <ul className="text-sm text-muted-foreground space-y-1">
            {insights?.languageUsage.map((lang, i) => (
              <li key={i} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-sm"
                  style={{
                    backgroundColor: getLanguageColor(lang.ext),
                  }}
                />
                {lang.ext.toUpperCase()} — {lang.percent}%
              </li>
            ))}
          </ul>
        </Section>
      )}

      {hasPackageInfo && (
        <Section
          title="Package Info"
          icon={<PackageIcon className="w-4 h-4" />}
        >
          <ul className="text-sm text-muted-foreground space-y-1 list-disc ml-5">
            {Object.entries(packageInfo).map(([key, value]) => (
              <li key={key}>
                <span className="font-medium">{key}:</span> {String(value)}
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
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        {icon}
        <span>{title}</span>
      </h3>
      <div>{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border rounded-lg px-3 py-2 bg-background shadow-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold text-sm">{value}</p>
    </div>
  );
}
