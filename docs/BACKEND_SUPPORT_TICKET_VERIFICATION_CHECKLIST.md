# Backend Support Ticket System Verification Checklist

## Overview
This checklist verifies that the backend is properly configured to support the frontend support ticket modal implementation.

## 1. API Endpoint Verification

### POST /tickets Endpoint
- [ ] Endpoint exists at `POST /tickets`
- [ ] Endpoint accepts the following request body:
  ```typescript
  {
    title: string;           // Required
    description: string;     // Required
    category: TicketCategory; // Required enum
    priority?: TicketPriority; // Optional, defaults to MEDIUM
    paymentId?: string;      // Optional
    studentId?: string;      // Optional
    attachments?: string[];  // Optional
  }
  ```
- [ ] Valid `TicketCategory` enum values:
  - `PAYMENT_ISSUE`
  - `ENROLLMENT_ISSUE`
  - `TECHNICAL_ISSUE`
  - `REFUND_REQUEST`
  - `ACCOUNT_ISSUE`
  - `OTHER`
- [ ] Valid `TicketPriority` enum values:
  - `LOW`
  - `MEDIUM` (default)
  - `HIGH`
  - `URGENT`
- [ ] Endpoint returns HTTP 201 on successful creation
- [ ] Endpoint returns created ticket object with all fields populated

### GET /tickets Endpoint
- [ ] Endpoint exists at `GET /tickets`
- [ ] Supports query parameters:
  - `status` (optional)
  - `category` (optional)
  - `priority` (optional)
  - `assignedTo` (optional)
  - `createdBy` (optional)
  - `page` (optional)
  - `limit` (optional)
- [ ] Returns paginated response:
  ```typescript
  {
    data: Ticket[],
    total: number,
    page: number,
    limit: number
  }
  ```

### GET /tickets/:id Endpoint
- [ ] Endpoint exists at `GET /tickets/:id`
- [ ] Returns single ticket with all relations (creator, assignee, payment, student, comments)
- [ ] Returns 404 if ticket not found
- [ ] Returns 403 if user doesn't have access

## 2. Authentication & Authorization

- [ ] Endpoint requires valid JWT authentication token (Bearer token)
- [ ] `JwtAuthGuard` is applied to the controller
- [ ] Endpoint respects `X-Center-Id` header for center-scoped tickets
- [ ] User permissions allow ticket creation for authenticated users
- [ ] Non-admin users can only see their own tickets or assigned tickets
- [ ] Admin/CEO/COO_HEAD_OFFICE/FINANCE_OFFICER can see all tickets

## 3. Database Schema Verification

### Tickets Table
- [ ] Table name: `tickets` (or `Ticket` in Prisma)
- [ ] Required fields exist:
  - `id` (UUID/string, primary key)
  - `title` (string, required)
  - `description` (text, required)
  - `category` (enum/string, required)
  - `priority` (enum/string, defaults to MEDIUM)
  - `status` (enum/string, defaults to OPEN)
  - `createdBy` (user ID reference, required)
  - `createdAt` (timestamp, auto-generated)
  - `updatedAt` (timestamp, auto-updated)
- [ ] Optional fields exist:
  - `paymentId` (foreign key to payments, nullable)
  - `studentId` (foreign key to students, nullable)
  - `assignedTo` (user ID reference, nullable)
  - `resolvedBy` (user ID reference, nullable)
  - `resolvedAt` (timestamp, nullable)
  - `resolution` (text, nullable)
  - `attachments` (array/JSON, nullable)
- [ ] Foreign key constraints are properly set up
- [ ] Indexes exist for:
  - `createdBy`
  - `assignedTo`
  - `status`
  - `category`
  - `paymentId`
  - `studentId`

### Ticket Comments Table (if applicable)
- [ ] Table name: `ticket_comments` (or `TicketComment` in Prisma)
- [ ] Fields:
  - `id` (primary key)
  - `ticketId` (foreign key to tickets)
  - `comment` (text)
  - `createdBy` (user ID reference)
  - `createdAt` (timestamp)
  - `attachments` (optional)

## 4. Response Format Verification

### Successful Creation (201)
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "category": "PAYMENT_ISSUE",
  "priority": "MEDIUM",
  "status": "OPEN",
  "createdBy": "string",
  "paymentId": "string" | null,
  "studentId": "string" | null,
  "createdAt": "ISO date string",
  "updatedAt": "ISO date string",
  "creator": {
    "id": "string",
    "email": "string",
    "firstname": "string",
    "lastname": "string"
  },
  "payment": { ... } | null,
  "student": { ... } | null
}
```

### Error Responses
- [ ] **400 Bad Request**: Returns validation errors
  ```json
  {
    "message": "Validation failed",
    "errors": ["field: error message"],
    "errorCount": 1
  }
  ```
- [ ] **401 Unauthorized**: Returns when authentication fails
  ```json
  {
    "statusCode": 401,
    "message": "Unauthorized"
  }
  ```
- [ ] **403 Forbidden**: Returns when user doesn't have access
  ```json
  {
    "statusCode": 403,
    "message": "You do not have access to this ticket"
  }
  ```
- [ ] **404 Not Found**: Returns when ticket/payment/student not found
  ```json
  {
    "statusCode": 404,
    "message": "Ticket not found"
  }
  ```
- [ ] **500 Internal Server Error**: Returns for server errors
  ```json
  {
    "statusCode": 500,
    "message": "Internal server error"
  }
  ```

## 5. Error Handling

- [ ] Backend returns error messages in consistent format
- [ ] Validation errors are descriptive and user-friendly
- [ ] Error messages don't expose sensitive system information
- [ ] All errors are properly logged on the server

## 6. Center Context & Filtering

- [ ] If `X-Center-Id` header is provided, ticket is associated with that center (via student relationship)
- [ ] If user cannot switch centers, their center ID is automatically used
- [ ] Center filtering works correctly in `getAllTickets`:
  - Tickets linked to students in user's center(s) are visible
  - General tickets (no student) are visible to all
- [ ] Center access is checked in `getTicket` for individual ticket retrieval

## 7. Business Logic Verification

- [ ] When `paymentId` is provided, payment existence is validated
- [ ] When `studentId` is provided, student existence is validated
- [ ] Ticket status defaults to `OPEN` on creation
- [ ] Ticket priority defaults to `MEDIUM` if not provided
- [ ] `createdBy` is automatically set from authenticated user
- [ ] Ticket creation emits `ticket.created` event for notifications

## 8. Notification System Integration

- [ ] `ticket.created` event is emitted when ticket is created
- [ ] Notification listeners are registered and working
- [ ] Email notifications are sent to appropriate recipients
- [ ] In-app notifications are created
- [ ] Regional managers are notified for relevant tickets

## 9. Testing Steps

### Test Ticket Creation
- [ ] Create ticket with all required fields (title, description, category)
- [ ] Create ticket with optional fields (paymentId, studentId)
- [ ] Create ticket with different priorities
- [ ] Create ticket with different categories
- [ ] Verify ticket appears in the list after creation
- [ ] Verify ticket can be viewed in detail page

### Test Error Handling
- [ ] Missing required fields returns 400 with validation errors
- [ ] Invalid category enum returns 400
- [ ] Invalid priority enum returns 400
- [ ] Invalid paymentId returns 404
- [ ] Invalid studentId returns 404
- [ ] Unauthenticated request returns 401
- [ ] Unauthorized access returns 403

### Test Center Association
- [ ] Create ticket with `X-Center-Id` header
- [ ] Create ticket without `X-Center-Id` header (uses user's center)
- [ ] Verify center filtering in ticket list
- [ ] Verify center access control in ticket detail

### Test Authorization
- [ ] Regular user can create tickets
- [ ] Regular user can only see their own tickets
- [ ] Admin can see all tickets
- [ ] Finance officer can see all tickets
- [ ] User cannot access tickets from other centers

## 10. Performance & Optimization

- [ ] Database queries are optimized with proper indexes
- [ ] Pagination works correctly for large ticket lists
- [ ] Response times are acceptable (< 500ms for creation)
- [ ] No N+1 query problems in ticket list/detail endpoints

## 11. Security Verification

- [ ] SQL injection protection (using Prisma parameterized queries)
- [ ] XSS protection (input sanitization)
- [ ] Rate limiting (if applicable)
- [ ] CORS configuration is correct
- [ ] Sensitive data is not exposed in error messages

## Quick Verification Commands

### Test Ticket Creation (using curl)
```bash
curl -X POST http://localhost:8000/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Center-Id: YOUR_CENTER_ID" \
  -d '{
    "title": "Test Ticket",
    "description": "This is a test ticket",
    "category": "TECHNICAL_ISSUE",
    "priority": "MEDIUM"
  }'
```

### Test Ticket List
```bash
curl -X GET "http://localhost:8000/tickets?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Center-Id: YOUR_CENTER_ID"
```

## Backend Files to Verify

1. **Controller**: `src/ticket/ticket.controller.ts`
   - [ ] POST endpoint exists
   - [ ] GET endpoints exist
   - [ ] Proper guards applied

2. **Service**: `src/ticket/ticket.service.ts`
   - [ ] `createTicket` method implemented
   - [ ] Validation logic present
   - [ ] Event emission working

3. **DTOs**: `src/ticket/dto/create-ticket.dto.ts`
   - [ ] All required fields defined
   - [ ] Validation decorators applied
   - [ ] Optional fields marked correctly

4. **Schema**: `docs/prisma/schema.prisma`
   - [ ] Ticket model defined
   - [ ] Enums defined (TicketCategory, TicketPriority, TicketStatus)
   - [ ] Relationships configured

5. **Module**: `src/ticket/ticket.module.ts`
   - [ ] Module properly configured
   - [ ] Dependencies injected

## Notes

- The backend implementation is already complete based on the codebase review
- The main verification needed is ensuring the API is accessible and working correctly
- All endpoints should be tested with proper authentication tokens
- Center context should be properly handled via `X-Center-Id` header or automatic detection

## Frontend Integration

Once all backend checks pass:
1. Frontend modal will submit to `/api/tickets` (Next.js API route)
2. Next.js API route proxies to backend `POST /tickets`
3. Backend creates ticket and returns response
4. Frontend refreshes ticket list or shows success message

