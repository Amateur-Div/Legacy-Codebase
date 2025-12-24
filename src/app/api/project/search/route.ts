import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import clientPromise from "@/lib/mongoClient";

export async function POST(req: NextRequest) {
  try {
    const { projectId, query } = await req.json();

    if (!query || !projectId) {
      return NextResponse.json(
        { error: "Missing query or projectId" },
        { status: 400 }
      );
    }

    const db = (await clientPromise).db();
    const project = await db.collection("projects").findOne({ projectId });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const matches: any[] = [];

    const walkTree = (nodes: any[]) => {
      for (const node of nodes) {
        if (node.type === "file" && node.fullPath) {
          const absPath = path.join(
            process.cwd(),
            "project_uploads",
            projectId,
            node.fullPath
          );

          const metaTypes = [
            { field: "functions", label: "function" },
            { field: "classes", label: "class" },
            { field: "components", label: "component" },
            { field: "exports", label: "export" },
            { field: "highlights", label: "highlight" },
            { field: "imports", label: "import", key: "value" },
          ];

          for (const { field, label, key = "name" } of metaTypes) {
            const items = node[field];
            if (Array.isArray(items)) {
              for (const item of items) {
                const text = item?.[key]?.toLowerCase?.();
                if (text && text.includes(query.toLowerCase())) {
                  matches.push({
                    path: node.fullPath,
                    line: item.loc,
                    snippet: item[key],
                    type: label,
                    match: item[key],
                  });
                }
              }
            }
          }

          try {
            const content = fs.readFileSync(absPath, "utf-8");
            const lines = content.split("\n");

            lines.forEach((line, idx) => {
              if (line.toLowerCase().includes(query.toLowerCase())) {
                matches.push({
                  path: node.fullPath,
                  line: idx + 1,
                  snippet: line.trim(),
                  type: "text",
                  match: query,
                });
              }
            });
          } catch (e) {
            console.warn("Could not read file content:", node.fullPath);
          }
        } else if (node.children) {
          walkTree(node.children);
        }
      }
    };

    walkTree(project.fileTree);

    const deduplicated = [];
    const seen = new Set();

    for (const item of matches) {
      const key = `${item.path.toLowerCase().trim()}|${item.line}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(item);
      }
    }

    return NextResponse.json({ results: deduplicated });
  } catch (err) {
    console.error("Search error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
