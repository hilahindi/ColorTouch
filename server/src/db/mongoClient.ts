import { MongoClient, type Db } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

/**
 * Connects once at server startup (see app.ts) and caches the Db handle —
 * every repository calls getDb() rather than holding its own connection.
 * Database name comes from the URI's path segment if present, otherwise
 * defaults to "colortouch" (Atlas connection strings from the UI omit it).
 */
export async function connectMongo(): Promise<Db> {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(process.env.MONGODB_DB_NAME ?? "colortouch");
  return db;
}

/** Throws if connectMongo() hasn't resolved yet — repositories are only ever
 * constructed after app.ts awaits connectMongo(), so this should never fire. */
export function getDb(): Db {
  if (!db) throw new Error("MongoDB not connected yet — call connectMongo() first");
  return db;
}
