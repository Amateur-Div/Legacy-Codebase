import { getGraph } from "@/app/api/lib/graph/graphStore";
import { authMiddleware } from "@/lib/auth-server";
import clientPromise from "@/lib/mongoClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  let projectId = req.url.split("/")[5];

  try {
    const token = req.headers.get("Authorization")?.split("Bearer ")[1];

    const { uid } = await authMiddleware(token);

    if (!uid) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // try {
    //   await assertProjectAccess(projectId, uid, "viewer");
    // } catch (error: any) {
    //   return NextResponse.json(
    //     { error: error.message },
    //     { status: error.status || 403 }
    //   );
    // }

    const graphs = await getGraph(projectId, uid);
    return NextResponse.json({ projectId, graphs });
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message ?? err) },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const projectId = req.url.split("/")[5];

    const client = await clientPromise;
    const db = client.db();
    const col = db.collection("graphs");

    const body = await req.json();
    const { nodes, edges } = body;

    const graph = await col.find({ projectId }).toArray();
    console.log("Graph : ", graph);

    await col.updateOne({ projectId }, { $set: { record: body } });

    return NextResponse.json({ message: "Graph updated successfully!" });
  } catch (error: any) {
    return NextResponse.json(
      { error: String(error?.message ?? error) },
      { status: 500 },
    );
  }
}
