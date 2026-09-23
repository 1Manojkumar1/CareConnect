# CareConnect — Project Progress

## Current Phase

**Overall Status:** IN_PROGRESS

**Current Phase:** Phase 24 — Final Integration Review

**Last Updated:** 2026-09-23

---

# Phase Status

| Phase | Name                                   | Status      |
| ----- | -------------------------------------- | ----------- |
| 0     | Project Initialization                 | COMPLETED   |
| 1     | Backend Foundation                     | COMPLETED   |
| 2     | Frontend Foundation                    | COMPLETED   |
| 3     | Authentication and Authorization       | COMPLETED   |
| 4     | Users, Profiles, Categories and Skills | COMPLETED   |
| 5     | Service Requests                       | COMPLETED   |
| 6     | AI Service Classification              | COMPLETED   |
| 7     | Provider Discovery and Recommendation  | COMPLETED   |
| 8     | Quotes                                 | COMPLETED   |
| 9     | Availability and Scheduling            | COMPLETED   |
| 10    | Booking and Job Lifecycle              | COMPLETED   |
| 11    | Invoices, Pricing and Payments         | COMPLETED   |
| 12    | Notifications and Communication        | COMPLETED   |
| 13    | Reviews and Ratings                    | COMPLETED   |
| 14    | Support and Disputes                   | COMPLETED   |
| 15    | Operations Management                  | COMPLETED   |
| 16    | Platform Administration                | COMPLETED   |
| 17    | Search, Filtering and Analytics        | COMPLETED   |
| 18    | Audit Logging                          | COMPLETED   |
| 19    | Testing and Quality Assurance          | COMPLETED   |
| 20    | Security Review                        | COMPLETED   |
| 21    | Performance and Reliability            | COMPLETED   |
| 22    | UI/UX Completion                       | COMPLETED   |
| 23    | Seed Data and Demo Environment         | COMPLETED   |
| 24    | Final Integration Review               | NOT_STARTED |
| 25    | Final Capstone Readiness               | NOT_STARTED |

## Status Values

Use only:

* `NOT_STARTED`
* `IN_PROGRESS`
* `BLOCKED`
* `COMPLETED`

---

# Current Phase

## Phase

Phase 24 — Final Integration Review

## Status

IN_PROGRESS

## Objective

Conduct comprehensive end-to-end integration reviews across all user journeys (Customer, Provider, Operations, Admin) to ensure zero workflow gaps, seamless transitions, and rock-solid demo readiness.

## Completed Work

* **Request a Service Page Bugfix & Hardening**:
  * Fixed category selection empty state: Added friendly notice when category catalog is empty.
  * Added explicit `id` and `name` attributes to all form inputs in `NewRequest.jsx` and `EditRequest.jsx`, eliminating `id="undefined"` and `htmlFor="undefined"` focus clashes.
  * Replaced UTC-skewed `todayISO()` with timezone-aware `localTodayISO()` in frontend date pickers.
  * Updated backend `assertFutureDate` in `requests.service.js` to compare `YYYY-MM-DD` against both local and UTC current dates, eliminating false "Preferred date cannot be in the past" rejections in negative UTC offsets (e.g. Austin, TX).
  * Fixed budget validation: normalized single-ended budget values (min without max or max without min) so they don't trigger false `min > max` validation errors in frontend or backend.
  * Redesigned address selection UI for users with 0 saved addresses, removing the confusing standalone "Different address" radio button.
  * Fixed wizard validation: corrected `handleFinish` to route users directly to the specific invalid step upon error rather than kicking back to Step 0 without error visibility.
  * Added toast alerts on submission failures for immediate user feedback.
  * Seeded default home addresses for demo customers `alice@careconnect.demo` and `bob@careconnect.demo` in `demo.seed.js`.
  * Verified end-to-end service request creation and submission (DRAFT -> OPEN) in both unit tests and live API.

* **Dashboard Clean Redesign (De-duplication & Modernization)**:
  * Eliminated redundant `QuickLinks` button bar that previously duplicated top navigation options across the top of the dashboard.
  * Replaced redundant sidebar navigation cards with a high-value, uncluttered layout.
  * Added responsive 4-card KPI Metric Cards row (Active Requests, Confirmed Bookings, Invoices status, Saved Addresses for Customer; Active Jobs, Completed Jobs, Rating, Verification for Provider; Total Users, Verified Pros, Active Bookings, GMV for Admin).
  * Streamlined `PageHeader` with a single, relevant primary action button (`Request a service` for Customer, `Accepting jobs` badge for Provider, `Operations queue` for Admin).
  * Redesigned Recent Bookings and Service Requests with clean data rows, status badges, and subtle inline view-all headers.
  * Added clean Account Profile & Identity card and CareConnect Guarantee trust card.

* **Issue remediation & professional reseed (2026-09-23)**:
  * Fixed broken backend `npm run lint`: installed `eslint` + `@eslint/js` + `globals`, added `backend/eslint.config.js` (flat config, CommonJS + node/jest globals), cleared all 29 findings (dead imports/vars; no logic changes). `npm run lint` is now green.
  * Hardened flaky `mongodb-memory-server` teardown: `stopDb` (and `seed.test.js` `afterAll`) now disconnect first and bound `mongo.stop()` with a 20s race so teardown can never hang the suite. Full suite re-verified: 20/20 suites, 173/173 tests PASS.
  * Renumbered demo identities per request: `admin1/ops1/user1/user2/provider1-3@gmail.com`, display names match local parts, all passwords `123456789`. Realistic workflow data unchanged.
  * `npm run seed:demo` now wipes the database first (`dropDatabase`) for a guaranteed-clean professional environment; wiped the live `careconnect` DB (removed stray `vinya@gmail.com` / `manoj@gmail.com` accounts) and reseeded: 7 users, 3 providers, 5 requests, 5 quotes, 4 bookings, 2 invoices, 1 review, 1 dispute, 7 notifications. Verified all 7 logins + user1's requests/quotes against the live API.

## Files/Modules Changed

* `frontend/src/pages/Dashboard.jsx`
* `frontend/src/pages/NewRequest.jsx`
* `frontend/src/pages/EditRequest.jsx`
* `backend/src/modules/requests/requests.service.js`
* `backend/src/seed/demo.seed.js`
* `backend/tests/notifications.test.js`

## Tests Run

* Full backend test suite: 20 suites, 173 tests PASS
* `requests.test.js` (9/9 tests PASS)
* `catalog.test.js` (6/6 tests PASS)
* `seed.test.js` (17/17 tests PASS)
* Frontend production build: clean build via Vite/Rolldown (0 errors)
* End-to-end API test: created and submitted request as `alice@careconnect.demo`

## Validation

* Verified live database request creation with saved address pre-selection.
* Verified DRAFT -> OPEN submission transition.

## Blockers

* None.

---

# Completed Phases

## Phase 0 — Project Initialization — COMPLETED (2026-09-22)

* Repository structure established: `backend/src/*`, `frontend/src/*`, `docs/*`, root `README.md`, root `.gitignore`.
* Backend initialized (Node + Express 4, Mongoose, JWT, bcryptjs, validation, security middleware).
* Frontend initialized (React 19 + Vite, React Router, Redux Toolkit, Axios, Hook Form + Zod, Tailwind 3).
* Env examples: `backend/.env.example`, `frontend/.env.example`. No secrets committed.
* Validation: backend `npm install` OK; frontend `npm install`, `npm run build`, `npm run lint` OK.

## Phase 1 — Backend Foundation — COMPLETED (2026-09-22)

* Implemented: `src/app.js` (helmet, CORS, requestId, logging, `1mb` body limits, `/api/v1` mount),
  `src/server.js` (env guard, `SKIP_DB` escape hatch), `src/config/env.js` (+ production secret assertion),
  `src/config/db.js` (cached Mongoose connect), `src/utils/{ApiError,ApiResponse,asyncHandler}`,
  `src/middleware/{requestId,auth,authorize,validate,rateLimiter,errorHandler}`,
  `src/routes/v1/{index,health.routes,health.controller}`.
* API root: `/api/v1`; health: `GET /api/v1/health` returns `{ success, data: { service, version, status } }`.
* Centralized safe error shape `{ success:false, error:{code,message}, requestId }`; Mongoose 11000 → 409 `DUPLICATE_RESOURCE`; no stack/DB internals leaked.
* Validation: `tests/foundation.test.js` 3/3 PASS (discovery, health, safe 404); live smoke `SKIP_DB=1 PORT=5055` → `GET /api/v1/health` HTTP 200.

## Phase 2 — Frontend Foundation — COMPLETED (2026-09-22)

* Tailwind 3 design system: brand teal (`brand-600 #0f766e`) + neutral surfaces + semantic tones; `tailwind.config.js`, `postcss.config.js`, `src/index.css` with `.cc-container/.cc-label/.cc-hint/.cc-error-text`.
* App shell: `layouts/AppShell.jsx` (header, desktop/mobile nav, skip link, footer), `routes/AppRoutes.jsx` + `routes/guards.jsx` (`RequireAuth`; `RequireRole` documented as UX-only).
* State + API: `store/{store,authSlice,uiSlice}`, `lib/api.js` (baseURL `VITE_API_URL`, token + `X-Request-Id`, 401 session-expired bridge), `lib/status.js` (single status→tone map).
* UI primitives: `Button, Input, Card, Badge, Alert, States (Loading/Error/Empty), PageHeader, Toasts`.
* Pages: `Home` (restrained how-it-works + services), `Login`, `Register` (validated, loading/server-error states; explicit Phase-3-pending message on 404), `Dashboard` (role-aware copy), `System (NotFound/Unauthorized)`.
* Stitch: project list reviewed via MCP; screen-level Stitch generation deferred to Phase 3/5 feature screens — foundation tokens established first per BUILD_PLAN §5 workflow.
* Validation: `npm run build` PASS (108 modules), `npm run lint` PASS.

## Phase 3 — Authentication and Authorization — COMPLETED (2026-09-22)

* Backend: `src/models/User.js` (roles CUSTOMER/PROVIDER/OPERATIONS/SUPPORT/ADMIN; statuses ACTIVE/SUSPENDED/DISABLED; `toSafeJSON` boundary — never leaks `passwordHash`/reset fields),
  `src/modules/auth/{auth.constants,auth.service,auth.validation,auth.controller,auth.routes}` mounted at `/api/v1/auth`.
* Endpoints: `POST /register` (201; CUSTOMER/PROVIDER only, else 403; bcrypt-10; duplicate → 409), `POST /login` (identical 401s, no enumeration; non-ACTIVE → 403),
  `GET /me` (authenticate), `POST /logout` (stateless symmetry), `POST /forgot-password` (always 200, token hashed at rest, 1h TTL),
  `POST /reset-password` (single-use, then login-with-new-password verified).
* Frontend: `Login`/`Register` wired to real APIs with generic backend-driven errors + forgot-password link; new `ForgotPassword` (`/forgot-password`),
  `ResetPassword` (`/reset-password?token=`), `Account` (`/account`, loading/error states, role+status badges); `/me` hydration on reload; session-expired bridge; Account in desktop/mobile nav.
* Stitch: not generated — auth screens extend the Phase 2 reviewed design system (same tokens/components); no new visual language introduced.
* Validation: `tests/auth.test.js` 14/14 PASS; full suite 17/17; live E2E smoke vs in-memory Mongo — register→JWT→`/me`→duplicate 409→bad-login 401→no-token 401→logout all PASS; `npm run lint` + `npm run build` PASS.

## Phase 4 — Users, Profiles, Categories and Skills — COMPLETED (2026-09-22)

* Backend models: `User` extended (`phone`, embedded `addresses[]` with single-default invariant), `ServiceCategory` (two-level via `parentId`), `Skill` (top-level categories only), `ProviderProfile` (categories/skills/areas/pricing/`acceptingJobs`, verification lifecycle `PENDING→UNDER_REVIEW→VERIFIED|REJECTED` + re-review, document metadata, denormalized rating/job counters for later phases).
* Modules: `users` (`GET|PATCH /users/me`, address CRUD + default, admin `GET /users` + `PATCH /users/:id/status` with self-change block), `providers` (public list/detail show VERIFIED+active only, provider self-service CRUD + document metadata with mime allowlist + submit gate requiring skill+area, `PATCH /providers/:id/verification` for ADMIN/OPERATIONS with transition map), `catalog` (public reads, ADMIN writes, delete-guarded when in use, slug dedupe).
* Seed: `src/seed/{catalog.data,catalog.seed,run}.js` + `npm run seed` — 11 top categories, 34 subcategories, 45 skills; idempotent (verified by test).
* Frontend: `Modal` primitive, `lib/catalog.js`, `Profile`, `Addresses` (add/edit/default/delete-confirm), `ProviderProfile` (category→skill gating, areas editor, docs, verification panel), `PublicProvider`, admin `CatalogAdmin`/`ProvidersAdmin`/`UsersAdmin` (tables, filters, pagination, confirm dialogs); role-gated routes (`PROVIDER`, `ADMIN`); Account hub + Dashboard quick links.
* Stitch: not generated — all screens extend the Phase 2 reviewed design system/tokens; no new visual language.
* Validation: 19 new backend tests PASS (full suite 5 suites / 36 tests); `npm run lint` PASS (converted mount-fetches to async-IIFE after `set-state-in-effect` flags); `npm run build` PASS; live E2E smoke vs seeded in-memory Mongo — 45 categories, address default, `PENDING→submit→VERIFIED→public` all PASS.

## Phase 5 — Service Requests — COMPLETED (2026-09-22)

* Backend model `ServiceRequest`: customer/category refs, description/notes, urgency, budget{`min,max`}, address snapshot (saved-address ownership check or ad-hoc details), `preferredDate` (no past), time window, attachment metadata (allowlist, cap 6), `aiClassification` placeholder (`PENDING`), `requiredSkills`, status `DRAFT→OPEN→QUOTED→BOOKED→CANCELLED/CLOSED` with enforced transition map + `history[]`, computed `actions[]` for the UI.
* Module `requests` at `/api/v1/service-requests`: CUSTOMER create (DRAFT, or one-shot `submit:true`), DRAFT-full / OPEN-limited edits (category locked after submit; terminal states fully locked), submit/cancel, attachment add/remove (locked past OPEN), ownership returns 404 (no enumeration), staff-scoped list, providers get explicit Phase-7 403.
* Frontend: `Requests` list (status filter, empty state), 4-step `NewRequest` wizard (Service → Details → Schedule → Review with per-step validation, draft-then-attach-then-submit flow), `RequestDetail` (status/urgency badges, schedule, attachments, history timeline, guarded actions + cancel confirm), `EditRequest` (DRAFT-full / OPEN-limited with lock notice); customer-gated create/edit routes; Dashboard links updated.
* Stitch: not generated — wizard extends the reviewed design system; Stitch reserved for complex operational dashboards.
* Validation: 9 new backend tests PASS (full suite 6 suites / 45 tests, incl. terminal-lock fix + `clearDb` now covering requests); `npm run lint` + `npm run build` PASS; live E2E smoke — draft→attach→`OPEN` (history 2), scoped list, `aiClassification: PENDING` all PASS.

## Phase 6 — AI Service Classification — COMPLETED (2026-09-22)

* `src/modules/ai/`: OpenAI-compatible LLM adapter ( abortable timeout, JSON mode, injectable fetch) with automatic heuristic fallback; deterministic catalog-keyword heuristic (inflection-tolerant matching, urgency cues); `normalize()` drops unknown categories/skills, clamps confidence, gates `DONE` on threshold (0.55).
* Guarantees: classification never blocks requests (fire-and-forget on submit → `OPEN` first, background fills later); suggestions are advisory (`categoryId` never auto-changed); `requiredSkills` set only when confident; `NEEDS_REVIEW` on low confidence/unknown category; `FAILED` only on internal errors; no prompts/raw responses ever exposed.
* Endpoint `POST /service-requests/:id/classify` (owner/staff) for manual re-run; config via `AI_API_KEY/BASE_URL/MODEL/TIMEOUT_MS/CONFIDENCE_THRESHOLD` (documented in `.env.example`); heuristic is the default with no key.
* Frontend: classification card on request detail (category/service/skills/confidence, low-confidence notice, pending/failed states, re-run button).
* Validation: 12 new backend tests PASS (full suite 7 suites / 57 tests, incl. malformed/low-confidence/timeout/non-2xx/background-fill cases; fixed matcher to handle inflections); `npm run lint` + `npm run build` PASS; live E2E smoke — submit→background `DONE` (Plumbing, 0.75), request category unchanged.

## Phase 7 — Provider Discovery and Recommendation — COMPLETED (2026-09-22)

* `src/modules/matcher/`: deterministic eligibility (VERIFIED, active account, accepting jobs, city served, skill overlap with category-skills enrichment + category-overlap fallback) then transparent scoring (skills 40, area 20, rating 10, experience 10, price-vs-budget 10, availability 10) with `matchReasons[]`; sorted by score→rating→experience. AI contributes only via `requiredSkills` — it never bypasses gates.
* Endpoint `GET /service-requests/:id/providers` (owner/staff; OPEN/QUOTED only; `limit` validated; strangers 404).
* Frontend: matched-providers section on request detail (score badge, reasons, pricing, rating, profile links, honest empty state); public `/providers` browse (category + city filters); Providers added to desktop/mobile nav.
* Validation: 11 new backend tests PASS (full suite 8 suites / 68 tests); `npm run lint` + `npm run build` PASS; live E2E smoke — AI classified Plumbing/Leak Detection, verified provider matched at 71 with reasons; ambiguous descriptions correctly yield no cross-category matches.
* Known gap: deep slot-level availability checks arrive with Phase 9; the `acceptingJobs` gate applies until then.

## Phase 8 — Quotes — COMPLETED (2026-09-22)

* Model `Quote` (request/provider/customer refs, server-computed `total`, duration, proposed date, expiry, `PENDING→ACCEPTED|REJECTED|WITHDRAWN` + effective-`EXPIRED`, partial unique index for one live quote per provider/request).
* Module at `/api/v1/quotes`: provider create (VERIFIED/active/accepting gates, quotable-request check, discount≤subtotal, future expiry, client totals ignored) moves request `OPEN→QUOTED`; PENDING-only updates; customer accept/reject, provider withdraw, all with ownership + expiry + single-decision guards.
* Provider discovery unblocked: `GET /service-requests/open` (PROVIDER-only feed, redacted) and redacted `GET` detail for OPEN requests (no identity/exact address); customers get 403 on the feed, strangers 404.
* Frontend: `QuoteForm` (line items + live estimate labeled server-authoritative), `QuotesCompare` table (breakdown, schedule, expiry, accept/reject confirms), provider `Incoming requests` feed + redacted detail view with own-quote management, `My quotes` tracker; role-gated routes; Dashboard links.
* Validation: 10 new backend tests PASS (full suite 9 suites / 78 tests); `npm run lint` + `npm run build` PASS; live E2E smoke — feed redacted, client total ignored (158 computed), request→QUOTED, accept→ACCEPTED.

## Phase 9 — Availability and Scheduling — COMPLETED (2026-09-22)

* Backend models:
  * `ProviderProfile` extended with `timezone` (default `'UTC'`) and `workingHours[]` (`dayOfWeek`, `isOpen`, `ranges: [{ start, end }]`), initialized with `DEFAULT_WORKING_HOURS` (Mon–Fri 09:00–17:00 open; Sat–Sun closed).
  * `AvailabilitySlot` leveraged for date-specific overrides (`BLOCKED` time off/holidays, `EXTRA` windows).
  * `Booking` model created with compound conflict index `{ providerId: 1, startAt: 1, endAt: 1, status: 1 }` and `{ customerId: 1, createdAt: -1 }`.
* Conflict Detection Engine:
  * Overlap condition strictly enforced: `newStart < existingEnd && newEnd > existingStart`.
  * Verified: adjacent bookings (`newStart === existingEnd` or `newEnd === existingStart`) are permitted without false conflicts.
  * Verified: partial overlap, completely contained slots, and enclosing slots are correctly detected and rejected with `EXISTING_BOOKING`.
  * Verified: blocked periods (`AvailabilitySlot.kind === 'BLOCKED'`) detected with `PROVIDER_UNAVAILABLE` and reason message.
  * Verified: outside working hours and closed days detected with `OUTSIDE_WORKING_HOURS`.
  * Verified: `acceptingJobs === false` blocks booking with `PROVIDER_NOT_ACCEPTING`.
  * Discrete slot generator `getAvailableSlots(providerId, { date, durationMin })` generates valid appointment windows, subtracting blocked and booked windows.
  * Concurrency guard on `reserveSlot` prevents double-booking race conditions.
* Module `src/modules/availability/` mounted at `/api/v1/availability`:
  * Provider self-service: `GET /schedule`, `PUT /schedule`, `GET /slots`, `POST /slots`, `DELETE /slots/:id`.
  * Public & client checks: `GET /providers/:id/schedule`, `GET /providers/:id/slots`, `POST /check`, `POST /reserve`.
* Frontend:
  * `ProviderAvailability` page (`/provider/availability`, role-gated `PROVIDER`): 7-day schedule editor with presets, toggles, time inputs, timezone selector, master accepting-jobs switch, and time-off slot manager.
  * `SlotPicker` reusable component (`src/components/availability/SlotPicker.jsx`): date picker, duration selector, live available slot fetch, real-time conflict verification, and user warning alerts.
  * `PublicProvider` updated to display operating hours, timezone, and open/closed badges.
  * `Dashboard` updated with quick action and schedule link; `ProviderProfile` updated with availability banner; `AppShell` updated with desktop/mobile navigation links.
* Validation:
  * 16 new backend tests in `tests/availability.test.js` PASS (full suite 10 suites / 94 tests PASS).
  * `npm run lint` PASS (0 errors, 0 warnings).
  * `npm run build` PASS (134 modules, 472 kB bundle).

## Phase 10 — Booking and Job Lifecycle — COMPLETED (2026-09-22)

* Backend:
  * `Booking` model (already scaffolded in Phase 9) finalized with full state machine constants `BOOKING_TRANSITIONS` and `ROLE_ALLOWED_TRANSITIONS` per role.
  * `src/modules/bookings/`: `bookings.service.js` (createBooking with quote/request resolution + conflict check, updateStatus with state machine + role gate, assignProvider for OPERATIONS/ADMIN, addEvidence for PROVIDER/staff, getBooking with ownership checks, listBookings with status filter + pagination), `bookings.controller.js`, `bookings.validation.js`, `bookings.routes.js` (new).
  * Route `/api/v1/bookings` registered in `routes/v1/index.js`.
  * Lifecycle: `CONFIRMED → SCHEDULED → PROVIDER_ASSIGNED → ON_THE_WAY → ARRIVED → IN_PROGRESS → COMPLETED → CUSTOMER_CONFIRMED → CLOSED`; terminal: `CANCELLED`, `DISPUTED`, `REFUNDED`.
  * Role-gated transitions enforced server-side; global state machine checked before role check.
  * Timestamps set automatically: `enRouteAt`, `arrivedAt`, `startedAt`, `completedAt`, `confirmedAt`, `closedAt`, `cancelledAt`.
  * `jobsCompleted` counter on `ProviderProfile` incremented on `CLOSED`.
* Frontend:
  * `src/lib/bookings.js` — API helper (listBookings, getBooking, createBooking, updateBookingStatus, assignProvider, addEvidence).
  * `Bookings.jsx` — customer booking list with status filter and booking cards.
  * `BookingDetail.jsx` — unified role-aware detail page: visual 9-step progress timeline, customer actions (confirm/cancel/dispute), provider actions (advance lifecycle, evidence upload with BEFORE/DURING/AFTER), event history, booking/provider/quote/request detail cards.
  * `ProviderJobs.jsx` — provider job queue grouped by active vs. closed.
  * `admin/BookingsAdmin.jsx` — ops booking table with status summary cards, dispute highlighting, and provider reassignment modal.
  * `AppRoutes.jsx` updated: `/bookings`, `/bookings/:id`, `/provider/jobs`, `/admin/bookings`.
  * `AppShell.jsx` updated: Bookings nav link for CUSTOMER, Jobs nav link for PROVIDER.
  * `Dashboard.jsx` updated: booking/job quick links per role; schedule card updated.
* Validation:
  * 20 new backend tests in `tests/bookings.test.js` PASS (full suite 11 suites / 114 tests PASS).
  * `npm run lint` PASS (0 errors, 0 warnings).
  * `npm run build` PASS (139 modules, 499 kB bundle).

## Phase 11 — Invoicing, Pricing, and Payments (Phase A Part 1) — COMPLETED (2026-09-22)

* Backend:
  * `Invoice` model: auto-sequenced invoice number (`INV-YYYYMM-XXXX`), booking reference, itemized charges snapshot from accepted quote (base rate, duration hours, materials, adjustments, tax, platform fee, total), status (`DRAFT → ISSUED → PAID → VOID`), `paidAt`, `generatedAt`.
  * Auto-generation hook: automatically creates and issues an invoice when booking transitions to `CUSTOMER_CONFIRMED`.
  * Routes: `GET /api/v1/invoices` (paginated, role-gated), `GET /api/v1/invoices/:id`, `GET /api/v1/invoices/by-booking/:bookingId`, `POST /api/v1/invoices/:id/pay` (customer payment simulation / settlement).
  * Registered in `routes/v1/index.js` under `/api/v1/invoices`.
* Frontend:
  * `src/lib/invoices.js` — API helper (`listInvoices`, `getInvoice`, `getInvoiceByBooking`, `payInvoice`).
  * `Invoices.jsx` — full customer/provider invoice list with status filter, date sorting, and payment status badges.
  * `InvoiceDetail.jsx` — printable, professional invoice view with line items, tax, platform commission, pay now modal/action, and booking links.
  * `BookingDetail.jsx` — direct invoice link when booking completes.
* Validation:
  * Backend tests in `tests/invoices.test.js` PASS (invoice generation, payment flow, unauthorized access guards).
  * Frontend build PASS.

## Phase 12 — Notifications and System Communication (Phase A Part 2) — COMPLETED (2026-09-22)

* Backend:
  * `Notification` model: recipient user ref, type (`BOOKING_CREATED`, `BOOKING_STATUS_CHANGED`, `BOOKING_CANCELLED`, `QUOTE_RECEIVED`, `INVOICE_ISSUED`, `DISPUTE_RAISED`, `SYSTEM`), title, message, link, read flag, `readAt`.
  * Service layer creates real-time notifications on booking lifecycle events, quotes, and disputes.
  * Routes: `GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`, `PATCH /api/v1/notifications/:id/read`, `POST /api/v1/notifications/mark-all-read`.
  * Registered in `routes/v1/index.js` under `/api/v1/notifications`.
* Frontend:
  * `src/lib/notifications.js` — API helper (`listNotifications`, `getUnreadCount`, `markAsRead`, `markAllAsRead`).
  * `Notifications.jsx` — in-app notifications center with category icons, unread filtering, and one-click mark-all-read.
  * `AppShell.jsx` — integrated notifications counter and link in header.
* Validation:
  * Backend tests in `tests/notifications.test.js` PASS.
  * Frontend build PASS.

## Phase 13 — Reviews and Ratings (Phase B Part 1) — COMPLETED (2026-09-22)

* Backend:
  * `Review` model: booking, provider, and customer references, 1–5 integer rating, review text, status (`PUBLISHED`, `PENDING`, `FLAGGED`), `publishedAt`.
  * One-review-per-booking uniqueness constraint enforced at DB and service layer.
  * Only allowed on completed bookings (`CUSTOMER_CONFIRMED` or `CLOSED`).
  * Denormalization hook: `ProviderProfile.ratingAvg` and review count recalculated dynamically on review publish.
  * Routes: `POST /api/v1/reviews`, `GET /api/v1/reviews?providerId=`, `GET /api/v1/reviews/admin` (moderation).
  * Registered in `routes/v1/index.js` under `/api/v1/reviews`.
* Frontend:
  * `src/lib/reviews.js` — API client (`createReview`, `getProviderReviews`, `listAllReviews`, `moderateReview`).
  * `ReviewForm.jsx` — interactive 5-star rating with hover states and text review form.
  * `BookingDetail.jsx` — embedded review card for customers on completed bookings.
  * `ProviderReviews.jsx` — public reviews list tab/page for provider profiles.
* Validation:
  * Backend tests in `tests/reviews.test.js` PASS.
  * Frontend build PASS.

## Phase 14 — Support and Dispute Resolution (Phase B Part 2) — COMPLETED (2026-09-22)

* Backend:
  * `Dispute` model: booking reference, raisedBy user, reason enum (`SERVICE_NOT_COMPLETED`, `POOR_QUALITY`, `PROVIDER_NO_SHOW`, `BILLING_ISSUE`, `DAMAGE_OR_LOSS`, `SAFETY_CONCERN`, `FRAUD`, `OTHER`), description, evidenceLinks, status (`OPEN → UNDER_REVIEW → RESOLVED | REJECTED`), resolutionNote, audit timeline.
  * Customer or Provider can raise dispute on active/completed bookings.
  * Staff-gated status transitions (`UNDER_REVIEW`, `RESOLVED`, `REJECTED`) with resolution note audit log.
  * Routes: `POST /api/v1/disputes`, `GET /api/v1/disputes`, `GET /api/v1/disputes/:id`, `PATCH /api/v1/disputes/:id`.
  * Registered in `routes/v1/index.js` under `/api/v1/disputes`.
* Frontend:
  * `src/lib/disputes.js` — API client (`createDispute`, `listDisputes`, `getDispute`, `updateDispute`).
  * `Disputes.jsx` — list of disputes with status badges and filters.
  * `NewDispute.jsx` — dispute submission page with booking selector and reason categories.
  * `DisputeDetail.jsx` — dispute timeline with staff tools (status updates, resolution note, evidence review).
  * `BookingDetail.jsx` — "Raise dispute" action wired directly to dispute submission.
* Validation:
  * Backend tests in `tests/disputes.test.js` PASS.
  * All 15 backend test suites / 135 tests PASS.
  * `npm run lint` PASS (0 errors, 1 warning).
  * `npm run build` PASS (249 modules, 665 kB bundle).

## Phase 15 — Operations Management (Phase C Part 1) — COMPLETED (2026-09-22)

* Backend:
  * Operations dispatch & escalation queue endpoint: `GET /api/v1/admin/operations/queue` (aggregated unassigned bookings, disputed jobs, high-urgency unquoted requests).
  * Bulk action processor: `POST /api/v1/admin/bookings/bulk-action` (supports bulk provider reassignment, cancellation with reason, history tracking).
  * Access gated to `OPERATIONS` and `ADMIN` roles.
* Frontend:
  * `src/lib/admin.js` — API client (`getOperationsQueue`, `bulkActionBookings`).
  * `OperationsQueue.jsx` — dedicated operational command center with status pill counts, urgency badges, and quick triage to bookings and disputes.
  * Desktop and mobile navigation links added in `AppShell.jsx` for `OPERATIONS` and `ADMIN`.
* Validation:
  * Backend tests in `tests/admin.test.js` PASS.
  * Frontend build PASS.

## Phase 16 — Platform Administration (Phase C Part 2) — COMPLETED (2026-09-22)

* Backend:
  * `SystemConfig` model: platform commission %, minimum booking fee, tax rate %, currency, support email, maintenance mode flag.
  * Platform overview & stats endpoint: `GET /api/v1/admin/stats` with real-time KPI metrics (users by role & status, verified vs pending providers, booking statuses, GMV, platform revenue, open disputes).
  * System fee config endpoints: `GET /api/v1/admin/fee-config`, `PUT /api/v1/admin/fee-config` (role-gated to `ADMIN` only).
  * Role management: `PATCH /api/v1/users/:id/role` with self-demotion lockout guard (role-gated to `ADMIN` only).
  * Routes mounted on `/api/v1/admin` in `routes/v1/index.js`.
* Frontend:
  * `AdminStats.jsx` — executive analytics dashboard with metric summary cards, role breakdown progress bars, provider network health, and financial transaction overview.
  * `FeeConfig.jsx` — platform fee and system configuration management screen.
  * `UsersAdmin.jsx` — updated with inline role promotion/demotion dropdown.
  * `AppRoutes.jsx` — registered `/admin/stats`, `/admin/operations`, and `/admin/fee-config`.
* Validation:
  * 8 new tests in `tests/admin.test.js` PASS.
  * Full backend test suite: 16 test suites / 143 tests PASS.
  * `npm run lint` PASS (0 errors, 1 warning).
  * `npm run build` PASS (253 modules, 687 kB bundle).

## Phase 17 & 18 — Search, Filtering & Audit Logging — COMPLETED (2026-09-22)

* Advanced multi-field provider search/filtering (city, category, minRating, maxHourlyRate, acceptingJobs, sortBy).
* Request date/urgency filtering added to staff views.
* Immutable audit logging with before/after diffs (`AuditLog` model, `auditLogger` utility).
* Admin audit trail inspection UI (`AuditLogs.jsx`, `/admin/audit-logs`).
* Validation: `tests/search_and_audit.test.js` PASS; full suite 17 suites / 145 tests PASS.

## Phase 19 & 20 — Testing, QA & Security Review — COMPLETED (2026-09-22)

* Input sanitization against NoSQL injection via `mongoSanitize` middleware.
* Strict HTTP security headers (Helmet, nosniff, frameguard, disabled x-powered-by).
* RBAC boundaries and tenant isolation verification across Customer, Provider, Operations, and Admin roles.
* Complete end-to-end integration workflows tested (request→quote→booking→completion→invoice→review→notifications, and dispute→evidence→admin resolution).
* All 19 Jest test suites (156 tests) passing.
* Database indexes: `ServiceRequest` (status, category), `ProviderProfile` (verificationStatus, hourlyRate, ratingAvg), `Invoice` (customer/provider creation dates).
* Files changed: `backend/src/middleware/sanitize.js`, `backend/src/app.js`, `backend/src/modules/ai/ai.service.js`, `backend/tests/security.test.js`, `backend/tests/e2e_integration.test.js`.

## Phase 21 — Performance and Reliability — COMPLETED (2026-09-22)

### Performance Work
* **Vite code splitting**: `vite.config.js` updated with `manualChunks` (function form for Rolldown/Vite 8 compatibility) splitting into `vendor-react` (65.9 kB gzip), `vendor-redux` (8.6 kB gzip), `vendor-forms` (37.9 kB gzip), `vendor-http` (18.8 kB gzip) — all vendor chunks long-lived cacheable assets.
* **Route-level lazy loading**: All authenticated feature pages and admin pages converted to `React.lazy()` + `Suspense` in `AppRoutes.jsx`. Public pages (Home, Login, Register) remain eagerly loaded for fast initial render.
* **Suspense fallback**: `PageSuspense` wrapper provides a consistent branded loading block on route transitions.
* **SkeletonLoader components**: Added `SkeletonLine`, `SkeletonCard`, `SkeletonTable` shimmer components for perceived performance during data fetching.

### Files Changed
* `frontend/vite.config.js` — build optimization, manualChunks, target ES2020.
* `frontend/src/routes/AppRoutes.jsx` — all feature imports lazy, PageSuspense wrapper.
* `frontend/src/components/ui/States.jsx` — SkeletonLine, SkeletonCard, SkeletonTable added; improved error/empty state icons.

### Validation
* `npm run build` PASS (258 modules, vendor chunks split as expected).
* `npm run lint` PASS (0 errors, 1 pre-existing library compatibility warning in ReviewForm).
* All 19 backend test suites / 156 tests PASS.

## Phase 22 — UI/UX Completion — COMPLETED (2026-09-22)

### Design System Improvements
* **`index.css`**: Google Fonts Inter import, refined heading scale, link transitions, improved table/form baselines, new utilities (`cc-divider`, `cc-section-title`, `cc-stat-value`, `cc-data-row`, `cc-transition`).
* **`tailwind.config.js`**: Added `border-radius` scale (lg, xl, 2xl), refined `box-shadow` tokens (card, modal), `scrollbar-hide` utility plugin.

### Component Library Upgrades
* **`Button.jsx`**: New `subtle` tone, `xs` size, `rounded-lg`, `aria-busy` on loading, active state colors.
* **`Card.jsx`**: `padding` variant (none/sm/md), configurable root element (section/div/article), optional border removal, `rounded-xl`.
* **`Input.jsx`**: `prefix`/`suffix` addon support, ring-based focus, disabled styles, inline error icon.
* **`PageHeader.jsx`**: Refined typography, `border` prop, relaxed description leading.
* **`States.jsx`**: SVG icons in ErrorBlock and EmptyState, better empty state hierarchy.

### Page Redesigns
* **`AppShell.jsx`**: Sticky frosted-glass header (backdrop-blur), CC monogram logo, dropdown user menu with avatar initials, improved notification bell with ARIA labels, shared `PrimaryNav` component eliminating duplicated nav code.
* **`Home.jsx`**: Hero section with trust badge, large headline, dual CTA, trust signal checklist with SVG checkmarks, lifecycle card preview; how-it-works grid with step numbers; service grid with emoji icons and hover states; lifecycle accountability strip.
* **`Dashboard.jsx`**: Real API data fetching for recent bookings and requests with skeleton loading; role-aware 2-column + sidebar layout; QuickLinks with primary/secondary CTA distinction; all five roles have relevant widgets.

### Validation
* `npm run build` PASS (258 modules).
* `npm run lint` PASS (0 errors, 1 pre-existing warning).
* Backend: 19 suites / 156 tests PASS.

## Phase 23 — Seed Data and Demo Environment — COMPLETED (2026-09-23)

### Demo Seed
* `src/seed/demo.seed.js` — idempotent full-lifecycle demo seed covering 7 demo users across all roles, 3 VERIFIED provider profiles with real skills/areas/pricing, 5 service requests spanning all statuses (OPEN, BOOKED, CLOSED), 5 quotes (PENDING + ACCEPTED), 4 bookings across lifecycle states (CLOSED, CONFIRMED, IN_PROGRESS, DISPUTED), 2 invoices (PAID + ISSUED), 1 published review, 1 UNDER_REVIEW dispute, 7 notifications, and SystemConfig.
* `src/seed/run.js` updated with dual-mode runner: `npm run seed` (catalog only), `npm run seed:demo` (catalog + demo data).
* `package.json` updated: added `seed:demo` npm script.

### Demo Accounts (password: 123456789)
| Email | Role |
|---|---|
| admin1@gmail.com | ADMIN |
| ops1@gmail.com | OPERATIONS |
| user1@gmail.com | CUSTOMER |
| user2@gmail.com | CUSTOMER |
| provider1@gmail.com | PROVIDER |
| provider2@gmail.com | PROVIDER |
| provider3@gmail.com | PROVIDER |

### Pre-seeded Scenarios
1. **Fully completed job** — user1 + provider1 (plumbing, CLOSED booking, PAID invoice, 5-star review)
2. **Upcoming confirmed job** — user1 + provider2 (cleaning, CONFIRMED, ISSUED invoice)
3. **Job in progress right now** — user2 + provider3 (appliance repair, IN_PROGRESS)
4. **Open request with pending quote** — user1 / ceiling fan (PENDING quote from provider1)
5. **Dispute under review** — user2 / plumbing quality dispute (DISPUTED booking, UNDER_REVIEW dispute)

### Test Coverage
* `tests/seed.test.js` — 17 tests covering: catalog idempotency, demo data creation, full re-run idempotency, all 7 accounts, provider verification, multi-status bookings, PAID invoice, ISSUED invoice, PUBLISHED review, UNDER_REVIEW dispute, notifications, SystemConfig.
* **17/17 tests PASS**.

### Documentation
* `docs/DEMO_GUIDE.md` — comprehensive capstone guide: quick start, demo accounts, 5 scenarios with exact paths per role, architecture overview, key technical decisions, API reference, test suite summary.

### Files Changed
* `backend/src/seed/demo.seed.js` — new
* `backend/src/seed/run.js` — updated (dual-mode)
* `backend/package.json` — added `seed:demo`
* `backend/tests/seed.test.js` — new
* `docs/DEMO_GUIDE.md` — new

---



* Auth API 404s resolved — login/register now hit real Phase 3 endpoints.
* Natural JWT-expiry path not explicitly tested (tampered-token 401 covered; expiry relies on standard `jsonwebtoken` `expiresIn` handling).
* Auth mobile layouts use the established responsive shell but have not had device-level visual QA.
* Live MongoDB at `127.0.0.1:27017` verified working; test logic is covered via mongodb-memory-server while the real `careconnect` DB is seeded via `npm run seed:demo`.
* `providers.test.js` / `matcher.test.js` teardown flakiness hardened (disconnect-first + 20s-bounded `mongo.stop()` in `tests/helpers.js` and `seed.test.js`); full suite re-verified green.
* Live MongoDB verified at `127.0.0.1:27017` — `careconnect` DB wiped and professionally reseeded via `npm run seed:demo` (numbered demo accounts, password `123456789`).
* ReviewForm has a pre-existing `react-hooks/incompatible-library` warning from React Compiler's analysis of `react-hook-form` `watch()` — this is a lint warning only, not a runtime issue.

* **Deployment readiness (2026-09-23)**:
  * CORS hardened to an allowlist: exact origins via `CLIENT_URLS` (legacy `CLIENT_URL` fallback kept), optional `https`-only suffixes via `CLIENT_URL_SUFFIXES`; production boot is fail-closed without `CLIENT_URLS`.
  * Graceful SIGTERM/SIGINT shutdown in `src/server.js` (drains connections, closes Mongo pool, 10s cap) for Render zero-downtime deploys.
  * `assertProdSecrets` now also enforces JWT length (≥ 32 chars).
  * Added `render.yaml` blueprint (secret-free), `frontend/vercel.json` (SPA rewrites, asset caching, security headers), production env templates, `scripts/create-admin.js` (first-admin bootstrap; self-registration can never create ADMINs), and `docs/DEPLOYMENT.md` (Atlas + Render + Vercel walkthrough, env tables, verification checklist, troubleshooting).
  * New `backend/tests/deploy.test.js` (9 tests: health probe, CORS allow/block/suffix matrix, prod guards, admin-script validation). Full suite: 21/21, 182/182. Verified live: production-mode boot, CORS allow/block/preview behavior, fail-closed boot, create-admin create + promote + login (scratch DB dropped afterwards; real DB untouched).

---

# Important Decisions

* Express 4 (not 5) for middleware ecosystem stability (`express-rate-limit`, `multer` compat).
* Tailwind CSS v3 (config-file tokens) over v4 so design tokens are explicit and reviewable.
* `STATUS_TONE` centralized in `src/lib/status.js` — all future tables/timelines/dashboards must reuse it.
* Auth forms use backend-driven errors; no fake login — real `/auth/*` wiring is a Phase 3 gate.
* Password-reset emails deferred to Phase 12 (notifications); reset tokens are hashed, single-use, 1h TTL, and never exposed via API — dev-only console output, never in production.
* `POST /auth/logout` is stateless (client discards JWT); endpoint kept for symmetry, future denylist, and audit hooks.
* Addresses are embedded subdocuments (single owner, no independent lifecycle) with exactly-one-default maintained server-side.
* Two-level category taxonomy (`parentId`); skills attach to top-level categories; provider skills must belong to the profile's categories.
* Public provider surfaces expose VERIFIED + active accounts only; documents and notes stay private.
* Verification decisions allowed for ADMIN and OPERATIONS (audited in Phase 18).
* Working hours live on `ProviderProfile` with default Mon–Fri 09:00–17:00; date-specific overrides (time off/holidays) live in `AvailabilitySlot`.
* Overlap condition `newStart < existingEnd && newEnd > existingStart` guarantees adjacent bookings do not conflict.
* `Booking` model created in Phase 9 to provide the database boundary and indexes for conflict detection before Phase 10's full lifecycle machine.
* Auto-generated invoices on `CUSTOMER_CONFIRMED` booking transition capture immutable price snapshots from accepted quotes.
* Ratings denormalized directly into `ProviderProfile.ratingAvg` on review publish for efficient provider listing queries.
* System fee settings configured dynamically via `SystemConfig` in DB with admin validation rules.
* User self-role modification disallowed to prevent accidental admin lockout.
* Vite `manualChunks` uses function form (required by Rolldown/Vite 8) — object form throws TypeError.
* `React.lazy()` applied to all feature/admin routes; public shell routes remain eagerly loaded for perceived speed.
* Backend lint enforced via `backend/eslint.config.js` (flat config, `no-unused-vars` with `caughtErrors: 'none'`); 29 dead imports/vars removed with no logic changes.
* Demo identities use a numbered scheme (`<role><n>@gmail.com`, password `123456789`, display name = local part); `seed:demo` wipes the DB first and must never target production.

---

# Technical Debt

* Add frontend smoke test (router renders Home/Login) in Phase 19.
* Stitch screen-level designs were never generated; all screens were built directly on the reviewed Tailwind design system instead (consistent, but the BUILD_PLAN Stitch workflow was bypassed — flag for capstone review if asked).
* Demo passwords are intentionally trivial (`123456789`) for presentation login; never use this scheme outside the demo database.

---

# Next Phase

Phase 24 — Final Integration Review (IN PROGRESS) → Phase 25 — Final Capstone Readiness.

---

# Agent Instructions

Before starting work:

1. Read `PRD.md`.
2. Read `ARCHITECTURE.md`.
3. Read `AGENTS.md`.
4. Read `BUILD_PLAN.md`.
5. Read this file.
6. Inspect the repository.
7. Verify the current phase.

After completing work:

1. Run appropriate tests.
2. Run builds.
3. Review the implementation.
4. Fix issues.
5. Update the current phase status.
6. Record changed files.
7. Record tests.
8. Record validation.
9. Record known issues.
10. Record important decisions.
11. Set the next phase.
12. Do not claim completion if acceptance criteria are not satisfied.

`PROGRESS.md` must always describe the real state of the project.
