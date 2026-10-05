# CareConnect — Complete Click-by-Click Demo Script (Empty Database, Deployed Link)

Premise: Atlas database is **completely empty**. You bootstrap and run
everything live. Full run ≈ 22 min; 12-min cut at the end.

URLs: `[APP_URL]` = your Vercel frontend, `[API_URL]` = your Render API.
Password for every account you create: `DemoPass1!`
Service day: next **Wednesday**, 10:00 AM (Mon–Fri hours; never weekends).

---

## ROLE MAP — what to select at signup for each account

| # | Account | How it is created | Role selected at signup |
|---|---|---|---|
| 1 | judge-admin@example.com | Render Shell (`npm run create-admin`) — NEVER signup | — (ADMIN directly) |
| 2 | maya@example.com | Signup page | **Customer — request services** |
| 3 | sam@example.com | Signup page | **Provider — offer services** |
| 4 | ops@example.com | Signup page as Customer, then admin promotes | **Customer — request services** → promoted to OPERATIONS |
| 5 | support@example.com | Signup page as Customer, then admin promotes | **Customer — request services** → promoted to SUPPORT |

There is NO staff option at signup — that is itself a demo point.

---

## PART 0 — Open the link, bootstrap (3 min)

> **No Render subscription needed.** Render Shell is paid-only, so you
> bootstrap from your laptop (do this 10 min before showtime, or live
> on screen — it takes 60 seconds and impresses).

1. From `C:\CareConnect\backend` in PowerShell:
   ```powershell
   $env:MONGODB_URI = "mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/careconnect?retryWrites=true&w=majority"
   npm run seed   # 11 categories, 34 subcategories, 44 skills — idempotent
   npm run create-admin -- --email=judge-admin@example.com --password='AdminDemoPass1!' --name='Judge Admin'
   ```
   Say: “Reference taxonomy seeded, first admin minted. Note the admin
   password is 12+ chars — and self-registration can NEVER create one.
   Try `role: ADMIN` on the register form later and it 403s.”
   (Atlas Network Access must allow your IP — `0.0.0.0/0` for demo day.)
2. Open `[APP_URL]` → Home loads. Open
   `[API_URL]/api/v1/health` → 200. “Empty database, API up.”

## PART 1 — Admin sees an empty platform (1 min)

5. `[APP_URL]/login` → Email `judge-admin@example.com`, Password
   `AdminDemoPass1!` → **Sign in** → lands on `/dashboard`.
6. Top nav (admin sees): Stats, Operations, Bookings, Disputes, Users,
   Audit, Invoices, Tickets. Click **Stats** → all zeros:
   “Watch these come alive.” Click **Audit** → empty. Click
   **Catalog** → 11 categories listed.

## PART 2 — Maya the customer (4 min)

7. Click user menu → **Sign out**. Click **Register** (or `/register`).
   Fill: Full name `Maya`, Email `maya@example.com`, Password
   `DemoPass1!`, dropdown **“I am joining as” → Customer — request
   services** → **Create account** → lands on Dashboard.
8. Click **Account** (user menu) → **Addresses** → add Home:
   label Home, street, Austin, ZIP → save, set default.
9. Top nav → **Requests** → **Request a service** (`/requests/new`,
   4-step wizard):
   - Step Service: Category **Plumbing**, description
     “Kitchen faucet spraying sideways, getting worse since morning.”
   - Step Details: Urgency **MEDIUM** (or HIGH to feed the ops queue),
     budget min 50 max 150, **Photos → Choose Files → pick the real
     photo** (“real multipart upload, mime-checked server-side”).
   - Step Schedule: Preferred date = **next Wednesday**, Time window
     **MORNING**, saved Home address.
   - Step Review → **Submit request** (not Save draft).
10. Open the request → **AI classification card** (refresh after ~10s if
    PENDING): category Plumbing, skills, urgency, confidence.
    Say: “Advisory only — eligibility, money, scheduling are
    deterministic. No key needed; heuristic fallback.”
11. **Matched providers** card → empty state. “Nobody verified exists
    yet — it returns nothing instead of hallucinating. Let’s onboard
    a provider.”

## PART 3 — Sam the provider + verification (3 min)

12. Sign out → Register: name `Sam the Plumber`, `sam@example.com`,
    `DemoPass1!`, dropdown → **Provider — offer services** →
    Create account.
13. Nav → **Profile** (`/provider/profile`): headline, bio, 8 years,
    category Plumbing, skill Leak Detection, service area Austin,
    $85/hr → Save.
14. Same page → **Verification documents** → **Upload document** →
    choose a real file → Upload. Then **Submit for verification**
    (PENDING → UNDER_REVIEW).
15. Sign out → admin login → **Providers** (`/admin/providers`) → Sam
    is UNDER_REVIEW with the document → **Approve** (→ VERIFIED).
    “Two human gates. Only VERIFIED providers can quote, match, or be
    booked — this decision is now in the audit log.”

## PART 4 — Staff, the honest way (1 min)

16. Sign out → Register `ops@example.com` as **Customer — request
    services**. Log out. Register `support@example.com` as
    **Customer — request services**. Log out.
17. Admin login → **Users** (`/admin/users`): find ops@example.com →
    change Role → **OPERATIONS** → Save. Same for support@example.com
    → **SUPPORT**. “Registration never grants privilege — an admin
    promoted both, and both promotions are audited.”

## PART 5 — Quote → book (3 min)

18. Login sam@example.com → **Requests** (`/provider/requests`,
    Incoming): Maya’s request listed, customer PII redacted →
    **Submit quote**: labor 90, materials 10, duration 60, proposed
    date = Wednesday, MORNING → Submit. “Total $100 — computed by the
    server. I never typed a total.”
19. Login maya@example.com → **Requests** → open it → **Quotes**
    compare table → **Accept** → confirm modal → slot picker opens
    (date/time/duration prefilled) → **Confirm booking** → lands on
    `/bookings/:id`, status CONFIRMED, address correct.
    “Availability re-checked server-side; overlaps 409; failures never
    half-update.”
20. (Optional 30s) On the booking → **Reschedule** → next day 2 PM →
    Confirm. “Same engine, own slot excluded.”

## PART 6 — Execute → invoice → review (3 min)

21. As Sam → **Jobs** (`/provider/jobs`) → open booking → status
    buttons: **SCHEDULED → ON_THE_WAY → ARRIVED → IN_PROGRESS**.
    “Illegal jumps are rejected.”
22. **+ Upload evidence** → phase AFTER → choose the photo →
    **COMPLETED**.
23. As Maya → booking → **Confirm completion** → invoice
    auto-generates (line items, tax + fee from live fee config).
    **Invoices** → open it → **Pay** (simulated) → back to booking →
    **Provider Review** → 5 stars + comment → published.
    “Reviews unlock only now, one per booking.”
24. As Sam → Dashboard **Performance cards**: 100% acceptance,
    revenue moved, completion rate — “paid-invoice math.”

## PART 7 — Support: ticket + dispute (3 min)

25. As Maya → **Tickets** → **New ticket**: subject “Charged twice for
    the faucet visit”, category PAYMENT_ISSUE, priority HIGH,
    20+ chars → Raise → ticket detail shows the thread.
26. Login support@example.com → **Tickets** queue → open Maya’s →
    **Send** a reply → **Triage**: IN_PROGRESS → RESOLVED + note.
    “Machine-enforced states, staff-only assignment, audited, emailed.”
27. As Maya → booking → **Raise dispute** (pre-filled booking):
    POOR_QUALITY, 20+ chars → created OPEN.
28. As support → **Disputes** → open it (booking link + evidence +
    messages) → message Maya → **Staff Action**: UNDER_REVIEW, then
    **RESOLVED + resolution note + Refund Amount 45.50** → Submit.
    Point at resolver name + $45.50. “Resolution-only refunds —
    the API 422s a refund on an unresolved dispute.”

## PART 8 — Ops + Admin close (2 min)

29. Login ops@example.com → **Operations**: Urgent/Unassigned tabs
    (HIGH request sat here while OPEN+unquoted, then cleared itself),
    **Bookings**: filter the platform’s bookings.
30. Login admin → **Stats**: 6 users, bookings, resolved disputes,
    **GMV + revenue nonzero** — “grew during this demo.”
    **Fee Config**: 12%/8.5% drove the invoice. **Audit Logs**: filter
    `BOOKING_CREATED`, `DISPUTE_STATUS_CHANGE` — “everything you
    watched.” **Users**: 6 accounts.

## PART 9 — Close (45s)

> “Twenty minutes ago this database was empty. Now: a verified
> provider, a five-star job with money moved, a resolved ticket, a
> refunded dispute, a staffed support desk — and the audit trail.
> Deterministic where it matters, advisory AI, RBAC everywhere,
> 213 tests. Next: object storage, real payments, workers. Questions?”

---

## Q&A one-liners

Double-booking? Overlap rule + pre-insert guard, shared by matcher and
booking. AI decides what? Classification only. Price tampering?
Server recomputes; invoices snapshot quotes + live config. Auth?
authenticate → authorize → ownership → state machine. AI down?
Heuristic + NEEDS_REVIEW. Refunds? Support-only, resolution-only.
Uploads? Multer, 10 MB, allowlists, local disk (object storage next).
Emails? SMTP or logged. Tests? 23/213, Supertest + in-memory Mongo.
Honest gaps? Simulated pay, local uploads, no websockets, stateless
logout — all documented.

## Failure lines

409 → “the engine working — next slot.” Weekend rejection → correct,
pick a weekday. AI PENDING → refresh. Cold start → retry once.
500 → “let me show that rule on this object instead.” Net dies →
localhost fallback.

## 12-minute cut

Pre-do bootstrap. Then: create + classify (2) → verify Sam (1) →
quote + book (2.5) → execute + pay (2.5) → dispute refund (1.5) →
stats + audit (1.5). Skip: email verification, reschedule, tickets,
reviews, ops deep-dive.
