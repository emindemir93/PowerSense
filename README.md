# PowerSense BI

A self-service Business Intelligence platform inspired by QlikSense and Power BI. Build interactive dashboards with drag-and-drop widgets, cross-filtering, and a dynamic query engine.

## Features

- **Dashboard Builder** — Drag-and-drop grid layout with resizable widgets
- **9 Widget Types** — KPI cards, Bar, Horizontal Bar, Line, Area, Pie, Donut, Scatter, and Data Table
- **Dynamic Query Engine** — Backend query API that supports any combination of dimensions, measures, and filters
- **Cross-Filtering** — Click on any chart element to filter all other widgets on the dashboard
- **Dashboard Management** — Create, save, duplicate, and delete dashboards
- **Data Explorer** — Ad-hoc query interface to explore raw data
- **Role-Based Access** — Admin, Analyst, and Viewer roles with appropriate permissions
- **Dark Theme** — Modern dark UI optimized for data visualization

## Architecture

```
PowerSense/
├── backend/          # Express.js REST API
│   ├── src/
│   │   ├── routes/   # API endpoints (query engine, dashboards, CRUD)
│   │   ├── config/   # Database, logger, swagger
│   │   └── middleware/# Auth & authorization
│   ├── migrations/   # PostgreSQL schema (Knex.js)
│   └── seeds/        # Demo data + sample dashboards
├── frontend/         # React SPA (dashboard builder)
│   └── src/
│       ├── components/ # Canvas, WidgetRenderer, ConfigPanel, FilterBar
│       ├── pages/      # Dashboards, Builder, Explorer, Profile
│       ├── store/      # Zustand state (auth, dashboard, cross-filters)
│       └── services/   # Axios API client
├── backoffice/       # Admin panel (user & audit management)
└── docker/           # Docker Compose setup
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Recharts, React Grid Layout, Zustand, TanStack Query |
| Backend | Node.js, Express, Knex.js |
| Database | PostgreSQL 14 |
| Auth | JWT (access + refresh tokens) |
| Deployment | Docker Compose, Nginx |

## Quick Start

```bash
cd docker
docker compose up -d --build
```

Services will be available at:
- **Frontend** — http://localhost:3000
- **Backend API** — http://localhost:4000
- **API Docs** — http://localhost:4000/api-docs
- **Backoffice** — http://localhost:3001

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@qlicksense.com | Admin123! |
| Analyst | analyst@qlicksense.com | Analyst123! |
| Viewer | viewer@qlicksense.com | Viewer123! |

## Dynamic Query API

The query engine accepts flexible payloads to aggregate data on the fly:

```bash
POST /api/query
{
  "source": "orders",
  "dimensions": ["region", "category"],
  "measures": [
    { "field": "total_amount", "aggregation": "sum", "alias": "revenue" },
    { "field": "order_count", "aggregation": "count", "alias": "orders" }
  ],
  "filters": { "status": ["completed", "shipped"] },
  "limit": 100
}
```

Available sources: `orders`, `customers`, `products` — each with their own dimensions and measures.

## Sample Dashboards

Three pre-built dashboards are seeded on first run:

1. **Sales Overview** — Revenue KPIs, monthly trend, category distribution, regional performance
2. **Customer Insights** — Customer counts, type breakdown, city and region analysis
3. **Product Performance** — Product metrics, category breakdown, stock distribution, catalog table

## License

MIT
