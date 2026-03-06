import { getJob } from "@/app/api/lib/jobs/jobManager";
import { loadJobForOwner } from "@/app/api/lib/jobs/jobStore";
import { authMiddleware } from "@/lib/auth-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  const { params } = await context;
  const { jobId } = await params;

  console.log(
    "req inside job route : ",
    JSON.stringify(req.nextUrl.searchParams),
  );

  const searchParams = req.nextUrl.searchParams;
  const token = searchParams.get("token");

  const { uid } = await authMiddleware(token);

  let job = await getJob(jobId);
  if (!job) {
    job = await loadJobForOwner(jobId, uid);
  }

  if (!job)
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json(job);
}
