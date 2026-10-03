# CareConnect — Live Judge Demo Script (10–15 min)

Target: live demo, one continuous story across all 5 roles.
Environment: deployed (Vercel + Render + Atlas) preferred; localhost fallback ready.
All passwords: `123456789`.

---

## 0. Pre-demo checklist

### Night before / morning of
- [ ] Re-seed the demo database fresh (`npm run seed:demo`) — rehearsals dirty the data.
- [ ] Verify all 8 logins work (admin1, ops1, support1, user1, user2, provider1–3).
- [ ] Warm the backend (Render free tier sleeps — hit `/api/v1/health` until 200).
- [ ] AI key optional: without `AI_API_KEY` the heuristic classifier runs — demo works either way.
- [ ] OS dark mode OFF, browser 100% zoom, clean browser profile, notifications silenced.
- [ ] Pre-open tabs: login page + one tab per role you will use (log in as each beforehand).
- [ ] Phone/camera ready: you will upload a real photo from disk in Act 1.
- [ ] Record a full backup video of this script. Keep a localhost instance running as fallback.

### Credentials card (keep on screen / print)
| Who | Login | Role in story |
|---|---|---|
| user1@gmail.com | CUSTOMER | Creates request, books, pays, reviews |
| provider1@gmail.com | PROVIDER | Quotes, executes the job |
| support1@gmail.com | SUPPORT | Tickets + dispute resolution |
| ops1@gmail.com | OPERATIONS | Dispatch queue |
| admin1@gmail.com | ADMIN | Stats, verification, audit |

### Golden rules
- NEVER run `seed:demo` during the demo (it wipes the DB).
- Do write-heavy steps on the NEW request you create in Act 1 — seeded narrative stays intact except where noted.
- If anything fails: say the guarantee out loud (“the server rejected this because…”) — every rejection in this app is a business rule working, and judges love that framing.

---

## 1. Opening — 60 seconds

> “CareConnect is an AI-enabled home-services marketplace. A customer posts a job, AI classifies it, the platform ranks verified providers who are **actually free on the requested date**, they quote, the customer books into a conflict-free slot, work is evidenced and invoiced, and support resolves problems with a full audit trail. I’ll run one job through that entire lifecycle live, then show support, operations, and admin.”

Click path: Home (`/`) → point at the 4-step process section → “Everything I show is real — same API the tests exercise: 23 suites, 213 tests.”

---

## 2. Act 1 — Customer creates a request — ~2.5 min (user1)

1. Login as `user1@gmail.com` → Dashboard. Point out: active requests, confirmed bookings, unpaid invoices — “actionable, not decorative.”
2. **Requests → New request.** Fill the wizard fast:
   - Category: Plumbing. Description: “Kitchen faucet spraying sideways, getting worse.” (mention: AI will read this)
   - Urgency MEDIUM, budget $50–$150, saved Home address.
   - **Photos: attach a real photo from disk** (JPEG/PNG). Say: “Real multipart upload — stored and served by the API, mime-checked server-side.”
   - Preferred date: 3 days out, MORNING. Submit.
3. Open the request → **AI classification card**: category, subcategory, skills, urgency, confidence. Say the key line: **“AI is advisory only — deterministic rules own eligibility, money, and scheduling.”**
4. **Matched providers**: point at provider1 — score + reasons including **“Available <date> (N open slots)”**. Say: “Ranking fuses skills, area, rating, experience, budget — and the availability engine excludes anyone with no free slot that day. An LLM never decides eligibility.”

---

## 3. Act 2 — Provider quotes, customer books — ~2.5 min (provider1 → user1)

1. Login as `provider1@gmail.com` → **Incoming Requests**: the just-created request is there (OPEN, Austin, redacted customer data). Say: “Providers see what they can serve — skills, area, verification.”
2. **Submit quote**: labor $90 + materials $10 → total **$100 computed by the server**. Say: “Clients can never set totals — the server recomputes from line items. Watch: I only entered labor and materials.”
3. Back to user1 → request → **Quotes**: compare table → **Accept** → the slot picker opens (defaults from the quote: date, morning, 60 min) → **Confirm booking**.
4. Land on the booking: CONFIRMED, address copied correctly. Say: “The booking re-checked availability server-side before confirming — overlapping requests get a 409, and a failed booking never half-updates the quote or request.”
5. **Reschedule once** (customer action on the booking): move it a day out. Say: “Reschedule re-runs the same conflict check, excluding the booking’s own slot.”

---

## 4. Act 3 — Job execution → invoice → review — ~2.5 min (provider1 → user1)

1. As provider1 → **Jobs** → open the booking → advance: **SCHEDULED → ON_THE_WAY → ARRIVED → IN_PROGRESS**. Say: “Only allowed transitions are accepted — the state machine rejects jumps.”
2. **Upload evidence** (AFTER phase, real photo). Then **COMPLETED**.
3. As user1 → booking → **Confirm completion** → invoice auto-generates (line items, tax + platform fee from the **live fee config**, unique invoice number).
4. **Pay** the invoice (simulated gateway) → leave a **5-star review**. Say: “Reviews only unlock after completion, one per booking, and the provider’s rating updates.”
5. Provider dashboard → **Performance cards**: acceptance rate, revenue, completion rate just moved. Say: “That revenue number is real paid-invoice math, not a mock.”

---

## 5. Act 4 — Support: tickets + dispute — ~2 min (support1)

1. **Tickets** (`/tickets`): the queue shows a HIGH in-progress ticket (fridge no-show, user2) and a RESOLVED payment ticket. Open the fridge ticket → **reply in-thread** → triage to **RESOLVED with a note**. Say: “Full lifecycle — OPEN → IN_PROGRESS → RESOLVED → CLOSED — assignment restricted to staff, every status change audited, both sides emailed.”
2. **Disputes**: open user2’s UNDER_REVIEW faucet dispute → show booking link + evidence → **message the customer** → move to **RESOLVED with resolution note + $45.50 refund**. Point at: resolver name + refund amount recorded. Say: “Refunds are resolution-only — the API rejects a refund on an unresolved dispute — and AI never touches money.”

---

## 6. Act 5 — Operations + Admin — ~2 min (ops1 → admin1)

1. As ops1 → **Operations queue**: unassigned requests (the seeded HIGH water-heater + anything still unquoted), disputed bookings (1), urgent requests (1). Say: “This queue used to be structurally empty — now every tab is live data.”
2. As admin1 → **Stats**: users by role, bookings, disputes — and **GMV $186.78 + platform revenue** (grows with the invoice you just paid). Say: “These numbers read paid invoices, not fixtures.”
3. **Fee Config**: commission 12%, tax 8.5% — “invoices follow these live; I changed the code so pricing rules actually drive billing.”
4. **Audit Logs**: filter `BOOKING_CREATED` / `DISPUTE_STATUS_CHANGE` — scroll the trail of everything you just did. Say: “Append-only. This is the same trail a regulator would ask for.”
5. **Users**: 8 demo accounts; mention role management is admin-only and audited.

---

## 7. Close — 60 seconds

> “One job went from tap water to five stars with money moved and support involved — plus dispatch and governance on top. Underneath: modular Express API, deterministic matching with AI kept advisory, server-authoritative money and scheduling, RBAC + ownership on every route, real uploads, dual-channel notifications, and 213 automated tests. What’s next: object storage for uploads, a real payment gateway, and background workers. Happy to take questions.”

---

## 8. Judge Q&A cheat sheet

| Question | Answer (one breath) |
|---|---|
| How do you prevent double-booking? | Overlap rule `newStart < existingEnd && newEnd > existingStart`, enforced in `checkConflict` + a pre-insert guard; matcher and booking both use it; 16 availability tests incl. back-to-back edges. |
| What does the AI actually decide? | Nothing authoritative. It classifies (category/skills/urgency/confidence) with a heuristic fallback; verification, availability, auth, and money are deterministic. |
| Can a client tamper with prices? | No — quotes recompute totals server-side; invoices snapshot from accepted quotes plus live fee config. |
| How is authorization enforced? | `authenticate` → `authorize(roles)` → ownership checks in services → state-machine guards; 403/404 semantics tested per module. |
| What if the AI API is down? | Heuristic classifier + `NEEDS_REVIEW` status; demo runs fine with no key. |
| Refund flow? | Support-only, resolution-only, validated non-negative, resolver + amount stored and audited. |
| File uploads? | Multer, 10 MB, mime allowlists, dual-mode endpoints, served at `/uploads`, delete-on-remove. Local disk = demo; object storage is the documented next step. |
| Emails? | Nodemailer when `SMTP_*` set, otherwise logged; reset, verification, booking, invoice, ticket, dispute events. |
| Testing? | 23 suites / 213 tests: Supertest + in-memory Mongo; RBAC, transitions, conflicts, money, seed idempotency. |
| Production readiness gaps (be honest)? | No payment gateway (simulated), uploads need object storage, no WS push, stateless logout (no denylist), no background workers. All documented as tech debt. |

---

## 9. If it breaks live

| Symptom | Recovery line |
|---|---|
| Render cold start spins | “Cold start — warming…” (you warmed it; this is backup banter) → cut to the next tab |
| Slot 409 on booking | “Perfect — that’s the conflict engine refusing an overlap. Let me pick the next slot.” (pick +1 day) |
| Any 500 | “Let me show the same flow on the seeded data instead” → pivot to bookingC / dispute / ticket1 (all pre-seeded) |
| Internet dies | Switch to localhost (already running) — “Same build, local database.” |
| Wrong password/typo | Credentials card on screen; laugh, retype, move on — never debug live |

## 10. Timing budget

| Block | Time |
|---|---|
| Opening | 1:00 |
| Act 1 customer request + AI + matching | 2:30 |
| Act 2 quote + book + reschedule | 2:30 |
| Act 3 execution + invoice + review | 2:30 |
| Act 4 support tickets + dispute | 2:00 |
| Act 5 ops + admin | 2:00 |
| Close | 1:00 |
| **Total** | **~13:30** |
| Buffer / Q&A | remaining |

**5-minute cut** (if asked to shorten): Act 1 (create + classify + matches) → Act 2 (accept seeded ceiling-fan quote + book) → Act 4 dispute resolve with refund → Act 5 stats + audit. Skip provider execution, tickets, reschedule.
