# CareConnect — System Architecture

**Version:** 1.0
**Architecture Style:** Modular Monolith
**Frontend:** React
**Backend:** Node.js + Express
**Database:** MongoDB + Mongoose
**AI:** LLM-assisted services
**API:** REST `/api/v1`

---

# 1. Architecture Philosophy

CareConnect will initially use a **modular monolith** rather than microservices.

The system should be internally separated into business modules while remaining deployable as a small number of applications.

```text
React Frontend
      ↓
Express API
      ↓
Business Modules
      ↓
MongoDB
```

This approach keeps the capstone manageable while preserving boundaries that can later be extracted into independent services.

---

# 2. High-Level Architecture

```text
                         ┌──────────────────────┐
                         │      Customers       │
                         └──────────┬───────────┘
                                    │
                         ┌──────────▼───────────┐
                         │    React Frontend    │
                         │                      │
                         │ Pages                │
                         │ Components           │
                         │ State                │
                         │ API Client           │
                         └──────────┬───────────┘
                                    │ HTTPS
                                    ▼
                         ┌──────────────────────┐
                         │    Express API       │
                         │      /api/v1         │
                         └──────────┬───────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
       Authentication         Business Modules        AI Layer
              │                     │                     │
              │          ┌──────────┼──────────┐          │
              │          │          │          │          │
              │       Requests   Bookings   Disputes   LLM
              │       Quotes     Jobs       Support     │
              │       Providers  Reviews    Admin       │
              │                     │                     │
              └─────────────────────┼─────────────────────┘
                                    │
                              Mongoose Models
                                    │
                                    ▼
                               MongoDB
```

---

# 3. Architectural Style

The backend uses:

```text
Modular Monolith
+
Layered Architecture
+
Domain-oriented Modules
```

Each module should contain:

```text
routes
controller
service
validation
constants
```

Example:

```text
requests/
├── request.controller.js
├── request.service.js
├── request.routes.js
├── request.validation.js
└── request.constants.js
```

---

# 4. Backend Request Flow

Every request should follow:

```text
HTTP Request
     ↓
Router
     ↓
Authentication Middleware
     ↓
Authorization Middleware
     ↓
Validation Middleware
     ↓
Controller
     ↓
Service
     ↓
Model / Repository Logic
     ↓
MongoDB
     ↓
Service Result
     ↓
Controller
     ↓
HTTP Response
```

Controllers should remain thin.

---

# 5. Backend Layers

## 5.1 Routes

Routes define:

* HTTP method
* URL
* Middleware
* Controller

Routes must not contain business logic.

---

## 5.2 Middleware

Middleware handles cross-cutting concerns:

* Authentication
* Authorization
* Validation
* Ownership
* Rate limiting
* File upload
* Error handling

---

## 5.3 Controllers

Controllers:

1. Read request data.
2. Call service functions.
3. Return standardized responses.

Controllers should not contain complex business logic.

---

## 5.4 Services

Services contain business rules.

Examples:

```text
booking.service.js
availability.service.js
quote.service.js
providerMatcher.service.js
dispute.service.js
```

Services are the primary location for domain logic.

---

## 5.5 Models

Mongoose models define:

* Schema
* Validation where appropriate
* Indexes
* Relationships/references
* Persistence behavior

---

# 6. Frontend Architecture

The React application uses a combination of:

```text
Feature-Based Organization
+
Reusable Components
+
Centralized API Layer
+
Role-Based Routing
```

Architecture:

```text
Page
 ↓
Feature Components
 ↓
Hooks / State
 ↓
API Service
 ↓
Axios
 ↓
Backend
```

---

# 7. Frontend State Management

Recommended responsibilities:

### Global state

Use Redux Toolkit for:

* Authentication
* Current user
* Notifications
* Global application state

### Server state

Prefer an API/query abstraction such as RTK Query where practical.

### Local state

Use React state for:

* Forms
* Modals
* UI toggles
* Temporary component state

Do not place every piece of UI state into Redux.

---

# 8. Role-Based Frontend Routing

Routes should be separated by role:

```text
PublicRoutes
CustomerRoutes
ProviderRoutes
OperationsRoutes
SupportRoutes
AdminRoutes
```

Example:

```text
/dashboard
/customer/*
/provider/*
/operations/*
/support/*
/admin/*
```

The frontend route guard improves UX but is not a security boundary.

The backend must independently enforce authorization.

---

# 9. Database Architecture

MongoDB stores domain entities as separate collections.

Primary collections:

```text
users
providerProfiles
serviceCategories
skills
serviceRequests
quotes
bookings
availabilitySlots
invoices
reviews
disputes
supportTickets
notifications
messages
attachments
payments
pricingRules
auditLogs
```

---

# 10. MongoDB Relationship Strategy

Use references for major independent entities.

Example:

```text
ServiceRequest
 ├── customerId
 ├── categoryId
 ├── assignedProviderId
 └── addressId
```

Avoid excessively embedding large or independently managed objects.

Small immutable snapshots may be embedded when historical accuracy is important.

For example, a booking may store a snapshot of the accepted quote totals.

---

# 11. Critical Database Indexes

Recommended indexes include:

```text
users.email
users.role

providerProfiles.userId
providerProfiles.verificationStatus

serviceRequests.customerId
serviceRequests.status
serviceRequests.categoryId
serviceRequests.createdAt

quotes.requestId
quotes.providerId
quotes.status

bookings.customerId
bookings.providerId
bookings.status
bookings.startAt
bookings.endAt

availabilitySlots.providerId
availabilitySlots.startAt
availabilitySlots.endAt

reviews.providerId
reviews.bookingId

disputes.bookingId
disputes.status

notifications.userId
notifications.readAt

auditLogs.actorId
auditLogs.targetId
auditLogs.createdAt
```

Indexes should be validated against actual query patterns.

---

# 12. Booking Concurrency

Booking creation is a critical consistency boundary.

The backend must:

1. Validate the provider.
2. Validate the quote.
3. Validate availability.
4. Detect conflicting bookings.
5. Create the booking safely.
6. Prevent race-condition-based double booking.

Where appropriate, use MongoDB transactions and/or additional concurrency controls.

Availability validation must never depend only on frontend checks.

---

# 13. State Machines

Business entities with lifecycle states must use explicit transition rules.

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

Invalid transitions must return an appropriate API error.

State transitions should be implemented in backend services.

---

# 14. AI Architecture

AI is an assistant to deterministic business logic.

```text
Customer Description
        ↓
AI Classification
        ↓
Structured Output
        ↓
Validation
        ↓
Normalized Request
        ↓
Deterministic Filtering
        ↓
Provider Scoring
        ↓
Recommendation
```

The AI layer must not directly:

* Create bookings
* Override authorization
* Calculate final payments
* Verify providers
* Approve refunds
* Bypass availability
* Change protected states

---

# 15. AI Classification Pipeline

```text
Raw User Text
      ↓
Prompt / Model
      ↓
Structured JSON
      ↓
Schema Validation
      ↓
Confidence Check
      ↓
Business Normalization
      ↓
Stored Classification
```

The system should handle:

```text
High Confidence
Medium Confidence
Low Confidence
AI Failure
```

Low-confidence results should fall back to user confirmation or manual classification.

---

# 16. Provider Matching Architecture

Provider matching should be deterministic first.

```text
All Providers
      ↓
Verified?
      ↓
Active?
      ↓
Skill Match?
      ↓
Service Area?
      ↓
Availability?
      ↓
Eligible Providers
      ↓
Scoring
      ↓
Recommendations
```

Possible scoring factors:

```text
Skill Match
Availability
Distance
Rating
Experience
Completion Rate
Cancellation Rate
Response Time
Price
```

The scoring implementation should be deterministic and testable.

---

# 17. File Architecture

Files should not be stored directly in MongoDB unless specifically required.

Recommended approach:

```text
Frontend
   ↓
Backend Upload Endpoint
   ↓
Validation
   ↓
Object Storage
   ↓
Attachment Metadata
   ↓
MongoDB
```

MongoDB stores metadata such as:

```text
fileName
mimeType
size
storageKey
uploadedBy
entityType
entityId
createdAt
```

---

# 18. Notification Architecture

Business events should trigger notifications.

Example:

```text
Quote Accepted
      ↓
Booking Created
      ↓
Notification Service
      ├── In-App Notification
      └── Email Notification
```

Notification creation should be separated from core business logic where possible.

Future architecture may introduce a queue:

```text
Business Event
      ↓
Message Queue
      ↓
Notification Worker
      ↓
Email / Push / SMS
```

---

# 19. Audit Architecture

Administrative and operational actions should generate audit events.

```text
Business Action
      ↓
Audit Service
      ↓
AuditLog
```

Audit logging should capture:

```text
Actor
Role
Action
Target
Metadata
Timestamp
Request ID
```

---

# 20. Error Handling

All backend errors should pass through centralized error handling.

Standard response:

```json
{
  "success": false,
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "The provider is unavailable for the selected time."
  },
  "requestId": "..."
}
```

Avoid exposing:

* Stack traces
* Database internals
* Secrets
* Sensitive implementation details

in production responses.

---

# 21. API Versioning

All APIs begin with:

```text
/api/v1
```

Future breaking changes should use:

```text
/api/v2
```

Do not silently change the contract of existing endpoints.

---

# 22. API Response Convention

Success:

```json
{
  "success": true,
  "data": {}
}
```

Paginated:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

Failure:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request."
  }
}
```

---

# 23. Security Architecture

```text
Client
  ↓
HTTPS
  ↓
Rate Limiter
  ↓
Authentication
  ↓
Authorization
  ↓
Ownership
  ↓
Validation
  ↓
Business Logic
  ↓
Database
```

Security must be enforced server-side.

---

# 24. Environment Configuration

Configuration should come from environment variables.

Example:

```text
NODE_ENV
PORT
MONGODB_URI
JWT_SECRET
JWT_EXPIRES_IN
CLIENT_URLS
CLIENT_URL_SUFFIXES
AI_API_KEY
EMAIL_HOST
EMAIL_PORT
EMAIL_USER
EMAIL_PASSWORD
STORAGE_BUCKET
STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY
```

Never commit secrets to Git.

---

# 25. Testing Architecture

Testing should exist at multiple levels.

```text
Unit Tests
Integration Tests
API Tests
Component Tests
End-to-End Tests
```

Critical logic requiring strong tests:

* Authentication
* Authorization
* Booking conflicts
* State transitions
* Quote acceptance
* Provider matching
* Pricing calculation
* Dispute transitions

---

# 26. Observability

The backend should support:

* Structured logging
* Request IDs
* Error logging
* Important business event logging
* Audit logs
* Performance monitoring

Production logs must not contain passwords, tokens, or sensitive personal data unnecessarily.

---

# 27. Deployment Architecture

Initial deployment can use:

```text
React
  ↓
Static Hosting / CDN

Express
  ↓
Node Hosting / Container

MongoDB
  ↓
Managed MongoDB

Object Storage
  ↓
Cloud Storage
```

Future scaling:

```text
CDN
 ↓
Load Balancer
 ↓
API Instances
 ↓
MongoDB
 ↓
Workers / Queues
```

---

# 28. Scalability Strategy

The initial application remains a modular monolith.

If scaling requires extraction, candidates include:

```text
AI Service
Notification Service
Payment Service
Search Service
Analytics Service
File Processing Service
```

Modules should communicate through clear interfaces so extraction remains possible.

---

# 29. Architecture Rules

### Rule 1

Routes must not contain business logic.

### Rule 2

Controllers should remain thin.

### Rule 3

Services own business rules.

### Rule 4

Frontend authorization is not security.

### Rule 5

AI does not bypass deterministic validation.

### Rule 6

Financial calculations happen on the server.

### Rule 7

Booking conflicts are checked on the server.

### Rule 8

Every important lifecycle transition must be explicit.

### Rule 9

Sensitive data must not be logged.

### Rule 10

New features must include tests and documentation.

---

# 30. Architectural Decision Principle

Prefer:

```text
Simple
Explicit
Testable
Modular
Secure
```

over:

```text
Premature microservices
Complex abstractions
AI for deterministic problems
Duplicated business logic
Large controllers
Frontend-only validation
```
### Frontend Styling

The frontend uses Tailwind CSS as the primary and required styling system.

Rules:
- Tailwind CSS is the default styling mechanism for all UI.
- Prefer Tailwind utility classes and shared design tokens over ad-hoc CSS.
- Avoid introducing another UI component library unless explicitly justified.
- Reusable components should encapsulate repeated Tailwind patterns.
- Global CSS should be minimal and reserved for base styles, typography setup, accessibility, and cases that cannot reasonably be expressed with Tailwind.
- Do not mix multiple styling systems unnecessarily.