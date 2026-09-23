# CareConnect — Deployment Plan (Vercel + Render)

> Operational runbook, not a planning doc: it describes how to ship the product
> defined in `PRD.md` / `ARCHITECTURE.md`. The five planning files in `docs/`
> remain the source of truth for *what* to build.

## 1. Target architecture

```text
Browser
  │  https://<your-app>.vercel.app          (Vercel — static frontend)
  │        │  VITE_API_URL
  ▼        ▼
https://careconnect-api.onrender.com/api/v1 (Render — Node/Express API)
  │
  ▼
MongoDB Atlas (M0/M10+ cluster, `careconnect` database)
```

- **Frontend** → Vercel: static Vite build, SPA rewrites (`frontend/vercel.json`), security headers, immutable asset caching.
- **Backend** → Render: Node Web Service from `render.yaml` blueprint, health check on `GET /api/v1/health`, graceful SIGTERM shutdown.
- **Database** → MongoDB Atlas (Render has no managed MongoDB).
- **CORS** → strict allowlist: exact origins in `CLIENT_URLS`, optional `https` suffixes in `CLIENT_URL_SUFFIXES` (e.g. `.vercel.app` for preview deploys). Browsers without an `Origin` header (health probes, curl) are unaffected.

## 2. Prerequisites

| Item | Where | Notes |
|---|---|---|
| GitHub repo with this code pushed | github.com | Render + Vercel both deploy from git |
| MongoDB Atlas account (free M0 works for staging) | cloud.mongodb.com | Create project + cluster (see §3) |
| Render account | render.com | Blueprint or manual Web Service |
| Vercel account | vercel.com | Import the same repo |
| OpenAI API key (optional) | platform.openai.com | Omit to use the built-in heuristic classifier |
| A generated JWT secret (≥ 32 chars) | local terminal | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |

Estimated first-deploy time: **45–75 minutes** (mostly Atlas + DNS).

## 3. Step 1 — MongoDB Atlas (do this first)

1. Create a project (e.g. `careconnect`) and a cluster (M0 free for staging; M10+ for anything real — M0 sleeps and has connection limits).
2. **Database Access** → Add user: username `careconnect-api`, autogenerate a strong password, role **Read and write to any database** (or scoped to `careconnect`).
3. **Network Access** → Add IP `0.0.0.0/0` (required: Render uses dynamic outbound IPs; Atlas M0 has no VPC peering). Note this in your risk log — for production hardening, use Atlas IP Access via Render's static outbound IPs (paid Render feature) or PrivateLink.
4. **Connect** → Drivers → Node.js → copy the connection string. Replace `<password>` and append the database name:
   ```text
   mongodb+srv://careconnect-api:<password>@cluster0.xxxxx.mongodb.net/careconnect?retryWrites=true&w=majority
   ```
5. Keep this string secret — it goes into Render as an environment variable, never into git.

## 4. Step 2 — Backend on Render

### Option A — Blueprint (recommended, reproducible)

1. Render Dashboard → **New → Blueprint** → select the repo. Render reads `render.yaml` at the repo root.
2. Review the detected service `careconnect-api`:
   - Build: `npm install` (runs in `backend/`)
   - Start: `node src/server.js`
   - Health check: `/api/v1/health`
3. Fill the `sync: false` values when prompted:
   - `MONGODB_URI` → Atlas string from §3.
   - `CLIENT_URLS` → leave temporarily as `https://placeholder.invalid` (you update it after §6 with the real Vercel URL). The app **refuses to boot in production without it** — that is intentional fail-closed behavior.
   - `JWT_SECRET` → click **Generate Random Value** (or paste your own ≥ 32 chars).
   - `AI_API_KEY` → optional; leave empty to use heuristics.
4. Create the Blueprint → wait for first deploy (~3–5 min).
5. The deploy will start but the app will exit with `Missing required production env vars: CLIENT_URLS` until you set it — expected. Continue to §6, set the real value, **Manual Deploy → Deploy latest commit**.

### Option B — Manual Web Service (if you prefer clicks)

1. New → Web Service → repo → Root Directory: `backend`.
2. Runtime Node, Build `npm install`, Start `node src/server.js`, Health Check Path `/api/v1/health`.
3. Add the same env vars as Option A (§5 table). Instance type: Free to start (spins down when idle — see §10), Starter ($7/mo) for a real demo.

### Render notes that matter
- **PORT**: Render injects it; the app reads `process.env.PORT`. Never set PORT manually.
- **Deploys**: auto-deploy on push to the tracked branch. Zero-downtime: new instance must pass the health check before traffic shifts; old instance gets SIGTERM, which the app handles by draining requests (10s cap) and closing the Mongo pool (`src/server.js`).
- **Logs**: Dashboard → Logs. Boot failures print `Missing required production env vars: …` or `Failed to start server: …` — fix env, redeploy.

## 5. Backend environment reference (Render → Environment)

| Variable | Required | Example | Notes |
|---|---|---|---|
| `NODE_ENV` | yes | `production` | Enables prod guards, combined logs |
| `MONGODB_URI` | yes | `mongodb+srv://…/careconnect?…` | Atlas string; boot fails without it |
| `JWT_SECRET` | yes | 64-hex random | Min 32 chars enforced; all sessions invalidate on rotation |
| `JWT_EXPIRES_IN` | no | `7d` | Session lifetime |
| `CLIENT_URLS` | yes | `https://careconnect.vercel.app` | Comma-separated exact origins, no trailing slash |
| `CLIENT_URL_SUFFIXES` | no | `.vercel.app` | `https`-only suffix match for preview deploys; exact origins always win |
| `AI_API_KEY` | no | `sk-…` | Omit → heuristic classifier (no external dependency) |
| `AI_MODEL` / `AI_BASE_URL` / `AI_TIMEOUT_MS` / `AI_CONFIDENCE_THRESHOLD` | no | see `backend/.env.example` | Tuning knobs, all have safe defaults |
| `EMAIL_HOST/PORT/USER/PASSWORD` | no | — | Nodemailer; notifications persist in-app regardless |

`render.yaml` is safe to commit: it contains **no secrets** (`sync: false` = dashboard-only, `generateValue` = Render-generated).

## 6. Step 3 — Bootstrap production data (NOT the demo seed)

1. Seed the service catalog (idempotent, safe to re-run):
   ```bash
   # One-off via Render Shell (Dashboard → Shell tab on the service):
   npm run seed   # 11 categories, 34 subcategories, 44 skills
   ```
2. Create the first admin (self-registration can never create ADMINs — by design):
   ```bash
   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='<generated-≥12-chars>' npm run create-admin
   ```
   or `npm run create-admin -- --email=… --password=… [--name=…]`. Promotes the user if the email already exists.
3. **Do NOT run `npm run seed:demo` against production.** It wipes the database first and installs trivial demo credentials (`123456789`). It exists for local/staging demos only.

## 7. Step 4 — Frontend on Vercel

1. Vercel → **Add New → Project** → import the repo.
2. Configure the project:
   - **Root Directory**: `frontend`
   - Framework preset: Vite (auto-detected)
   - Build: `npm run build` · Output: `dist` (defaults)
3. **Environment Variables** (Production): add exactly one —
   ```text
   VITE_API_URL=https://careconnect-api.onrender.com/api/v1
   ```
   (use your real Render URL from §4). ⚠️ Vite bakes env vars in **at build time**: changing this later requires a **redeploy** (Deployments → ⋯ → Redeploy), not just saving.
4. Deploy. `frontend/vercel.json` (committed) handles the rest:
   - SPA fallback rewrites so deep links (`/requests/…`, `/bookings/…`) don't 404 on refresh,
   - immutable caching for `/assets/*`,
   - baseline security headers (`nosniff`, strict referrer, restrictive permissions policy).
5. Copy the production URL (e.g. `https://careconnect.vercel.app`).

## 8. Step 5 — Wire CORS (backend trusts the frontend)

1. Back in Render → service → **Environment** → set:
   ```text
   CLIENT_URLS=https://careconnect.vercel.app
   ```
   (add your custom domain too once §9 is done, comma-separated).
2. Preview deployments (optional): set `CLIENT_URL_SUFFIXES=.vercel.app` so every `https://*.vercel.app` preview can call the API. Only enable this if you actually use previews — exact origins are stricter.
3. **Manual Deploy → Deploy latest commit** (env changes need a restart).
4. Verify from a browser console on the Vercel site:
   ```js
   fetch('https://careconnect-api.onrender.com/api/v1/health').then(r => r.json())
   ```
   should return `{ success: true, … }` with an `access-control-allow-origin` response header echoing your site. Automated coverage for this matrix lives in `backend/tests/deploy.test.js`.

## 9. Step 6 — End-to-end verification (do not skip)

Run through as each role, in this order:

- [ ] Health: `GET /api/v1/health` → 200 (also the Render health-check proof).
- [ ] Register customer → create request → submit (AI classification fills in).
- [ ] Register provider → complete profile → submit verification → **admin verifies** → provider sees the request in Incoming → submits quote.
- [ ] Customer compares quotes → accepts → booking appears; advance lifecycle to CLOSED; invoice generated; review submitted.
- [ ] Raise a dispute → ops reviews → resolves.
- [ ] Admin: users, catalog, fee config, audit logs all load.
- [ ] Negative checks: expired JWT rejected; cross-user resource access 404s; wrong-role route calls 403; unknown frontend origin gets no CORS headers.
- [ ] Vercel: hard-refresh a deep link (`/bookings/…`) → renders (rewrite check); open DevTools → no console errors.

## 10. Custom domains (optional, recommended for production)

- **Vercel**: Project → Settings → Domains → add `app.example.com` (or apex). Add the DNS records Vercel shows.
- **Render**: Service → Settings → Custom Domains → add `api.example.com`, add the CNAME. TLS is automatic on both.
- Update **both** sides: `CLIENT_URLS=https://app.example.com` on Render (redeploy), `VITE_API_URL=https://api.example.com/api/v1` on Vercel (redeploy — build-time!).
- Keep the `*.onrender.com` / `*.vercel.app` URLs working as fallbacks until DNS propagates.

## 11. Ongoing operations

| Concern | Practice |
|---|---|
| Deploys | Push to main → Render + Vercel auto-deploy. Health-gated on Render; instant static publish on Vercel. |
| Rollback | Render → Deploys → Rollback; Vercel → Deployments → Promote previous to Production. DB migrations (if any) must be backwards-compatible. |
| Logs | Render Logs tab (request logs skip `/health` by design); Atlas slow-query profiler for DB. Never log secrets/PII — the logger already redacts error internals from responses. |
| Free-tier caveats | Render Free spins down after inactivity (first request takes ~30–60s — warm it before demos). Atlas M0 sleeps/pauses and caps connections; use M10+ for real traffic. |
| Backups | Atlas continuous backups (M10+) or scheduled `mongodump` for M0. Test restores quarterly. |
| Secret rotation | Rotate `JWT_SECRET` in Render → redeploy (all sessions invalidate — announce it). Rotate Atlas password → update `MONGODB_URI` → redeploy. |
| Rate limits | In-memory per instance (300 req/15min global, 50 auth). Fine for one instance; move to Redis store if you scale horizontally. |
| Scaling | Backend is stateless (JWT, no local sessions) — safe to add Render instances. DB indexes already cover hot query paths (`users.email`, `bookings.*`, `serviceRequests.*`, …). |

## 12. Troubleshooting

| Symptom | Likely cause → fix |
|---|---|
| Frontend shows “Unable to reach the server” / CORS error in console | `CLIENT_URLS` missing the exact Vercel origin (scheme + host, no path/trailing slash) → fix on Render → redeploy. Check `access-control-allow-origin` on the preflight response. |
| Render deploy fails: `Missing required production env vars: …` | Fill the named vars in Dashboard → Environment → Manual Deploy. |
| Render service crash-loops: `ServerSelectionTimeout` / Mongo errors | Atlas Network Access doesn't allow `0.0.0.0/0`, or wrong DB password in `MONGODB_URI`. Test the string locally with `mongosh`. |
| API works via curl but browser calls fail | Classic CORS: see first row. Also confirm the call uses `https`, not `http`. |
| Vercel page 404s on refresh of `/requests/123` | `vercel.json` rewrites missing/misapplied → confirm file is in `frontend/` and Root Directory is `frontend`. |
| Changed `VITE_API_URL` but app still calls the old API | Vite embeds env at build time → Redeploy (don't just save the variable). |
| Login works then immediately logs out | `JWT_SECRET` differs between instances/deploys, or token expired (`JWT_EXPIRES_IN`). After rotation, all users re-login once. |
| `POST /auth/*` returns 429 | Auth rate limiter (50/15min/IP) — behind Render's proxy the app trusts one hop (`trust proxy, 1`); if Render changes topology and every client shares one IP, tighten `trust proxy` or move to keyed limits. |

## 13. Security checklist before going live

- [ ] No `.env` files committed (`git status` clean of secrets; `.gitignore` covers them).
- [ ] `JWT_SECRET` ≥ 32 random chars, unique per environment.
- [ ] `CLIENT_URLS` lists only your domains; `CLIENT_URL_SUFFIXES` only if previews are needed.
- [ ] Atlas: strong DB password, `0.0.0.0/0` replaced with tighter access if possible, backups enabled.
- [ ] Demo credentials (`123456789`) exist **only** in local/staging databases — never seeded to prod.
- [ ] First admin created via `create-admin`; no shared admin accounts.
- [ ] `npm run lint` clean on both sides; backend suite green; frontend build clean.
