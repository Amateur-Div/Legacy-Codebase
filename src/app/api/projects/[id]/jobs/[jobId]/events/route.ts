import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/app/api/lib/jobs/jobManager";
import { loadJob, loadJobForOwner } from "@/app/api/lib/jobs/jobStore";
import { authMiddleware } from "@/lib/auth-server";
import { assertProjectAccess } from "@/app/api/lib/projectAccess";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ projectId: string; jobId: string }> }
) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  const { uid } = await authMiddleware(token);

  if (!uid) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const { params } = await context;
  const { projectId, jobId } = await params;
  console.log("[SSE] Connected for job:", jobId);

  try {
    await assertProjectAccess(projectId, uid, "viewer");
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: err.status || 403 }
    );
  }

  const job = await loadJobForOwner(jobId, uid);
  if (!job) {
    return;
  }

  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let lastStatus = "";
      let lastProgress = -1;

      const sendEvent = (event: string, data: any) => {
        const payload =
          `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      const ping = setInterval(() => {
        if (!closed)
          controller.enqueue(encoder.encode("event: ping\ndata: {}\n\n"));
      }, 15000);

      const poll = setInterval(async () => {
        if (closed) return;
        try {
          const job = (await getJob(jobId)) || (await loadJob(jobId));
          if (!job) return;

          if (job.status !== lastStatus || job.progress !== lastProgress) {
            sendEvent("job:update", job);
            lastStatus = job.status;
            lastProgress = job.progress ?? 0;
          }

          if (["done", "error"].includes(job.status)) {
            sendEvent("job:complete", job);
            clearInterval(poll);
            clearInterval(ping);
            controller.close();
            closed = true;
            console.log("Job completed ...");
            return;
          }
        } catch (err) {
          console.error("Poll failed:", err);
        }
      }, 2000);

      req.signal.addEventListener("abort", () => {
        console.log("[SSE] Aborted by client:", jobId);
        clearInterval(poll);
        clearInterval(ping);
        closed = true;
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, { headers });
}
