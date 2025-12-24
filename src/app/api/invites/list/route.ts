import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongoClient";
import { authMiddleware } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  const tokenHeader = req.headers.get("authorization") || "";
  const token = tokenHeader.replace("Bearer ", "");

  const { email } = await authMiddleware(token);

  if (!email) return NextResponse.json({ invites: [] });

  const db = (await clientPromise).db();
  const projects = await db
    .collection("projects")
    .find({ "pendingInvites.email": email.toLocaleLowerCase() })
    .project({ projectId: 1, projectName: 1, pendingInvites: 1 })
    .toArray();

  const invites = projects
    .map((p) => {
      const invitesForEmail = (p.pendingInvites || []).filter(
        (inv: any) => inv.email === email
      );
      return invitesForEmail.map((inv: any) => ({
        projectId: p.projectId,
        projectName: p.projectName,
        role: inv.role,
        invitedAt: inv.invitedAt,
        invitedBy: inv.invitedBy,
      }));
    })
    .flat();

  return NextResponse.json({ invites });
}
