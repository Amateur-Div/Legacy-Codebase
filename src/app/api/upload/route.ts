import { NextRequest, NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { authMiddleware } from "@/lib/auth-server";
import clientPromise from "@/lib/mongoClient";
import { createJob } from "../lib/jobs/jobManager";
import os from "os";
import fs from "fs";
import { jobQueue } from "../lib/queue";
import path from "path";

const MAX_ZIP_SIZE = 1024 * 1024 * 70;

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { uid } = await authMiddleware(token);

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Invalid ZIP file" }, { status: 400 });
    }

    if (file.size > MAX_ZIP_SIZE) {
      return NextResponse.json(
        {
          error: "Repository ZIP exceeds the maximum supported size of 50 MB",
        },
        {
          status: 404,
        },
      );
    }

    const projectId = uuid();
    const job = await createJob(projectId, uid, 0);

    const uploadPath = path.join(os.tmpdir(), "uploads", `${projectId}.zip`);
    fs.mkdirSync(path.dirname(uploadPath), { recursive: true });

    const db = (await clientPromise).db();

    await db.collection("projects").insertOne({
      ownerId: uid,
      members: [uid],
      roles: { [uid]: "owner" },
      pendingInvites: [],
      projectName: file.name.replace(/\.zip$/, ""),
      createdAt: new Date(),
      projectId,
      uploadPath,
      fileTree: null,
      packageInfo: null,
      entryPoints: [],
      tags: [],
      analysisComplete: false,
    });

    await jobQueue.add(
      "analyze",
      { jobId: job.id },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    const stream = fs.createWriteStream(uploadPath);
    const reader = file.stream().getReader();

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          stream.write(value);
        }

        stream.end();
      } catch (err) {
        console.error("Upload stream error:", err);
      }
    })();

    return NextResponse.json({
      message: "Upload successful",
      jobId: job.id,
    });
  } catch (err) {
    console.error("[UPLOAD_ERROR]", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
