import clientPromise from "@/lib/mongoClient";
import { ObjectId } from "bson";

export type Role = "owner" | "editor" | "viewer";

export async function assertProjectAccess(
  projectId: string,
  uid: string,
  requiredRole?: Role
) {
  const db = (await clientPromise).db();
  const col = db.collection("projects");

  const project = await col.findOne({ _id: new ObjectId(projectId) });
  if (!project) {
    const err: any = new Error("Project not found");
    err.status = 404;
    throw err;
  }

  const members: string[] = project.members;
  console.log("Members : ", members);
  console.log("Uid : ", uid);
  if (!members.includes(uid)) {
    const err: any = new Error("Forbidden: not a project member");
    err.status = 403;
    throw err;
  }

  if (requiredRole) {
    const roles = project.roles || {};
    const role = roles[uid] as Role | undefined;
    const rank = { viewer: 0, editor: 1, owner: 2 } as Record<Role, number>;
    console.log("Role : ", role);
    console.log("\nRequired : ", requiredRole);
    console.log(
      "Role rank : ",
      rank[role!],
      " Required role rank : ",
      rank[requiredRole]
    );

    if (!role || rank[role] < rank[requiredRole]) {
      const err: any = new Error("Forbidden: insufficient role");
      err.status = 403;
      throw err;
    }
  }

  return project;
}
