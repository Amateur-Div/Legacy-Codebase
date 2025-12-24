import { getGraph } from "@/app/api/lib/graph/graphStore";
import { assertProjectAccess } from "@/app/api/lib/projectAccess";
import { authMiddleware } from "@/lib/auth-server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ jobId: string }> }
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
      { status: 500 }
    );
  }
}
