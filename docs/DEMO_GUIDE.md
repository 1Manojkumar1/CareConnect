# CareConnect — Demo & Capstone Guide

## Quick Start

```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Start MongoDB (local)
mongod

# 3. Seed catalog + full demo data
cd backend
MONGODB_URI=mongodb://localhost/careconnect npm run seed:demo

# 4. Start backend (terminal 1)
MONGODB_URI=mongodb://localhost/careconnect \
  JWT_SECRET=careconnect_dev_secret_minimum_32_chars \
  npm run dev

# 5. Start frontend (terminal 2)
cd frontend
VITE_API_URL=http://localhost:5000/api/v1 npm run dev
```

Frontend runs at **http://localhost:5173** · API at **http://localhost:5000/api/v1**

---

## Demo Accounts

All passwords: **`123456789`**

| Email | Role | Name | Notes |
|---|---|---|---|
| `admin1@gmail.com` | ADMIN | admin1 | Full platform access |
| `ops1@gmail.com` | OPERATIONS | ops1 | Booking queue + disputes |
| `user1@gmail.com` | CUSTOMER | user1 | Has bookings, invoice, quote |
| `user2@gmail.com` | CUSTOMER | user2 | Active job + dispute |
| `provider1@gmail.com` | PROVIDER | provider1 | Plumbing + Electrical, Austin |
| `provider2@gmail.com` | PROVIDER | provider2 | Cleaning + Pest Control, Austin |
| `provider3@gmail.com` | PROVIDER | provider3 | Appliance Repair + HVAC, Austin |

---

## Pre-Seeded Scenarios

The demo environment tells a complete story across the service lifecycle.

### Scenario 1 — Fully completed job (user1 + provider1)
- user1 raised a plumbing request (kitchen sink leak — HIGH urgency).
- provider1 submitted a quote ($155 fixed price). user1 accepted.
- Booking went through the full lifecycle: CONFIRMED → IN_PROGRESS → COMPLETED → CLOSED.
- Invoice **PAID** ($186.78 incl. tax + platform fee).
- user1 left a ⭐⭐⭐⭐⭐ review for provider1.

> **Demo path:** Log in as `user1@gmail.com` → My Bookings → view closed booking → View Invoice → View Review

### Scenario 2 — Upcoming booking (user1 + provider2)
- user1 has a deep clean scheduled 3 days from now.
- Booking is CONFIRMED. Invoice ISSUED ($337.40), due on service day.
- Notifications generated for user1 (invoice ready) and provider2 (upcoming job reminder).

> **Demo path:** Log in as `user1@gmail.com` → My Bookings → upcoming cleaning booking

### Scenario 3 — Job in progress right now (user2 + provider3)
- user2 raised a HIGH urgency appliance repair (Samsung refrigerator not cooling).
- provider3 arrived 75 minutes ago and is currently IN_PROGRESS.
- Provider status updates (ON_THE_WAY → ARRIVED → IN_PROGRESS) all timestamped.

> **Demo path:** Log in as `user2@gmail.com` → My Bookings → refrigerator repair (active)
> **Or as provider:** Log in as `provider3@gmail.com` → My Jobs → advance job to COMPLETED

### Scenario 4 — Open request with pending quote (user1)
- user1 needs a ceiling fan installed. Request is OPEN.
- provider1 submitted a PENDING quote ($125) awaiting user1's acceptance.
- Demonstrates the quote comparison + accept flow.

> **Demo path:** Log in as `user1@gmail.com` → My Requests → ceiling fan request → compare quotes

### Scenario 5 — Dispute under review (user2 + provider1)
- user2 disputed a completed plumbing job (poor quality — faucet dripping again).
- Dispute is UNDER_REVIEW. Ops team has acknowledged it.
- Booking is in DISPUTED state.

> **Demo path:** Log in as `ops1@gmail.com` → Operations Center → Disputes
> **Or:** Log in as `user2@gmail.com` → Dispute detail

---

## Demo Walkthrough by Role

### As user1 (CUSTOMER)

1. **Dashboard** → see recent bookings, open request with pending quote
2. **My Requests** → open ceiling fan request → view provider1's quote → Accept
3. **My Bookings** → see CONFIRMED upcoming cleaning, CLOSED plumbing job
4. **Invoices** → PAID invoice ($186.78), ISSUED invoice ($337.40)
5. **Account** → profile, addresses

### As user2 (CUSTOMER)

1. **Dashboard** → see IN_PROGRESS refrigerator repair
2. **My Bookings** → active job with live status (provider3 is in progress)
3. **Disputes** → UNDER_REVIEW dispute, description and reason
4. **Invoices** → (no paid invoices yet — job not confirmed)

### As provider1 (PROVIDER)

1. **My Jobs** → see jobs; closed plumbing job visible
2. **Incoming Requests** → browse open requests in Austin (ceiling fan from user1)
3. **Provider Profile** → VERIFIED profile, skills, areas, pricing, rating 4.8 (47 reviews)
4. **Availability** → schedule, working hours, timezone

### As provider2 (PROVIDER)

1. **My Jobs** → upcoming cleaning job (CONFIRMED, in 3 days)
2. **My Quotes** → view the accepted cleaning quote
3. **Provider Profile** → VERIFIED, Cleaning + Pest Control, Austin

### As provider3 (PROVIDER)

1. **My Jobs** → IN_PROGRESS refrigerator repair (currently active)
2. → advance status: COMPLETED (demonstrates provider job control)
3. **Provider Profile** → VERIFIED, Appliance Repair + HVAC

### As Operations Manager

1. **Operations Center** → booking queue overview
2. **Booking Queue** (Admin → Bookings) → all platform bookings, dispute highlighted
3. **Disputes** → user2's dispute, mark RESOLVED with resolution note
4. **Provider Verification** → view provider profiles, verification panel

### As Admin

1. **Platform Stats** → KPI dashboard (users by role, GMV, revenue, disputes)
2. **Fee Config** → platform commission 12%, tax 8.5%, support email
3. **Users** → all 7 demo users, role management
4. **Audit Logs** → immutable audit trail
5. **Service Catalog** → 11 categories, 34 subcategories, 45 skills

---

## Architecture Overview

```
CareConnect
├── backend/                   Node.js + Express 4 API
│   ├── src/
│   │   ├── modules/           Feature modules (auth, bookings, requests, …)
│   │   ├── models/            14 Mongoose models
│   │   ├── middleware/        Auth, RBAC, validation, rate limiting
│   │   ├── utils/             ApiError, ApiResponse, auditLogger
│   │   └── seed/              Catalog + demo seed scripts
│   └── tests/                 20 Jest test suites, 170+ tests
│
└── frontend/                  React 19 + Vite SPA
    ├── src/
    │   ├── pages/             40+ feature pages
    │   ├── components/ui/     Design system (Button, Card, Input, Badge…)
    │   ├── layouts/           AppShell with role-aware navigation
    │   ├── routes/            React Router v6 + lazy loading
    │   ├── store/             Redux Toolkit (auth, ui slices)
    │   └── lib/               API helpers per domain
    └── tailwind.config.js     Design tokens (brand teal, surfaces, ink)
```

### Key Technical Decisions

| Decision | Rationale |
|---|---|
| Express 4 (not 5) | Middleware ecosystem stability |
| Tailwind v3 | Explicit config-file tokens, reviewable |
| Redux Toolkit | Predictable auth + UI state, DevTools |
| React.lazy + Suspense | Route-level code splitting, ~65 kB gzip initial |
| Vite manualChunks | 4 vendor chunks → long-lived browser caching |
| MongoDB Memory Server | Test isolation without external dependency |
| Immutable audit logs | Append-only AuditLog model, never patched |
| JWT stateless auth | No session store; reset tokens hashed at rest |

---

## API Reference (Selected Endpoints)

| Verb | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | — | CUSTOMER/PROVIDER only |
| `POST` | `/api/v1/auth/login` | — | Returns JWT |
| `GET` | `/api/v1/auth/me` | ✓ | Current user |
| `POST` | `/api/v1/service-requests` | CUSTOMER | Create + optional submit |
| `GET` | `/api/v1/service-requests/:id/providers` | CUSTOMER/STAFF | Matched providers |
| `POST` | `/api/v1/quotes` | PROVIDER | Submit quote |
| `POST` | `/api/v1/quotes/:id/accept` | CUSTOMER | Accept quote → booking |
| `GET` | `/api/v1/bookings` | ✓ | Paginated, role-scoped |
| `PATCH` | `/api/v1/bookings/:id/status` | ✓ | State machine enforced |
| `GET` | `/api/v1/invoices/by-booking/:id` | ✓ | Auto-generated invoice |
| `POST` | `/api/v1/invoices/:id/pay` | CUSTOMER | Simulate payment |
| `POST` | `/api/v1/reviews` | CUSTOMER | After COMPLETED booking |
| `GET` | `/api/v1/admin/stats` | ADMIN | Platform KPIs |
| `GET` | `/api/v1/health` | — | Health check |

Full OpenAPI specification: see `docs/API_SPEC.md` (generated from routes).

---

## Test Suite

```bash
cd backend
npm test               # 20 suites, 170+ tests
npm test -- seed       # Seed idempotency tests only
```

| Suite | Focus |
|---|---|
| `auth.test.js` | Registration, login, JWT, password reset |
| `bookings.test.js` | Lifecycle state machine, role gates, conflicts |
| `invoices.test.js` | Auto-generation, payment simulation |
| `disputes.test.js` | Raise, evidence, staff resolution |
| `reviews.test.js` | Rating, uniqueness, moderation |
| `availability.test.js` | Conflict detection, schedule, override |
| `e2e_integration.test.js` | Full lifecycle end-to-end |
| `security.test.js` | RBAC, tenant isolation, injection |
| `seed.test.js` | Catalog + demo idempotency, data quality |
| … 11 more | Providers, quotes, requests, catalog, admin, AI, … |

---

## Known Constraints (Demo)

- **Payment simulation only** — no real payment gateway; `POST /invoices/:id/pay` simulates settlement.
- **File uploads metadata only** — attachments/evidence use metadata objects (no S3/cloud storage in demo).
- **Email delivery** — password reset tokens logged to console; Nodemailer configured but pointed at demo SMTP.
- **AI classification** — uses keyword heuristic when `AI_API_KEY` is not set; set key for full LLM classification.
- **Real-time** — no WebSockets; notifications are polled via REST.
