# CareConnect — AI Agent Development Guidelines

**Purpose:** Define how AI coding agents should understand, modify, test, and document the CareConnect codebase.

---

# 1. Mission

AI agents working on CareConnect must behave like disciplined software engineers.

Agents must:

* Understand existing architecture before modifying it.
* Preserve established conventions.
* Make the smallest safe change.
* Avoid unnecessary rewrites.
* Validate changes.
* Write tests for critical behavior.
* Update documentation when architecture or contracts change.
* Never bypass security or authorization requirements.

---

# 2. Project Context

CareConnect is a MERN-based home-services marketplace.

```text
Frontend
React

Backend
Node.js + Express

Database
MongoDB + Mongoose

AI
LLM-assisted classification and recommendation

API
REST /api/v1
```

Primary roles:

```text
CUSTOMER
PROVIDER
OPERATIONS
SUPPORT
ADMIN
```

---

# 3. Source of Truth

Agents should consult documentation in this order:

```text
docs/prd.md
      ↓
docs/architecture.md
      ↓
docs/database.md
      ↓
docs/api.md
      ↓
docs/workflows.md
      ↓
Relevant module code
```

If implementation conflicts with documentation:

1. Determine whether the documentation is outdated.
2. Inspect related code and tests.
3. Avoid silently changing behavior.
4. Update the relevant documentation when the intended architecture changes.

---

# 4. General Agent Workflow

Before implementing a feature:

```text
1. Understand requirement
2. Locate relevant module
3. Inspect existing implementation
4. Inspect related tests
5. Identify dependencies
6. Plan minimal changes
7. Implement
8. Run validation
9. Run tests
10. Review security
11. Update documentation
```

Do not immediately start editing files without understanding the surrounding architecture.

---

# 5. Repository Exploration

Before modifying code, inspect:

```text
package.json
README.md
docs/
src/
tests/
```

For backend features inspect:

```text
routes
controller
service
model
validation
middleware
tests
```

For frontend features inspect:

```text
page
components
hooks
state
API service
routes
tests
```

---

# 6. Backend Rules

## Controllers

Controllers must be thin.

Bad:

```js
router.post(..., async (req, res) => {
  // 100 lines of business logic
});
```

Preferred:

```text
Route
 ↓
Controller
 ↓
Service
```

---

# 7. Service Layer

Business logic belongs in services.

Examples:

```text
booking.service.js
quote.service.js
availability.service.js
providerMatcher.service.js
dispute.service.js
```

Services should be reusable and testable.

---

# 8. Database Rules

Agents must:

* Use Mongoose schemas consistently.
* Add indexes based on actual query patterns.
* Avoid unnecessary duplication.
* Preserve historical data where required.
* Avoid destructive schema changes without migration planning.
* Validate references and ownership.

Never casually rename or remove a field used by existing workflows.

---

# 9. API Rules

All new APIs must use:

```text
/api/v1
```

Endpoints should follow REST conventions.

Example:

```text
POST   /requests
GET    /requests
GET    /requests/:id
PATCH  /requests/:id
DELETE /requests/:id
```

Actions may use explicit endpoints where appropriate:

```text
POST /quotes/:id/accept
POST /bookings/:id/cancel
POST /jobs/:id/complete
```

---

# 10. Validation Rules

Every externally supplied input must be validated.

Validate:

* Body
* Query parameters
* Route parameters
* File uploads

Never trust frontend validation alone.

---

# 11. Authorization Rules

Every protected endpoint must answer:

```text
Who is the user?
What role do they have?
Do they own this resource?
Are they allowed to perform this action?
Is the resource in a valid state?
```

Agents must not solve authorization problems by hiding UI controls only.

---

# 12. Booking Rules

Booking logic is high-risk.

Any booking implementation must consider:

```text
Provider
Customer
Quote
Availability
Existing Bookings
Start Time
End Time
Booking Status
Cancellation Rules
```

Use:

```text
newStart < existingEnd
AND
newEnd > existingStart
```

for overlap detection unless business rules explicitly define otherwise.

Never rely on a frontend availability check as the final authority.

---

# 13. State Transition Rules

Agents must not allow arbitrary status updates.

Bad:

```http
PATCH /booking/:id
{
  "status": "CLOSED"
}
```

without validating the transition.

Preferred:

```text
Current State
     ↓
Allowed Transition?
     ↓
Yes → Apply
No  → Reject
```

---

# 14. Financial Rules

The server is authoritative for:

* Prices
* Taxes
* Discounts
* Platform fees
* Invoice totals
* Refund calculations

Never trust totals submitted by the browser.

Client values should be treated as requested inputs and recalculated server-side.

---

# 15. AI Rules

AI must be treated as an uncertain external dependency.

Agents must:

* Validate model output.
* Use structured output.
* Define fallback behavior.
* Handle API failure.
* Handle malformed responses.
* Avoid placing authorization in prompts.
* Avoid allowing AI to directly mutate protected business state.

AI should assist with:

```text
Classification
Skill extraction
Semantic matching
Summarization
Recommendation assistance
```

AI should not independently decide:

```text
Authorization
Provider verification
Final payment
Refund approval
Booking conflict resolution
Security policy
```

---

# 16. AI Output Validation

Expected model output should have a schema.

Example:

```json
{
  "category": "string",
  "subcategory": "string",
  "skills": ["string"],
  "urgency": "LOW | MEDIUM | HIGH",
  "confidence": 0
}
```

Invalid output must be rejected or normalized.

---

# 17. Provider Matching

Provider matching should use deterministic filtering.

Required:

```text
verified
active
skill match
service area
availability
```

Only then should scoring/recommendation occur.

Do not use an LLM as a substitute for database filtering.

---

# 18. Frontend Rules

Components should have clear responsibilities.

Avoid giant components containing:

```text
UI
API calls
business logic
validation
state management
```

Prefer:

```text
Page
 ↓
Component
 ↓
Hook / State
 ↓
API Service
```

---

# 19. Forms

Forms should use the project's standard validation approach.

Forms must provide:

* Labels
* Validation
* Loading state
* Error state
* Success feedback
* Disabled submit during submission where appropriate

---

# 20. UX Requirements

Every asynchronous UI should consider:

```text
Loading
Success
Error
Empty
Disabled
```

Example:

```text
Loading → Skeleton/Spinner
Empty   → Helpful empty-state message
Error   → Recoverable error message
Success → Confirmation feedback
```

---

# 21. Security Checklist

Before completing a feature, verify:

```text
[ ] Authentication required?
[ ] Correct role required?
[ ] Ownership checked?
[ ] Input validated?
[ ] File validated?
[ ] Rate limiting needed?
[ ] Sensitive data exposed?
[ ] Error messages safe?
[ ] Logs safe?
[ ] AI output validated?
```

---

# 22. Testing Rules

Critical backend logic must have automated tests.

At minimum, test:

```text
Happy path
Invalid input
Unauthorized user
Wrong role
Wrong resource owner
Invalid state transition
Boundary conditions
Failure conditions
```

For booking:

```text
No overlap
Partial overlap
Contained booking
Containing booking
Same start
Same end
Back-to-back booking
Invalid time range
```

---

# 23. Test-First Areas

Agents should strongly consider tests before implementation for:

* Booking availability
* Pricing
* Provider matching
* State transitions
* Authorization
* Dispute resolution
* Quote acceptance
* AI output parsing

---

# 24. Error Handling

Do not expose internal errors.

Bad:

```json
{
  "error": "MongoServerError: E11000 ..."
}
```

Preferred:

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_RESOURCE",
    "message": "This resource already exists."
  }
}
```

Internal details belong in server logs.

---

# 25. Git Rules

Use focused commits.

Examples:

```text
feat: add service request creation
feat: add provider availability validation
fix: prevent overlapping bookings
test: add booking conflict tests
docs: update booking workflow
refactor: extract provider matching service
```

Avoid giant commits combining unrelated work.

---

# 26. Change Scope

Agents should prefer:

```text
Small focused change
```

over:

```text
Repository-wide rewrite
```

Do not refactor unrelated code while implementing a feature unless the refactor is necessary for correctness.

---

# 27. Dependency Rules

Before adding a dependency:

1. Check whether an existing dependency solves the problem.
2. Consider bundle/server impact.
3. Check maintenance quality.
4. Check security implications.
5. Avoid dependencies for trivial functionality.

Do not add libraries merely for convenience.

---

# 28. Documentation Rules

When changing:

### API

Update:

```text
docs/api.md
```

### Database

Update:

```text
docs/database.md
```

### Workflow

Update:

```text
docs/workflows.md
```

### Architecture

Update:

```text
docs/architecture.md
```

### AI behavior

Update:

```text
docs/ai.md
```

Documentation is part of the feature.

---

# 29. Completion Checklist

Before declaring a task complete:

```text
[ ] Requirement understood
[ ] Correct module identified
[ ] Implementation completed
[ ] Validation added
[ ] Authorization verified
[ ] Ownership verified
[ ] Error handling added
[ ] Tests added/updated
[ ] Existing tests pass
[ ] Lint passes
[ ] Build passes
[ ] Documentation updated
[ ] No secrets committed
[ ] No unrelated changes
```

---

# 30. Agent Output Format

When reporting completed work, use:

```text
## Implemented

- Feature/change 1
- Feature/change 2

## Files Changed

- path/to/file
- path/to/file

## Tests

- Test command
- Result

## Validation

- Lint: PASS
- Build: PASS

## Notes

- Important implementation detail
- Known limitation
```

If something could not be validated, explicitly state it.

Never claim tests passed when they were not executed.

---

# 31. Forbidden Agent Behavior

Agents must not:

* Commit secrets.
* Disable authentication to make a feature work.
* Bypass authorization.
* Remove validation to fix failing requests.
* Trust client-provided financial totals.
* Allow arbitrary status changes.
* Delete data to solve bugs without explicit authorization.
* Replace working architecture unnecessarily.
* Introduce undocumented APIs.
* Pretend tests passed.
* Ignore failing tests without explanation.
* Allow AI output to bypass deterministic business rules.

---

# 32. Priority Order

When requirements conflict, prioritize:

```text
1. Security
2. Data integrity
3. Business invariants
4. Correctness
5. Existing API compatibility
6. Maintainability
7. Performance
8. Developer convenience
```

---

# 33. Final Principle

CareConnect should be built as if it were a real production system, while keeping the implementation appropriate for a capstone.

The goal is not maximum complexity.

The goal is:

```text
Clear Architecture
+
Correct Business Logic
+
Secure APIs
+
Good UX
+
Useful AI
+
Strong Testing
+
Excellent Documentation
```
# UI/UX Engineering Rules

## Quality Standard

The frontend must meet a professional product-design standard.

The agent must reject its own implementation when it looks like:

* Generic AI-generated UI
* Template-generated SaaS UI
* A component-library demo
* A student CRUD dashboard
* Visually inconsistent pages
* Excessively colorful UI
* Excessively rounded UI
* Excessively card-based UI
* Over-designed UI
* Under-designed UI
* A collection of unrelated screens

The target is:

**Professional, modern, restrained, intentional and production-quality.**

---

# Stitch MCP Rules

Stitch MCP should be used for major UI design work.

Before using Stitch:

1. Read PRD.md.
2. Read ARCHITECTURE.md.
3. Read BUILD_PLAN.md.
4. Read PROGRESS.md.
5. Inspect the existing frontend.
6. Identify existing design tokens.
7. Identify reusable components.
8. Identify the exact user role.
9. Identify the exact user task.

Do not ask Stitch to independently invent the entire application design for every screen.

---

# Design System First

Before generating large numbers of screens, establish the CareConnect visual language.

The agent must establish:

* Typography
* Color system
* Spacing
* Radius
* Shadows
* Buttons
* Forms
* Navigation
* Cards
* Tables
* Status badges
* Modal/dialog patterns

Once established, subsequent screens must use the same language.

---

# Anti-AI-Slop Rules

Do NOT automatically use:

* Purple-to-blue gradients
* Excessive gradients
* Huge rounded cards
* Excessive glassmorphism
* Random colorful blobs
* Excessive floating elements
* Excessive shadows
* Excessive emojis
* Decorative charts
* Random illustrations
* Excessive icons
* Multiple competing accent colors
* Huge hero typography without product purpose
* Excessive animations
* Artificial-looking statistics
* Generic SaaS dashboard patterns
* Repeated three-card/four-card layouts without information need

A visual element must have a product or usability reason.

---

# Color Rules

Use restrained color.

Prefer:

```text
Neutral foundation
+
One strong brand color
+
Semantic state colors
```

Do not introduce a new accent color for every feature.

Do not use color merely to make the interface appear "modern".

Color must support hierarchy and meaning.

---

# Typography Rules

Typography is a primary design tool.

Do not compensate for weak hierarchy with:

* More colors
* More cards
* More icons
* Larger borders
* More shadows

Use typography, spacing and alignment first.

---

# Layout Rules

Prefer:

* Strong alignment
* Clear grids
* Consistent widths
* Intentional whitespace
* Clear hierarchy
* Predictable interaction placement

Avoid:

* Random spacing
* Inconsistent margins
* Uneven alignment
* Overcrowded screens
* Empty screens filled with decorative cards

---

# Card Rules

Do not turn every UI section into a card.

Use cards when they represent an actual conceptual object or grouping.

Prefer:

* Sections
* Lists
* Tables
* Dividers
* Whitespace

when cards do not add value.

---

# Dashboard Rules

Every dashboard must prioritize actions and information.

Before adding a chart or KPI, ask:

> What decision does this help the user make?

If there is no useful answer, do not add it.

---

# Content Rules

Do not use obvious placeholder content in final UI.

Avoid:

```text
John Doe
Test Provider
Lorem ipsum
123456
$123
Item 1
Item 2
```

Use realistic home-services data.

---

# Stitch Output Review

After Stitch generates a design, the agent must review:

### Visual

* Does the design look like one product?
* Is the visual hierarchy clear?
* Is the color restrained?
* Is typography consistent?
* Is spacing consistent?
* Is the interface overly decorative?
* Does it look like a generic AI template?

### UX

* Is the main action obvious?
* Is navigation clear?
* Are important states visible?
* Are forms understandable?
* Are errors understandable?
* Is the information density appropriate?

### Technical

* Does it fit the existing React architecture?
* Can existing components be reused?
* Does it introduce unnecessary dependencies?
* Can it connect to the existing API layer?
* Does it preserve role-based authorization?

If the answer to any major question is no, revise the design before considering the screen complete.

---

# Reuse Before Create

Before creating a new component:

1. Search the existing frontend.
2. Identify similar components.
3. Reuse if possible.
4. Extend the existing component if appropriate.
5. Create a new component only when necessary.

Do not create:

```text
ButtonNew
ButtonModern
ButtonPrimary2
CardNew
DashboardCard2
```

when an existing component can be extended.

---

# Responsive Rules

Every new screen must be reviewed at:

* Mobile
* Tablet
* Desktop

Do not simply allow desktop UI to overflow on mobile.

Tables, navigation, forms and dashboards need intentional responsive behavior.

---

# Completion Rule

A UI screen is not complete until:

* Stitch design reviewed
* React implementation complete
* Design tokens used
* Responsive behavior checked
* Loading state handled
* Empty state handled where necessary
* Error state handled
* Accessibility considered
* API/state integration complete where applicable
* Visual consistency verified
* No obvious AI/template artifacts remain

## Styling Rules

CareConnect uses Tailwind CSS as the required styling system.

Agents must:
- Use Tailwind CSS for component and page styling.
- Follow the project's shared design tokens and utility conventions.
- Prefer reusable React components over repeated large class strings where appropriate.
- Keep custom CSS minimal.
- Avoid introducing MUI, Bootstrap, Chakra UI, styled-components, CSS-in-JS, or another styling framework unless explicitly approved.
- Avoid arbitrary one-off visual decisions that conflict with the established design system.
- Preserve consistent spacing, typography, borders, radii, shadows, and responsive behavior across the application.

Tailwind is a styling system, not a substitute for design decisions. UI must still follow the CareConnect visual direction defined in PRD.md and BUILD_PLAN.md.