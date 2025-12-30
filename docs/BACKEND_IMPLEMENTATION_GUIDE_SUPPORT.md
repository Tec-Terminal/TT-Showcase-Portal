# Backend Implementation Guide

## Refund System Implementation

### Database Schema

#### Refunds Table
```sql
CREATE TABLE refunds (
  id VARCHAR(255) PRIMARY KEY,
  payment_id VARCHAR(255) NOT NULL,
  student_id VARCHAR(255) NOT NULL,
  requested_by VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  reason ENUM(
    'student_withdrawal',
    'course_cancellation',
    'payment_error',
    'duplicate_payment',
    'service_issue',
    'other'
  ) NOT NULL,
  reason_description TEXT,
  status ENUM(
    'pending',
    'approved',
    'rejected',
    'processed',
    'cancelled'
  ) DEFAULT 'pending',
  approved_by VARCHAR(255),
  approved_at DATETIME,
  processed_at DATETIME,
  rejection_reason TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (payment_id) REFERENCES payments(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (requested_by) REFERENCES users(id),
  FOREIGN KEY (approved_by) REFERENCES users(id),
  
  INDEX idx_payment_id (payment_id),
  INDEX idx_student_id (student_id),
  INDEX idx_status (status),
  INDEX idx_requested_by (requested_by)
);
```

### API Endpoints

#### 1. Create Refund Request
```
POST /refunds
Authorization: Bearer {token}
X-Center-Id: {centerId} (optional)

Request Body:
{
  "paymentId": "string",
  "amount": number,
  "reason": "student_withdrawal" | "course_cancellation" | "payment_error" | "duplicate_payment" | "service_issue" | "other",
  "reasonDescription": "string" (required if reason is "other"),
  "notes": "string" (optional)
}

Response:
{
  "id": "string",
  "paymentId": "string",
  "studentId": "string",
  "requestedBy": "string",
  "amount": number,
  "reason": "string",
  "status": "pending",
  "createdAt": "ISO date string",
  ...
}
```

#### 2. Get All Refunds
```
GET /refunds
Authorization: Bearer {token}
X-Center-Id: {centerId} (optional)

Query Parameters:
- status: filter by status (optional)
- studentId: filter by student (optional)
- paymentId: filter by payment (optional)
- page: page number (optional)
- limit: items per page (optional)

Response:
{
  "data": RefundRequest[],
  "total": number,
  "page": number,
  "limit": number
}
```

#### 3. Get Single Refund
```
GET /refunds/:id
Authorization: Bearer {token}

Response: RefundRequest
```

#### 4. Approve Refund (CEO only)
```
PATCH /refunds/:id/approve
Authorization: Bearer {token}
Role Required: CEO

Request Body:
{
  "notes": "string" (optional)
}

Response: Updated RefundRequest
```

#### 5. Reject Refund (CEO only)
```
PATCH /refunds/:id/reject
Authorization: Bearer {token}
Role Required: CEO

Request Body:
{
  "rejectionReason": "string" (required)
}

Response: Updated RefundRequest
```

#### 6. Process Refund (After Approval)
```
PATCH /refunds/:id/process
Authorization: Bearer {token}
Role Required: CEO or Finance Officer

Response: Updated RefundRequest with processedAt timestamp
```

### Business Logic

1. **Create Refund Request:**
   - Validate payment exists and belongs to the student
   - Validate refund amount doesn't exceed payment amount
   - Check if payment has already been refunded
   - Set status to "pending"
   - Send notification to CEO

2. **Approve Refund:**
   - Verify user has CEO role
   - Update status to "approved"
   - Set approvedBy and approvedAt
   - Send notification to requester and finance team

3. **Reject Refund:**
   - Verify user has CEO role
   - Update status to "rejected"
   - Set rejectionReason
   - Send notification to requester

4. **Process Refund:**
   - Verify refund is approved
   - Create refund transaction record
   - Update payment balance
   - Update student payment plan
   - Set status to "processed"
   - Set processedAt timestamp
   - Send notification to student

### Middleware/Authorization

```javascript
// Example middleware for CEO-only routes
const requireCEO = (req, res, next) => {
  if (req.user.role !== 'ceo') {
    return res.status(403).json({ error: 'Only CEO can perform this action' });
  }
  next();
};
```

---

## Support Ticket System Implementation

### Database Schema

#### Tickets Table
```sql
CREATE TABLE tickets (
  id VARCHAR(255) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category ENUM(
    'payment_issue',
    'enrollment_issue',
    'technical_issue',
    'refund_request',
    'account_issue',
    'other'
  ) NOT NULL,
  priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  status ENUM(
    'open',
    'in_progress',
    'resolved',
    'closed',
    'cancelled'
  ) DEFAULT 'open',
  created_by VARCHAR(255) NOT NULL,
  assigned_to VARCHAR(255),
  payment_id VARCHAR(255),
  student_id VARCHAR(255),
  resolution TEXT,
  resolved_at DATETIME,
  resolved_by VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (payment_id) REFERENCES payments(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (resolved_by) REFERENCES users(id),
  
  INDEX idx_status (status),
  INDEX idx_category (category),
  INDEX idx_priority (priority),
  INDEX idx_created_by (created_by),
  INDEX idx_assigned_to (assigned_to)
);
```

#### Ticket Comments Table
```sql
CREATE TABLE ticket_comments (
  id VARCHAR(255) PRIMARY KEY,
  ticket_id VARCHAR(255) NOT NULL,
  comment TEXT NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  attachments JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  
  INDEX idx_ticket_id (ticket_id)
);
```

#### Ticket Attachments Table (if storing files separately)
```sql
CREATE TABLE ticket_attachments (
  id VARCHAR(255) PRIMARY KEY,
  ticket_id VARCHAR(255),
  comment_id VARCHAR(255),
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INT,
  file_type VARCHAR(100),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES ticket_comments(id) ON DELETE CASCADE
);
```

### API Endpoints

#### 1. Create Ticket
```
POST /tickets
Authorization: Bearer {token}
X-Center-Id: {centerId} (optional)

Request Body:
{
  "title": "string",
  "description": "string",
  "category": "payment_issue" | "enrollment_issue" | "technical_issue" | "refund_request" | "account_issue" | "other",
  "priority": "low" | "medium" | "high" | "urgent",
  "paymentId": "string" (optional),
  "studentId": "string" (optional),
  "attachments": ["string"] (optional - file URLs)
}

Response: Ticket
```

#### 2. Get All Tickets
```
GET /tickets
Authorization: Bearer {token}
X-Center-Id: {centerId} (optional)

Query Parameters:
- status: filter by status
- category: filter by category
- priority: filter by priority
- assignedTo: filter by assigned user
- createdBy: filter by creator
- page: page number
- limit: items per page

Response:
{
  "data": Ticket[],
  "total": number,
  "page": number,
  "limit": number
}
```

#### 3. Get Single Ticket
```
GET /tickets/:id
Authorization: Bearer {token}

Response: Ticket with comments
```

#### 4. Update Ticket
```
PATCH /tickets/:id
Authorization: Bearer {token}

Request Body:
{
  "status": "open" | "in_progress" | "resolved" | "closed" | "cancelled",
  "assignedTo": "string" (optional),
  "priority": "low" | "medium" | "high" | "urgent",
  "resolution": "string" (optional)
}

Response: Updated Ticket
```

#### 5. Add Comment to Ticket
```
POST /tickets/:id/comments
Authorization: Bearer {token}

Request Body:
{
  "comment": "string",
  "attachments": ["string"] (optional)
}

Response: TicketComment
```

#### 6. Get Ticket Comments
```
GET /tickets/:id/comments
Authorization: Bearer {token}

Response: TicketComment[]
```

### Business Logic

1. **Create Ticket:**
   - Auto-assign based on category (optional)
   - Set initial status to "open"
   - Send notification to support team
   - Link to payment/student if provided

2. **Update Ticket:**
   - Allow status transitions based on current status
   - If resolved, set resolvedBy and resolvedAt
   - Send notifications on status changes
   - Auto-assign based on category if not assigned

3. **Add Comment:**
   - Update ticket's updatedAt timestamp
   - Send notification to ticket creator and assignee
   - If commenter is not creator/assignee, notify them

4. **Ticket Assignment:**
   - Support staff can assign tickets to themselves or others
   - Managers can assign tickets to any team member
   - Auto-assignment based on workload and expertise

### Notification System

Send notifications for:
- New refund request (to CEO)
- Refund approval/rejection (to requester)
- Refund processed (to student)
- New ticket created (to support team)
- Ticket assigned (to assignee)
- Ticket status changed (to creator and assignee)
- New comment added (to relevant parties)

### File Upload

For ticket attachments:
1. Accept file uploads (images, PDFs, documents)
2. Store in cloud storage (AWS S3, Cloudinary, etc.)
3. Return file URLs
4. Store URLs in database
5. Implement file size and type validation

---

## Implementation Checklist

### Refunds
- [ ] Create refunds table
- [ ] Create refund request endpoint
- [ ] Create get refunds endpoint
- [ ] Create approve refund endpoint (CEO only)
- [ ] Create reject refund endpoint (CEO only)
- [ ] Create process refund endpoint
- [ ] Implement authorization middleware
- [ ] Add validation logic
- [ ] Implement notification system
- [ ] Add payment balance update logic
- [ ] Create refund transaction records

### Support Tickets
- [ ] Create tickets table
- [ ] Create ticket_comments table
- [ ] Create ticket_attachments table (if needed)
- [ ] Create ticket endpoints (CRUD)
- [ ] Create comment endpoints
- [ ] Implement ticket assignment logic
- [ ] Add file upload functionality
- [ ] Implement notification system
- [ ] Add ticket status workflow
- [ ] Create ticket dashboard/analytics

### General
- [ ] Add proper error handling
- [ ] Implement logging
- [ ] Add input validation
- [ ] Set up rate limiting
- [ ] Add API documentation
- [ ] Write unit tests
- [ ] Write integration tests

---

## Example Controller Code (Node.js/Express)

### Refund Controller
```javascript
const createRefundRequest = async (req, res) => {
  try {
    const { paymentId, amount, reason, reasonDescription, notes } = req.body;
    const userId = req.user.id;

    // Validate payment
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Validate amount
    if (amount > payment.amount) {
      return res.status(400).json({ error: 'Refund amount exceeds payment amount' });
    }

    // Check for existing refunds
    const existingRefund = await Refund.findOne({
      paymentId,
      status: { $in: ['pending', 'approved'] }
    });

    if (existingRefund) {
      return res.status(400).json({ error: 'Refund request already exists for this payment' });
    }

    // Create refund request
    const refund = await Refund.create({
      paymentId,
      studentId: payment.studentId,
      requestedBy: userId,
      amount,
      reason,
      reasonDescription: reason === 'other' ? reasonDescription : null,
      notes,
      status: 'pending'
    });

    // Send notification to CEO
    await sendNotification({
      userId: await getCEOUserId(),
      type: 'refund_request',
      message: `New refund request for ₦${amount.toLocaleString()}`,
      data: { refundId: refund.id }
    });

    res.status(201).json(refund);
  } catch (error) {
    console.error('Error creating refund request:', error);
    res.status(500).json({ error: 'Failed to create refund request' });
  }
};

const approveRefund = async (req, res) => {
  try {
    if (req.user.role !== 'ceo') {
      return res.status(403).json({ error: 'Only CEO can approve refunds' });
    }

    const { id } = req.params;
    const { notes } = req.body;

    const refund = await Refund.findById(id);
    if (!refund) {
      return res.status(404).json({ error: 'Refund not found' });
    }

    if (refund.status !== 'pending') {
      return res.status(400).json({ error: 'Refund is not pending approval' });
    }

    refund.status = 'approved';
    refund.approvedBy = req.user.id;
    refund.approvedAt = new Date();
    if (notes) refund.notes = notes;
    await refund.save();

    // Send notifications
    await sendNotification({
      userId: refund.requestedBy,
      type: 'refund_approved',
      message: `Your refund request of ₦${refund.amount.toLocaleString()} has been approved`,
      data: { refundId: refund.id }
    });

    res.json(refund);
  } catch (error) {
    console.error('Error approving refund:', error);
    res.status(500).json({ error: 'Failed to approve refund' });
  }
};
```

### Ticket Controller
```javascript
const createTicket = async (req, res) => {
  try {
    const { title, description, category, priority, paymentId, studentId, attachments } = req.body;
    const userId = req.user.id;

    const ticket = await Ticket.create({
      title,
      description,
      category,
      priority: priority || 'medium',
      status: 'open',
      createdBy: userId,
      paymentId,
      studentId,
      attachments
    });

    // Auto-assign based on category (optional)
    const assignee = await getAutoAssignee(category);
    if (assignee) {
      ticket.assignedTo = assignee.id;
      await ticket.save();
    }

    // Send notification to support team
    await sendNotificationToSupportTeam({
      type: 'new_ticket',
      message: `New ${category} ticket: ${title}`,
      data: { ticketId: ticket.id }
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
};
```

---

## Security Considerations

1. **Authorization:**
   - Verify user roles for sensitive operations
   - Check user permissions for center-specific data
   - Validate user ownership of resources

2. **Input Validation:**
   - Validate all input data
   - Sanitize user inputs
   - Check data types and ranges

3. **Rate Limiting:**
   - Limit API requests per user
   - Prevent abuse of refund/ticket creation

4. **Data Privacy:**
   - Only return data user has access to
   - Filter sensitive information
   - Log access to sensitive data

---

## Testing

### Unit Tests
- Test refund creation logic
- Test approval/rejection workflows
- Test ticket creation and assignment
- Test status transitions

### Integration Tests
- Test complete refund flow
- Test ticket lifecycle
- Test notification system
- Test authorization checks

### E2E Tests
- Test user can create refund request
- Test CEO can approve/reject
- Test refund processing
- Test ticket creation and resolution

