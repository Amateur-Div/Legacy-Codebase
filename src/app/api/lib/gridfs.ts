import { GridFSBucket, ObjectId } from "mongodb";
import fs from "fs";
import clientPromise from "../../../lib/mongoClient";

let bucket: GridFSBucket | null = null;

export async function getGridFSBucket() {
  if (bucket) return bucket;

  const client = await clientPromise;
  const db = client.db();

  bucket = new GridFSBucket(db, {
    bucketName: "project_uploads",
    chunkSizeBytes: 1024 * 1024,
  });

  return bucket;
}

export async function uploadZipToGridFS(
  projectId: string,
  file: File,
): Promise<string> {
  const bucket = await getGridFSBucket();

  const uploadStream = bucket.openUploadStream(`${projectId}.zip`, {
    metadata: { projectId },
  });

  const reader = file.stream().getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    uploadStream.write(value);
  }

  uploadStream.end();

  return new Promise((resolve, reject) => {
    uploadStream.on("finish", () => {
      resolve(uploadStream.id.toString()); // keep string for DB
    });
    uploadStream.on("error", reject);
  });
}

export async function downloadZipToPath(fileId: ObjectId, destPath: string) {
  const bucket = await getGridFSBucket();

  const stream = bucket.openDownloadStream(new ObjectId(fileId));

  return new Promise<void>((resolve, reject) => {
    const write = fs.createWriteStream(destPath);

    stream.pipe(write);

    write.on("finish", () => resolve());
    write.on("error", reject);
    stream.on("error", reject);
  });
}
