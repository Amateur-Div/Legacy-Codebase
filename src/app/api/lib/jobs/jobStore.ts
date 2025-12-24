import type { Job } from "./jobManager";
import clientPromise from "@/lib/mongoClient";

const COLLECTION = "jobs";

export async function saveJob(job: Job) {
  const db = (await clientPromise).db();
  const collection = db.collection(COLLECTION);
  await collection.updateOne({ id: job.id }, { $set: job }, { upsert: true });
}

export async function loadJob(jobId: string): Promise<Job | null> {
  const db = (await clientPromise).db();
  const collection = db.collection(COLLECTION);
  const job = await collection.findOne({ id: jobId });
  return job as Job | null;
}

export async function loadJobForOwner(
  jobId: string,
  ownerId: string
): Promise<Job | null> {
  const db = (await clientPromise).db();
  const collection = db.collection(COLLECTION);
  const job = await collection.findOne({ id: jobId, ownerId });
  return job as Job | null;
}

export async function listJobs(projectId: string, ownerId?: string) {
  const db = (await clientPromise).db();
  const collection = db.collection(COLLECTION);
  const q: any = { projectId };
  if (ownerId) q.ownerId = ownerId;
  return collection.find(q).sort({ createdAt: -1 }).limit(50).toArray();
}

export async function deleteOldJobs(days = 7) {
  const db = (await clientPromise).db();
  const collection = db.collection(COLLECTION);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  await collection.deleteMany({ createdAt: { $lt: cutoff.getTime() } });
}
