import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongoClient";
import { ObjectId } from "bson";
import { authMiddleware } from "@/lib/auth-server";
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

    return NextResponse.json({
      content: fileDoc.files[filePath],
    });
  } catch (err) {
    console.error("FILE_READ_ERROR", err);
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}

function renameInTree(nodes: any[], oldPath: string, newPath: string): any[] {
  return nodes.map((node) => {
    if (node.type === "file" && node.fullPath === oldPath) {
      return {
        ...node,
        name: newPath.split("/").pop(),
        fullPath: newPath,
      };
    }

    if (node.children) {
      return {
        ...node,
        children: renameInTree(node.children, oldPath, newPath),
      };
    }

    return node;
  });
}

function updateImportsOnRename(
  nodes: any[],
  oldBase: string,
  newBase: string
): any[] {
  return nodes.map((node) => {
    if (node.type === "file" && Array.isArray(node.imports)) {
      return {
        ...node,
        imports: node.imports.map((imp: any) => {
          if (
            (typeof imp.name === "string" &&
              imp.name.endsWith(`/${oldBase}`)) ||
            imp.name === `./${oldBase}` ||
            imp.name === `../${oldBase}`
          ) {
            return {
              ...imp,
              name: imp.name.replace(oldBase, newBase),
            };
          }
          return imp;
        }),
      };
    }

    if (node.children) {
      return {
        ...node,
        children: updateImportsOnRename(node.children, oldBase, newBase),
      };
    }

    return node;
  });
}

function resolveImportPath(
  importerPath: string,
  importName: string
): string | null {
  if (!importName.startsWith(".")) return null;

  const importerDir = path.posix.dirname(importerPath);
  const resolved = path.posix.normalize(
    path.posix.join(importerDir, importName)
  );

  return resolved;
}

function toRelativeImport(importerPath: string, targetPath: string): string {
  const importerDir = path.posix.dirname(importerPath);
  let relative = path.posix.relative(importerDir, targetPath);

  if (!relative.startsWith(".")) {
    relative = "./" + relative;
  }

  relative = relative.replace(/\.(js|jsx|ts|tsx)$/, "");

  return relative;
}

export async function POST(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const token = req.headers.get("Authorization")?.split("Bearer ")[1];
    await authMiddleware(token);

    const { oldPath, newName } = await req.json();

    if (!oldPath || !newName) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 }
      );
    }

    const db = (await clientPromise).db();

    const project = await db.collection("projects").findOne({ projectId });

    if (!project) throw new Error("Project not found");

    const ext = oldPath.includes(".")
      ? oldPath.substring(oldPath.lastIndexOf("."))
      : "";

    const dir = oldPath.includes("/")
      ? oldPath.substring(0, oldPath.lastIndexOf("/"))
      : "";

    const newPath =
      dir.length > 0
        ? `${dir}/${newName.endsWith(ext) ? newName : newName + ext}`
        : newName.endsWith(ext)
        ? newName
        : newName + ext;

    const updatedTree = renameInTree(project.fileTree, oldPath, newPath);

    const oldBase = path.basename(oldPath).replace(/\.(js|jsx|ts|tsx)$/, "");
    const newBase = path.basename(newPath).replace(/\.(js|jsx|ts|tsx)$/, "");

    const treeWithUpdatedImports = updateImportsOnRename(
      updatedTree,
      oldBase,
      newBase
    );

    await db
      .collection("projects")
      .updateOne({ projectId }, { $set: { fileTree: treeWithUpdatedImports } });

    const fileDoc = await db.collection("project_files").findOne({ projectId });

    if (fileDoc?.files && fileDoc.files[oldPath]) {
      const updatedFiles: Record<string, string> = {};

      for (const [filePath, content] of Object.entries(fileDoc.files)) {
        if (filePath === oldPath) {
          updatedFiles[newPath] = content as string;
        } else {
          updatedFiles[filePath] = content as string;
        }
      }

      await db
        .collection("project_files")
        .updateOne({ projectId }, { $set: { files: updatedFiles } });
    }

    return NextResponse.json({ success: true, newPath });
  } catch (error) {
    console.error("Rename failed:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

function deleteFromTree(nodes: any[], targetPath: string): any[] {
  return nodes
    .filter((node) => node.fullPath !== targetPath)
    .map((node) => {
      if (node.children) {
        return {
          ...node,
          children: deleteFromTree(node.children, targetPath),
        };
      }
      return node;
    });
}

export async function DELETE(req: NextRequest) {
  try {
    const projectId = req.nextUrl.searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const token = req.headers.get("Authorization")?.split("Bearer ")[1];
    await authMiddleware(token);

    const { oldPath } = await req.json();
    if (!oldPath) {
      return NextResponse.json({ error: "Missing file path" }, { status: 400 });
    }

    const db = (await clientPromise).db();

    const project = await db
      .collection("projects")
      .findOne({ _id: new ObjectId(projectId) });

    if (!project) throw new Error("Project not found");

    const updatedTree = deleteFromTree(project.fileTree, oldPath);

    await db
      .collection("projects")
      .updateOne(
        { _id: new ObjectId(projectId) },
        { $set: { fileTree: updatedTree } }
      );

    const fileDoc = await db.collection("project_files").findOne({ projectId });

    if (fileDoc && fileDoc.files && fileDoc.files[oldPath]) {
      const newFiles = { ...fileDoc.files };
      delete newFiles[oldPath];

      await db
        .collection("project_files")
        .updateOne({ projectId }, { $set: { files: newFiles } });
    }

    return NextResponse.json({
      success: true,
      message: "File deleted successfully!",
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
