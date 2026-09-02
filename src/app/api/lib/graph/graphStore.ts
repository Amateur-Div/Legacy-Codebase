import clientPromise from "../../../../lib/mongoClient";

const COLLECTION = "graphs";

export async function ensureGraphIndexes() {
  const client = await clientPromise;
  const db = client.db();
  const col = db.collection(COLLECTION);

  await col.createIndex(
    { projectId: 1 },
    {
      unique: true,
      name: "unique_project_graph",
    },
  );
}

export async function saveGraph(
  projectId: string,
  record: {
    nodes: any[];
    edges: any[];
    meta: {
      nodeCount: number;
      edgeCount: number;
      mode: string | null;
      generatedAt: Date;
    };
  },
  ownerId?: string,
) {
  const client = await clientPromise;
  const db = client.db();
  const col = db.collection(COLLECTION);

  await col.updateOne(
    { projectId },
    {
      $setOnInsert: {
        projectId,
        ownerId,
        createdAt: new Date(),
      },
      $set: {
        ownerId,
        record,
        updatedAt: new Date(),
      },
    },
    {
      upsert: true,
    },
  );
}

export async function getGraph(projectId: string, ownerId?: string) {
  const client = await clientPromise;
  const db = client.db();
  const col = db.collection(COLLECTION);

  const filter: Record<string, any> = { projectId };

  if (ownerId) {
    filter.ownerId = ownerId;
  }

  const graph = await col.findOne(filter);

  return graph || null;
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
    updatedAt: d.updatedAt,
    nodeCount: d.record?.nodes?.length ?? 0,
    edgeCount: d.record?.edges?.length ?? 0,
  }));
}
