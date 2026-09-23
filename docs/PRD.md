# CareConnect — Product Requirements Document

**Version:** 1.0
**Status:** Approved for Development
**Project Type:** MERN + AI Capstone
**Repository:** `CareConnect`

---

## 1. Product Overview

CareConnect is an AI-enabled home-services marketplace and operations platform that connects customers with verified service providers for household services such as appliance repair, plumbing, electrical work, cleaning, carpentry, painting, pest control, maintenance, and installation services.

The platform supports the complete service lifecycle:

```text
Service Request
      ↓
AI Classification
      ↓
Provider Matching
      ↓
Quote Collection
      ↓
Quote Comparison
      ↓
Booking
      ↓
Scheduling
      ↓
Service Execution
      ↓
Evidence
      ↓
Completion
      ↓
Invoice / Payment
      ↓
Review
      ↓
Closure
```

CareConnect also provides operational tooling for administrators, operations managers, and support agents.

---

# 2. Product Vision

Build a reliable digital marketplace where customers can quickly obtain appropriate home services while providers can efficiently manage their availability, requests, jobs, earnings, and professional reputation.

The platform should combine:

* Marketplace functionality
* Scheduling
* Provider management
* Operations management
* Customer support
* AI-assisted classification
* AI-assisted provider recommendations
* Analytics
* Auditing
* Secure role-based access

---

# 3. Product Goals

## 3.1 Primary Goals

1. Allow customers to create home-service requests.
2. Automatically classify service requests using AI.
3. Identify required skills from customer descriptions.
4. Match requests with suitable providers.
5. Allow providers to submit quotes.
6. Allow customers to compare and accept quotes.
7. Prevent provider scheduling conflicts.
8. Track jobs through a defined lifecycle.
9. Support service evidence and dispute resolution.
10. Provide provider verification workflows.
11. Provide operational monitoring.
12. Provide administrative controls.
13. Maintain auditable records of important actions.
14. Provide analytics for marketplace operations.
15. Build the application using maintainable, modular MERN architecture.

---

# 4. Non-Goals

The following are outside the initial MVP unless explicitly added later:

* Native Android application
* Native iOS application
* Full payroll management
* Full accounting/ERP system
* Advanced route optimization
* Autonomous AI decision-making
* AI-controlled payment/refund decisions
* Cryptocurrency payments
* International multi-currency support
* Multi-country tax compliance
* Fully automated provider verification

These may be considered future enhancements.

---

# 5. Target Users

CareConnect has five primary roles.

| Role               | Description                                     |
| ------------------ | ----------------------------------------------- |
| Customer           | Requests and books home services                |
| Service Provider   | Provides services and manages jobs              |
| Operations Manager | Coordinates bookings and marketplace operations |
| Support Agent      | Handles customer/provider problems              |
| Platform Admin     | Controls platform configuration and governance  |

---

# 6. Core User Journeys

## 6.1 Customer Journey

```text
Register
  ↓
Create Profile
  ↓
Add Service Address
  ↓
Create Request
  ↓
AI Classification
  ↓
Receive Quotes
  ↓
Compare Providers
  ↓
Accept Quote
  ↓
Confirm Booking
  ↓
Track Provider
  ↓
Service Completed
  ↓
Confirm Completion
  ↓
Payment / Invoice
  ↓
Review Provider
```

---

## 6.2 Provider Journey

```text
Register
  ↓
Complete Provider Profile
  ↓
Upload Verification Documents
  ↓
Admin Review
  ↓
Provider Verified
  ↓
Configure Skills
  ↓
Configure Service Areas
  ↓
Configure Availability
  ↓
Receive Requests
  ↓
Submit Quote
  ↓
Quote Accepted
  ↓
Booking Scheduled
  ↓
Perform Service
  ↓
Upload Evidence
  ↓
Complete Job
  ↓
Invoice
  ↓
Receive Review
```

---

## 6.3 Operations Journey

```text
Monitor Dashboard
  ↓
Identify Unassigned / Delayed Booking
  ↓
Review Suitable Providers
  ↓
Assign / Reassign Provider
  ↓
Monitor Booking
  ↓
Escalate Problem
  ↓
Resolve Operational Issue
```

---

## 6.4 Support Journey

```text
Ticket Created
  ↓
Ticket Assigned
  ↓
Review Conversation / Evidence
  ↓
Investigate
  ↓
Communicate With User
  ↓
Resolve
  ↓
Close Ticket
```

---

# 7. Functional Requirements

## 7.1 Authentication

The system must support:

* Customer registration
* Provider registration
* Staff login
* JWT authentication
* Logout
* Password hashing
* Password reset
* Email/OTP verification
* Current-user endpoint
* Session/token validation

Authentication must never expose passwords or password hashes through APIs.

---

# 8. Authorization

CareConnect must implement:

```text
Authentication
      ↓
Role Authorization
      ↓
Resource Ownership
      ↓
Permission Check
```

Examples:

* Customers can access their own requests.
* Providers can access their own jobs.
* Providers cannot modify another provider's availability.
* Support agents can access support resources assigned to them.
* Operations managers can manage operational resources.
* Admins can access administrative resources according to configured permissions.

Authorization must be enforced server-side.

---

# 9. Customer Requirements

Customers must be able to:

### Profile

* View profile
* Edit profile
* Change password
* Manage service addresses

### Service Requests

* Create request
* Edit eligible request
* Cancel request
* Upload photos/videos
* Specify urgency
* Specify preferred date/time
* Specify budget
* Add notes

### Quotes

* View quotes
* Compare quotes
* View provider profile
* View provider rating
* Accept quote
* Reject quote

### Bookings

* View booking
* Track status
* Reschedule where allowed
* Cancel where allowed
* Confirm completion

### Reviews

* Rate provider
* Submit review
* View previous reviews

### Disputes

* Create dispute
* Upload evidence
* View dispute status
* Communicate through supported channels

---

# 10. Provider Requirements

Providers must be able to:

* Register
* Create professional profile
* Add skills
* Add categories
* Configure service areas
* Configure availability
* Upload verification documents
* View verification status
* Receive service requests
* Submit quotes
* Withdraw eligible quotes
* View bookings
* Update job status
* Add notes
* Upload service evidence
* Complete jobs
* Generate invoices
* View reviews
* View performance metrics

---

# 11. Operations Requirements

Operations managers must be able to:

* View operational dashboard
* View bookings
* Identify unassigned requests
* Assign providers
* Reassign providers
* Monitor active jobs
* Detect delayed jobs
* Escalate problems
* Cancel eligible bookings
* Review provider availability
* Review operational metrics

---

# 12. Support Requirements

Support agents must be able to:

* View tickets
* Create tickets
* Assign tickets
* Update priority
* Communicate with users
* Review booking information
* Review dispute evidence
* Process supported issue workflows
* Resolve tickets
* Escalate tickets

---

# 13. Admin Requirements

Administrators must be able to manage:

* Users
* Providers
* Categories
* Subcategories
* Skills
* Pricing rules
* Provider verification
* Bookings
* Disputes
* Reviews
* Notifications
* Platform configuration
* Audit logs
* Analytics

---

# 14. Service Request Requirements

A service request should contain:

```text
Customer
Category
Subcategory
Description
Attachments
Address
Location
Preferred Date
Preferred Time Window
Urgency
Budget
AI Classification
Required Skills
Status
Created At
Updated At
```

Example AI result:

```json
{
  "category": "Plumbing",
  "subcategory": "Sink Repair",
  "skills": [
    "Sink Repair",
    "Leak Detection",
    "Pipe Repair"
  ],
  "urgency": "MEDIUM",
  "confidence": 0.91
}
```

AI results are advisory and must be validated before being used in critical workflows.

---

# 15. Provider Matching

Provider recommendations should combine deterministic filtering and scoring.

Required filtering:

```text
Verified Provider
        +
Required Skill
        +
Service Area
        +
Availability
        +
Active Account
```

Optional scoring signals:

```text
Rating
Experience
Completion Rate
Cancellation Rate
Response Time
Historical Service Performance
Distance
Price
```

The system must not rely exclusively on an LLM for provider eligibility.

---

# 16. Quote Requirements

A quote should contain:

```text
Service Request
Provider
Base Price
Labor
Materials
Tax
Discount
Total
Estimated Duration
Proposed Date
Proposed Time
Notes
Expiration
Status
```

The server must calculate authoritative financial totals.

Clients must never be trusted to provide final totals.

---

# 17. Booking Requirements

Bookings must validate:

* Provider eligibility
* Quote eligibility
* Quote status
* Customer ownership
* Provider availability
* Time conflicts
* Booking status
* Cancellation rules

The backend must prevent overlapping provider bookings.

Overlap rule:

```text
newStart < existingEnd
AND
newEnd > existingStart
```

---

# 18. Booking State Machine

Primary booking states:

```text
PENDING
CONFIRMED
SCHEDULED
PROVIDER_ASSIGNED
ON_THE_WAY
ARRIVED
IN_PROGRESS
COMPLETED
CUSTOMER_CONFIRMED
CLOSED
```

Alternative states:

```text
CANCELLED
DISPUTED
REFUNDED
```

Only explicitly allowed state transitions may be performed.

---

# 19. Job Evidence

Providers may upload:

### Before

* Photos
* Videos
* Initial diagnosis

### During

* Progress photos
* Notes
* Materials used

### After

* Completion photos
* Final notes
* Work summary

Evidence must be linked to the appropriate booking/job and uploader.

---

# 20. Invoice Requirements

Invoices must contain:

```text
Invoice Number
Customer
Provider
Booking
Service
Labor
Materials
Tax
Discount
Total
Payment Status
Issue Date
Due Date
```

Invoice numbers must be unique.

---

# 21. Review Requirements

Reviews may only be submitted according to business rules, normally after completion.

A review contains:

```text
Customer
Provider
Booking
Rating
Comment
Created At
```

The system should prevent duplicate reviews for the same eligible booking.

---

# 22. Dispute Requirements

Disputes must support:

```text
OPEN
UNDER_REVIEW
WAITING_FOR_CUSTOMER
WAITING_FOR_PROVIDER
RESOLVED
REJECTED
```

A dispute should retain:

* Reason
* Description
* Booking
* Customer
* Provider
* Evidence
* Messages
* Resolution
* Resolution actor
* Resolution timestamp
* Refund amount where applicable

---

# 23. Notifications

Notifications must support:

```text
In-App
Email
```

Optional future channels:

```text
SMS
Push Notifications
```

Notifications should be generated for important lifecycle events.

---

# 24. Analytics

Admin analytics should include:

* Total users
* Total providers
* Verified providers
* Total bookings
* Completed bookings
* Cancelled bookings
* Revenue
* Platform fees
* Active disputes
* Average rating

Provider analytics may include:

* Jobs completed
* Jobs cancelled
* Revenue
* Average rating
* Quote acceptance rate
* Completion rate

---

# 25. Audit Logging

Important administrative and operational actions must be recorded.

Example:

```json
{
  "actorId": "...",
  "actorRole": "ADMIN",
  "action": "PROVIDER_VERIFIED",
  "targetType": "Provider",
  "targetId": "...",
  "metadata": {},
  "timestamp": "..."
}
```

Audit records should be append-oriented and protected from unauthorized modification.

---

# 26. AI Requirements

## 26.1 Classification

AI should extract:

* Category
* Subcategory
* Skills
* Urgency
* Structured problem information

## 26.2 Provider Recommendation

AI may assist in:

* Skill interpretation
* Semantic matching
* Request understanding

Deterministic backend logic must remain responsible for:

* Verification status
* Availability
* Service-area eligibility
* Booking conflicts
* Authorization
* Financial calculations

---

# 27. Security Requirements

The system must implement:

* Password hashing
* JWT authentication
* RBAC
* Ownership checks
* Input validation
* Request sanitization
* Rate limiting
* CORS
* Secure headers
* File validation
* File size limits
* Centralized error handling
* Environment variables
* Audit logging
* Secure secrets management

Sensitive information must not be logged unnecessarily.

---

# 28. Non-Functional Requirements

## Performance

Target:

* Fast API responses for ordinary CRUD operations
* Pagination for large collections
* Indexed database queries
* Efficient provider filtering

## Reliability

The system should:

* Validate state transitions
* Protect against duplicate booking operations
* Handle failed external services gracefully
* Avoid partial updates where transactions are required

## Maintainability

Code must use:

```text
Routes
 ↓
Controllers
 ↓
Services
 ↓
Models
```

Business logic must not be placed directly inside route handlers.

## Scalability

The architecture should allow future extraction of:

* Notification workers
* AI services
* Search service
* Payment service
* Background job processing

---

# 29. MVP Scope

The MVP should prioritize:

1. Authentication
2. RBAC
3. Customer profiles
4. Provider profiles
5. Categories and skills
6. Service requests
7. AI classification
8. Provider matching
9. Quotes
10. Booking
11. Availability
12. Job lifecycle
13. Reviews
14. Basic invoices
15. Provider verification
16. Admin dashboard
17. Support/disputes
18. Notifications
19. Audit logs

---

# 30. Future Scope

Potential future features:

* Real-time location tracking
* Socket.IO live updates
* Online payment gateway
* Advanced route optimization
* Mobile applications
* Subscription plans
* Provider payouts
* Loyalty programs
* Promotional coupons
* Recommendation personalization
* Advanced fraud detection
* Multi-language support
* Multi-country support

---

# 31. Definition of Done

A feature is considered complete only when:

* Backend API exists
* Input validation exists
* Authorization exists
* Ownership rules are enforced
* Database model is implemented
* Frontend UI exists
* Loading state exists
* Empty state exists
* Error state exists
* Success feedback exists
* Tests exist for critical logic
* API documentation is updated
* Relevant audit events exist
* Documentation is updated

---

# 32. Success Criteria

The completed capstone should demonstrate:

```text
Full-stack MERN development
+
Authentication
+
RBAC
+
CRUD
+
Business workflows
+
Scheduling
+
AI integration
+
File handling
+
Analytics
+
Security
+
Testing
+
Production-style architecture
```

# Professional UI/UX Requirements

## Product Experience Goal

CareConnect must feel like a professionally designed, production-grade home services platform.

The application must NOT look like:

* An AI-generated template
* A generic SaaS dashboard
* A student CRUD application
* A collection of unrelated screens
* A template with excessive gradients
* A template with excessive cards
* A template using arbitrary colors
* A prototype with placeholder content
* A collection of copied component-library examples

The final experience should communicate:

* Trust
* Reliability
* Professionalism
* Simplicity
* Service quality
* Operational efficiency
* Modern technology without visual gimmicks

The UI should feel intentionally designed by a professional product/design team.

---

## Visual Design Direction

CareConnect should use a modern, refined and restrained visual language.

The design should prioritize:

1. Typography
2. Layout
3. Spacing
4. Hierarchy
5. Content clarity
6. Consistent components
7. Subtle visual details
8. Meaningful use of color

Color must support the information hierarchy rather than dominate the interface.

Avoid visually noisy interfaces.

---

## Color Philosophy

Use a restrained primary color system.

The interface should have:

* One primary brand color
* A small number of semantic colors
* Neutral backgrounds
* Neutral surfaces
* Carefully controlled accent usage

Do NOT use multiple unrelated accent colors merely to make the interface look colorful.

Do NOT use gradients as a default visual treatment.

Do NOT use bright saturated colors across large UI areas.

Do NOT use color decoration without a functional purpose.

Semantic colors should communicate states such as:

* Success
* Warning
* Error
* Information
* Neutral

Color must not be the only method of communicating state.

---

## Typography

Typography must create a clear hierarchy.

Use a professional modern sans-serif typeface.

The interface should have a consistent hierarchy for:

* Page titles
* Section headings
* Subheadings
* Body text
* Supporting text
* Labels
* Metadata
* Buttons
* Navigation

Avoid excessive font weights and unnecessary typography variations.

Text should be concise and product-oriented.

---

## Layout

Use a consistent spacing system throughout the application.

Layouts should have:

* Strong alignment
* Consistent content widths
* Clear page hierarchy
* Predictable navigation
* Comfortable whitespace
* Consistent section spacing
* Appropriate density for operational screens

Do not fill empty space with unnecessary cards or decorative elements.

Whitespace is an intentional part of the design.

---

## Components

Create a consistent component language.

Core components include:

* Buttons
* Inputs
* Selects
* Textareas
* Search
* Dropdowns
* Tabs
* Cards
* Tables
* Badges
* Alerts
* Toasts
* Modals
* Drawers
* Breadcrumbs
* Pagination
* Avatars
* Tooltips
* Navigation
* Sidebars
* Headers
* Empty states
* Loading states
* Error states
* Confirmation states

Components should look and behave consistently throughout all roles.

---

## Cards

Cards should be used only when they improve grouping or hierarchy.

Do not place every piece of information inside a card.

Avoid:

* Excessive nested cards
* Cards inside cards
* Decorative cards
* Large collections of identical cards

Use tables, lists, sections and whitespace where those patterns communicate information more effectively.

---

## Dashboards

Dashboards must prioritize actionable information.

A dashboard should answer:

* What needs attention?
* What changed?
* What is currently happening?
* What requires action?
* What is scheduled?
* What is delayed?
* What requires follow-up?

Avoid dashboards that consist primarily of:

* Random statistics
* Decorative charts
* Large KPI cards with little meaning
* Unnecessary graphs

Charts must communicate useful information.

---

## Forms

Forms should be simple and structured.

Use:

* Clear labels
* Helpful descriptions
* Logical grouping
* Appropriate field sizes
* Inline validation
* Clear error messages
* Appropriate defaults
* Progressive disclosure when necessary

Do not create unnecessarily long forms when information can be collected progressively.

---

## Tables

Operational interfaces should use tables when users need to compare multiple records.

Tables should support:

* Clear column hierarchy
* Sorting where useful
* Filtering where useful
* Pagination
* Status indicators
* Row actions
* Responsive behavior

Avoid overly dense tables.

---

## Status Design

Booking and job lifecycle states must have a consistent visual language.

Examples:

* Requested
* Quoted
* Booked
* Scheduled
* Provider Assigned
* On the Way
* Arrived
* In Progress
* Completed
* Customer Confirmed
* Closed
* Cancelled
* Disputed
* Refunded

Status colors must remain consistent across:

* Tables
* Cards
* Details pages
* Notifications
* Timelines
* Dashboards

---

## Role-Specific Experience

The interface must feel intentionally designed for each role.

### Customer

Prioritize:

* Simplicity
* Trust
* Service discovery
* Easy booking
* Clear job status
* Provider confidence
* Transparent pricing
* Support

### Service Provider

Prioritize:

* Work queue
* Availability
* Requests
* Quotes
* Jobs
* Earnings/invoices
* Job status
* Evidence
* Fast actions

### Operations Manager

Prioritize:

* Monitoring
* Exceptions
* Assignments
* Scheduling
* Escalations
* Provider performance
* Operational metrics

### Support Agent

Prioritize:

* Tickets
* Conversations
* Customer context
* Provider context
* Disputes
* Evidence
* Resolution actions

### Platform Admin

Prioritize:

* Configuration
* Users
* Providers
* Verification
* Pricing
* Categories
* Reports
* Auditability
* System controls

---

## Responsive Design

The product must be designed for:

* Desktop
* Tablet
* Mobile

Responsive behavior must be intentionally designed rather than achieved by simply shrinking desktop layouts.

Navigation, tables, forms, dashboards and action areas must have appropriate mobile patterns.

---

## Accessibility

The UI must consider:

* Keyboard navigation
* Focus states
* Contrast
* Semantic HTML
* Accessible form labels
* Screen-reader-friendly structure
* Error messaging
* Non-color state indicators
* Appropriate touch targets

Accessibility should be considered during design rather than added at the end.

---

## Content Quality

The interface must use realistic product content.

Do not use repetitive placeholder content such as:

* Lorem ipsum
* John Doe
* Test User
* Provider 1
* Service 1
* $123
* Random meaningless statistics

When demo data is required, it should look realistic and consistent with a home-services marketplace.

---

## UI Quality Bar

A screen is considered professionally designed only when:

* Hierarchy is immediately understandable.
* Content feels intentional.
* Typography is consistent.
* Spacing is consistent.
* Color is restrained.
* Components are consistent.
* Actions are obvious.
* States are understandable.
* The screen works responsively.
* The screen does not feel like a generic template.
* The screen does not contain unnecessary decoration.
* The screen visually belongs to the CareConnect product.



The project should be demonstrable from registration through service completion and dispute handling.

### UI Technology

The web application uses Tailwind CSS for styling.

The visual system should produce a modern, professional, restrained, trustworthy interface rather than a generic template or AI-generated dashboard aesthetic.