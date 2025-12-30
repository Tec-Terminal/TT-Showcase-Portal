# Backend Implementation Guide: Discount System

## Overview

This guide provides a complete implementation plan for the discount system on the backend, including approval workflows, automatic payment plan updates, and discount tagging.

---

## 1. Database Schema

### DiscountRequest Table

```prisma
model DiscountRequest {
  id                String   @id @default(cuid())
  studentId         String
  student           Student  @relation(fields: [studentId], references: [id])
  courseId          String
  course            Course   @relation(fields: [courseId], references: [id])
  paymentPlanId     String?
  paymentPlan       PaymentPlan? @relation(fields: [paymentPlanId], references: [id])
  
  // Discount Details
  discountType      DiscountType // PERCENTAGE or FIXED_AMOUNT
  discountValue     Float    // Percentage (0-100) or fixed amount in NGN
  originalAmount    Float    // Original course fee before discount
  discountedAmount  Float    // Amount after discount is applied
  
  // Request Details
  reason            String   // Required reason for discount
  notes             String?   // Optional additional notes
  
  // Approval Workflow
  status            DiscountStatus @default(PENDING)
  requestedBy       String   // User ID who created the request
  requestedByName   String?  // User full name (for display)
  requestedAt       DateTime @default(now())
  
  approvedBy        String?  // CEO User ID
  approvedByName    String? // CEO full name
  approvedAt        DateTime?
  
  rejectedBy        String?  // User ID who rejected
  rejectedByName    String? // User full name
  rejectedAt        DateTime?
  rejectionReason   String? // Required if rejected
  
  appliedAt         DateTime? // When discount was actually applied to payment plan
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([studentId])
  @@index([courseId])
  @@index([paymentPlanId])
  @@index([status])
  @@index([requestedBy])
}

enum DiscountType {
  PERCENTAGE
  FIXED_AMOUNT
}

enum DiscountStatus {
  PENDING
  APPROVED
  REJECTED
  APPLIED
  CANCELLED
}
```

### PaymentPlan Table Updates

```prisma
model PaymentPlan {
  id                String   @id @default(cuid())
  userId            String
  name              String
  amount            Float    // This should be updated when discount is applied
  paid              Float    @default(0)
  pending           Float    // This should be recalculated when discount is applied
  courseId          String
  course            Course   @relation(fields: [courseId], references: [id])
  
  // Discount Tracking
  hasDiscount       Boolean  @default(false) // Flag to indicate if discount is applied
  discountTag       String?  // "DISCOUNTED" or null
  originalAmount    Float?   // Store original amount before discount for reference
  
  // ... other existing fields
  
  discountRequests  DiscountRequest[] // Relation to discount requests
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

---

## 2. API Endpoints

### 2.1 Create Discount Request

**Endpoint:** `POST /discounts`

**Request Body:**
```typescript
{
  studentId: string;
  courseId: string;
  paymentPlanId?: string;
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  originalAmount: number;
  discountedAmount: number;
  reason: string;
  notes?: string;
}
```

**Implementation Steps:**

```typescript
@Post()
@UseGuards(JwtAuthGuard)
async createDiscountRequest(
  @Body() createDiscountDto: CreateDiscountRequestDto,
  @Request() req
) {
  // 1. Validate input
  await this.validateDiscountRequest(createDiscountDto);

  // 2. Get current user
  const user = req.user;
  
  // 3. Verify student and course exist
  const student = await this.studentsService.findOne(createDiscountDto.studentId);
  const course = await this.coursesService.findOne(createDiscountDto.courseId);
  
  // 4. Get or find payment plan
  let paymentPlan = null;
  if (createDiscountDto.paymentPlanId) {
    paymentPlan = await this.paymentPlansService.findOne(createDiscountDto.paymentPlanId);
  } else {
    // Find payment plan by student and course
    paymentPlan = await this.paymentPlansService.findByStudentAndCourse(
      createDiscountDto.studentId,
      createDiscountDto.courseId
    );
  }

  // 5. Verify originalAmount matches payment plan amount
  if (paymentPlan && Math.abs(paymentPlan.amount - createDiscountDto.originalAmount) > 0.01) {
    throw new BadRequestException('Original amount does not match payment plan amount');
  }

  // 6. Verify discounted amount calculation
  const calculatedDiscounted = this.calculateDiscountedAmount(
    createDiscountDto.originalAmount,
    createDiscountDto.discountType,
    createDiscountDto.discountValue
  );
  
  if (Math.abs(calculatedDiscounted - createDiscountDto.discountedAmount) > 0.01) {
    throw new BadRequestException('Discounted amount calculation is incorrect');
  }

  // 7. Create discount request
  const discountRequest = await this.discountsService.create({
    ...createDiscountDto,
    requestedBy: user.id,
    requestedByName: `${user.firstname} ${user.lastname}`,
    status: DiscountStatus.PENDING,
    paymentPlanId: paymentPlan?.id,
  });

  return discountRequest;
}

private calculateDiscountedAmount(
  originalAmount: number,
  discountType: DiscountType,
  discountValue: number
): number {
  if (discountType === DiscountType.PERCENTAGE) {
    return originalAmount * (1 - discountValue / 100);
  } else {
    return Math.max(0, originalAmount - discountValue);
  }
}
```

### 2.2 Get All Discount Requests

**Endpoint:** `GET /discounts`

**Query Parameters:**
- `status?: DiscountStatus` - Filter by status
- `studentId?: string` - Filter by student
- `courseId?: string` - Filter by course

**Implementation:**

```typescript
@Get()
@UseGuards(JwtAuthGuard)
async getAllDiscounts(
  @Query('status') status?: DiscountStatus,
  @Query('studentId') studentId?: string,
  @Query('courseId') courseId?: string,
) {
  return this.discountsService.findAll({
    status,
    studentId,
    courseId,
  });
}
```

### 2.3 Get Single Discount Request

**Endpoint:** `GET /discounts/:id`

**Implementation:**

```typescript
@Get(':id')
@UseGuards(JwtAuthGuard)
async getDiscountRequest(@Param('id') id: string) {
  return this.discountsService.findOne(id);
}
```

### 2.4 Approve Discount Request (CEO Only)

**Endpoint:** `PATCH /discounts/:id/approve`

**Request Body:**
```typescript
{
  notes?: string;
}
```

**Implementation:**

```typescript
@Patch(':id/approve')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CEO')
async approveDiscount(
  @Param('id') id: string,
  @Body() approveDto: ApproveDiscountRequestDto,
  @Request() req
) {
  const user = req.user;
  
  // 1. Get discount request
  const discountRequest = await this.discountsService.findOne(id);
  
  if (discountRequest.status !== DiscountStatus.PENDING) {
    throw new BadRequestException('Only pending discount requests can be approved');
  }

  // 2. Update discount request status
  await this.discountsService.update(id, {
    status: DiscountStatus.APPROVED,
    approvedBy: user.id,
    approvedByName: `${user.firstname} ${user.lastname}`,
    approvedAt: new Date(),
    notes: approveDto.notes || discountRequest.notes,
  });

  // 3. Apply discount to payment plan
  await this.applyDiscountToPaymentPlan(discountRequest);

  // 4. Update discount request to APPLIED status
  await this.discountsService.update(id, {
    status: DiscountStatus.APPLIED,
    appliedAt: new Date(),
  });

  // 5. Return updated discount request
  return this.discountsService.findOne(id);
}

private async applyDiscountToPaymentPlan(discountRequest: DiscountRequest) {
  if (!discountRequest.paymentPlanId) {
    // Find payment plan if not provided
    const paymentPlan = await this.paymentPlansService.findByStudentAndCourse(
      discountRequest.studentId,
      discountRequest.courseId
    );
    
    if (!paymentPlan) {
      throw new NotFoundException('Payment plan not found for this student and course');
    }
    
    discountRequest.paymentPlanId = paymentPlan.id;
  }

  const paymentPlan = await this.paymentPlansService.findOne(discountRequest.paymentPlanId);

  // Calculate new pending amount
  // pending = (discountedAmount - paid)
  const newPending = Math.max(0, discountRequest.discountedAmount - paymentPlan.paid);

  // Update payment plan
  await this.paymentPlansService.update(discountRequest.paymentPlanId, {
    // Store original amount if not already stored
    originalAmount: paymentPlan.originalAmount || paymentPlan.amount,
    
    // Update amount to discounted amount
    amount: discountRequest.discountedAmount,
    
    // Recalculate pending
    pending: newPending,
    
    // Tag as discounted
    hasDiscount: true,
    discountTag: 'DISCOUNTED',
    
    // Recalculate perInstallment if needed
    perInstallment: paymentPlan.installments > 0 
      ? discountRequest.discountedAmount / paymentPlan.installments 
      : paymentPlan.perInstallment,
    
    // Recalculate estimate
    estimate: newPending,
  });

  // Log the discount application
  await this.logDiscountApplication(discountRequest, paymentPlan);
}
```

### 2.5 Reject Discount Request (CEO Only)

**Endpoint:** `PATCH /discounts/:id/reject`

**Request Body:**
```typescript
{
  rejectionReason: string; // Required
}
```

**Implementation:**

```typescript
@Patch(':id/reject')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CEO')
async rejectDiscount(
  @Param('id') id: string,
  @Body() rejectDto: RejectDiscountRequestDto,
  @Request() req
) {
  const user = req.user;
  
  // 1. Get discount request
  const discountRequest = await this.discountsService.findOne(id);
  
  if (discountRequest.status !== DiscountStatus.PENDING) {
    throw new BadRequestException('Only pending discount requests can be rejected');
  }

  // 2. Update discount request status
  await this.discountsService.update(id, {
    status: DiscountStatus.REJECTED,
    rejectedBy: user.id,
    rejectedByName: `${user.firstname} ${user.lastname}`,
    rejectedAt: new Date(),
    rejectionReason: rejectDto.rejectionReason,
  });

  return this.discountsService.findOne(id);
}
```

---

## 3. Service Layer Implementation

### 3.1 Discounts Service

```typescript
@Injectable()
export class DiscountsService {
  constructor(
    @InjectRepository(DiscountRequest)
    private discountRepository: Repository<DiscountRequest>,
    private paymentPlansService: PaymentPlansService,
  ) {}

  async create(createDiscountDto: CreateDiscountRequestDto): Promise<DiscountRequest> {
    const discountRequest = this.discountRepository.create(createDiscountDto);
    return this.discountRepository.save(discountRequest);
  }

  async findAll(filters?: {
    status?: DiscountStatus;
    studentId?: string;
    courseId?: string;
  }): Promise<DiscountRequest[]> {
    const queryBuilder = this.discountRepository
      .createQueryBuilder('discount')
      .leftJoinAndSelect('discount.student', 'student')
      .leftJoinAndSelect('discount.course', 'course')
      .leftJoinAndSelect('discount.paymentPlan', 'paymentPlan');

    if (filters?.status) {
      queryBuilder.andWhere('discount.status = :status', { status: filters.status });
    }

    if (filters?.studentId) {
      queryBuilder.andWhere('discount.studentId = :studentId', { studentId: filters.studentId });
    }

    if (filters?.courseId) {
      queryBuilder.andWhere('discount.courseId = :courseId', { courseId: filters.courseId });
    }

    return queryBuilder
      .orderBy('discount.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string): Promise<DiscountRequest> {
    const discount = await this.discountRepository.findOne({
      where: { id },
      relations: ['student', 'course', 'paymentPlan'],
    });

    if (!discount) {
      throw new NotFoundException(`Discount request with ID ${id} not found`);
    }

    return discount;
  }

  async update(id: string, updateData: Partial<DiscountRequest>): Promise<DiscountRequest> {
    await this.discountRepository.update(id, updateData);
    return this.findOne(id);
  }
}
```

### 3.2 Payment Plans Service Updates

```typescript
@Injectable()
export class PaymentPlansService {
  // ... existing methods

  async findByStudentAndCourse(
    studentId: string,
    courseId: string
  ): Promise<PaymentPlan | null> {
    return this.paymentPlanRepository.findOne({
      where: {
        userId: studentId,
        courseId: courseId,
      },
      relations: ['discountRequests'],
    });
  }

  async update(id: string, updateData: Partial<PaymentPlan>): Promise<PaymentPlan> {
    await this.paymentPlanRepository.update(id, updateData);
    return this.findOne(id);
  }

  // When fetching payment plans, include applied discounts
  async findOne(id: string): Promise<PaymentPlan> {
    const paymentPlan = await this.paymentPlanRepository.findOne({
      where: { id },
      relations: ['course', 'payments', 'discountRequests'],
    });

    if (!paymentPlan) {
      throw new NotFoundException(`Payment plan with ID ${id} not found`);
    }

    // Filter to only include APPLIED discounts
    if (paymentPlan.discountRequests) {
      paymentPlan.discountRequests = paymentPlan.discountRequests.filter(
        (discount) => discount.status === DiscountStatus.APPLIED
      );
    }

    return paymentPlan;
  }

  // When fetching student courses, include discount info
  async findByStudent(studentId: string): Promise<PaymentPlan[]> {
    return this.paymentPlanRepository.find({
      where: { userId: studentId },
      relations: ['course', 'payments', 'discountRequests'],
      order: { createdAt: 'DESC' },
    }).then(plans => {
      // Filter discountRequests to only show APPLIED ones
      return plans.map(plan => ({
        ...plan,
        discountRequests: plan.discountRequests?.filter(
          (discount) => discount.status === DiscountStatus.APPLIED
        ) || [],
      }));
    });
  }
}
```

---

## 4. Validation DTOs

### 4.1 Create Discount Request DTO

```typescript
import { IsString, IsNumber, IsEnum, IsOptional, Min, Max, ValidateIf } from 'class-validator';

export class CreateDiscountRequestDto {
  @IsString()
  studentId: string;

  @IsString()
  courseId: string;

  @IsString()
  @IsOptional()
  paymentPlanId?: string;

  @IsEnum(DiscountType)
  discountType: DiscountType;

  @IsNumber()
  @Min(0)
  discountValue: number;

  @IsNumber()
  @Min(0)
  originalAmount: number;

  @IsNumber()
  @Min(0)
  discountedAmount: number;

  @IsString()
  reason: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
```

### 4.2 Approve Discount Request DTO

```typescript
export class ApproveDiscountRequestDto {
  @IsString()
  @IsOptional()
  notes?: string;
}
```

### 4.3 Reject Discount Request DTO

```typescript
export class RejectDiscountRequestDto {
  @IsString()
  rejectionReason: string;
}
```

---

## 5. Business Logic: Applying Discounts

### 5.1 Discount Application Flow

```typescript
private async applyDiscountToPaymentPlan(discountRequest: DiscountRequest) {
  // 1. Get payment plan
  const paymentPlan = await this.paymentPlansService.findOne(discountRequest.paymentPlanId);

  // 2. Validate that discount hasn't been applied already
  if (paymentPlan.hasDiscount && paymentPlan.discountTag === 'DISCOUNTED') {
    // Check if there's already an applied discount
    const existingAppliedDiscount = await this.discountsService.findOneByPaymentPlanAndStatus(
      discountRequest.paymentPlanId,
      DiscountStatus.APPLIED
    );
    
    if (existingAppliedDiscount && existingAppliedDiscount.id !== discountRequest.id) {
      throw new BadRequestException('A discount has already been applied to this payment plan');
    }
  }

  // 3. Store original amount if not already stored
  const originalAmount = paymentPlan.originalAmount || paymentPlan.amount;

  // 4. Calculate new values
  const discountedAmount = discountRequest.discountedAmount;
  const newPending = Math.max(0, discountedAmount - paymentPlan.paid);
  
  // 5. Recalculate installment amounts if needed
  const installments = parseInt(paymentPlan.installments) || 1;
  const newPerInstallment = installments > 0 ? discountedAmount / installments : paymentPlan.perInstallment;

  // 6. Update payment plan
  await this.paymentPlansService.update(discountRequest.paymentPlanId, {
    originalAmount: originalAmount,
    amount: discountedAmount,
    pending: newPending,
    hasDiscount: true,
    discountTag: 'DISCOUNTED',
    perInstallment: newPerInstallment,
    estimate: newPending,
  });

  // 7. Send notification (optional)
  await this.notificationService.sendDiscountApprovedNotification(
    discountRequest.studentId,
    discountRequest
  );
}
```

### 5.2 Recalculating Pending Amount

The pending amount should always be calculated as:
```
pending = discountedAmount - paid
```

This ensures that:
- If a discount is applied, pending is automatically reduced
- If payments are made after discount, pending continues to decrease correctly
- The balance reflects the discounted amount, not the original

---

## 6. Payment Plan Response Format

When returning payment plans (e.g., in student enrollment endpoint), include discount information:

```typescript
// In your student courses endpoint
async getStudentCourses(studentId: string) {
  const paymentPlans = await this.paymentPlansService.findByStudent(studentId);
  
  return paymentPlans.map(plan => ({
    id: plan.id,
    course: plan.course,
    paymentPlan: {
      id: plan.id,
      amount: plan.amount, // This is the discounted amount if discount is applied
      paid: plan.paid,
      pending: plan.pending, // Already calculated with discount
      // ... other fields
      discountRequests: plan.discountRequests?.filter(
        d => d.status === DiscountStatus.APPLIED
      ) || [], // Only return APPLIED discounts
      hasDiscount: plan.hasDiscount,
      discountTag: plan.discountTag, // "DISCOUNTED" or null
      originalAmount: plan.originalAmount, // Original amount before discount
    },
  }));
}
```

---

## 7. Testing Checklist

### 7.1 Discount Request Creation
- [ ] Can create discount request with valid data
- [ ] Validates discount calculation (percentage and fixed)
- [ ] Validates originalAmount matches payment plan
- [ ] Rejects invalid discount values (negative, >100%, etc.)
- [ ] Requires reason field

### 7.2 Discount Approval
- [ ] Only CEO can approve discounts
- [ ] Only PENDING discounts can be approved
- [ ] Approval updates payment plan amount
- [ ] Approval updates payment plan pending
- [ ] Approval tags payment plan as "DISCOUNTED"
- [ ] Approval stores original amount
- [ ] Approval recalculates perInstallment
- [ ] Approval changes status to APPLIED
- [ ] Cannot approve already approved/rejected discounts

### 7.3 Discount Rejection
- [ ] Only CEO can reject discounts
- [ ] Only PENDING discounts can be rejected
- [ ] Requires rejection reason
- [ ] Rejection doesn't affect payment plan
- [ ] Rejection changes status to REJECTED

### 7.4 Payment Plan Updates
- [ ] Pending amount correctly reflects discount
- [ ] Amount field shows discounted amount
- [ ] Original amount is preserved
- [ ] Discount tag is set to "DISCOUNTED"
- [ ] PerInstallment is recalculated
- [ ] Estimate is updated

### 7.5 Data Integrity
- [ ] Only one APPLIED discount per payment plan
- [ ] Discount requests are linked to correct payment plan
- [ ] Payment plan includes discountRequests in response
- [ ] Only APPLIED discounts are returned in payment plan response

---

## 8. Error Handling

```typescript
// Common error scenarios to handle:

// 1. Invalid discount calculation
if (Math.abs(calculatedDiscounted - dto.discountedAmount) > 0.01) {
  throw new BadRequestException('Discounted amount calculation is incorrect');
}

// 2. Discount already applied
if (paymentPlan.hasDiscount) {
  const existingDiscount = await this.findAppliedDiscount(paymentPlan.id);
  if (existingDiscount && existingDiscount.id !== discountRequest.id) {
    throw new BadRequestException('A discount has already been applied to this payment plan');
  }
}

// 3. Invalid status transition
if (discountRequest.status !== DiscountStatus.PENDING) {
  throw new BadRequestException(`Cannot approve/reject discount with status ${discountRequest.status}`);
}

// 4. Payment plan not found
if (!paymentPlan) {
  throw new NotFoundException('Payment plan not found for this student and course');
}

// 5. Unauthorized access
if (user.role !== 'CEO') {
  throw new ForbiddenException('Only CEO can approve/reject discount requests');
}
```

---

## 9. Notification Integration (Optional)

```typescript
// Send notification when discount is approved
async sendDiscountApprovedNotification(
  studentId: string,
  discountRequest: DiscountRequest
) {
  const student = await this.studentsService.findOne(studentId);
  
  // Send WhatsApp/SMS notification
  await this.notificationService.send({
    to: student.phone,
    message: `Your discount request for ${discountRequest.course.name} has been approved. New amount: ₦${discountRequest.discountedAmount.toLocaleString()}`,
    type: 'WHATSAPP',
  });

  // Send email notification
  await this.emailService.send({
    to: student.email,
    subject: 'Discount Request Approved',
    template: 'discount-approved',
    data: {
      studentName: student.fullName,
      courseName: discountRequest.course.name,
      originalAmount: discountRequest.originalAmount,
      discountedAmount: discountRequest.discountedAmount,
      savings: discountRequest.originalAmount - discountRequest.discountedAmount,
    },
  });
}
```

---

## 10. Summary

### Key Implementation Points:

1. **Database Schema:**
   - `DiscountRequest` table with approval workflow fields
   - `PaymentPlan` table updated with discount tracking fields

2. **API Endpoints:**
   - `POST /discounts` - Create discount request
   - `GET /discounts` - List all discount requests
   - `GET /discounts/:id` - Get single discount request
   - `PATCH /discounts/:id/approve` - Approve discount (CEO only)
   - `PATCH /discounts/:id/reject` - Reject discount (CEO only)

3. **Discount Application Logic:**
   - When approved, update payment plan `amount` to `discountedAmount`
   - Recalculate `pending = discountedAmount - paid`
   - Set `hasDiscount = true` and `discountTag = "DISCOUNTED"`
   - Store `originalAmount` for reference
   - Recalculate `perInstallment` and `estimate`

4. **Response Format:**
   - Include `discountRequests` array in payment plan responses
   - Only return APPLIED discounts
   - Include `hasDiscount` and `discountTag` flags
   - Include `originalAmount` for display

5. **Security:**
   - Only CEO can approve/reject discounts
   - Validate discount calculations
   - Prevent multiple discounts on same payment plan
   - Validate status transitions

This implementation ensures that when a discount is approved, the student's pending payment is automatically reduced, and the payment plan is properly tagged as discounted.
