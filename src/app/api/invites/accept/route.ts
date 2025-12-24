import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongoClient";
import { authMiddleware } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  const tokenHeader = req.headers.get("authorization") || "";
  const token = tokenHeader.replace("Bearer ", "");
  let user;
  user = await authMiddleware(token);

  const uid = user.uid;
  const email = user.email!.toLowerCase();
  if (!email)
    return NextResponse.json({ error: "No email on user" }, { status: 400 });

  const body = await req.json();
  const { projectId } = body;
  if (!projectId)
    return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const db = (await clientPromise).db();
  const col = db.collection("projects");

  const project = await col.findOne({
    projectId,
    "pendingInvites.email": email,
  });

  if (!project) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const invite = (project.pendingInvites || []).find(
    (inv: any) => inv.email === email
  );
  const role = invite?.role || "viewer";

  await col.updateOne(
    { projectId },
    {
      $addToSet: { members: uid },
      $set: { [`roles.${uid}`]: role },
      $pull: { pendingInvites: { email: email } } as any,
    }
  );

  return NextResponse.json({ ok: true, projectId, role });
}
