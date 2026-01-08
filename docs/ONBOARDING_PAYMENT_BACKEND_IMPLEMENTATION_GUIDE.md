# Onboarding Payment Backend Implementation Guide

## Overview

This guide provides comprehensive instructions for implementing onboarding payment initialization and verification endpoints on the backend. The implementation follows the same pattern as wallet funding and installment payments, ensuring consistency across the payment system.

The backend needs to implement two main endpoints:

1. **Initialize Onboarding Payment**: Initialize Paystack payment for onboarding enrollment deposit
2. **Verify Onboarding Payment**: Verify Paystack payment after callback

---

## Table of Contents

1. [API Endpoints](#api-endpoints)
2. [DTOs (Data Transfer Objects)](#dtos-data-transfer-objects)
3. [Service Implementation](#service-implementation)
4. [Controller Implementation](#controller-implementation)
5. [Database Considerations](#database-considerations)
6. [Integration with Paystack Service](#integration-with-paystack-service)
7. [Error Handling](#error-handling)
8. [Testing](#testing)

---

## API Endpoints

### 1. Initialize Onboarding Payment

**Endpoint:** `POST /portal/onboarding/initialize-payment`

**Authentication:** Required (Bearer token)

**Request Headers:**

```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**

```json
{
  "email": "student@example.com",
  "amount": 250000,
  "courseId": "course_123abc",
  "centerId": "center_456def",
  "initialDeposit": 250000,
  "duration": 10,
  "fullTuition": 780000,
  "metadata": {
    "courseName": "Full Stack Web Development",
    "centerName": "Abuja Center"
  }
}
```

**Response (Success - 200):**

```json
{
  "authorizationUrl": "https://checkout.paystack.com/xxxxx",
  "accessCode": "xxxxxxxxxxxx",
  "reference": "ONBOARD_1234567890_abc123xyz"
}
```

**Response (Error - 400):**

```json
{
  "statusCode": 400,
  "message": "Minimum payment amount is ₦100",
  "error": "Bad Request"
}
```

---

### 2. Verify Onboarding Payment

**Endpoint:** `POST /portal/onboarding/verify-payment`

**Authentication:** Required (Bearer token)

**Request Headers:**

```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Request Body:**

```json
{
  "reference": "ONBOARD_1234567890_abc123xyz",
  "guardianEmail": "guardian@example.com",
  "profile": {
    "trainingLocation": "clx123abc",
    "centre": "clx789ghi",
    "studentAddress": "123 Main Street, Wuse 2, Abuja",
    "guardianName": "John Doe",
    "guardianPhone": "08012345678",
    "guardianEmail": "guardian@example.com",
    "guardianAddress": "456 Guardian Street",
    "hasGuardian": true
  },
  "selectedCenter": {
    "id": "center_456def",
    "name": "Abuja Center"
  },
  "selectedCourse": {
    "id": "course_123abc",
    "name": "Full Stack Web Development"
  },
  "paymentPlan": {
    "initialDeposit": 250000,
    "duration": 10,
    "installments": [
      {
        "title": "Enrolment Deposit",
        "date": "Jan 8, 2026",
        "amount": 250000,
        "status": "DUE TODAY"
      },
      {
        "title": "Installment 1 of 10",
        "date": "Feb 8, 2026",
        "amount": 53000
      }
    ]
  }
}
```

**Response (Success - 200):**

```json
{
  "success": true,
  "message": "Payment verified and enrollment completed successfully",
  "reference": "ONBOARD_1234567890_abc123xyz",
  "amount": 250000,
  "currency": "NGN",
  "status": "completed",
  "transactionDate": "2026-01-08T12:00:00.000Z",
  "student": {
    "id": "student_789xyz",
    "studentId": "STU-2026-001",
    "fullName": "John Doe",
    "email": "student@example.com",
    "center": {
      "id": "center_456def",
      "name": "Abuja Center"
    },
    "course": {
      "id": "course_123abc",
      "name": "Full Stack Web Development"
    },
    "status": "PENDING_APPROVAL"
  },
  "metadata": {
    "type": "onboarding_payment",
    "userId": "user_123abc",
    "courseId": "course_123abc",
    "centerId": "center_456def",
    "initialDeposit": 250000,
    "duration": 10,
    "fullTuition": 780000
  }
}
```

**Response (Error - 404):**

```json
{
  "statusCode": 404,
  "message": "Payment not found",
  "error": "Not Found"
}
```

---

## DTOs (Data Transfer Objects)

Create DTOs for request validation:

```typescript
// dto/initialize-onboarding-payment.dto.ts
import {
  IsEmail,
  IsNumber,
  IsString,
  IsNotEmpty,
  Min,
  IsOptional,
  IsObject,
} from "class-validator";

export class InitializeOnboardingPaymentDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(100, { message: "Minimum payment amount is ₦100" })
  amount: number;

  @IsString()
  @IsNotEmpty()
  courseId: string;

  @IsString()
  @IsNotEmpty()
  centerId: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(100)
  initialDeposit: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  duration: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  fullTuition: number;

  @IsObject()
  @IsOptional()
  metadata?: {
    [key: string]: any;
  };
}
```

```typescript
// dto/verify-onboarding-payment.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsObject,
  ValidateNested,
  IsNumber,
} from "class-validator";
import { Type } from "class-transformer";

class ProfileDto {
  @IsString()
  @IsNotEmpty()
  trainingLocation: string;

  @IsString()
  @IsNotEmpty()
  centre: string;

  @IsString()
  @IsOptional()
  studentAddress?: string;

  @IsString()
  @IsOptional()
  guardianName?: string;

  @IsString()
  @IsOptional()
  guardianPhone?: string;

  @IsEmail()
  @IsOptional()
  guardianEmail?: string;

  @IsString()
  @IsOptional()
  guardianAddress?: string;

  @IsOptional()
  hasGuardian?: boolean;
}

class CenterDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsOptional()
  name?: string;
}

class CourseDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsOptional()
  name?: string;
}

class InstallmentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  date: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsOptional()
  status?: string;
}

class PaymentPlanDto {
  @IsNumber()
  @IsNotEmpty()
  initialDeposit: number;

  @IsNumber()
  @IsNotEmpty()
  duration: number;

  @ValidateNested({ each: true })
  @Type(() => InstallmentDto)
  installments: InstallmentDto[];
}

export class VerifyOnboardingPaymentDto {
  @IsString()
  @IsNotEmpty()
  reference: string;

  @IsEmail()
  @IsOptional()
  guardianEmail?: string;

  // Enrollment data required for creating student
  @ValidateNested()
  @Type(() => ProfileDto)
  @IsNotEmpty()
  profile: ProfileDto;

  @ValidateNested()
  @Type(() => CenterDto)
  @IsNotEmpty()
  selectedCenter: CenterDto;

  @ValidateNested()
  @Type(() => CourseDto)
  @IsNotEmpty()
  selectedCourse: CourseDto;

  @ValidateNested()
  @Type(() => PaymentPlanDto)
  @IsNotEmpty()
  paymentPlan: PaymentPlanDto;
}
```

---

## Service Implementation

Create an `OnboardingPaymentService` to handle the business logic:

```typescript
// services/onboarding-payment.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaystackService } from "./paystack.service";
import { EnrollmentService } from "./enrollment.service"; // Service that handles student enrollment
import { User } from "../entities/user.entity";
import { OnboardingPayment } from "../entities/onboarding-payment.entity"; // See Database Considerations

@Injectable()
export class OnboardingPaymentService {
  constructor(
    @InjectRepository(OnboardingPayment)
    private onboardingPaymentRepository: Repository<OnboardingPayment>,
    private paystackService: PaystackService,
    private enrollmentService: EnrollmentService // Inject enrollment service
  ) {}

  /**
   * Initialize onboarding payment via Paystack
   * This follows the same pattern as wallet funding
   */
  async initializeOnboardingPayment(
    userId: string,
    dto: InitializeOnboardingPaymentDto
  ): Promise<{
    authorizationUrl: string;
    accessCode: string;
    reference: string;
  }> {
    // Validate amount
    if (dto.amount < 100) {
      throw new BadRequestException("Minimum payment amount is ₦100");
    }

    // Generate unique reference
    const reference = `ONBOARD_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Create pending payment record
    const payment = this.onboardingPaymentRepository.create({
      userId,
      email: dto.email,
      amount: dto.amount,
      courseId: dto.courseId,
      centerId: dto.centerId,
      initialDeposit: dto.initialDeposit,
      duration: dto.duration,
      fullTuition: dto.fullTuition,
      reference,
      status: "PENDING",
      paymentMethod: "paystack",
    });
    await this.onboardingPaymentRepository.save(payment);

    // Prepare callback URL - redirect to onboarding page with query params
    const frontendUrl =
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";
    const callbackUrl = `${frontendUrl}/onboarding?success=true&reference=${reference}`;

    // Initialize Paystack payment
    const paystackResponse = await this.paystackService.initializeTransaction({
      email: dto.email,
      amount: dto.amount * 100, // Convert Naira to kobo
      reference: reference,
      metadata: {
        type: "onboarding_payment",
        userId,
        paymentId: payment.id,
        courseId: dto.courseId,
        centerId: dto.centerId,
        initialDeposit: dto.initialDeposit,
        duration: dto.duration,
        fullTuition: dto.fullTuition,
        ...(dto.metadata || {}),
      },
      callback_url: callbackUrl,
    });

    // Update payment with Paystack reference
    payment.paystackReference = paystackResponse.reference;
    await this.onboardingPaymentRepository.save(payment);

    return {
      authorizationUrl: paystackResponse.authorization_url,
      accessCode: paystackResponse.access_code,
      reference: paystackResponse.reference,
    };
  }

  /**
   * Verify onboarding payment after Paystack callback
   * Automatically creates student/enrollment after successful verification
   * This ensures student is created before redirecting to success page
   */
  async verifyOnboardingPayment(
    userId: string,
    dto: VerifyOnboardingPaymentDto
  ): Promise<{
    success: boolean;
    message: string;
    reference: string;
    amount: number;
    currency: string;
    status: string;
    transactionDate: Date;
    student?: any; // Student data returned after enrollment
    metadata: any;
  }> {
    // Find payment by reference (try both our reference and Paystack reference)
    let payment = await this.onboardingPaymentRepository.findOne({
      where: [
        { reference: dto.reference },
        { paystackReference: dto.reference },
      ],
      relations: ["user"],
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    // Verify user owns this payment
    if (payment.userId !== userId) {
      throw new BadRequestException(
        "You do not have permission to verify this payment"
      );
    }

    // If already verified AND enrollment completed, return existing data
    if (payment.status === "COMPLETED") {
      // Payment and enrollment already completed
      return {
        success: true,
        message: "Payment and enrollment already completed",
        reference: payment.paystackReference || payment.reference,
        amount: Number(payment.amount),
        currency: "NGN",
        status: "completed",
        transactionDate: payment.verifiedAt || payment.createdAt,
        student: payment.enrollmentData, // Return saved student data
        metadata: {
          type: "onboarding_payment",
          userId: payment.userId,
          paymentId: payment.id,
          courseId: payment.courseId,
          centerId: payment.centerId,
          initialDeposit: payment.initialDeposit,
          duration: payment.duration,
          fullTuition: payment.fullTuition,
        },
      };
    }

    // If verified but enrollment not completed, try to complete enrollment
    if (payment.status === "VERIFIED") {
      // Payment verified but enrollment pending - try to complete enrollment
      try {
        const enrollmentResult = await this.enrollmentService.enrollStudent({
          userId,
          profile: dto.profile,
          centerId: dto.selectedCenter.id,
          courseId: dto.selectedCourse.id,
          payment: {
            amount: payment.initialDeposit,
            courseFee: payment.fullTuition,
            numberOfInstallments: payment.duration,
            paymentPlan: "installment",
            paymentType: "monthly",
            paymentMethod: "paystack",
            paymentReference: payment.reference,
            installments: dto.paymentPlan.installments.map((inst) => ({
              title: inst.title,
              date: inst.date,
              amount: inst.amount,
              status: inst.status,
            })),
          },
        });

        // Update payment status to COMPLETED and save enrollment data
        payment.status = "COMPLETED";
        payment.enrollmentData = enrollmentResult; // Store student data
        await this.onboardingPaymentRepository.save(payment);

        return {
          success: true,
          message: "Payment verified and enrollment completed",
          reference: payment.paystackReference || payment.reference,
          amount: Number(payment.amount),
          currency: "NGN",
          status: "completed",
          transactionDate: payment.verifiedAt || payment.createdAt,
          student: enrollmentResult,
          metadata: {
            type: "onboarding_payment",
            userId: payment.userId,
            paymentId: payment.id,
            courseId: payment.courseId,
            centerId: payment.centerId,
            initialDeposit: payment.initialDeposit,
            duration: payment.duration,
            fullTuition: payment.fullTuition,
          },
        };
      } catch (enrollmentError) {
        // Enrollment failed but payment is verified
        throw new BadRequestException(
          `Payment verified but enrollment failed: ${enrollmentError.message}`
        );
      }
    }

    // Verify with Paystack
    const verification = await this.paystackService.verifyTransaction(
      dto.reference.includes("ONBOARD_")
        ? payment.paystackReference
        : dto.reference
    );

    if (verification.status !== "success") {
      payment.status = "FAILED";
      payment.verificationError = "Payment verification failed";
      await this.onboardingPaymentRepository.save(payment);

      throw new BadRequestException(
        "Payment verification failed. Payment was not successful."
      );
    }

    // Verify amount matches
    const verifiedAmount = verification.amount / 100; // Convert from kobo to Naira
    if (Math.abs(verifiedAmount - payment.amount) > 1) {
      // Allow 1 Naira difference due to rounding
      throw new BadRequestException("Payment amount mismatch");
    }

    // Update payment status to VERIFIED
    payment.status = "VERIFIED";
    payment.verifiedAt = new Date();
    payment.paystackReference =
      verification.reference || payment.paystackReference;
    payment.verificationData = JSON.stringify(verification);

    // Store guardian email if provided (for notification purposes)
    if (dto.guardianEmail) {
      payment.guardianEmail = dto.guardianEmail;
    }

    await this.onboardingPaymentRepository.save(payment);

    // Now create student/enrollment immediately after payment verification
    try {
      const enrollmentResult = await this.enrollmentService.enrollStudent({
        userId,
        profile: dto.profile,
        centerId: dto.selectedCenter.id,
        courseId: dto.selectedCourse.id,
        payment: {
          amount: payment.initialDeposit,
          courseFee: payment.fullTuition,
          numberOfInstallments: payment.duration,
          paymentPlan: "installment",
          paymentType: "monthly",
          paymentMethod: "paystack",
          paymentReference: payment.reference,
          installments: dto.paymentPlan.installments.map((inst) => ({
            title: inst.title,
            date: inst.date,
            amount: inst.amount,
            status: inst.status,
          })),
        },
      });

      // Update payment status to COMPLETED and save student data
      payment.status = "COMPLETED";
      payment.enrollmentData = enrollmentResult; // Store student data for reference
      await this.onboardingPaymentRepository.save(payment);

      // Return verification result with student data
      return {
        success: true,
        message: "Payment verified and enrollment completed successfully",
        reference: payment.paystackReference || payment.reference,
        amount: Number(payment.amount),
        currency: "NGN",
        status: "completed",
        transactionDate: payment.verifiedAt,
        student: enrollmentResult, // Return student data so frontend can display it
        metadata: {
          type: "onboarding_payment",
          userId: payment.userId,
          paymentId: payment.id,
          courseId: payment.courseId,
          centerId: payment.centerId,
          initialDeposit: payment.initialDeposit,
          duration: payment.duration,
          fullTuition: payment.fullTuition,
          ...(verification.metadata || {}),
        },
      };
    } catch (enrollmentError) {
      // Payment is verified but enrollment failed
      // This is a critical error - payment succeeded but we couldn't create student
      console.error(
        "Enrollment failed after payment verification:",
        enrollmentError
      );

      // Keep payment as VERIFIED but don't mark as COMPLETED
      // Admin can manually complete enrollment later
      throw new BadRequestException(
        `Payment verified successfully, but enrollment creation failed. ` +
          `Please contact support with reference: ${payment.reference}. ` +
          `Error: ${enrollmentError.message}`
      );
    }
  }
}
```

---

## Controller Implementation

Create a controller to handle the HTTP requests:

```typescript
// controllers/onboarding-payment.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { OnboardingPaymentService } from "../services/onboarding-payment.service";
import { InitializeOnboardingPaymentDto } from "../dto/initialize-onboarding-payment.dto";
import { VerifyOnboardingPaymentDto } from "../dto/verify-onboarding-payment.dto";

@Controller("portal/onboarding")
@UseGuards(JwtAuthGuard)
export class OnboardingPaymentController {
  constructor(
    private readonly onboardingPaymentService: OnboardingPaymentService
  ) {}

  /**
   * Initialize onboarding payment
   * POST /portal/onboarding/initialize-payment
   */
  @Post("initialize-payment")
  @HttpCode(HttpStatus.OK)
  async initializePayment(
    @Request() req: any,
    @Body() dto: InitializeOnboardingPaymentDto
  ) {
    const userId = req.user.id; // Extract from JWT token

    return this.onboardingPaymentService.initializeOnboardingPayment(
      userId,
      dto
    );
  }

  /**
   * Verify onboarding payment
   * POST /portal/onboarding/verify-payment
   */
  @Post("verify-payment")
  @HttpCode(HttpStatus.OK)
  async verifyPayment(
    @Request() req: any,
    @Body() dto: VerifyOnboardingPaymentDto
  ) {
    const userId = req.user.id; // Extract from JWT token

    return this.onboardingPaymentService.verifyOnboardingPayment(userId, dto);
  }
}
```

---

## Database Considerations

### Option 1: Create OnboardingPayment Entity (Recommended)

Create a dedicated entity to track onboarding payments separately from regular payments:

```typescript
// entities/onboarding-payment.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./user.entity";

export enum OnboardingPaymentStatus {
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

@Entity("onboarding_payments")
export class OnboardingPayment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  user: User;

  @Column()
  email: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  amount: number;

  @Column()
  courseId: string;

  @Column()
  centerId: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  initialDeposit: number;

  @Column()
  duration: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  fullTuition: number;

  @Column({ unique: true })
  reference: string; // Our internal reference

  @Column({ nullable: true })
  paystackReference: string; // Paystack's reference

  @Column({
    type: "enum",
    enum: OnboardingPaymentStatus,
    default: OnboardingPaymentStatus.PENDING,
  })
  status: OnboardingPaymentStatus;

  @Column({ default: "paystack" })
  paymentMethod: string;

  @Column({ nullable: true })
  guardianEmail: string;

  @Column({ type: "json", nullable: true })
  verificationData: any; // Store full Paystack verification response

  @Column({ nullable: true })
  verificationError: string;

  @Column({ type: "timestamp", nullable: true })
  verifiedAt: Date;

  @Column({ type: "json", nullable: true })
  enrollmentData: any; // Store student data after successful enrollment

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Option 2: Reuse Existing Payment Entity

If you prefer to use the existing `Payment` entity, add a type/flag to distinguish onboarding payments:

```typescript
// Add to existing Payment entity
@Column({ nullable: true })
paymentType: string; // 'onboarding', 'installment', 'wallet_funding', etc.

@Column({ nullable: true, type: 'json' })
onboardingData: {
  initialDeposit: number;
  duration: number;
  fullTuition: number;
  courseId: string;
  centerId: string;
};
```

---

## Integration with Paystack Service

Ensure your `PaystackService` has the methods used in the implementation:

```typescript
// services/paystack.service.ts (excerpt)
export class PaystackService {
  // ... existing code ...

  /**
   * Initialize a transaction
   */
  async initializeTransaction(data: {
    email: string;
    amount: number; // Amount in kobo
    reference: string;
    metadata?: any;
    callback_url?: string;
  }): Promise<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }> {
    // Implementation from WALLET_AND_INSTALLMENT_PAYMENT_BACKEND_GUIDE.md
    // ... existing implementation ...
  }

  /**
   * Verify a transaction
   */
  async verifyTransaction(reference: string): Promise<{
    status: string;
    amount: number; // Amount in kobo
    customer: any;
    metadata: any;
    reference: string;
  }> {
    // Implementation from WALLET_AND_INSTALLMENT_PAYMENT_BACKEND_GUIDE.md
    // ... existing implementation ...
  }
}
```

---

## Error Handling

The service should handle the following error cases:

1. **Invalid Amount**: Amount less than ₦100
2. **Payment Not Found**: Reference doesn't exist in database
3. **Payment Already Verified**: Prevent duplicate verification
4. **Paystack Verification Failed**: Transaction not successful on Paystack
5. **Amount Mismatch**: Verified amount doesn't match expected amount
6. **Unauthorized Access**: User trying to verify payment they don't own

---

## Module Registration

Don't forget to register the service and controller in your module:

```typescript
// onboarding-payment.module.ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OnboardingPaymentController } from "./controllers/onboarding-payment.controller";
import { OnboardingPaymentService } from "./services/onboarding-payment.service";
import { OnboardingPayment } from "./entities/onboarding-payment.entity";
import { PaystackService } from "./services/paystack.service";
import { EnrollmentService } from "./services/enrollment.service"; // Service that handles student enrollment
import { User } from "./entities/user.entity";

@Module({
  imports: [TypeOrmModule.forFeature([OnboardingPayment, User])],
  controllers: [OnboardingPaymentController],
  providers: [
    OnboardingPaymentService,
    PaystackService,
    EnrollmentService, // Required for automatic enrollment creation
  ],
  exports: [OnboardingPaymentService],
})
export class OnboardingPaymentModule {}
```

---

## Environment Variables

Ensure these environment variables are set:

```env
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx  # Your Paystack secret key
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx  # Your Paystack public key

# Frontend URL for callback
FRONTEND_URL=http://localhost:3000  # Or your production URL
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Alternative name
```

---

## Testing

### Test Cases

1. **Initialize Payment - Success**

   - Valid request with all required fields
   - Returns authorization URL and reference
   - Creates pending payment record

2. **Initialize Payment - Invalid Amount**

   - Amount less than ₦100
   - Returns 400 error

3. **Verify Payment - Success**

   - Valid reference
   - Payment exists and is pending
   - Paystack verification succeeds
   - Updates payment status to VERIFIED

4. **Verify Payment - Not Found**

   - Invalid reference
   - Returns 404 error

5. **Verify Payment - Already Verified**

   - Payment already in VERIFIED status
   - Returns success without re-verifying

6. **Verify Payment - Paystack Failure**
   - Paystack returns failed status
   - Updates payment to FAILED
   - Returns error

---

## Integration Flow

The complete flow works as follows:

1. **User clicks Pay button** on onboarding page
2. **Frontend calls** `POST /portal/onboarding/initialize-payment`
3. **Backend creates** pending payment record
4. **Backend initializes** Paystack payment
5. **Backend returns** authorization URL to frontend
6. **User redirected** to Paystack payment page
7. **User completes** payment on Paystack
8. **Paystack redirects** to `/onboarding?success=true&reference=xxx`
9. **Frontend detects** callback parameters
10. **Frontend calls** `POST /portal/onboarding/verify-payment`
11. **Backend verifies** payment with Paystack
12. **Backend updates** payment status to VERIFIED
13. **Backend returns** verification result
14. **Frontend moves** to success page
15. **Frontend submits** onboarding data to `/students/enroll` endpoint via `/api/onboarding/submit`

### Important: Payment Verification vs Enrollment Submission

**The backend automatically calls enrollment creation after successful payment verification.** This ensures the student is created before the frontend redirects to the success page.

- **Payment Verification** (`/portal/onboarding/verify-payment`):
  1. Verifies that the Paystack payment was successful
  2. Updates the payment record status to VERIFIED
  3. **Immediately creates student/enrollment** by calling the enrollment service
  4. Updates payment status to COMPLETED
  5. Returns student data along with verification result

**Flow:**

```
Payment Verification (Backend)
        ↓
Verify with Paystack → Payment Status = VERIFIED
        ↓
Create Student/Enrollment (via EnrollmentService)
        ↓
Payment Status = COMPLETED
        ↓
Return verification result + student data
        ↓
Frontend shows success page with student info
```

**Benefits:**

1. Atomic operation: Payment verification and enrollment happen together
2. No race conditions: Student is guaranteed to exist after successful payment
3. Better UX: Frontend receives student data immediately, can display it on success page
4. Error handling: If enrollment fails, payment remains VERIFIED but not COMPLETED, allowing admin intervention

---

## Important Notes

1. **Callback URL**: The callback URL must redirect to `/onboarding?success=true&reference=xxx` (not `/onboarding/payment/callback`)

2. **Reference Format**: Use `ONBOARD_` prefix for easy identification in logs

3. **Payment Status vs Enrollment Status**:

   - Track payment status separately from enrollment status
   - A payment can be VERIFIED even if enrollment data hasn't been submitted yet
   - The `/students/enroll` endpoint (called by frontend via `/api/onboarding/submit`) is responsible for creating the student record and linking it to the verified payment
   - **DO NOT** automatically create student records in the verify endpoint - this is handled by the separate enrollment endpoint

4. **User Ownership**: Always verify that the user making the request owns the payment (via userId)

5. **Idempotency**: Ensure verification is idempotent - verifying the same payment twice should not cause issues

6. **Metadata**: Store important metadata (courseId, centerId, etc.) in both the payment record and Paystack metadata for redundancy

---

## Linking Verified Payment to Enrollment

When the frontend calls `/students/enroll` after payment verification, the backend should:

1. **Verify payment exists and is verified**: Check that a payment record with the provided `paymentReference` exists and has status `VERIFIED`
2. **Link payment to student**: When creating the payment plan, link it to the verified onboarding payment
3. **Handle race conditions**: Ensure that if `/students/enroll` is called multiple times for the same payment reference, it doesn't create duplicate records

Example implementation in `/students/enroll` endpoint:

```typescript
// In your enrollment service/controller
async enrollStudent(dto: EnrollStudentDto) {
  // ... existing validation ...

  // Verify the payment exists and is verified
  const verifiedPayment = await this.onboardingPaymentRepository.findOne({
    where: {
      reference: dto.payment.paymentReference,
      status: OnboardingPaymentStatus.VERIFIED,
      userId: req.user.id, // Ensure user owns this payment
    },
  });

  if (!verifiedPayment) {
    throw new BadRequestException(
      'Payment not found or not verified. Please complete payment first.'
    );
  }

  // Check if enrollment already exists for this payment
  const existingEnrollment = await this.enrollmentRepository.findOne({
    where: {
      student: { userId: req.user.id },
      courseId: dto.courseId,
    },
  });

  if (existingEnrollment) {
    throw new ConflictException('Student is already enrolled in this course');
  }

  // Create student, enrollment, payment plan, etc.
  // Link the payment plan to the verified onboarding payment
  const paymentPlan = this.paymentPlanRepository.create({
    // ... other fields ...
    onboardingPaymentId: verifiedPayment.id, // Link to verified payment
  });

  // Update payment status to COMPLETED after successful enrollment
  verifiedPayment.status = OnboardingPaymentStatus.COMPLETED;
  await this.onboardingPaymentRepository.save(verifiedPayment);

  // ... rest of enrollment logic ...
}
```

---

## Migration Script

If creating a new entity, create a migration:

```sql
-- Create onboarding_payments table
CREATE TABLE onboarding_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  course_id VARCHAR(255) NOT NULL,
  center_id VARCHAR(255) NOT NULL,
  initial_deposit DECIMAL(10, 2) NOT NULL,
  duration INTEGER NOT NULL,
  full_tuition DECIMAL(10, 2) NOT NULL,
  reference VARCHAR(255) UNIQUE NOT NULL,
  paystack_reference VARCHAR(255),
  status VARCHAR(50) DEFAULT 'PENDING',
  payment_method VARCHAR(50) DEFAULT 'paystack',
  guardian_email VARCHAR(255),
  verification_data JSONB,
  verification_error TEXT,
  verified_at TIMESTAMP,
  enrollment_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_onboarding_payments_user_id ON onboarding_payments(user_id);
CREATE INDEX idx_onboarding_payments_reference ON onboarding_payments(reference);
CREATE INDEX idx_onboarding_payments_paystack_reference ON onboarding_payments(paystack_reference);
CREATE INDEX idx_onboarding_payments_status ON onboarding_payments(status);
```

---

This implementation follows the same pattern as wallet funding and installment payments, ensuring consistency and maintainability across your payment system.
