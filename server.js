import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { FalkorDB } from "falkordb";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FALKORDB_HOST = process.env.FALKORDB_HOST || "localhost";
const FALKORDB_PORT = parseInt(process.env.FALKORDB_PORT || "6379", 10);
const FALKORDB_PASSWORD = process.env.FALKORDB_PASSWORD || "";
const FALKORDB_USERNAME = process.env.FALKORDB_USERNAME || "";
const GRAPH_NAME = process.env.GRAPH_NAME || "r7";
const PORT = parseInt(process.env.PORT || "3333", 10);

let db;
let graph;

async function connectDB() {
  const opts = { socket: { host: FALKORDB_HOST, port: FALKORDB_PORT } };
  if (FALKORDB_PASSWORD) opts.password = FALKORDB_PASSWORD;
  if (FALKORDB_USERNAME) opts.username = FALKORDB_USERNAME;
  db = await FalkorDB.connect(opts);
  graph = db.selectGraph(GRAPH_NAME);
  console.log(`Connected to FalkorDB at ${FALKORDB_HOST}:${FALKORDB_PORT}, graph: ${GRAPH_NAME}`);
}

async function fetchGraph() {
  // Fetch all nodes — falkordb v6 returns data as objects keyed by column name
  const nodesResult = await graph.query(
    `MATCH (n:Node) RETURN n.name AS name, n.channel AS channel, n.description AS description, n.properties AS properties, n.created_at AS created_at, n.updated_at AS updated_at`
  );

  const nodes = [];
  for (const row of nodesResult.data || []) {
    const name = row.name;
    if (!name) continue;
    const channel = row.channel || "unknown";
    const description = row.description || "";
    const properties = row.properties || "{}";
    const created_at = row.created_at || "";
    const updated_at = row.updated_at || "";

    // Extract prefix from name (e.g., "insight" from "insight:foo")
    const prefix = name.includes(":") ? name.split(":")[0] : "other";

    nodes.push({ id: name, name, channel, prefix, description, properties, created_at, updated_at });
  }

  // Fetch all edges
  const edgesResult = await graph.query(
    `MATCH (a:Node)-[r]->(b:Node) RETURN a.name AS source, b.name AS target, type(r) AS type, r.context AS context`
  );

  const edges = [];
  for (const row of edgesResult.data || []) {
    edges.push({
      source: row.source,
      target: row.target,
      type: row.type,
      context: row.context || "",
    });
  }

  return { nodes, edges };
}

const app = express();
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/graph", async (_req, res) => {
  try {
    const data = await fetchGraph();
    res.json(data);
  } catch (err) {
    console.error("Failed to fetch graph:", err);
    res.status(500).json({ error: err.message });
  }
});

async function main() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`r7-viz running at http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
