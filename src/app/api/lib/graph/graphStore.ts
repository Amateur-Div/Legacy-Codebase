import clientPromise from "@/lib/mongoClient";

const COLLECTION = "graphs";

export async function saveGraph(
  projectId: string,
  record: { nodes: any[]; edges: any[] },
  ownerId?: string
) {
  const client = await clientPromise;
  const db = client.db();
  const col = db.collection(COLLECTION);

  await col.insertOne({
    projectId,
    ownerId,
    createdAt: new Date(),
    record,
  });
}

export async function getGraph(projectId: any, ownerId?: string) {
  const client = await clientPromise;
  const db = client.db();
  const col = db.collection(COLLECTION);

  console.log(ownerId);

  const graphs = await col
    .find({ projectId })
    .sort({ createdAt: -1 })
    .limit(1)
    .toArray();
  return graphs || { nodes: [], edges: [] };
}

export async function listGraphs(limit = 10) {
  const client = await clientPromise;
  const db = client.db();
  const col = db.collection(COLLECTION);

  const docs = await col
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return docs.map((d) => ({
    projectId: d.projectId,
    createdAt: d.createdAt,
    nodeCount: d.record?.nodes?.length ?? 0,
    edgeCount: d.record?.edges?.length ?? 0,
  }));
}
