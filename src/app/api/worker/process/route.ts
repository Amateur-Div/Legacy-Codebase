import { NextResponse } from "next/server";
import {
  findAndLockJob,
  loadJob,
  saveJob,
  unlockJob,
} from "@/app/api/lib/jobs/jobStore";
import { runJobStep } from "../../lib/jobs/jobWorker";

export async function POST() {
  const locked = await findAndLockJob();

  if (!locked) {
    return NextResponse.json({ message: "No job available" });
  }

  try {
    let job = await loadJob(locked.id);

    if (!job) {
      await unlockJob(locked.id);
      return NextResponse.json({ message: "Job not found" });
    }

    await runJobStep(job);
    job = await loadJob(job.id);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Worker error:", err);

    await saveJob({
      ...locked,
      status: "error",
      error: err.message,
    });

    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    await unlockJob(locked.id);
  }
}
