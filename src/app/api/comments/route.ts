import clientPromise from "@/lib/mongoClient";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { projectId, filePath, lineNumber, text, authorId } =
      await req.json();

    if (!projectId || !filePath || !lineNumber || !text) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
      });
    }

    const db = (await clientPromise).db();

    const result = await db.collection("comments").insertOne({
      projectId,
      filePath,
      lineNumber,
      text,
      authorId: authorId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return new Response(JSON.stringify({ insertedId: result.insertedId }), {
      status: 201,
    });
  } catch (error) {
    console.error("Error : ", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const filePath = searchParams.get("filePath");

  const db = (await clientPromise).db();

  console.log("id : ", projectId, ", path : ", filePath);

  const comments = await db
    .collection("comments")
    .find({ projectId, filePath })
    .sort({ lineNumber: 1, createdAt: 1 })
    .toArray();

  return new Response(JSON.stringify(comments), { status: 200 });
}
