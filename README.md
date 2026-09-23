# CareConnect — Home Services Booking & Operations Platform

MERN + AI marketplace: customers request services, providers quote, bookings follow an
explicit lifecycle, with operations / support / admin tooling. See `docs/`.

## Quick start

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev   # SKIP_DB=1 npm run dev  → run API without MongoDB
npm test
```

API root: `http://localhost:5000/api/v1` · health: `GET /api/v1/health`

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
npm run build
```

App: `http://localhost:5173` · API URL via `VITE_API_URL`.

## Deployment

Production target: **frontend on Vercel, API on Render, database on MongoDB Atlas**.

Full step-by-step plan: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) · Render blueprint: [`render.yaml`](render.yaml) · Vercel config: [`frontend/vercel.json`](frontend/vercel.json)

## Docs (source of truth)

```text
docs/PRD.md
docs/ARCHITECTURE.md
docs/AGENTS.md
docs/BUILD_PLAN.md
docs/PROGRESS.md
```

No additional planning Markdown files — update the five above.
