import { authMiddleware } from "@/lib/auth-server";
import clientPromise from "@/lib/mongoClient";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get("projectId");
    const filePath = searchParams.get("filePath");

    const token = req.headers.get("Authorization")?.split("Bearer ")[1];
    await authMiddleware(token);

    if (!projectId || !filePath) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 }
      );
    }

    const db = (await clientPromise).db();

    const fileDoc = await db.collection("project_files").findOne({ projectId });

    if (!fileDoc || !fileDoc.files || !fileDoc.files[filePath]) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const content = fileDoc.files[filePath];

    return new Response(content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
