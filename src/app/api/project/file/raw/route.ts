import { authMiddleware } from "@/lib/auth-server";
import clientPromise from "@/lib/mongoClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const projectId = searchParams.get("projectId");
    const filePath = searchParams.get("filePath");
    const token = searchParams.get("token");

    await authMiddleware(token);

    if (!projectId || !filePath) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 },
      );
    }

    const db = (await clientPromise).db();

    const fileDoc = await db.collection("project_files").findOne({
      projectId,
      path: filePath.toLocaleLowerCase(),
    });

    if (!fileDoc) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const content = fileDoc.content;

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
