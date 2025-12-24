import { NextRequest, NextResponse } from "next/server";
import { authMiddleware } from "@/lib/auth-server";
import { assertProjectAccess } from "@/app/api/lib/projectAccess";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const projectId = await params.id;

  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const user = await authMiddleware(token);
  const uid = user.uid;

  const project = await assertProjectAccess(projectId, uid, "viewer");

  const members = project.members || [];
  const roles = project.roles || {};

  console.log(members);

  const result = members.map(({ uid, email }: any) => ({
    email,
    uid,
    role: roles[uid],
  }));

  return NextResponse.json({ projectId, members: result });
}
