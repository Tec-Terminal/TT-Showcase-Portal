# Onboarding Backend Integration Guide

This guide provides instructions for implementing the backend API endpoint to handle onboarding data submission after successful Paystack payment.

## Overview

When a user completes payment via Paystack, the frontend submits all onboarding data to the backend. The backend should:

1. Create a Student record
2. Create Guardian record (if applicable)
3. Create Course Enrollment record
4. Create Payment and payment plan record(s) with installments
5. Set student status to `PENDING_APPROVAL`
6. Send notifications to finance officers

---

## API Endpoint

### Submit Onboarding Data

**Endpoint:** `POST /students/enroll` (or your preferred endpoint)

**Authentication:** Required (Bearer token)

**Request Headers:**

```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

---

## Request Payload Structure

```json
{
  "userId": "user_123abc", // Optional: User ID to link student to authenticated user
  // If not provided, backend MUST extract from JWT token
  // This ensures Student is tied to User account
  "profile": {
    "trainingLocation": "clx123abc",
    "centre": "clx789ghi",
    "studentAddress": "123 Main Street, Wuse 2, Abuja, FCT",
    "guardianName": "John Doe",
    "guardianPhone": "08012345678",
    "guardianEmail": "guardian@example.com",
    "guardianAddress": "456 Guardian Street, Garki, Abuja, FCT",
    "hasGuardian": true
  },
  "centerId": "clx789ghi",
  "courseId": "clx111aaa",
  "payment": {
    "amount": 300000,
    "courseFee": 600000,
    "numberOfInstallments": 3,
    "paymentPlan": "installment",
    "paymentType": "monthly",
    "paymentMethod": "paystack",
    "paymentReference": "TT-1735467890-abc123xyz",
    "installments": [
      {
        "title": "Enrolment Deposit",
        "date": "Dec 29, 2025",
        "amount": 300000,
        "status": "DUE TODAY"
      },
      {
        "title": "Installment 1 of 3",
        "date": "Jan 29, 2026",
        "amount": 100000
      },
      {
        "title": "Installment 2 of 3",
        "date": "Feb 29, 2026",
        "amount": 100000
      },
      {
        "title": "Installment 3 of 3",
        "date": "Mar 29, 2026",
        "amount": 100000
      }
    ]
  }
}
```

---

## Field Descriptions

### User-Student Relationship

- **`userId`** (string, optional): User ID to link the student profile to the authenticated user account
  - If provided, this will be used to link the student to the user
  - If not provided, the backend MUST extract the user ID from the JWT token (via `@Request() req.user.id` or similar)
  - **IMPORTANT**: Every Student MUST be tied to a User. A User may not have a Student profile, but a Student must always have a User.
  - This relationship allows users to access their student portal and view their enrollment details

### Profile Object

- `trainingLocation` (string, required): Location/State ID
- `centre` (string, required): Center ID
- `studentAddress` (string, required): Student's residential address
- `guardianName` (string, optional): Full name of guardian/sponsor
- `guardianPhone` (string, optional): Guardian phone number (without country code)
- `guardianEmail` (string, optional): Guardian email address
- `guardianAddress` (string, optional): Guardian's residential address (required if hasGuardian is true)
- `hasGuardian` (boolean): Whether student has a guardian

### Payment Object

- `amount` (number, required): Initial deposit amount in Naira
- `courseFee` (number, required): Full course tuition in Naira
- `numberOfInstallments` (number, required): Number of installments for remaining balance
- `paymentPlan` (string, required): Payment plan type (e.g., "installment")
- `paymentType` (string, required): Payment frequency (e.g., "monthly")
- `paymentMethod` (string, required): Payment method (e.g., "paystack")
- `paymentReference` (string, required): Paystack transaction reference
- `installments` (array, required): Array of installment details

### Installment Object

- `title` (string, required): Installment title (e.g., "Installment 1 of 3")
- `date` (string, required): Due date in format "MMM DD, YYYY"
- `amount` (number, required): Installment amount in Naira
- `status` (string, optional): Status (e.g., "DUE TODAY")

---

## Backend Implementation

### 1. DTO (Data Transfer Object)

```typescript
// dto/create-student-enrollment.dto.ts
export class CreateStudentEnrollmentDto {
  userId?: string; // Optional: User ID from payload. If not provided, extract from JWT token

  profile: {
    trainingLocation: string;
    centre: string;
    studentAddress: string; // Required: Student's residential address
    guardianName?: string;
    guardianPhone?: string;
    guardianEmail?: string;
    guardianAddress?: string; // Optional: Guardian's address (required if hasGuardian is true)
    hasGuardian: boolean;
  };

  centerId: string;
  courseId: string;

  payment: {
    amount: number;
    courseFee: number;
    numberOfInstallments: number;
    paymentPlan: string;
    paymentType: string;
    paymentMethod: string;
    paymentReference: string;
    installments: Array<{
      title: string;
      date: string;
      amount: number;
      status?: string;
    }>;
  };
}
```

### 2. Service Implementation

```typescript
// students.service.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Student } from "./entities/student.entity";
import { Guardian } from "./entities/guardian.entity";
import { Payment } from "./entities/payment.entity";
import { CourseEnrollment } from "./entities/course-enrollment.entity";
import { CreateStudentEnrollmentDto } from "./dto/create-student-enrollment.dto";

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Guardian)
    private guardianRepository: Repository<Guardian>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(CourseEnrollment)
    private enrollmentRepository: Repository<CourseEnrollment>
  ) {}

  async createStudentEnrollment(
    dto: CreateStudentEnrollmentDto,
    userId: string // User ID from authenticated user (extracted from JWT token)
  ): Promise<Student> {
    // 1. Get user information (from auth token or payload)
    // Priority: Use userId from DTO if provided, otherwise use from JWT token
    const finalUserId = dto.userId || userId;

    if (!finalUserId) {
      throw new Error(
        "User ID is required. Must be provided in payload or extracted from JWT token."
      );
    }

    const user = await this.userRepository.findOne({
      where: { id: finalUserId },
    });
    if (!user) {
      throw new Error("User not found");
    }

    // 2. Create Student record - MUST link to User
    const student = this.studentRepository.create({
      userId: user.id, // REQUIRED: Student must be tied to a User
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || null,
      address: dto.profile.studentAddress, // Student's residential address
      centerId: dto.centerId,
      courseId: dto.courseId,
      status: "PENDING_APPROVAL", // Set to pending approval
      enrolledDate: new Date(),
      programType: "REGULAR_STUDENT",
    });

    const savedStudent = await this.studentRepository.save(student);

    // 3. Create Guardian record (if applicable)
    if (dto.profile.hasGuardian && dto.profile.guardianName) {
      const guardian = this.guardianRepository.create({
        studentId: savedStudent.id,
        fullname: dto.profile.guardianName,
        phone: dto.profile.guardianPhone || null,
        email: dto.profile.guardianEmail || null,
        address: dto.profile.guardianAddress || null, // Guardian's residential address
      });
      await this.guardianRepository.save(guardian);
    }

    // 4. Create Course Enrollment record
    const enrollment = this.enrollmentRepository.create({
      studentId: savedStudent.id,
      courseId: dto.courseId,
      enrolledAt: new Date(),
      status: "ACTIVE",
    });
    await this.enrollmentRepository.save(enrollment);

    // 5. Create Payment records
    // First payment (Enrolment Deposit) - already paid
    const initialPayment = this.paymentRepository.create({
      studentId: savedStudent.id,
      courseId: dto.courseId,
      amount: dto.payment.amount,
      courseFee: dto.payment.courseFee,
      paymentDate: new Date(),
      dueDate: new Date(), // Due today
      paymentPlan: dto.payment.paymentPlan,
      paymentType: dto.payment.paymentType,
      paymentMethod: dto.payment.paymentMethod,
      paymentReference: dto.payment.paymentReference,
      status: "APPROVED", // Already paid via Paystack
      numberOfInstallments: dto.payment.numberOfInstallments,
      note: "Initial deposit paid via Paystack",
    });
    await this.paymentRepository.save(initialPayment);

    // Create future installment records
    for (const installment of dto.payment.installments) {
      // Skip the first one (already created as initial payment)
      if (installment.status === "DUE TODAY") {
        continue;
      }

      // Parse date from "MMM DD, YYYY" format
      const dueDate = this.parseDate(installment.date);

      const futurePayment = this.paymentRepository.create({
        studentId: savedStudent.id,
        courseId: dto.courseId,
        amount: installment.amount,
        courseFee: dto.payment.courseFee,
        paymentDate: null, // Not paid yet
        dueDate: dueDate,
        paymentPlan: dto.payment.paymentPlan,
        paymentType: dto.payment.paymentType,
        paymentMethod: null, // Will be set when paid
        paymentReference: null, // Will be set when paid
        status: "PENDING",
        numberOfInstallments: dto.payment.numberOfInstallments,
        note: installment.title,
      });
      await this.paymentRepository.save(futurePayment);
    }

    // 6. Update bank balance (if applicable)
    // Add the initial payment amount to the center's bank balance
    await this.updateBankBalance(dto.centerId, dto.payment.amount);

    // 7. Send notifications to finance officers
    await this.notifyFinanceOfficers(savedStudent);

    return savedStudent;
  }

  private parseDate(dateString: string): Date {
    // Parse "MMM DD, YYYY" format (e.g., "Jan 29, 2026")
    const months: { [key: string]: number } = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };

    const parts = dateString.split(" ");
    const month = months[parts[0]];
    const day = parseInt(parts[1].replace(",", ""));
    const year = parseInt(parts[2]);

    return new Date(year, month, day);
  }

  private async updateBankBalance(
    centerId: string,
    amount: number
  ): Promise<void> {
    // Update the center's bank balance
    // Implementation depends on your bank balance structure
    // Example:
    // await this.bankRepository.increment({ centerId }, 'balance', amount);
  }

  private async notifyFinanceOfficers(student: Student): Promise<void> {
    // Get all finance officers
    const financeOfficers = await this.userRepository.find({
      where: { role: "financeOfficer" },
    });

    // Get center and course details
    const center = await this.centerRepository.findOne({
      where: { id: student.centerId },
    });
    const course = await this.courseRepository.findOne({
      where: { id: student.courseId },
    });

    // Send notification to each finance officer
    for (const officer of financeOfficers) {
      await this.notificationService.create({
        userId: officer.id,
        type: "student_enrollment_pending",
        title: "New Student Enrollment Pending Approval",
        message: `${student.fullName} has been enrolled in ${
          course?.name || "a course"
        } at ${center?.name || "a center"}. Please review and approve.`,
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
}
```

### 3. Controller Implementation

```typescript
// students.controller.ts
import { Controller, Post, Body, UseGuards, Request } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { StudentsService } from "./students.service";
import { CreateStudentEnrollmentDto } from "./dto/create-student-enrollment.dto";

@Controller("students")
@UseGuards(AuthGuard("jwt"))
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post("enroll")
  async createEnrollment(
    @Body() dto: CreateStudentEnrollmentDto,
    @Request() req
  ) {
    // Extract user ID from JWT token (authenticated user)
    const userIdFromToken = req.user.id;

    // Use userId from DTO if provided, otherwise use from token
    // This ensures the student is always tied to the authenticated user
    const userId = dto.userId || userIdFromToken;

    if (!userId) {
      throw new UnauthorizedException(
        "User ID is required. User must be authenticated."
      );
    }

    return this.studentsService.createStudentEnrollment(dto, userId);
  }
}
```

---

## Response Structure

### Success Response (201 Created)

```json
{
  "id": "student_123",
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "08012345678",
  "centerId": "clx789ghi",
  "courseId": "clx111aaa",
  "status": "PENDING_APPROVAL",
  "enrolledDate": "2025-12-29T10:00:00.000Z",
  "studentId": "TT-637N",
  "guardians": [
    {
      "id": "guardian_123",
      "fullname": "Jane Doe",
      "phone": "08012345678",
      "email": "guardian@example.com"
    }
  ],
  "payments": [
    {
      "id": "payment_123",
      "amount": 300000,
      "status": "APPROVED",
      "paymentReference": "TT-1735467890-abc123xyz",
      "paymentDate": "2025-12-29T10:00:00.000Z"
    }
  ]
}
```

### Error Response (400 Bad Request)

```json
{
  "error": "Validation failed",
  "message": "centerId is required"
}
```

### Error Response (500 Internal Server Error)

```json
{
  "error": "Internal server error",
  "message": "Failed to create student enrollment"
}
```

---

## Database Schema Requirements

### Student Table

- `id` (string, primary key)
- `userId` (string, foreign key to users table)
- `fullName` (string)
- `email` (string)
- `phone` (string, nullable)
- `address` (string, required) - Student's residential address
- `centerId` (string, foreign key to centers table)
- `courseId` (string, foreign key to courses table)
- `status` (enum: 'ACTIVE', 'PENDING_APPROVAL', 'DROPOUT', 'GRADUATED', 'ON_HOLD')
- `enrolledDate` (datetime)
- `programType` (enum)
- `studentId` (string, unique) - Auto-generated

### Guardian Table

- `id` (string, primary key)
- `studentId` (string, foreign key to students table)
- `fullname` (string)
- `phone` (string, nullable)
- `email` (string, nullable)
- `address` (string, nullable) - Guardian's residential address

### Payment Table

- `id` (string, primary key)
- `studentId` (string, foreign key to students table)
- `courseId` (string, foreign key to courses table)
- `amount` (number)
- `courseFee` (number)
- `paymentDate` (datetime, nullable)
- `dueDate` (datetime)
- `paymentPlan` (string)
- `paymentType` (string)
- `paymentMethod` (string, nullable)
- `paymentReference` (string, nullable)
- `status` (enum: 'PENDING', 'APPROVED', 'REJECTED')
- `numberOfInstallments` (number)
- `note` (text, nullable)

### Course Enrollment Table

- `id` (string, primary key)
- `studentId` (string, foreign key to students table)
- `courseId` (string, foreign key to courses table)
- `enrolledAt` (datetime)
- `status` (string)

---

## Important Notes

1. **Student ID Generation**: Generate a unique student ID (e.g., "TT-637N") based on your business rules
2. **Payment Status**: The initial payment should be marked as `APPROVED` since it's already paid via Paystack
3. **Future Installments**: Create payment records for future installments with `status: 'PENDING'`
4. **Bank Balance**: Update the center's bank balance with the initial deposit amount
5. **Notifications**: Send notifications to finance officers for approval
6. **Error Handling**: Handle validation errors, duplicate enrollments, and database errors gracefully
7. **Transaction**: Wrap the entire operation in a database transaction to ensure data consistency

---

## Testing

### Test Payload Example

```json
{
  "profile": {
    "trainingLocation": "clx123abc",
    "centre": "clx789ghi",
    "studentAddress": "123 Main Street, Wuse 2, Abuja, FCT",
    "guardianName": "Jane Doe",
    "guardianPhone": "08012345678",
    "guardianEmail": "jane@example.com",
    "guardianAddress": "456 Guardian Street, Garki, Abuja, FCT",
    "hasGuardian": true
  },
  "centerId": "clx789ghi",
  "courseId": "clx111aaa",
  "payment": {
    "amount": 300000,
    "courseFee": 600000,
    "numberOfInstallments": 3,
    "paymentPlan": "installment",
    "paymentType": "monthly",
    "paymentMethod": "paystack",
    "paymentReference": "TT-1735467890-test123",
    "installments": [
      {
        "title": "Enrolment Deposit",
        "date": "Dec 29, 2025",
        "amount": 300000,
        "status": "DUE TODAY"
      },
      {
        "title": "Installment 1 of 3",
        "date": "Jan 29, 2026",
        "amount": 100000
      },
      {
        "title": "Installment 2 of 3",
        "date": "Feb 29, 2026",
        "amount": 100000
      },
      {
        "title": "Installment 3 of 3",
        "date": "Mar 29, 2026",
        "amount": 100000
      }
    ]
  }
}
```

---

## Environment Variables

Make sure to set the following environment variables:

```env
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
API_BASE_URL=http://localhost:8000
```

---

## Next Steps

1. Implement the backend endpoint according to this guide
2. Test with the provided payload structure
3. Verify that all records are created correctly
4. Ensure notifications are sent to finance officers
5. Test the complete flow from frontend to backend

---

## User-Student Relationship Requirements

### Relationship Rules

1. **Student MUST be tied to a User**: Every Student record MUST have a `userId` field that references a User.

   - This is a **required** relationship (NOT optional)
   - The Student entity should have: `userId: string` (required, foreign key to User)

2. **User may NOT have a Student**: A User account can exist without a Student profile.

   - This is an **optional** relationship from the User side
   - Users can be staff, admins, or other roles without being students

3. **One User to One Student**: Typically, one User should have one Student profile (one-to-one relationship).
   - However, the system may allow multiple student profiles per user if needed
   - Check your business requirements

### Database Schema Example

```typescript
// User Entity (already exists)
@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  email: string;

  @Column()
  fullName: string;

  // Optional: One-to-one relationship to Student
  @OneToOne(() => Student, (student) => student.user)
  student?: Student;
}

// Student Entity (must include userId)
@Entity("students")
export class Student {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  fullName: string;

  @Column()
  email: string;

  // REQUIRED: Foreign key to User
  @Column({ nullable: false })
  userId: string;

  // REQUIRED: Relationship to User
  @ManyToOne(() => User, (user) => user.student)
  @JoinColumn({ name: "userId" })
  user: User;

  @Column()
  centerId: string;

  @Column()
  courseId: string;

  // ... other fields
}
```

### Implementation Checklist

- [ ] Student entity has `userId` field (required, NOT nullable)
- [ ] Student entity has `@ManyToOne` relationship to User
- [ ] User entity has optional `@OneToOne` relationship to Student
- [ ] Controller extracts `userId` from JWT token (`req.user.id`)
- [ ] Service method accepts `userId` parameter
- [ ] Service method sets `userId` when creating Student record
- [ ] Database migration includes `userId` foreign key constraint
- [ ] Backend validates that user exists before creating student
