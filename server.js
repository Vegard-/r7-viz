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

// Configurable field mapping — adapts queries to any FalkorDB schema
const NAME_PROP = process.env.NAME_PROP || "name";
const DESC_PROP = process.env.DESC_PROP || "description";
const NODE_LABEL = process.env.NODE_LABEL || "";  // empty = all labels

// Multi-level grouping: comma-separated list of property names
// First property = primary group (color hue), subsequent = sub-groups (shade)
// e.g. GROUP_PROPS=channel,prefix  or  GROUP_PROPS=label,type
const GROUP_PROPS = (process.env.GROUP_PROPS || process.env.GROUP_PROP || "channel")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

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

// Auto-discover schema from FalkorDB
async function fetchSchema() {
  const [labelsRes, relTypesRes, propsRes] = await Promise.all([
    graph.query("CALL db.labels()"),
    graph.query("CALL db.relationshipTypes()"),
    graph.query("CALL db.propertyKeys()"),
  ]);

  const labels = (labelsRes.data || []).map(r => r.label || Object.values(r)[0]);
  const relationshipTypes = (relTypesRes.data || []).map(r => r.relationshipType || Object.values(r)[0]);
  const propertyKeys = (propsRes.data || []).map(r => r.propertyKey || Object.values(r)[0]);

  return {
    labels,
    relationshipTypes,
    propertyKeys,
    config: { NAME_PROP, DESC_PROP, GROUP_PROPS, NODE_LABEL },
  };
}

async function fetchGraph() {
  // Build label match — specific label or all nodes
  const labelMatch = NODE_LABEL ? `(n:\`${NODE_LABEL}\`)` : "(n)";

  // Build group columns for each configured group property
  const groupCols = GROUP_PROPS.map((prop, i) => `, n.\`${prop}\` AS group_${i}`).join("");
  const nodesResult = await graph.query(
    `MATCH ${labelMatch} RETURN n.\`${NAME_PROP}\` AS name, n.\`${DESC_PROP}\` AS description, labels(n) AS labels, properties(n) AS all_props${groupCols}`
  );

  const nodes = [];
  for (const row of nodesResult.data || []) {
    const name = row.name || "";
    if (!name) continue;
    const description = row.description || "";
    const nodeLabels = row.labels || [];
    const allProps = row.all_props || {};

    // Build groups array from configured props, falling through to next level
    const groups = GROUP_PROPS.map((_, i) => row[`group_${i}`] || "");
    // Primary group is first non-empty, or "unknown"
    const primaryGroup = groups.find(g => g) || "unknown";

    // Extract prefix from name (e.g., "insight" from "insight:foo")
    const prefix = name.includes(":") ? name.split(":")[0] : "other";

    nodes.push({
      id: name,
      name,
      groups,           // array of group values at each level
      group: primaryGroup,  // backward compat: primary group
      prefix,
      description,
      labels: nodeLabels,
      properties: JSON.stringify(allProps),
      created_at: allProps.created_at || "",
      updated_at: allProps.updated_at || "",
    });
  }

  // Fetch all edges — use same label filter
  const edgeMatch = NODE_LABEL
    ? `(a:\`${NODE_LABEL}\`)-[r]->(b:\`${NODE_LABEL}\`)`
    : "(a)-[r]->(b)";
  const edgesResult = await graph.query(
    `MATCH ${edgeMatch} WHERE a.\`${NAME_PROP}\` IS NOT NULL AND b.\`${NAME_PROP}\` IS NOT NULL RETURN a.\`${NAME_PROP}\` AS source, b.\`${NAME_PROP}\` AS target, type(r) AS type, r.context AS context`
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

app.get("/api/schema", async (_req, res) => {
  try {
    const schema = await fetchSchema();
    res.json(schema);
  } catch (err) {
    console.error("Failed to fetch schema:", err);
    res.status(500).json({ error: err.message });
  }
});

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
