import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in environment variables.");
}

const uri = process.env.MONGODB_URI;

const options = {
  tls: true,
  monitorCommands: process.env.NODE_ENV === "development",
  tlsAllowInvalidCertificates: false,
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

async function ensureIndexes(db: any) {
  await db
    .collection("project_files")
    .createIndex({ projectId: 1, path: 1 }, { unique: true });

  await db.collection("project_files").createIndex({ projectId: 1 });

  await db.collection("comments").createIndex({
    projectId: 1,
    filePath: 1,
    lineNumber: 1,
  });
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect().then(async (c) => {
      const db = c.db();
      await ensureIndexes(db);
      return c;
    });
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect().then(async (c) => {
    const db = c.db();
    await ensureIndexes(db);
    return c;
  });
}

export default clientPromise;
