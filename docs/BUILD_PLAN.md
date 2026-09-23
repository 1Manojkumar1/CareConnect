# CareConnect — Build Plan

## 1. Purpose

`BUILD_PLAN.md` is the master execution plan for building the CareConnect platform.

It defines:

* what must be built
* the order in which it should be built
* how backend, frontend, AI, security, testing, and operations should be implemented
* how UI/UX must be designed and implemented
* how Stitch MCP should be used during UI development
* how each phase must be validated before moving forward
* how progress must be recorded

This document must be followed together with:

* `PRD.md`
* `ARCHITECTURE.md`
* `AGENTS.md`
* `PROGRESS.md`

These five Markdown files are the only project-planning Markdown files.

---

# 2. Core Build Philosophy

CareConnect must be developed as a **real production-style product**, not as a collection of disconnected academic CRUD pages.

The implementation must prioritize:

1. correctness
2. maintainability
3. modular architecture
4. professional UX
5. visual consistency
6. security
7. realistic workflows
8. proper validation
9. reliable state management
10. responsive behavior
11. accessibility
12. testability
13. clean separation of concerns
14. realistic business logic
15. AI used where it provides meaningful value

The final product should feel like a cohesive professional home-services marketplace.

---

# 3. Non-Negotiable UI/UX Requirement

Professional UI/UX is a **project-wide requirement from the beginning of development**.

It is not a final polishing phase.

Every frontend feature must be designed and implemented with the following target:

> Modern, professional, attractive, restrained, intentional, trustworthy, and production-quality.

The application must NOT look like:

* generic AI-generated UI
* an AI dashboard template
* a student CRUD project
* a collection of random dashboard cards
* a generic SaaS template
* a purple-gradient AI interface
* an over-rounded component library demo
* a colorful startup landing-page template
* a visually inconsistent collection of screens

Avoid:

* excessive gradients
* excessive rounded cards
* excessive glassmorphism
* random colors
* unnecessary decorative illustrations
* meaningless icons
* oversized headings
* excessive shadows
* inconsistent spacing
* excessive badges
* excessive pills
* repetitive cards
* unnecessary charts
* giant empty dashboard areas
* visually noisy interfaces
* template-like layouts

The UI must use visual hierarchy intentionally.

---

# 4. Product Design Direction

CareConnect should communicate:

* reliability
* professionalism
* trust
* service quality
* clarity
* operational efficiency
* safety
* convenience

The design should feel appropriate for a serious home-services marketplace.

The visual language must remain consistent across:

* customer screens
* provider screens
* operations screens
* support screens
* administration screens
* authentication
* booking flows
* service requests
* provider discovery
* quotes
* jobs
* disputes
* analytics

Different roles may have different information density and navigation patterns, but they must still belong to the same product.

---

# 5. Stitch MCP Design Workflow

Stitch MCP is part of the UI development workflow.

Stitch must be treated as a **design exploration and generation tool**, not as the application's runtime architecture.

The workflow is:

```text
PRD
  ↓
UI Requirements
  ↓
Architecture
  ↓
Stitch Design Exploration
  ↓
Design Review
  ↓
Design System Alignment
  ↓
React Implementation
  ↓
API Integration
  ↓
Responsive Validation
  ↓
Accessibility Validation
  ↓
Visual QA
```

Stitch-generated designs must never be copied blindly.

The developer/agent must review the generated design and adapt it to:

* CareConnect branding
* existing design tokens
* existing components
* established spacing
* established typography
* existing navigation
* existing interaction patterns
* actual application data
* real workflows

---

# 6. General Phase Execution Protocol

Every phase must follow this process:

```text
READ
↓
UNDERSTAND
↓
INSPECT
↓
PLAN
↓
IMPLEMENT
↓
TEST
↓
SELF-REVIEW
↓
FIX
↓
VALIDATE
↓
UPDATE PROGRESS
↓
CONTINUE
```

Before implementing a phase, inspect the current repository.

Do not assume that files, components, routes, APIs, schemas, or utilities exist.

Before creating a new implementation, determine whether an existing implementation can be reused or extended.

Avoid duplicate:

* components
* API utilities
* validation schemas
* services
* hooks
* state logic
* styles
* business rules

---

# 7. Mandatory Documentation Reading

Before beginning any major implementation phase, read:

1. `PRD.md`
2. `ARCHITECTURE.md`
3. `AGENTS.md`
4. `BUILD_PLAN.md`
5. `PROGRESS.md`

The implementation must remain consistent with all five documents.

If a conflict exists between implementation assumptions and the documented architecture, stop and resolve the inconsistency before proceeding.

---

# 8. UI Development Protocol

Every UI-related phase must follow this sequence.

## Step 1 — Identify Screens

Determine:

* required pages
* required routes
* role-specific views
* reusable sections
* dialogs
* forms
* tables
* detail views
* mobile layouts
* loading states
* empty states
* error states

## Step 2 — Inspect Existing UI

Before designing anything new:

* inspect the existing design system
* inspect existing components
* inspect layouts
* inspect navigation
* inspect forms
* inspect tables
* inspect cards
* inspect buttons
* inspect modals
* inspect typography
* inspect spacing

Reuse existing patterns wherever appropriate.

## Step 3 — Use Stitch

Generate or explore the required screen design through Stitch MCP.

The generated result must be reviewed before implementation.

## Step 4 — Design Review

Check:

* visual hierarchy
* spacing
* typography
* color usage
* information density
* interaction clarity
* responsive behavior
* accessibility
* consistency with CareConnect

Reject designs that feel:

* generic
* overly decorative
* AI-generated
* template-like
* unnecessarily complex

## Step 5 — React Implementation

Implement the approved visual direction using the existing React architecture and design system.

Do not introduce arbitrary one-off styling if an existing token or component already exists.

## Step 6 — Real Application States

Every important screen must support:

* loading
* success
* empty
* validation error
* server error
* permission error
* network failure where relevant

## Step 7 — API Integration

Connect the UI to real backend APIs.

Avoid building large amounts of fake frontend state that will later need to be replaced.

## Step 8 — Responsive Validation

Validate:

* desktop
* tablet
* mobile

## Step 9 — Accessibility Validation

Validate:

* keyboard navigation
* labels
* focus states
* contrast
* semantic structure
* accessible errors
* usable touch targets

## Step 10 — Visual QA

Compare the implemented screen with the approved design direction.

Fix visual inconsistencies before marking the phase complete.

---

# 9. UI Quality Rules

## 9.1 Color

Use a restrained color system.

Color should communicate meaning rather than decoration.

Use distinct semantic colors for:

* success
* warning
* error
* information
* neutral states

Do not randomly introduce new colors.

---

## 9.2 Typography

Typography must establish hierarchy through:

* size
* weight
* spacing
* line height
* grouping

Avoid using huge headings simply to make a screen look impressive.

---

## 9.3 Spacing

Use a consistent spacing system.

Do not manually invent unrelated spacing values throughout the application.

---

## 9.4 Cards

Cards should be used when they improve information grouping.

Do not place every piece of information inside a card.

Prefer:

* sections
* tables
* lists
* timelines
* grouped content
* panels

when they communicate information more effectively.

---

## 9.5 Borders and Shadows

Use subtle borders and shadows.

Avoid making every component visually float.

---

## 9.6 Icons

Icons must have a clear purpose.

Do not use icons simply to decorate every heading or button.

---

## 9.7 Motion

Animations should communicate:

* transitions
* state changes
* loading
* confirmation
* navigation

Avoid unnecessary animations.

---

# 10. Architecture Protection

Do not sacrifice architecture quality to make a feature appear complete quickly.

Never:

* put business logic inside presentation components unnecessarily
* duplicate backend validation in uncontrolled ways
* bypass service layers
* bypass authorization
* hard-code database IDs
* expose secrets
* place API credentials in frontend code
* use fake data as a substitute for backend functionality
* create massive components
* create unstructured utility files
* create unnecessary global state

When a feature becomes complex, split it into appropriate modules.

---

# 11. Phase Completion Standard

A phase is complete only when all relevant requirements have been satisfied.

Minimum completion requirements:

* requirements implemented
* architecture respected
* code organized
* UI implemented where applicable
* Stitch design reviewed where applicable
* design system followed
* API integration completed
* validation implemented
* loading states implemented
* empty states implemented
* error states implemented
* responsive behavior verified
* accessibility considered
* security considered
* edge cases handled
* tests added where appropriate
* existing functionality not broken
* build succeeds
* acceptance criteria satisfied
* `PROGRESS.md` updated

A feature is not considered complete merely because the main success path works.

---

# 12. Phase 0 — Repository and Environment Initialization

## Objectives

Create the initial CareConnect repository structure and development environment.

## Tasks

### Repository

Create:

```text
CareConnect/
├── frontend/
├── backend/
├── PRD.md
├── ARCHITECTURE.md
├── AGENTS.md
├── BUILD_PLAN.md
├── PROGRESS.md
├── README.md
└── .gitignore
```

No additional project-planning Markdown files should be created.

### Backend Initialization

Initialize:

* Node.js
* Express
* MongoDB/Mongoose
* environment configuration
* basic server
* error handling foundation
* API versioning foundation

### Frontend Initialization

Initialize:

* React
* routing
* state management
* API client
* styling/design system foundation
* environment configuration

### Development Tooling

Configure appropriate:

* linting
* formatting
* testing
* development scripts

## Validation

Confirm:

* frontend starts
* backend starts
* database connection configuration works
* environment variables are documented safely
* repository structure matches architecture
* no secrets are committed

---

# 13. Phase 1 — Backend Foundation

## Objectives

Build the backend foundation required for all future modules.

## Tasks

Implement:

* Express application
* database connection
* environment configuration
* API versioning
* centralized error handling
* request logging
* validation infrastructure
* authentication middleware foundation
* authorization middleware foundation
* common response patterns
* common utility functions

Establish:

```text
/api/v1
```

as the API root.

## Security Foundation

Implement the foundation for:

* secure password handling
* JWT authentication
* role-based authorization
* request validation
* sanitization
* CORS
* security headers
* rate limiting
* safe error responses
* environment variable protection

## Validation

Verify:

* server startup
* database connection
* error handling
* invalid request handling
* protected route behavior
* API versioning

---

# 14. Phase 2 — Frontend Foundation and Design System

## Objectives

Build the frontend foundation and establish the CareConnect visual language.

This phase is critical because the design system will influence every later screen.

## Tasks

Implement:

* React application shell
* routing
* authentication-aware routing foundation
* API client
* global state foundation
* notification/toast system
* reusable layout system
* responsive foundation
* design tokens
* typography
* spacing
* color system
* buttons
* inputs
* selects
* checkboxes
* radios
* dialogs
* tables
* badges
* alerts
* loaders
* empty states
* error states
* form patterns
* navigation patterns

## Stitch Design Exploration

Use Stitch MCP to explore the CareConnect visual direction.

Explore:

* authentication
* customer dashboard
* service request flow
* provider dashboard
* booking/job screens
* operations dashboard

The purpose is to establish a consistent visual language before building large amounts of UI.

## Design Review

Select a coherent direction based on:

* professionalism
* usability
* information hierarchy
* restrained visual style
* scalability
* consistency

Reject designs that introduce:

* excessive gradients
* excessive rounded cards
* excessive decorative elements
* random colors
* generic AI-dashboard appearance

## App Shell

Implement:

* desktop navigation
* mobile navigation
* role-aware navigation foundation
* header
* page container
* breadcrumbs where appropriate
* notifications entry
* profile entry
* responsive behavior

## Validation

Verify that the design system can support:

* forms
* dashboards
* tables
* lists
* detail pages
* timelines
* dialogs
* status displays
* mobile layouts

---

# 15. Phase 3 — Authentication and Authorization

## Objectives

Implement secure authentication and role-based access.

## Roles

Support:

* Customer
* Service Provider
* Operations Manager
* Support Agent
* Platform Admin

## Backend

Implement:

* registration
* login
* logout/session handling
* password hashing
* token handling
* authentication middleware
* role authorization
* account status
* password reset foundation
* profile foundation

## Frontend

Design and implement through the established UI system:

* login
* registration
* forgot password
* reset password
* account/profile
* unauthorized page
* session-expired handling

## UI Requirements

Authentication screens must be:

* clean
* professional
* focused
* accessible
* responsive

Avoid turning authentication into an unnecessarily decorative landing page.

## Validation

Test:

* valid login
* invalid login
* duplicate registration
* protected routes
* role restrictions
* expired sessions
* logout
* password reset flows
* mobile layouts

---

# 16. Phase 4 — User, Provider, Category and Skill Foundation

## Objectives

Build the core marketplace entities.

## Customer

Implement:

* profile
* contact information
* multiple addresses
* default address
* address validation

## Provider

Implement:

* provider profile
* skills
* certifications
* service areas
* experience
* pricing information
* availability foundation
* verification status
* account status

## Service Categories

Implement:

* categories
* subcategories
* service types
* skill relationships

Initial service areas may include:

* appliance repair
* plumbing
* electrical
* cleaning
* AC repair
* TV repair
* refrigerator repair
* carpentry
* painting
* pest control
* maintenance
* installation

## Admin Foundation

Provide administrative management for:

* categories
* subcategories
* skills
* provider verification data

## UI

Create professional:

* profile pages
* provider profile pages
* category management
* skill management
* provider verification interfaces

## Validation

Verify relationships between:

* users
* providers
* skills
* categories
* service areas

---

# 17. Phase 5 — Service Request Workflow

## Objectives

Allow customers to create structured service requests.

## Request Data

Support:

* category
* subcategory
* problem description
* media
* service address
* preferred date
* preferred time
* urgency
* budget
* additional notes

## Backend

Implement:

* service request schema
* creation
* updates where allowed
* ownership validation
* status management
* media metadata
* request history

## Frontend

Design through Stitch and implement:

* service category selection
* service request form
* problem description
* media upload
* address selection
* date/time selection
* urgency
* budget
* review/confirmation step

## UX Requirements

The request flow should be:

* clear
* progressive
* low-friction
* easy to understand
* mobile-friendly

Avoid presenting a huge form all at once when the workflow can be meaningfully grouped.

## States

Support:

* draft
* submitting
* validation error
* upload error
* success
* server error

---

# 18. Phase 6 — AI Service Classification

## Objectives

Use AI to classify service requests.

## AI Output

The AI system may determine:

* category
* subcategory
* required skills
* urgency
* normalized problem description
* confidence

## Architecture

AI output must not directly override deterministic business rules.

The system should:

```text
Customer Request
↓
AI Classification
↓
Validation / Normalization
↓
Deterministic Backend Rules
↓
Stored Service Request
```

## Requirements

AI failures must not prevent basic service request functionality.

Provide fallback behavior when:

* AI API fails
* response is malformed
* confidence is low
* classification is ambiguous
* request exceeds expected input limits

## UI

Where useful, show classification results in a clear, understandable way.

Do not expose unnecessary model internals to customers.

## Validation

Test:

* valid classification
* malformed AI output
* low confidence
* AI timeout
* AI unavailable
* manual correction where applicable
* unsupported categories

---

# 19. Phase 7 — Provider Discovery and Recommendations

## Objectives

Build provider discovery and recommendation.

## Deterministic Eligibility

Before AI recommendation, providers should be filtered using backend rules such as:

* active account
* verified status where required
* required skill
* service area
* availability
* applicable service restrictions

## Recommendation Factors

The recommendation system may consider:

* skill match
* service area
* availability
* rating
* experience
* previous jobs
* completion rate
* cancellation rate
* response time
* price

AI recommendations must not bypass eligibility requirements.

## Frontend

Implement:

* provider list
* filters
* provider profile
* provider comparison
* recommendation indicators
* service coverage information
* availability information

## UX

Provider discovery should make it easy for customers to understand:

* who the provider is
* what they offer
* whether they are available
* relevant experience
* pricing information
* reviews
* why they appear in the results

Do not overload the interface with unnecessary metrics.

## Validation

Test:

* skill matching
* area filtering
* availability filtering
* provider status
* recommendation fallback
* empty provider results
* filter combinations

---

# 20. Phase 8 — Quote Management

## Objectives

Allow providers to submit quotes and customers to compare them.

## Provider

Implement:

* quote creation
* pricing
* estimated duration
* notes
* quote expiration
* quote updates where allowed

## Customer

Implement:

* quote list
* quote detail
* comparison
* acceptance
* rejection

## Backend

Validate:

* provider eligibility
* request ownership
* quote state
* pricing rules
* expiration
* duplicate quote restrictions

## UI

Use clear comparison patterns.

Avoid turning quote comparison into a visually noisy collection of cards.

Where appropriate, use:

* structured comparison tables
* concise summaries
* clear primary actions

## States

Handle:

* no quotes
* pending quotes
* expired quotes
* accepted quote
* rejected quote
* provider withdrawn quote

---

# 21. Phase 9 — Availability and Scheduling

## Objectives

Implement provider availability and booking conflict prevention.

## Availability

Providers should be able to define:

* working days
* working hours
* unavailable periods
* service-area availability

## Conflict Detection

Use the overlap condition:

```text
newStart < existingEnd
AND
newEnd > existingStart
```

This rule must be applied consistently by the backend.

## Frontend

Implement:

* availability management
* calendar/time selection
* booking slot selection
* conflict messages

## Validation

Test:

* overlapping bookings
* adjacent bookings
* unavailable periods
* invalid time ranges
* timezone handling
* provider schedule changes
* race conditions during booking

---

# 22. Phase 10 — Booking and Job Lifecycle

## Objectives

Implement the complete service lifecycle.

## Lifecycle

```text
REQUESTED
→ QUOTED
→ BOOKED
→ SCHEDULED
→ PROVIDER_ASSIGNED
→ ON_THE_WAY
→ ARRIVED
→ IN_PROGRESS
→ COMPLETED
→ CUSTOMER_CONFIRMED
→ CLOSED
```

Alternative states:

```text
CANCELLED
DISPUTED
REFUNDED
```

## Backend

Implement:

* booking creation
* provider assignment
* state transitions
* transition validation
* cancellation rules
* timestamps
* job history
* ownership checks
* operational events

## Frontend

Create role-specific views for:

### Customer

* booking detail
* status
* provider
* schedule
* service information
* timeline
* cancellation
* confirmation

### Provider

* assigned jobs
* job detail
* status updates
* arrival
* work progress
* evidence
* completion

### Operations

* booking queue
* assignment
* reassignment
* escalations
* status monitoring

## UX

Use a clear job timeline.

Status should be understandable without forcing users to interpret internal codes.

## Validation

Test every valid and invalid lifecycle transition.

No role should be able to perform unauthorized state changes.

# CareConnect — Build Plan

## Continuation — Chunk 2 of 4

# 23. Phase 11 — Pricing, Invoices and Payments

## Objectives

Implement the financial foundation for service bookings.

## Pricing

Support:

* provider quote price
* platform pricing rules
* service fees where applicable
* discounts where applicable
* taxes where applicable
* final payable amount

Pricing logic must be deterministic and auditable.

Do not allow frontend-calculated totals to be treated as authoritative.

The backend must calculate and validate final totals.

## Invoice

Implement:

* invoice generation
* invoice number
* booking reference
* customer information
* provider information
* service information
* itemized charges
* taxes/fees where applicable
* total
* invoice status
* timestamps

## Payment Architecture

If a payment gateway is implemented, isolate it behind a payment service abstraction.

The application should not spread gateway-specific logic throughout controllers and UI components.

Support payment states such as:

```text
PENDING
AUTHORIZED
PAID
FAILED
REFUNDED
PARTIALLY_REFUNDED
```

## Frontend

Implement:

* pricing summary
* invoice detail
* payment status
* payment result states
* refund status where relevant

## UI Requirements

Financial screens should prioritize:

* clarity
* trust
* accurate totals
* readable breakdowns
* clear status
* predictable actions

Avoid excessive visual decoration.

## Validation

Test:

* pricing calculation
* quote amount validation
* taxes/fees
* invoice totals
* payment success
* payment failure
* refund
* duplicate payment attempts
* unauthorized access

---

# 24. Phase 12 — Notifications and Communication

## Objectives

Provide reliable communication between the platform and users.

## Notification Types

Support notifications for:

* registration
* verification
* new service request
* quote received
* quote accepted
* booking confirmed
* schedule changes
* provider assignment
* provider arrival
* job completion
* customer confirmation
* cancellation
* dispute updates
* support updates
* payment events

## Channels

The architecture may support:

* in-app notifications
* email
* optional SMS/push depending on infrastructure

## Backend

Implement:

* notification model
* notification service
* templates
* read/unread state
* delivery status
* retry strategy where appropriate

## Frontend

Implement:

* notification center
* unread indicator
* notification detail/navigation
* notification preferences where required

## Real-Time Communication

If Socket.IO is used, isolate real-time infrastructure from core business logic.

Real-time updates must not be the only mechanism for critical state persistence.

The database remains authoritative.

## UI

Notifications should be:

* concise
* actionable
* non-intrusive
* grouped logically

Avoid overwhelming users with unnecessary notifications.

---

# 25. Phase 13 — Reviews and Ratings

## Objectives

Allow customers to review completed services.

## Requirements

Implement:

* rating
* written review
* booking association
* provider association
* customer association
* review timestamps
* moderation status where required

## Rules

Only eligible completed services should be reviewable.

Prevent:

* duplicate reviews
* unauthorized reviews
* reviews for unrelated providers
* review manipulation through direct API access

## Provider Profile

Show:

* average rating
* review count
* recent reviews
* relevant review summaries

Do not expose internal moderation data to customers.

## Admin

Implement moderation capabilities where required.

## UI

Review interfaces should be simple and focused.

Avoid oversized rating graphics or unnecessary decorative elements.

---

# 26. Phase 14 — Support and Disputes

## Objectives

Implement customer support and service dispute workflows.

## Support

Support:

* tickets
* complaints
* cancellation requests
* refund requests
* communication history
* ticket status
* assignment

## Ticket States

Example:

```text
OPEN
ASSIGNED
IN_PROGRESS
WAITING_FOR_CUSTOMER
WAITING_FOR_PROVIDER
RESOLVED
CLOSED
```

## Disputes

Implement:

* dispute creation
* evidence
* messages
* booking association
* parties involved
* status
* resolution
* refund information
* audit history

## Dispute States

```text
OPEN
UNDER_REVIEW
WAITING_FOR_CUSTOMER
WAITING_FOR_PROVIDER
RESOLVED
REJECTED
```

## Evidence

Support appropriate evidence such as:

* images
* documents
* job notes
* timestamps
* communication history

Uploads must be validated.

## UI

Dispute screens should prioritize:

* timeline
* evidence
* participants
* current status
* required actions
* resolution information

Avoid visually confusing dispute pages.

---

# 27. Phase 15 — Operations Management

## Objectives

Build the operational control layer for internal staff.

## Operations Dashboard

Show meaningful operational information such as:

* active bookings
* pending requests
* unassigned requests
* provider availability
* delayed jobs
* escalations
* disputes
* cancellations
* service quality indicators

Do not fill the dashboard with metrics that do not support decisions.

## Booking Management

Operations users should be able to:

* inspect bookings
* assign providers
* reassign providers
* monitor status
* identify delays
* handle escalations

## Provider Operations

Support:

* verification review
* account status
* service coverage
* skills
* availability
* performance information

## UI

Operations interfaces can be more information-dense than customer interfaces.

However, information density must remain structured.

Prefer:

* tables
* filters
* grouped panels
* timelines
* concise summaries

over dozens of unrelated cards.

## Validation

Test role permissions carefully.

Operations users must not receive unrestricted administrative access unless explicitly authorized.

---

# 28. Phase 16 — Platform Administration

## Objectives

Build the platform administration layer.

## Admin Areas

Implement management for:

* users
* providers
* categories
* subcategories
* skills
* pricing policies
* verification
* bookings
* disputes
* reviews
* reports
* notifications
* configuration
* audit logs

## Admin UI

The admin interface should prioritize:

* efficiency
* information density
* search
* filtering
* bulk operations where appropriate
* clear status
* safe destructive actions

## Destructive Actions

Actions such as:

* deleting
* disabling
* rejecting
* cancelling
* refunding
* suspending

must require appropriate confirmation and authorization.

## Auditability

Important administrative actions should produce audit records.

---

# 29. Phase 17 — Search, Filtering and Analytics

## Objectives

Provide useful discovery and operational analytics.

## Search

Support relevant search across:

* providers
* services
* bookings
* users
* tickets
* disputes

## Filtering

Support combinations such as:

* status
* category
* provider
* date
* location/service area
* rating
* urgency
* assignment

## Analytics

Provide appropriate analytics such as:

* booking volume
* completion rate
* cancellation rate
* average response time
* provider performance
* category demand
* revenue summaries where implemented
* dispute trends
* service quality metrics

## UI

Charts must answer real questions.

Do not add charts simply to make dashboards appear sophisticated.

Every chart should have:

* clear title
* useful units
* meaningful labels
* understandable time period
* appropriate empty state

## Validation

Test:

* filter combinations
* pagination
* sorting
* search
* date ranges
* empty results
* large result sets

---

# 30. Phase 18 — Audit Logging

## Objectives

Create a reliable audit trail for important actions.

## Audit Events

Track appropriate actions such as:

* authentication events
* role changes
* provider verification
* booking state changes
* provider assignment
* pricing changes
* refunds
* dispute resolution
* administrative changes
* account status changes

## Audit Record

Where appropriate include:

* actor
* action
* resource
* resource ID
* previous state
* new state
* timestamp
* relevant metadata
* request context where safe

## Security

Audit logs must not expose:

* passwords
* tokens
* secrets
* unnecessary personal information

## UI

Admin users should have a searchable audit log.

Use structured tables and detail views rather than unnecessarily decorative layouts.

---

# 31. Phase 19 — Comprehensive Testing

## Objectives

Verify the platform as an integrated system.

Testing must not be postponed until the end.

Testing should occur continuously during each phase.

## Backend Tests

Cover:

* authentication
* authorization
* validation
* service requests
* AI classification boundaries
* provider matching
* quotes
* availability
* booking lifecycle
* pricing
* payments
* notifications
* reviews
* support
* disputes
* admin actions
* audit logs

## Frontend Tests

Cover:

* routing
* forms
* validation
* state management
* API states
* loading
* empty
* errors
* role-based rendering
* important user flows

## Integration Tests

Test complete workflows such as:

```text
Customer Registration
→ Service Request
→ Classification
→ Provider Discovery
→ Quote
→ Booking
→ Scheduling
→ Job
→ Completion
→ Customer Confirmation
→ Review
```

## Dispute Workflow

Test:

```text
Completed/Active Booking
→ Dispute
→ Evidence
→ Review
→ Resolution
→ Refund where applicable
```

## Operations Workflow

Test:

```text
Request
→ Operations Review
→ Provider Assignment
→ Monitoring
→ Escalation
→ Resolution
```

## Testing Principles

Tests should verify business behavior rather than implementation details wherever practical.

---

# 32. Phase 20 — Security Review

## Objectives

Perform a dedicated security review.

## Authentication

Verify:

* secure password hashing
* token handling
* session expiration
* password reset protection
* brute-force protection

## Authorization

Verify:

* role checks
* ownership checks
* resource-level authorization
* admin boundaries
* provider/customer separation

## Input Security

Verify:

* request validation
* sanitization
* safe query handling
* file validation
* size limits
* MIME/type restrictions

## API Security

Verify:

* rate limiting
* CORS
* security headers
* safe error messages
* API versioning
* authentication enforcement

## File Security

Verify:

* upload restrictions
* storage configuration
* access control
* file size limits
* safe filenames
* malicious file handling

## Data Protection

Verify that sensitive data is not unnecessarily exposed through:

* API responses
* logs
* frontend state
* browser storage
* audit logs

---

# 33. Phase 21 — Performance and Reliability

## Objectives

Improve performance without sacrificing maintainability.

## Backend

Review:

* database indexes
* query efficiency
* pagination
* population strategy
* aggregation performance
* caching opportunities
* API response sizes

## Frontend

Review:

* bundle size
* code splitting
* lazy loading
* unnecessary renders
* image loading
* API request duplication
* state management efficiency

## Reliability

Test:

* network failures
* API timeouts
* retry behavior
* partial failures
* database errors
* third-party service failures
* AI service failures

The application should fail gracefully.

---

# 34. Phase 22 — Full UI/UX Review

## Objectives

Perform a complete visual and interaction review of the application.

This phase is not an opportunity to redesign the product randomly.

It is a consistency and quality review.

## Review All Major Areas

### Customer

* authentication
* dashboard
* service request
* provider discovery
* quote comparison
* booking
* job tracking
* invoices
* notifications
* reviews
* support
* disputes
* profile
* addresses

### Provider

* dashboard
* profile
* verification
* availability
* incoming requests
* quotes
* jobs
* evidence
* invoices
* notifications
* performance

### Operations

* dashboard
* request management
* bookings
* assignment
* provider management
* escalations
* disputes

### Support

* tickets
* complaints
* communication
* cancellations
* refunds
* disputes

### Admin

* users
* providers
* categories
* skills
* pricing
* verification
* bookings
* reviews
* disputes
* analytics
* audit logs
* configuration

## Visual Review

Check:

* typography consistency
* spacing consistency
* button consistency
* form consistency
* navigation consistency
* table consistency
* modal consistency
* status consistency
* icon consistency
* color consistency
* responsive behavior

## Anti-Slop Review

Explicitly look for:

* excessive cards
* unnecessary gradients
* generic AI layouts
* excessive rounded containers
* random colors
* inconsistent spacing
* meaningless icons
* excessive decorative elements
* duplicated UI patterns
* screens that look unrelated to the rest of CareConnect

---

# 35. Phase 23 — Accessibility Review

## Objectives

Make the application accessible and usable.

## Review

Verify:

* semantic HTML
* keyboard navigation
* focus visibility
* form labels
* error messages
* screen-reader-friendly controls
* color contrast
* accessible dialogs
* accessible tables
* accessible status indicators
* touch targets
* reduced-motion considerations

## Forms

Every important field must have:

* accessible label
* useful error message
* understandable validation
* appropriate focus behavior

## Dynamic Content

Important status updates should be communicated accessibly.

---

# 36. Phase 24 — Demo Data and Demo Environment

## Objectives

Create realistic demo data for capstone presentation and testing.

## Demo Data

Include realistic examples for:

* customers
* providers
* categories
* skills
* service requests
* quotes
* bookings
* jobs
* reviews
* support tickets
* disputes
* notifications
* invoices

## Data Quality

Avoid meaningless demo values such as:

```text
test
test123
abc
Lorem ipsum
Provider 1
User 1
```

Use realistic but fictional data.

## Demo Scenarios

Prepare complete scenarios for:

1. customer requests service
2. AI classification
3. provider discovery
4. quote comparison
5. booking
6. provider job execution
7. customer confirmation
8. review
9. support ticket
10. dispute
11. operations intervention
12. administrative management

---

# 37. Phase 25 — Final Integration Review

## Objectives

Verify that all major modules work together.

## Integration Areas

Confirm:

```text
Authentication
↓
Profiles
↓
Service Categories
↓
Service Request
↓
AI Classification
↓
Provider Discovery
↓
Quotes
↓
Availability
↓
Booking
↓
Job Lifecycle
↓
Payment/Invoice
↓
Notifications
↓
Review
↓
Support/Dispute
↓
Operations
↓
Administration
↓
Audit
```

No major feature should remain isolated.

---

# 38. Phase 26 — Final Product Quality Review

## Product Review

Ask:

* Does the product feel like one application?
* Is the navigation predictable?
* Are workflows understandable?
* Are role boundaries clear?
* Does the UI feel professional?
* Is the information hierarchy strong?
* Are screens visually consistent?
* Are errors understandable?
* Are empty states useful?
* Are loading states polished?
* Does the application behave well on mobile?
* Does the interface avoid generic AI-generated patterns?

## Code Review

Check:

* architecture
* naming
* modularity
* duplication
* error handling
* validation
* security
* performance
* testing
* maintainability

## Data Review

Check:

* realistic demo data
* valid relationships
* no leaked secrets
* no accidental personal data
* no broken references

---

# 39. Phase 27 — Final Capstone Readiness

## Objectives

Prepare CareConnect for final demonstration and submission.

## Final Requirements

Verify:

* frontend builds
* backend runs
* database connects
* environment configuration works
* major workflows work
* role permissions work
* AI functionality works or gracefully degrades
* responsive UI works
* accessibility basics are satisfied
* security review is complete
* tests pass
* demo data is available
* no major console errors remain
* no major API errors remain
* no placeholder content remains in important screens

## Demo Preparation

Prepare a reliable demonstration sequence:

```text
Login
↓
Customer Dashboard
↓
Create Service Request
↓
AI Classification
↓
Provider Discovery
↓
Quote Comparison
↓
Booking
↓
Provider Workflow
↓
Job Completion
↓
Customer Confirmation
↓
Review
↓
Support/Dispute Example
↓
Operations Dashboard
↓
Admin Dashboard
```

---

# 40. UI Completion Checklist

Every major UI feature should progress through:

```text
Stitch Design
↓
Design Review
↓
React Implementation
↓
Design System Integration
↓
Real Data/API
↓
Loading State
↓
Empty State
↓
Error State
↓
Responsive Validation
↓
Accessibility Validation
↓
Visual Review
↓
QA
```

A screen should not be marked complete merely because it renders.

---

# 41. Stitch Design Review Checklist

Before accepting a Stitch-generated design, verify:

## Brand

* Does it look like CareConnect?
* Does it communicate reliability?
* Does it fit the home-services marketplace?

## Visual

* Is hierarchy clear?
* Is typography intentional?
* Is spacing consistent?
* Is color restrained?
* Are cards used appropriately?
* Are shadows subtle?

## UX

* Are actions obvious?
* Is information grouped logically?
* Are forms understandable?
* Are error states considered?
* Does the flow make sense?

## Anti-AI-Slop

Reject or revise designs with:

* unnecessary gradients
* excessive cards
* excessive icons
* excessive pills
* decorative clutter
* random colors
* generic AI dashboard appearance
* excessive glassmorphism
* oversized typography
* meaningless visual elements

---

# 42. Scope Control

Do not add features simply because they are technically interesting.

Every new feature should have a clear relationship to:

* PRD
* user need
* business workflow
* architecture
* capstone objective

If a requested feature expands scope significantly, evaluate:

* complexity
* dependencies
* security impact
* testing requirements
* UI impact
* maintenance cost

Do not compromise core workflows for unnecessary extras.

---

# 43. Change Management

When changing architecture or major behavior:

1. inspect the current implementation
2. identify affected modules
3. identify affected UI
4. identify affected API contracts
5. identify affected tests
6. update relevant documentation
7. implement
8. test
9. review for regressions
10. update `PROGRESS.md`

Do not silently introduce architectural changes.

---

# 44. Dependency Management

Before adding a dependency, determine whether:

* an existing dependency already provides the capability
* the functionality can be implemented cleanly without another dependency
* the dependency is maintained
* it creates security concerns
* it increases bundle size significantly
* it fits the architecture

Avoid dependency accumulation.

---

# 45. Error Handling Standard

Errors should be handled at every layer.

## Backend

Return safe, structured errors.

Do not expose:

* stack traces
* database internals
* secrets
* implementation details

## Frontend

Errors should be:

* understandable
* actionable
* contextual

Do not display raw API errors to users.

---

# 46. Loading and Empty State Standard

Every data-driven interface should consider loading and empty states.

## Loading

Use appropriate:

* skeletons
* progress indicators
* disabled states

Avoid making users stare at blank screens.

## Empty

Explain:

* what is empty
* why it may be empty
* what the user can do next

Example categories:

* no bookings
* no quotes
* no providers
* no notifications
* no reviews
* no support tickets

Empty states should remain visually restrained.

---

# 47. Form Quality Standard

Forms must include:

* labels
* validation
* clear required indicators
* useful errors
* appropriate defaults
* loading state
* success feedback
* server error handling

Long forms should be divided into logical groups.

Do not make every form a giant undifferentiated block.

---

# 48. Responsive Design Standard

Responsive behavior must be designed rather than patched after desktop development.

Every major screen should be evaluated at:

* desktop
* tablet
* mobile

Check:

* navigation
* forms
* tables
* dialogs
* cards
* filters
* timelines
* buttons
* typography
* spacing
* touch interaction

On small screens, information hierarchy should be preserved.

Do not simply shrink desktop layouts.

---

# 49. Accessibility Standard

Accessibility must be considered during implementation, not added only at the end.

Use:

* semantic elements
* keyboard-friendly controls
* visible focus
* meaningful labels
* appropriate ARIA only where needed
* readable contrast
* accessible error messages
* accessible dialogs
* accessible navigation

---

# 50. Code Quality Standard

Prefer:

* small focused modules
* clear naming
* predictable folder structure
* reusable components
* reusable services
* typed/validated data boundaries
* centralized constants
* explicit business rules

Avoid:

* giant components
* giant controllers
* duplicated business logic
* unexplained magic values
* deeply nested conditionals
* unnecessary abstraction
* copy-paste implementations

---

# 51. Definition of Done

A feature is **DONE** only when:

```text
Requirement
✓
Architecture
✓
Backend
✓
Frontend
✓
UI Design
✓
Stitch Review
✓
API Integration
✓
Validation
✓
Loading State
✓
Empty State
✓
Error State
✓
Responsive
✓
Accessibility
✓
Security
✓
Testing
✓
Edge Cases
✓
Visual QA
✓
Documentation/Progress
✓
```

If one of the relevant items is incomplete, the feature should remain in progress.

---

# 52. Autonomous Execution Mode

When implementing this project, work phase-by-phase.

Do not repeatedly stop after every small implementation step when the required information is already available.

Within a phase:

1. inspect
2. plan
3. implement
4. test
5. review
6. fix
7. validate
8. update progress

Then continue to the next logical task.

Do not move to the next major phase if the current phase contains unresolved blocking issues.

---

# 53. Mandatory Self-Review

Before marking any phase complete, ask:

```text
Does this satisfy the PRD?

Does this respect the architecture?

Does this follow AGENTS.md?

Does this follow the established UI system?

Was Stitch used where required?

Does the UI look intentional and professional?

Does it avoid generic AI-generated UI patterns?

Are loading, empty, and error states handled?

Is the feature responsive?

Is accessibility considered?

Are authorization and ownership checks correct?

Are edge cases handled?

Are tests present where appropriate?

Did this introduce duplication?

Did this break existing functionality?

Does the application still feel like one cohesive product?

Is PROGRESS.md updated?
```

Only after these checks should the phase be considered complete.

---

# 54. Final Product Principle

CareConnect should ultimately feel like:

> **One coherent, professional home-services platform built with deliberate product design, reliable engineering, and meaningful AI assistance.**

It should not feel like:

> a collection of AI-generated screens connected to a database.

Every phase must contribute toward the same product vision.

# CareConnect — Build Plan

## Continuation — Chunk 3 of 4

# 55. Cross-Phase Dependency Order

The following dependency order should be respected unless there is a documented architectural reason to deviate.

```text
Repository
↓
Backend Foundation
↓
Frontend Foundation
↓
Design System
↓
Authentication
↓
Users / Providers / Categories / Skills
↓
Service Requests
↓
AI Classification
↓
Provider Discovery
↓
Quotes
↓
Availability
↓
Booking
↓
Jobs
↓
Pricing / Invoices / Payments
↓
Notifications
↓
Reviews
↓
Support / Disputes
↓
Operations
↓
Administration
↓
Search / Analytics
↓
Audit
↓
Testing
↓
Security
↓
Performance
↓
UI/UX Review
↓
Accessibility
↓
Demo Data
↓
Final Integration
↓
Capstone Readiness
```

Some implementation tasks may proceed in parallel when dependencies are already satisfied.

However, parallel work must not create conflicting architecture or duplicate implementations.

---

# 56. Feature Development Pattern

Every major feature should follow this pattern.

## 56.1 Requirement

Identify:

* user
* goal
* inputs
* outputs
* permissions
* business rules
* failure cases
* UI requirements

## 56.2 Data Model

Define:

* entities
* relationships
* indexes
* constraints
* lifecycle states

## 56.3 API

Define:

* route
* method
* authentication
* authorization
* request validation
* response shape
* error behavior

## 56.4 Backend

Implement:

* controller
* service
* model
* validation
* authorization
* business rules
* error handling

## 56.5 UI Design

Identify:

* screen
* route
* layout
* components
* interactions
* states

Use Stitch MCP where the feature introduces meaningful new UI.

## 56.6 React

Implement:

* page
* components
* state
* API integration
* validation
* loading
* empty
* error states

## 56.7 Testing

Test:

* happy path
* invalid input
* unauthorized access
* edge cases
* failure states

## 56.8 Review

Check:

* architecture
* UX
* visual consistency
* security
* responsiveness
* accessibility

---

# 57. Backend Module Implementation Order

Backend modules should generally follow this order:

```text
config
↓
database
↓
common utilities
↓
middleware
↓
authentication
↓
users
↓
providers
↓
categories
↓
skills
↓
service requests
↓
AI
↓
provider discovery
↓
quotes
↓
availability
↓
bookings
↓
jobs
↓
pricing
↓
invoices
↓
payments
↓
notifications
↓
reviews
↓
support
↓
disputes
↓
operations
↓
admin
↓
analytics
↓
audit
```

Each module should remain independently understandable.

---

# 58. Frontend Feature Implementation Order

The frontend should generally evolve in this order:

```text
Application Shell
↓
Design System
↓
Authentication
↓
Profile
↓
Customer Experience
↓
Provider Experience
↓
Operations Experience
↓
Support Experience
↓
Admin Experience
↓
Analytics
↓
Cross-role polish
```

The exact screen order may change depending on dependencies.

---

# 59. Customer Experience Build Sequence

## Step 1 — Authentication

Build:

* login
* registration
* password recovery

## Step 2 — Customer Profile

Build:

* profile
* addresses
* preferences where required

## Step 3 — Customer Dashboard

Show useful information such as:

* active requests
* upcoming bookings
* recent activity
* pending quotes
* notifications

Avoid dashboard clutter.

## Step 4 — Service Request

Build the complete request workflow.

## Step 5 — Provider Discovery

Build:

* provider results
* filters
* provider profile
* recommendation context

## Step 6 — Quote Comparison

Build:

* quotes
* comparison
* acceptance

## Step 7 — Booking

Build:

* schedule
* confirmation
* booking detail

## Step 8 — Job Tracking

Build:

* status
* timeline
* provider
* service information

## Step 9 — Completion

Build:

* completion confirmation
* invoice
* review

## Step 10 — Support

Build:

* support ticket
* complaint
* cancellation
* dispute

---

# 60. Provider Experience Build Sequence

## Step 1 — Provider Registration

Build:

* registration
* profile
* service areas
* skills

## Step 2 — Verification

Build:

* certification uploads
* verification status
* required information

## Step 3 — Provider Dashboard

Show:

* incoming requests
* pending quotes
* upcoming jobs
* current workload
* important notifications

## Step 4 — Availability

Build:

* working schedule
* unavailable periods
* service availability

## Step 5 — Quotes

Build:

* request details
* quote creation
* quote status

## Step 6 — Jobs

Build:

* assigned jobs
* job detail
* status updates
* arrival
* progress
* completion

## Step 7 — Evidence

Build:

* evidence upload
* notes
* completion evidence

## Step 8 — Performance

Show appropriate:

* completed jobs
* ratings
* response information
* cancellation information

Do not overload providers with unnecessary analytics.

---

# 61. Operations Experience Build Sequence

Operations users require an efficient workflow.

## Dashboard

Show:

* pending requests
* unassigned jobs
* active jobs
* delayed jobs
* escalations
* disputes

## Request Management

Allow:

* inspection
* assignment
* reassignment
* escalation

## Booking Monitoring

Provide:

* status
* provider
* customer
* schedule
* service
* operational events

## Provider Management

Allow authorized operations users to inspect:

* availability
* skills
* service areas
* verification
* performance

## Exception Handling

Provide clear interfaces for:

* delayed jobs
* provider no-show
* customer cancellation
* assignment failure
* dispute escalation

---

# 62. Support Experience Build Sequence

Support agents need an efficient queue-oriented interface.

## Ticket Queue

Support:

* filtering
* status
* priority
* assignment
* search

## Ticket Detail

Show:

* customer
* provider
* booking
* history
* messages
* evidence
* internal notes where authorized
* actions

## Actions

Support agents may be allowed to:

* respond
* request information
* escalate
* resolve
* initiate appropriate workflows

Sensitive administrative actions must remain permission-controlled.

---

# 63. Admin Experience Build Sequence

Admin functionality should be organized into logical areas.

## Users

* search
* filter
* inspect
* activate/deactivate
* role information

## Providers

* verification
* profile
* skills
* service areas
* status

## Services

* categories
* subcategories
* skills

## Pricing

* pricing policies
* configuration

## Bookings

* monitoring
* intervention
* history

## Disputes

* review
* resolution
* refund information

## Reviews

* moderation

## Analytics

* reports
* operational metrics

## Audit

* event search
* detail inspection

## Configuration

* platform settings

---

# 64. API Design Standards

All API endpoints should follow consistent conventions.

## Versioning

Use:

```text
/api/v1
```

## Naming

Prefer resource-oriented routes.

Examples:

```text
GET    /api/v1/providers
GET    /api/v1/providers/:id
POST   /api/v1/service-requests
GET    /api/v1/service-requests/:id
POST   /api/v1/quotes
POST   /api/v1/bookings
GET    /api/v1/bookings/:id
```

Avoid unnecessarily action-heavy routes when a resource-oriented design is sufficient.

## Validation

Every externally supplied input must be validated.

## Authorization

Authentication alone is not enough.

Validate:

* role
* ownership
* resource relationship
* state
* permissions

---

# 65. API Response Standards

Responses should be predictable.

Where appropriate:

```json
{
  "success": true,
  "data": {}
}
```

For errors:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": []
  }
}
```

The exact response contract should follow `ARCHITECTURE.md`.

Do not expose internal exceptions directly.

---

# 66. Database Standards

Use MongoDB/Mongoose according to the architecture.

## Requirements

Models should have:

* clear schemas
* appropriate indexes
* timestamps where useful
* validation
* references where appropriate
* lifecycle/state constraints

## Indexes

Review indexes for:

* user lookups
* provider search
* category search
* service areas
* booking dates
* statuses
* notifications
* tickets
* disputes
* audit events

Do not create indexes without considering actual query patterns.

---

# 67. Booking Integrity Rules

Booking creation is a critical transaction boundary.

Before confirming a booking, validate:

1. service request exists
2. request is eligible for booking
3. selected quote is valid
4. provider is eligible
5. provider is active
6. provider is verified where required
7. provider covers the service area
8. requested slot is valid
9. no availability conflict exists
10. pricing is valid
11. customer is authorized
12. booking does not already exist for the same accepted quote/request where prohibited

Race conditions must be considered.

---

# 68. State Machine Rules

Important workflows should be treated as state machines.

Do not allow arbitrary status changes.

Example:

```text
REQUESTED
    ↓
QUOTED
    ↓
BOOKED
    ↓
SCHEDULED
    ↓
PROVIDER_ASSIGNED
    ↓
ON_THE_WAY
    ↓
ARRIVED
    ↓
IN_PROGRESS
    ↓
COMPLETED
    ↓
CUSTOMER_CONFIRMED
    ↓
CLOSED
```

Alternative transitions must be explicitly defined.

Invalid transitions must return safe errors.

---

# 69. Role-Based UI Rules

The frontend must not rely on hiding buttons as the only security mechanism.

For example:

A customer should not see provider-only actions.

But even if a customer manually calls the provider endpoint, the backend must reject it.

Therefore:

```text
Frontend Authorization
+
Backend Authorization
```

are both required.

---

# 70. AI Architecture Standards

AI functionality must remain modular.

AI services should be isolated from normal business services.

Recommended conceptual structure:

```text
AI Request
↓
AI Service
↓
Prompt / Model Adapter
↓
Structured Output
↓
Validation
↓
Normalization
↓
Business Logic
```

The application should not depend on raw model text.

Prefer structured output.

---

# 71. AI Failure Handling

The platform must remain usable when AI fails.

Possible failures:

* provider unavailable
* timeout
* malformed response
* quota issue
* unexpected classification
* low confidence
* invalid JSON
* model service unavailable

Fallbacks may include:

* manual category selection
* deterministic matching
* default classification
* retry
* user confirmation

AI should enhance the workflow rather than become a single point of failure.

---

# 72. Provider Recommendation Architecture

Provider recommendation should be layered.

## Layer 1 — Eligibility

Deterministic rules:

```text
Active
+
Required Skill
+
Service Area
+
Available
+
Required Verification
```

## Layer 2 — Ranking

Use relevant factors such as:

```text
Skill Match
+
Availability
+
Rating
+
Experience
+
Completion Rate
+
Cancellation Rate
+
Response Time
+
Price
```

## Layer 3 — AI Assistance

AI may assist with:

* nuanced matching
* ranking explanations
* request interpretation
* preference understanding

AI must not bypass Layer 1.

---

# 73. Media Upload Standards

Uploads may be used for:

* service request photos
* provider certifications
* job evidence
* dispute evidence
* profile information where appropriate

Validate:

* file size
* file type
* MIME type
* upload count
* authorization
* storage destination

Do not trust file extensions alone.

---

# 74. Search and Pagination Standards

Large datasets must not be loaded unnecessarily.

Use:

* pagination
* filtering
* sorting
* indexed queries

Where appropriate.

Frontend lists should communicate:

* current result range
* total where available
* current filters
* loading state
* empty state

---

# 75. Table Design Standards

Tables are appropriate for information-dense operational screens.

Tables should provide:

* clear column labels
* readable density
* row actions
* sorting where useful
* filtering where useful
* pagination
* empty state
* loading state

On mobile, tables should adapt rather than simply overflow without consideration.

Possible strategies:

* horizontal scrolling
* condensed columns
* row-to-detail views
* stacked information

Use whichever best preserves usability.

---

# 76. Dashboard Design Standards

Dashboards must answer:

> What does the user need to know or do right now?

A dashboard should not simply display:

```text
12 Cards
+
4 Charts
+
10 Badges
```

Instead prioritize:

1. immediate actions
2. important status
3. relevant work
4. useful summaries
5. trends only where meaningful

Different roles should have dashboards appropriate to their responsibilities.

---

# 77. Detail Page Standards

Detail pages should make the primary entity understandable.

For example, a booking detail should clearly communicate:

* booking identity
* customer
* provider
* service
* schedule
* status
* price
* timeline
* relevant actions

Do not scatter critical information across unrelated cards.

---

# 78. Timeline Standards

Timelines are useful for:

* booking lifecycle
* job progress
* support tickets
* disputes
* audit events

Each event should communicate:

* what happened
* when
* relevant actor
* relevant context

Do not use decorative timeline elements that add no information.

---

# 79. Modal and Dialog Standards

Dialogs should be used for focused actions such as:

* confirmation
* short forms
* destructive actions
* quick details

Avoid placing entire complex workflows inside giant modal windows when a dedicated page is clearer.

Destructive actions must clearly explain consequences.

---

# 80. Notification UX Standards

Notifications should distinguish:

* informational
* success
* warning
* error
* action required

Avoid excessive toast notifications.

Important persistent events should appear in the notification center or relevant workflow.

---

# 81. Mobile UX Standards

Mobile is not simply a smaller desktop version.

For mobile:

* prioritize primary actions
* reduce unnecessary secondary information
* collapse navigation appropriately
* simplify dense tables
* preserve important status
* keep forms usable
* maintain touch-friendly controls

Do not hide critical information simply to make a screen visually clean.

---

# 82. Visual Consistency Rules

Every new UI component must be evaluated against existing components.

Before introducing a new:

* button
* badge
* card
* modal
* input
* table
* header
* navigation element

ask:

> Does an existing component already solve this?

If yes, reuse it.

If not, create the new component in the design system when it is likely to be reused.

---

# 83. Design Token Rules

Centralize:

* colors
* spacing
* typography
* radius
* shadows
* breakpoints
* transitions

Do not scatter design constants across individual pages.

The exact token values should be defined in the implementation according to the approved CareConnect visual direction.

---

# 84. Frontend State Standards

Use appropriate state ownership.

Prefer:

* local state for local UI
* feature state for feature-level state
* global state only when shared across the application
* server/cache state patterns where appropriate

Avoid placing everything into one global store.

---

# 85. API Client Standards

The frontend API layer should centralize:

* base URL
* authentication handling
* headers
* common error handling
* request configuration

Feature modules should not each create their own unrelated API client.

---

# 86. Form Validation Standards

Validation should exist at both:

```text
Frontend
+
Backend
```

Frontend validation provides usability.

Backend validation provides security and correctness.

Never trust frontend validation alone.

---

# 87. Security Boundary Principle

Treat the following as untrusted:

* browser input
* query parameters
* route parameters
* uploaded files
* AI output
* provider-submitted data
* customer-submitted data
* third-party API responses

Validate all external data before using it.

---

# 88. Logging Standards

Logs should help diagnose problems without exposing sensitive information.

Never log:

* passwords
* authentication tokens
* secrets
* unnecessary personal information

Use appropriate levels for:

* debug
* info
* warning
* error

Production logging should remain useful and controlled.

---

# 89. Environment Configuration

Sensitive configuration belongs in environment variables.

Examples:

```text
MONGODB_URI
JWT_SECRET
AI_API_KEY
EMAIL_PROVIDER_KEY
STORAGE credentials
PAYMENT credentials
```

Never hard-code secrets.

Provide safe example configuration through the project's normal environment setup process rather than committing real credentials.

---

# 90. Git and Change Discipline

Changes should be organized logically.

Avoid mixing unrelated changes in one implementation step.

For example, do not combine:

* authentication refactor
* unrelated UI redesign
* analytics feature
* database migration

without a clear reason.

Keep changes traceable to project requirements.

---

# 91. Regression Prevention

After implementing a feature, check related existing workflows.

For example:

### After changing booking logic

Check:

* quotes
* availability
* provider dashboard
* customer dashboard
* notifications
* invoices
* disputes

### After changing authentication

Check:

* all protected routes
* role access
* session handling
* profile
* logout

### After changing design tokens

Check:

* all major screens
* forms
* dashboards
* tables
* dialogs
* mobile layouts

---

# 92. Final Regression Matrix

Before final completion, verify at minimum:

| Area              | Customer | Provider | Operations | Support | Admin |
| ----------------- | -------: | -------: | ---------: | ------: | ----: |
| Authentication    |        ✓ |        ✓ |          ✓ |       ✓ |     ✓ |
| Profile           |        ✓ |        ✓ |          ✓ |       ✓ |     ✓ |
| Service Requests  |        ✓ |        ✓ |          ✓ |       — |     ✓ |
| Quotes            |        ✓ |        ✓ |          ✓ |       — |     ✓ |
| Availability      |        — |        ✓ |          ✓ |       — |     ✓ |
| Bookings          |        ✓ |        ✓ |          ✓ |       ✓ |     ✓ |
| Jobs              |        ✓ |        ✓ |          ✓ |       ✓ |     ✓ |
| Payments/Invoices |        ✓ |        ✓ |          ✓ |       ✓ |     ✓ |
| Notifications     |        ✓ |        ✓ |          ✓ |       ✓ |     ✓ |
| Reviews           |        ✓ |        ✓ |          ✓ |       — |     ✓ |
| Support           |        ✓ |        ✓ |          ✓ |       ✓ |     ✓ |
| Disputes          |        ✓ |        ✓ |          ✓ |       ✓ |     ✓ |
| Analytics         |        — |  Limited |          ✓ | Limited |     ✓ |
| Audit             |        — |        — |    Limited | Limited |     ✓ |

The exact permissions must follow `PRD.md` and `ARCHITECTURE.md`.

---

# 93. End-to-End Acceptance Scenarios

The final product should support realistic end-to-end scenarios.

## Scenario A — Customer Service Request

```text
Customer Login
↓
Dashboard
↓
Create Service Request
↓
Select Category
↓
Describe Problem
↓
Upload Image
↓
Select Address
↓
Select Date/Time
↓
Set Urgency/Budget
↓
Submit
↓
AI Classification
↓
Request Created
```

Expected:

* validation works
* request is persisted
* AI result is structured
* user receives confirmation
* relevant providers can eventually discover it

---

# 94. End-to-End Acceptance Scenario — Provider Matching

```text
Service Request
↓
Eligibility Filtering
↓
Provider Search
↓
Availability Check
↓
Recommendation/Ranking
↓
Provider Results
```

Expected:

* inactive providers excluded
* ineligible providers excluded
* unavailable providers excluded where required
* service-area rules respected
* skill requirements respected

---

# 95. End-to-End Acceptance Scenario — Quote and Booking

```text
Provider Receives Request
↓
Provider Reviews Request
↓
Provider Submits Quote
↓
Customer Receives Notification
↓
Customer Compares Quotes
↓
Customer Accepts Quote
↓
Schedule Confirmed
↓
Booking Created
```

Expected:

* quote is associated with correct provider/request
* customer cannot accept an invalid quote
* expired quote cannot be accepted
* booking cannot create an availability conflict

---

# 96. End-to-End Acceptance Scenario — Job Completion

```text
Booking
↓
Provider Assigned
↓
Provider On The Way
↓
Provider Arrives
↓
Job Starts
↓
Evidence Added
↓
Job Completed
↓
Customer Confirms
↓
Booking Closed
↓
Review Available
```

Expected:

* invalid state transitions are rejected
* timeline records important events
* evidence is associated correctly
* review becomes available only when eligible

---

# 97. End-to-End Acceptance Scenario — Dispute

```text
Booking/Job
↓
Customer Opens Dispute
↓
Evidence Added
↓
Support/Operations Review
↓
Provider Response
↓
Resolution
↓
Refund Where Applicable
↓
Audit Event
```

Expected:

* only authorized users can access dispute information
* evidence remains associated with the dispute
* resolution is recorded
* refund information is auditable
* relevant notifications are generated

---

# 98. End-to-End Acceptance Scenario — Provider Verification

```text
Provider Registration
↓
Profile Completion
↓
Certification Upload
↓
Verification Submission
↓
Admin/Operations Review
↓
Approved / Rejected
↓
Provider Status Updated
```

Expected:

* incomplete provider profiles cannot bypass requirements
* uploaded documents are protected
* verification decisions are audited
* provider eligibility reflects verification state

# CareConnect — Build Plan

## Continuation — Chunk 4 of 4

# 99. End-to-End Acceptance Scenario — Operations Intervention

```text
Service Request
↓
No Suitable Provider
↓
Operations Queue
↓
Operations Reviews Request
↓
Provider Search
↓
Manual Assignment
↓
Customer Notification
↓
Booking/Job Continues
```

Expected:

* operations can intervene where authorized
* assignment is audited
* customer receives appropriate updates
* normal booking workflow remains intact

---

# 100. End-to-End Acceptance Scenario — Support Ticket

```text
Customer
↓
Support Request
↓
Ticket Created
↓
Support Agent Assigned
↓
Investigation
↓
Customer Communication
↓
Resolution
↓
Ticket Closed
```

Expected:

* communication history is preserved
* ticket ownership is controlled
* support agents can perform only authorized actions
* customer sees relevant ticket status

---

# 101. End-to-End Acceptance Scenario — Cancellation

Cancellation behavior must be based on the booking's current state and applicable business rules.

Possible flow:

```text
Booking
↓
Cancellation Request
↓
Eligibility Check
↓
Cancellation
↓
Pricing/Refund Calculation
↓
Notifications
↓
Audit
```

The backend must determine whether cancellation is allowed.

The frontend must not independently decide eligibility.

---

# 102. End-to-End Acceptance Scenario — Payment Failure

```text
Booking
↓
Payment Attempt
↓
Payment Provider Failure
↓
Payment Marked Failed
↓
User Informed
↓
Retry/Alternative Flow
```

Expected:

* failed payment does not appear as successful
* booking state remains consistent
* duplicate payment is prevented
* user receives understandable feedback

---

# 103. End-to-End Acceptance Scenario — AI Failure

```text
Service Request
↓
AI Classification Attempt
↓
AI Failure
↓
Fallback
↓
Request Continues
```

Expected:

* service request is not lost
* user receives appropriate feedback
* fallback classification/manual selection is available where appropriate
* failure is logged safely
* secrets/model details are not exposed

---

# 104. Final UI Audit Matrix

Before final completion, inspect each major screen using this matrix.

| Category       | Check                     |
| -------------- | ------------------------- |
| Layout         | Clear hierarchy           |
| Typography     | Consistent                |
| Spacing        | Consistent                |
| Color          | Restrained and meaningful |
| Components     | Reused appropriately      |
| Navigation     | Predictable               |
| Forms          | Validated                 |
| Loading        | Present                   |
| Empty          | Present                   |
| Error          | Present                   |
| Responsive     | Verified                  |
| Accessibility  | Verified                  |
| API            | Real data connected       |
| Permissions    | Correct                   |
| Visual Quality | Professional              |
| Anti-Slop      | Passed                    |

---

# 105. Anti-AI-Slop Final Audit

The final application must explicitly be reviewed for AI-generated visual patterns.

## Reject

### Generic Dashboard Composition

Avoid:

```text
Header
+
Four identical cards
+
Three colorful cards
+
Random chart
+
Recent activity card
+
AI badge
```

when those elements do not represent actual user needs.

### Excessive Rounded Containers

Do not place:

* headings
* forms
* tables
* every list
* every section

inside separate rounded containers without a clear reason.

### Excessive Gradients

Do not use gradients as a default visual shortcut.

### Excessive Color

Do not use a different color for every category of information.

### Decorative Icons

Do not add icons simply to fill visual space.

### Fake Sophistication

Avoid:

* meaningless analytics
* unnecessary charts
* fake AI labels
* decorative status indicators
* exaggerated statistics
* visual complexity without functional purpose

---

# 106. Professional UI Review Questions

Before finalizing any screen, ask:

### Hierarchy

Can the user immediately identify:

* where they are
* what matters
* what they can do
* what needs attention

### Clarity

Can the user understand the screen without explanation?

### Consistency

Does the screen feel like CareConnect?

### Restraint

Has anything been added purely for decoration?

### Trust

Does the screen feel reliable enough for:

* bookings
* payments
* service requests
* disputes
* personal information

### Efficiency

Can the user complete the intended task without unnecessary steps?

---

# 107. Customer UI Quality Review

Customer-facing screens should prioritize:

* clarity
* confidence
* ease of use
* transparent information
* predictable actions

Customer screens should not expose unnecessary operational complexity.

For example, customers should understand:

```text
Service
Provider
Price
Schedule
Status
Next Action
```

without needing to understand internal system states.

---

# 108. Provider UI Quality Review

Provider-facing screens should prioritize:

* work queue
* schedule
* job information
* customer information
* actionable tasks
* earnings/pricing information where applicable

Providers should not need to navigate through excessive decorative dashboards to find active work.

---

# 109. Operations UI Quality Review

Operations interfaces may be dense but must remain structured.

Prioritize:

* queue
* filters
* status
* exceptions
* assignment
* escalation
* timelines

Use tables and structured detail views where they improve operational efficiency.

---

# 110. Support UI Quality Review

Support interfaces should make it easy to answer:

* Who needs help?
* What happened?
* What booking is affected?
* What has already happened?
* What action is required?
* What is the current status?

---

# 111. Admin UI Quality Review

Administration interfaces should prioritize:

* control
* search
* filtering
* safety
* auditability
* bulk operations where appropriate

Destructive actions should be visually clear without relying on excessive red styling everywhere.

---

# 112. Documentation Synchronization

Documentation must remain synchronized with implementation.

If implementation changes:

* architecture
* API behavior
* roles
* workflow states
* major UI patterns
* feature scope

then the relevant planning document must be updated.

The five project documents are:

```text
PRD.md
ARCHITECTURE.md
AGENTS.md
BUILD_PLAN.md
PROGRESS.md
```

Do not create additional planning Markdown files to compensate for documentation gaps.

---

# 113. PROGRESS.md Update Rules

After completing a meaningful task or phase, update `PROGRESS.md`.

Track at minimum:

* phase
* feature
* backend status
* frontend status
* UI/design status
* API integration status
* testing status
* responsive status
* accessibility status
* blockers
* notes

For UI features, distinguish:

```text
Stitch Design
React UI
API Integration
Responsive
Accessibility
QA
```

This prevents a visually complete screen from being mistaken for a fully integrated feature.

---

# 114. Recommended Progress States

Use clear states such as:

```text
NOT_STARTED
IN_PROGRESS
BLOCKED
READY_FOR_REVIEW
COMPLETED
```

For UI work, more detailed tracking may use:

```text
DESIGN_PENDING
STITCH_DESIGNED
DESIGN_REVIEWED
REACT_IMPLEMENTED
API_INTEGRATED
RESPONSIVE_VERIFIED
ACCESSIBILITY_VERIFIED
QA_COMPLETE
```

---

# 115. Blocker Handling

When blocked:

1. identify the blocker
2. identify affected functionality
3. determine whether another independent task can proceed
4. record the blocker in `PROGRESS.md`
5. avoid implementing unsafe workarounds
6. resolve the blocker before declaring the dependent feature complete

Do not hide blockers simply to maintain an appearance of progress.

---

# 116. Definition of Phase Completion

A phase is complete when:

```text
Requirements satisfied
AND
Architecture satisfied
AND
Implementation complete
AND
Relevant UI complete
AND
Stitch review complete where applicable
AND
API integration complete
AND
Validation complete
AND
Loading/empty/error states complete
AND
Responsive validation complete
AND
Accessibility considered
AND
Security reviewed
AND
Testing complete
AND
Visual QA complete
AND
No known blocking defects
AND
PROGRESS.md updated
```

---

# 117. Definition of Project Completion

CareConnect is ready for final capstone presentation only when:

## Product

* core customer workflow works
* provider workflow works
* operations workflow works
* support workflow works
* admin workflow works

## Backend

* APIs work
* validation works
* authorization works
* database relationships work
* lifecycle rules work

## AI

* service classification works
* recommendation assistance works where implemented
* deterministic business rules remain authoritative
* AI failure handling works

## Frontend

* major screens implemented
* real APIs connected
* state handling complete
* responsive behavior verified
* accessibility reviewed

## UI/UX

* design system is consistent
* Stitch designs were reviewed
* screens look professional
* visual hierarchy is strong
* interface does not look AI-generated or template-like

## Security

* authentication secure
* authorization enforced
* inputs validated
* uploads protected
* secrets protected
* sensitive data handled appropriately

## Testing

* unit tests where appropriate
* integration tests
* important end-to-end workflows
* regression testing

## Operations

* notifications
* support
* disputes
* audit
* admin controls

## Demo

* realistic demo data
* reliable demo workflow
* no placeholder content in important areas
* no major visible defects

---

# 118. Final Release Checklist

## Repository

* [ ] structure is correct
* [ ] no unnecessary planning Markdown files
* [ ] no secrets committed
* [ ] environment configuration documented
* [ ] README is usable

## Backend

* [ ] server starts
* [ ] database connects
* [ ] APIs work
* [ ] validation works
* [ ] authorization works
* [ ] errors are handled
* [ ] uploads are protected
* [ ] logging is safe

## Frontend

* [ ] application starts
* [ ] routing works
* [ ] authentication works
* [ ] API integration works
* [ ] state management works
* [ ] loading states work
* [ ] empty states work
* [ ] error states work

## UI

* [ ] Stitch designs reviewed
* [ ] design system consistent
* [ ] typography consistent
* [ ] spacing consistent
* [ ] colors consistent
* [ ] responsive behavior verified
* [ ] accessibility reviewed
* [ ] no generic AI-dashboard appearance
* [ ] no unnecessary gradients
* [ ] no excessive cards
* [ ] no excessive decorative elements

## Business Logic

* [ ] service requests
* [ ] AI classification
* [ ] provider discovery
* [ ] quotes
* [ ] availability
* [ ] bookings
* [ ] jobs
* [ ] pricing
* [ ] invoices
* [ ] payments
* [ ] notifications
* [ ] reviews
* [ ] support
* [ ] disputes
* [ ] operations
* [ ] administration
* [ ] analytics
* [ ] audit

## Security

* [ ] authentication
* [ ] authorization
* [ ] ownership checks
* [ ] input validation
* [ ] upload validation
* [ ] rate limiting
* [ ] CORS
* [ ] security headers
* [ ] secret protection

## Testing

* [ ] backend tests
* [ ] frontend tests
* [ ] integration tests
* [ ] critical end-to-end scenarios
* [ ] regression checks

## Final

* [ ] build succeeds
* [ ] no critical bugs
* [ ] demo data available
* [ ] demo workflow tested
* [ ] `PROGRESS.md` updated
* [ ] final UI review complete

---

# 119. Final Execution Rule

The project should always move toward a **working, integrated, professional product**.

Do not optimize for:

* number of files
* number of screens
* number of components
* number of charts
* amount of code
* amount of AI-generated content

Optimize for:

* correctness
* user experience
* reliability
* maintainability
* security
* consistency
* realistic workflows
* professional presentation

---

# 120. Final Principle

CareConnect is not merely a MERN CRUD application.

It is a complete home-services marketplace and operations platform.

The implementation must therefore combine:

```text
Product Requirements
+
Business Logic
+
Professional UI/UX
+
Strong Architecture
+
Secure APIs
+
Reliable Workflows
+
AI Assistance
+
Testing
+
Operations
```

The final experience should feel deliberate from the first screen to the final workflow.

Every new screen should look like it belongs to CareConnect.

Every new API should respect the architecture.

Every AI feature should support the product rather than replace deterministic business rules.

Every major workflow should be testable.

Every user role should have a clear and appropriate experience.

Every phase should improve the same cohesive product.

> **Build CareConnect as one professional product—not as a collection of generated pages and disconnected features.**

### Styling Implementation

Use Tailwind CSS throughout the frontend.

The implementation must establish a shared visual foundation before building feature screens:

- typography scale
- font weights
- spacing scale
- colors
- surface/background colors
- borders
- radii
- shadows
- focus states
- form states
- responsive breakpoints
- transitions
- accessibility states

Create reusable components for recurring UI patterns rather than styling every page independently.

Do not treat Tailwind as permission to generate visually inconsistent utility combinations.