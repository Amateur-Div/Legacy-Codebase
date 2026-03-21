import clientPromise from "@/lib/mongoClient";

export async function getCodeFiles(projectId: string) {
  const db = (await clientPromise).db();

  return db
    .collection("project_files")
    .find({ projectId, isCode: true })
    .sort({ path: 1 })
    .toArray();
}
