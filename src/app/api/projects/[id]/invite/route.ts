import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongoClient";
import { assertProjectAccess } from "@/app/api/lib/projectAccess";
import { authMiddleware } from "@/lib/auth-server";
import { ObjectId } from "bson";
import User from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const tokenHeader = req.headers.get("authorization") || "";
  const token = tokenHeader.replace("Bearer ", "");
  let inviter;
  try {
    inviter = await authMiddleware(token);
  } catch (err) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const uid = inviter.uid;
  const { params } = await context;
  const { id } = await params;

  let project;
  try {
    project = await assertProjectAccess(id, uid, "owner");
  } catch (err: any) {
    return NextResponse.json(
      {
        error:
          "You are not allowed to send invites, only project admin can send invites.",
      },
      { status: err.status || 403 }
    );
  }

  const body = await req.json();
  const { email, role } = body;

  if (!email || !["viewer", "editor"].includes(role)) {
    return NextResponse.json(
      { error: "Invalid invite payload" },
      { status: 400 }
    );
  }

  const db = (await clientPromise).db();
  const col = db.collection("projects");

  const invitedAt = Date.now();

  await col.updateOne(
    { _id: new ObjectId(id) },
    {
      $addToSet: {
        pendingInvites: {
          email: email.toLowerCase(),
          role,
          invitedAt,
          invitedBy: uid,
        },
      },
    }
  );

  return NextResponse.json({ ok: true, message: "Invite created" });
}
