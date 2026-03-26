# CLAUDE.md

## Overview

r7-viz is an interactive graph visualizer for FalkorDB, built as a companion to the r7 knowledge graph MCP server. Single-page app with Express backend.

## Architecture

- **server.js** — Express backend. Connects to FalkorDB, serves two API endpoints:
  - `GET /api/schema` — auto-discovers labels, relationship types, property keys
  - `GET /api/graph` — fetches all nodes and edges with configurable field mapping
- **public/index.html** — Single-file frontend (~2000 lines). Uses sigma.js + graphology for graph rendering. All HTML, CSS, and JS in one file.

## Tech Stack

- Backend: Express 5, FalkorDB client, dotenv
- Frontend: sigma.js (WebGL graph renderer), graphology (graph data structure), ForceAtlas2 layout
- All frontend deps loaded via CDN (unpkg)

## Running

```bash
npm install
npm run dev    # node --watch server.js
npm start      # production
```

Requires FalkorDB running (default: localhost:6379).

## Configuration (Environment Variables)

| Variable | Default | Description |
|----------|---------|-------------|
| `FALKORDB_HOST` | localhost | FalkorDB host |
| `FALKORDB_PORT` | 6379 | FalkorDB port |
| `FALKORDB_PASSWORD` | (empty) | FalkorDB password |
| `GRAPH_NAME` | r7 | Graph name to visualize |
| `PORT` | 3333 | HTTP server port |
| `NAME_PROP` | name | Node property used as display name |
| `DESC_PROP` | description | Node property used as description |
| `NODE_LABEL` | (all) | Filter to specific node label |
| `GROUP_PROPS` | channel | Comma-separated properties for color grouping |

## Key Features

- **Color grouping** by channel/property with auto-generated palettes
- **Search** with fuzzy matching across node names and descriptions
- **Node detail panel** showing properties, edges, description
- **Edge type filtering** — toggle visibility of specific relationship types
- **Heat map mode** — color nodes by recency of `updated_at` property
- **Multi-hop focus** — click a node to focus on its N-hop neighborhood
- **Path finding** — find shortest path between two nodes
- **ForceAtlas2** physics layout with play/pause

## Code Notes

- The frontend is intentionally a single file for simplicity. CSS, JS, and HTML are co-located.
- Node colors are determined by the first non-empty value in `GROUP_PROPS`.
- Edge labels show relationship type on hover.
- The graph auto-refreshes data when clicking the refresh button.
