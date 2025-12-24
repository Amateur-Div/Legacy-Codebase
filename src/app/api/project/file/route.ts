import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import clientPromise from "@/lib/mongoClient";
import { ObjectId } from "bson";
import { authMiddleware } from "@/lib/auth-server";

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

    const absolutePath = path.join(
      process.cwd(),
      "project_uploads",
      projectId,
      filePath
    );
    const content = fs.readFileSync(absolutePath, "utf-8");

    return NextResponse.json({ content });
  } catch (err) {
    console.error("FILE_READ_ERROR", err);
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get("projectId");
    if (!projectId)
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const token = req.headers.get("Authorization")?.split("Bearer ")[1];
    const { uid } = await authMiddleware(token);

    const { oldPath, newName } = await req.json();

    const db = (await clientPromise).db();
    const projects = db.collection("projects");

    const ext = path.extname(oldPath);
    const dir = path.dirname(oldPath);
    const newPath = path.join(
      dir,
      newName.endsWith(ext) ? newName : newName + ext
    );

    const project = await projects.findOne({ _id: new ObjectId(projectId) });
    if (!project) throw new Error("Project not found");

    const updatedTree = project.fileTree.map((file: any) => {
      if (file.fullPath === oldPath) {
        return {
          ...file,
          name: newPath,
          fullPath: newPath,
        };
      }
      return file;
    });

    await projects.updateOne(
      { _id: new ObjectId(projectId) },
      { $set: { fileTree: updatedTree } }
    );

    return NextResponse.json({ success: true, newPath });
  } catch (error) {
    console.error("Rename failed:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get("projectId");
    if (!projectId)
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const token = req.headers.get("Authorization")?.split("Bearer ")[1];
    const { uid } = await authMiddleware(token);

    const { oldPath } = await req.json();

    const db = (await clientPromise).db();
    const project = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(projectId) });

    if (!project) throw new Error("Project not found");

    const updatedTree = project.fileTree.filter(
      (file: any) => file.fullPath !== oldPath
    );

    const projects = db.collection("projects");
    await projects.updateOne(
      { _id: new ObjectId(projectId) },
      { $set: { fileTree: updatedTree } }
    );

    return NextResponse.json({
      success: true,
      message: "File deleted successfully!",
    });
  } catch (error) {
    console.error("Error deleting file :", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
