import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { analyzeFile } from "@/app/api/lib/analyzer/analyzeFile";
import { scanImports } from "@/app/api/lib/analyzer/scanImports";
import { enqueueJob } from "@/app/api/lib/jobs/jobManager";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { params } = await context;
    const { id } = await params;

    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") || "fast";
    const body = await req.json();
    const files: Record<string, string> = body.files || {};

    const fileGraphs: Record<string, any> = {};
    for (const [path, code] of Object.entries(files)) {
      try {
        const graph = await analyzeFile(path, code as string);
        const importExport = scanImports(code as string);
        fileGraphs[path] = { graph, code, importExport };
      } catch (err: any) {
        fileGraphs[path] = {
          graph: { nodes: [], edges: [] },
          code,
          importExport: undefined,
          error: String(err?.message ?? err),
        };
      }
    }

    if (mode === "full") {
      const job = enqueueJob(id, files);
      return NextResponse.json(
        { jobId: job.id, status: job.status },
        { status: 202 }
      );
    }

    const results: Record<string, any> = {};
    for (const [path, code] of Object.entries(files)) {
      try {
        const graph = await analyzeFile(path, code as string);
        const importExport = scanImports(code as string);
        fileGraphs[path] = { graph, code, importExport };
      } catch (err: any) {
        results[path] = { ok: false, error: String(err?.message ?? err) };
      }
    }
    return NextResponse.json({ projectId: id, results }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
