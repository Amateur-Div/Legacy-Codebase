import type { Job } from "./jobManager";
import clientPromise from "@/lib/mongoClient";

const COLLECTION = "jobs";

export async function saveJob(job: Partial<Job> & { id: string }) {
  const db = (await clientPromise).db();
  const collection = db.collection("jobs");

  const { id, ...updates } = job;

  await collection.updateOne({ id }, { $set: updates }, { upsert: true });
}

export async function loadJob(jobId: string): Promise<Job | null> {
  const db = (await clientPromise).db();
  const collection = db.collection(COLLECTION);
  const job = await collection.findOne({ id: jobId });
  return job as Job | null;
}

export async function findAndLockJob(): Promise<Job | null> {
  const db = (await clientPromise).db();
  const collection = db.collection<Job>("jobs");

  const job = await collection.findOneAndUpdate(
    {
      status: { $in: ["queued", "running"] },
      locked: { $ne: true },
    },
    {
      $set: { locked: true },
    },
    {
      returnDocument: "after",
    },
  );

  return job;
}

export async function unlockJob(jobId: string) {
  const db = (await clientPromise).db();
  const collection = db.collection("jobs");

  await collection.updateOne({ id: jobId }, { $set: { locked: false } });
}

export async function loadJobForOwner(
  jobId: string,
  ownerId: string,
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
