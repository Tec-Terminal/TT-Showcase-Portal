# Student Approval Workflow - Backend Implementation Guide

## Overview

This guide implements an approval workflow for student enrollments and payments. When a student is enrolled or a payment is recorded, their status is set to `PENDING_APPROVAL`. Finance officers receive notifications for new enrollments. After approval, the student status is changed to `ACTIVE`, and center managers are notified when payments are approved.

## Workflow Summary

1. **Student Enrollment:**
   - Student status → `PENDING_APPROVAL`
   - Send notification to finance officers
   - Finance officer approves → Status → `ACTIVE`

2. **Payment Creation:**
   - Student status → `PENDING_APPROVAL`
   - Finance officer approves payment → Status → `ACTIVE`
   - Send notification to center manager

## Database Schema Updates

### 1. Update Student Model

Add `PENDING_APPROVAL` to the student status enum:

```sql
-- Update students table status column to include PENDING_APPROVAL
ALTER TABLE students 
MODIFY COLUMN status ENUM(
  'ACTIVE',
  'PENDING_APPROVAL',
  'DROPOUT',
  'GRADUATED',
  'ON_HOLD'
) DEFAULT 'PENDING_APPROVAL';
```

### 2. Payment Approval Tracking (Optional)

If you want to track payment approvals separately:

```sql
-- Add approval fields to payments table (if not exists)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS approved_at DATETIME,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD INDEX idx_payment_status (status),
ADD INDEX idx_approved_by (approved_by);

-- Foreign key for approved_by
ALTER TABLE payments
ADD CONSTRAINT fk_payment_approved_by 
FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;
```

## API Endpoints

### 1. Create Student (Update Existing)

**Endpoint:** `POST /students`

**Current Behavior:** Creates a student with the provided status.

**Updated Behavior:**
- Always set `status` to `PENDING_APPROVAL` for new enrollments
- Send notification to finance officers
- Return created student with `PENDING_APPROVAL` status

**Request Payload:**
```json
{
  "leadId": "lead_123",
  "fullName": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "address": "123 Main St",
  "status": "PENDING_APPROVAL",  // Will be set automatically
  "centerId": "center_123",
  "enrolledDate": "2025-01-15",
  "birthDate": "2000-01-01",
  "guardianName": "Jane Doe",
  "guardianPhone": "+1234567891",
  "guardianEmail": "jane@example.com",
  "guardianAddress": "123 Main St",
  "courseFee": "50000",
  "amount": "10000",
  "lumpSumFee": "50000",
  "numberOfInstallments": "5",
  "paymentPlan": "installment",
  "paymentType": "monthly",
  "paymentMethod": "bank-transfer",
  "notes": "New enrollment",
  "courseId": "course_123",
  "bankId": "bank_123",
  "batchId": "batch_123"
}
```

**Response:**
```json
{
  "id": "student_123",
  "fullName": "John Doe",
  "status": "PENDING_APPROVAL",
  "centerId": "center_123",
  "courseId": "course_123",
  "createdAt": "2025-01-15T10:00:00Z",
  // ... other student fields
}
```

**Implementation:**

```typescript
// student.service.ts
async createStudent(createStudentDto: CreateStudentDto, userId: string): Promise<Student> {
  // Force status to PENDING_APPROVAL for new enrollments
  const studentData = {
    ...createStudentDto,
    status: 'PENDING_APPROVAL',
  };

  const student = await this.studentRepository.save({
    ...studentData,
    createdBy: userId,
  });

  // Send notification to finance officers
  await this.notifyFinanceOfficersForEnrollment(student);

  return student;
}

private async notifyFinanceOfficersForEnrollment(student: Student): Promise<void> {
  // Get all finance officers
  const financeOfficers = await this.userRepository.find({
    where: { role: 'financeOfficer' },
  });

  // Get center and course details
  const center = await this.centerRepository.findOne({ where: { id: student.centerId } });
  const course = await this.courseRepository.findOne({ where: { id: student.courseId } });

  // Send notification to each finance officer
  for (const officer of financeOfficers) {
    await this.notificationService.create({
      userId: officer.id,
      type: 'student_enrollment_pending',
      title: 'New Student Enrollment Pending Approval',
      message: `${student.fullName} has been enrolled in ${course?.name || 'a course'} at ${center?.name || 'a center'}. Please review and approve.`,
      link: `/dashboard/academic/students/${student.id}`,
      metadata: {
        studentId: student.id,
        studentName: student.fullName,
        centerId: student.centerId,
        centerName: center?.name,
        courseId: student.courseId,
        courseName: course?.name,
      },
    });
  }
}
```

### 2. Create Payment (Update Existing)

**Endpoint:** `POST /students/enroll/course` or `POST /students/add/payment`

**Current Behavior:** Creates a payment record.

**Updated Behavior:**
- Set associated student status to `PENDING_APPROVAL`
- Send notification to finance officers
- Return payment with student status updated

**Request Payload:**
```json
{
  "studentId": "student_123",
  "courseId": "course_123",
  "bankId": "bank_123",
  "amount": 10000,
  "courseFee": 50000,
  "numberOfInstallments": 5,
  "paymentPlan": "installment",
  "paymentType": "monthly",
  "paymentMethod": "bank-transfer"
}
```

**Response:**
```json
{
  "id": "payment_123",
  "studentId": "student_123",
  "amount": 10000,
  "student": {
    "id": "student_123",
    "status": "PENDING_APPROVAL",
    // ... other student fields
  },
  "createdAt": "2025-01-15T10:00:00Z"
}
```

**Implementation:**

```typescript
// student.service.ts or payment.service.ts
async createPayment(createPaymentDto: CreateStudentPaymentDto, userId: string): Promise<Payment> {
  // Create payment
  const payment = await this.paymentRepository.save({
    ...createPaymentDto,
    userId,
    status: 'pending', // Payment status
  });

  // Update student status to PENDING_APPROVAL
  await this.studentRepository.update(createPaymentDto.studentId, {
    status: 'PENDING_APPROVAL',
  });

  // Get student, center, and course details
  const student = await this.studentRepository.findOne({
    where: { id: createPaymentDto.studentId },
    relations: ['center', 'course'],
  });

  // Send notification to finance officers
  await this.notifyFinanceOfficersForPayment(payment, student);

  return payment;
}

private async notifyFinanceOfficersForPayment(payment: Payment, student: Student): Promise<void> {
  const financeOfficers = await this.userRepository.find({
    where: { role: 'financeOfficer' },
  });

  for (const officer of financeOfficers) {
    await this.notificationService.create({
      userId: officer.id,
      type: 'payment_pending_approval',
      title: 'New Payment Pending Approval',
      message: `A payment of ₦${payment.amount.toLocaleString()} has been recorded for ${student.fullName}. Please review and approve.`,
      link: `/dashboard/finance/payments/${payment.id}`,
      metadata: {
        paymentId: payment.id,
        studentId: student.id,
        studentName: student.fullName,
        amount: payment.amount,
        centerId: student.centerId,
      },
    });
  }
}
```

### 3. Approve Student Enrollment

**Endpoint:** `PATCH /students/:id/approve`

**Description:** Approves a student enrollment, changing status from `PENDING_APPROVAL` to `ACTIVE`.

**Authorization:** Finance Officer or higher

**Request:**
```json
{
  "notes": "Approved after verification" // Optional
}
```

**Response:**
```json
{
  "id": "student_123",
  "status": "ACTIVE",
  "approvedBy": "user_finance_001",
  "approvedAt": "2025-01-15T11:00:00Z",
  // ... other student fields
}
```

**Implementation:**

```typescript
// student.service.ts
async approveStudentEnrollment(
  studentId: string,
  userId: string,
  notes?: string,
): Promise<Student> {
  const student = await this.studentRepository.findOne({
    where: { id: studentId },
  });

  if (!student) {
    throw new NotFoundException('Student not found');
  }

  if (student.status !== 'PENDING_APPROVAL') {
    throw new BadRequestException('Student is not pending approval');
  }

  // Update student status
  await this.studentRepository.update(studentId, {
    status: 'ACTIVE',
    approvedBy: userId,
    approvedAt: new Date(),
  });

  const updatedStudent = await this.studentRepository.findOne({
    where: { id: studentId },
  });

  // Send notification to student (optional)
  await this.notificationService.create({
    userId: student.userId, // If student has a user account
    type: 'enrollment_approved',
    title: 'Enrollment Approved',
    message: 'Your enrollment has been approved. Welcome!',
    link: `/dashboard/student/profile`,
  });

  return updatedStudent;
}
```

### 4. Approve Payment

**Endpoint:** `PATCH /payments/:id/approve`

**Description:** Approves a payment, changing associated student status from `PENDING_APPROVAL` to `ACTIVE` and notifies center manager.

**Authorization:** Finance Officer or higher

**Request:**
```json
{
  "notes": "Payment verified and approved" // Optional
}
```

**Response:**
```json
{
  "id": "payment_123",
  "status": "approved",
  "approvedBy": "user_finance_001",
  "approvedAt": "2025-01-15T11:00:00Z",
  "student": {
    "id": "student_123",
    "status": "ACTIVE",
    // ... other student fields
  }
}
```

**Implementation:**

```typescript
// payment.service.ts
async approvePayment(
  paymentId: string,
  userId: string,
  notes?: string,
): Promise<Payment> {
  const payment = await this.paymentRepository.findOne({
    where: { id: paymentId },
    relations: ['student', 'student.center'],
  });

  if (!payment) {
    throw new NotFoundException('Payment not found');
  }

  if (payment.status === 'approved') {
    throw new BadRequestException('Payment is already approved');
  }

  // Update payment status
  await this.paymentRepository.update(paymentId, {
    status: 'approved',
    approvedBy: userId,
    approvedAt: new Date(),
  });

  // Update student status to ACTIVE
  await this.studentRepository.update(payment.student.id, {
    status: 'ACTIVE',
  });

  const updatedPayment = await this.paymentRepository.findOne({
    where: { id: paymentId },
    relations: ['student', 'student.center'],
  });

  // Send notification to center manager
  await this.notifyCenterManagerForPaymentApproval(updatedPayment);

  return updatedPayment;
}

private async notifyCenterManagerForPaymentApproval(payment: Payment): Promise<void> {
  const student = payment.student;
  const center = student.center;

  if (!center) {
    return;
  }

  // Get center manager
  const centerManager = await this.userRepository.findOne({
    where: {
      role: 'centerManager',
      centerId: center.id,
    },
  });

  if (centerManager) {
    await this.notificationService.create({
      userId: centerManager.id,
      type: 'payment_approved',
      title: 'Payment Approved',
      message: `A payment of ₦${payment.amount.toLocaleString()} for ${student.fullName} has been approved.`,
      link: `/dashboard/finance/payments/${payment.id}`,
      metadata: {
        paymentId: payment.id,
        studentId: student.id,
        studentName: student.fullName,
        amount: payment.amount,
        centerId: center.id,
      },
    });
  }
}
```

### 5. Reject Student/Payment (Optional)

**Endpoint:** `PATCH /students/:id/reject` or `PATCH /payments/:id/reject`

**Description:** Rejects a student enrollment or payment, keeping status as `PENDING_APPROVAL` or setting to a rejected state.

**Request:**
```json
{
  "reason": "Incomplete documentation"
}
```

## DTOs

### ApproveStudentDto

```typescript
// dto/approve-student.dto.ts
export class ApproveStudentDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
```

### ApprovePaymentDto

```typescript
// dto/approve-payment.dto.ts
export class ApprovePaymentDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
```

## Notification Types

Add these notification types to your notification system:

```typescript
// notification.types.ts
export enum NotificationType {
  // ... existing types
  STUDENT_ENROLLMENT_PENDING = 'student_enrollment_pending',
  PAYMENT_PENDING_APPROVAL = 'payment_pending_approval',
  ENROLLMENT_APPROVED = 'enrollment_approved',
  PAYMENT_APPROVED = 'payment_approved',
}
```

## Migration Script

```sql
-- Migration: Add PENDING_APPROVAL status and approval tracking

-- 1. Update student status enum
ALTER TABLE students 
MODIFY COLUMN status ENUM(
  'ACTIVE',
  'PENDING_APPROVAL',
  'DROPOUT',
  'GRADUATED',
  'ON_HOLD'
) DEFAULT 'PENDING_APPROVAL';

-- 2. Add approval tracking to students (optional)
ALTER TABLE students
ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS approved_at DATETIME,
ADD INDEX idx_student_approved_by (approved_by);

-- 3. Add approval tracking to payments
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS approved_at DATETIME,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD INDEX idx_payment_status (status),
ADD INDEX idx_approved_by (approved_by);

-- 4. Set existing students with null status to PENDING_APPROVAL
UPDATE students 
SET status = 'PENDING_APPROVAL' 
WHERE status IS NULL OR status = '';

-- 5. Set existing payments to approved (if they were already processed)
UPDATE payments 
SET status = 'approved' 
WHERE status IS NULL OR status = '';
```

## Testing Checklist

### Student Enrollment
- [ ] New student enrollment sets status to `PENDING_APPROVAL`
- [ ] Finance officers receive notification on enrollment
- [ ] Approval endpoint changes status to `ACTIVE`
- [ ] Only finance officers can approve enrollments
- [ ] Non-pending students cannot be approved

### Payment Creation
- [ ] New payment sets student status to `PENDING_APPROVAL`
- [ ] Finance officers receive notification on payment
- [ ] Payment approval changes student status to `ACTIVE`
- [ ] Center manager receives notification after payment approval
- [ ] Only finance officers can approve payments

### Edge Cases
- [ ] Multiple payments for same student
- [ ] Student with multiple courses
- [ ] Finance officer approval workflow
- [ ] Notification delivery verification
- [ ] Status transitions are logged

## Frontend Integration Notes

The frontend has been updated to:
1. Automatically set status to `PENDING_APPROVAL` on enrollment
2. Hide status field in enrollment modal
3. Display `PENDING_APPROVAL` in status dropdowns

Backend should:
1. Always enforce `PENDING_APPROVAL` on new enrollments (ignore frontend status)
2. Handle payment creation status updates
3. Provide approval endpoints
4. Send notifications as described

## Security Considerations

1. **Authorization:**
   - Only finance officers and above can approve enrollments/payments
   - Use role-based access control (RBAC)

2. **Audit Trail:**
   - Log all status changes
   - Track who approved what and when
   - Store approval notes

3. **Validation:**
   - Verify student exists before approval
   - Check current status before allowing approval
   - Validate payment amounts and details

## Notification Templates

### Enrollment Pending
```
Title: New Student Enrollment Pending Approval
Message: {studentName} has been enrolled in {courseName} at {centerName}. Please review and approve.
Link: /dashboard/academic/students/{studentId}
```

### Payment Pending
```
Title: New Payment Pending Approval
Message: A payment of ₦{amount} has been recorded for {studentName}. Please review and approve.
Link: /dashboard/finance/payments/{paymentId}
```

### Payment Approved (Center Manager)
```
Title: Payment Approved
Message: A payment of ₦{amount} for {studentName} has been approved.
Link: /dashboard/finance/payments/{paymentId}
```

## Summary

This implementation provides:
1. ✅ Automatic `PENDING_APPROVAL` status on enrollment
2. ✅ Automatic `PENDING_APPROVAL` status on payment creation
3. ✅ Finance officer notifications for enrollments
4. ✅ Finance officer notifications for payments
5. ✅ Approval endpoints to change status to `ACTIVE`
6. ✅ Center manager notifications after payment approval
7. ✅ Proper authorization and audit trails

