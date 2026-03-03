# r7-viz

Interactive graph visualizer for [FalkorDB](https://www.falkordb.com/).

![Stack](https://img.shields.io/badge/node-%3E%3D18-green) ![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- Real-time force-directed layout (ForceAtlas2)
- Dark-first UI with automatic color coding by node properties
- Search nodes with `/` shortcut
- Click nodes to inspect properties, edges, and navigate the graph
- Hover tooltips with node details
- Legend showing node groups and edge types
- Curved edges with type labels

## Quick start

```bash
cp .env.example .env
# Edit .env with your FalkorDB connection details
npm install
npm start
```

Open [http://localhost:3333](http://localhost:3333).

## Configuration

| Variable | Default | Description |
|---|---|---|
| `FALKORDB_HOST` | `localhost` | FalkorDB host |
| `FALKORDB_PORT` | `6379` | FalkorDB port |
| `FALKORDB_PASSWORD` | | FalkorDB password |
| `FALKORDB_USERNAME` | | FalkorDB username |
| `GRAPH_NAME` | `r7` | Graph name to visualize |
| `NAME_PROP` | `name` | Node property used as label |
| `DESC_PROP` | `description` | Node property used for description |
| `GROUP_PROP` | `channel` | Node property used for color grouping |
| `GROUP_FALLBACK_PROP` | | Fallback grouping property when `GROUP_PROP` is absent |
| `NODE_LABEL` | *(all)* | Graph label to query (empty = all labels) |
| `PORT` | `3333` | HTTP server port |

## Stack

- **Backend:** Express, [falkordb](https://www.npmjs.com/package/falkordb) client
- **Frontend:** [Sigma.js 3.0](https://www.sigmajs.org/) + [Graphology](https://graphology.github.io/) (loaded via CDN)
- **Layout:** ForceAtlas2 (custom JS implementation, no Web Worker)

## License

[MIT](LICENSE)
