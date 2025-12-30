# Address Fields Backend Implementation Guide

This guide provides the complete payload structure and implementation steps for adding student and guardian address fields to the onboarding backend.

## Updated Payload Structure

### Complete Request Payload

```json
{
  "userId": "user_123abc",
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
      }
    ]
  }
}
```

### New Fields Added

#### Profile Object - New Fields

1. **`studentAddress`** (string, **required**)
   - Student's residential address
   - Example: `"123 Main Street, Wuse 2, Abuja, FCT"`
   - Must be provided for all enrollments

2. **`guardianAddress`** (string, **optional**)
   - Guardian's residential address
   - Example: `"456 Guardian Street, Garki, Abuja, FCT"`
   - Required if `hasGuardian` is `true`
   - Can be `null` if `hasGuardian` is `false`

---

## Backend Implementation Steps

### Step 1: Update DTO (Data Transfer Object)

**File:** `dto/create-student-enrollment.dto.ts`

```typescript
export class CreateStudentEnrollmentDto {
  userId?: string;

  profile: {
    trainingLocation: string;
    centre: string;
    studentAddress: string; // ✅ NEW: Required field
    guardianName?: string;
    guardianPhone?: string;
    guardianEmail?: string;
    guardianAddress?: string; // ✅ NEW: Optional field (required if hasGuardian is true)
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

### Step 2: Update Student Entity

**File:** `entities/student.entity.ts`

Add the `address` field to the Student entity:

```typescript
@Entity("students")
export class Student {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  fullName: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column() // ✅ NEW: Student address field (required)
  address: string;

  @Column({ nullable: false })
  userId: string;

  @Column()
  centerId: string;

  @Column()
  courseId: string;

  // ... other fields
}
```

### Step 3: Update Guardian Entity

**File:** `entities/guardian.entity.ts`

Add the `address` field to the Guardian entity:

```typescript
@Entity("guardians")
export class Guardian {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  studentId: string;

  @Column()
  fullname: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true }) // ✅ NEW: Guardian address field (optional)
  address: string;

  // ... other fields
}
```

### Step 4: Update Service Implementation

**File:** `students.service.ts`

Update the `createStudentEnrollment` method to save addresses:

```typescript
async createStudentEnrollment(
  dto: CreateStudentEnrollmentDto,
  userId: string
): Promise<Student> {
  // ... existing code ...

  // 2. Create Student record - MUST link to User
  const student = this.studentRepository.create({
    userId: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone || null,
    address: dto.profile.studentAddress, // ✅ NEW: Save student address
    centerId: dto.centerId,
    courseId: dto.courseId,
    status: "PENDING_APPROVAL",
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
      address: dto.profile.guardianAddress || null, // ✅ NEW: Save guardian address
    });
    await this.guardianRepository.save(guardian);
  }

  // ... rest of the code ...
}
```

### Step 5: Add Validation

**File:** `dto/create-student-enrollment.dto.ts`

Add validation decorators:

```typescript
import { IsString, IsNotEmpty, ValidateIf } from 'class-validator';

export class CreateStudentEnrollmentDto {
  // ... other fields ...

  profile: {
    @IsString()
    @IsNotEmpty()
    trainingLocation: string;

    @IsString()
    @IsNotEmpty()
    centre: string;

    @IsString()
    @IsNotEmpty()
    studentAddress: string; // ✅ Required validation

    @IsString()
    @ValidateIf((o) => o.hasGuardian === true)
    @IsNotEmpty()
    guardianName?: string;

    @IsString()
    guardianPhone?: string;

    @IsString()
    guardianEmail?: string;

    @IsString()
    @ValidateIf((o) => o.hasGuardian === true)
    @IsNotEmpty()
    guardianAddress?: string; // ✅ Required if hasGuardian is true

    hasGuardian: boolean;
  };

  // ... other fields ...
}
```

### Step 6: Create Database Migration

**File:** `migrations/XXXXXX-add-address-fields.ts`

```typescript
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAddressFields1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add address column to students table
    await queryRunner.addColumn(
      'students',
      new TableColumn({
        name: 'address',
        type: 'varchar',
        length: '500',
        isNullable: false,
        default: "''", // Temporary default for existing records
      })
    );

    // Add address column to guardians table
    await queryRunner.addColumn(
      'guardians',
      new TableColumn({
        name: 'address',
        type: 'varchar',
        length: '500',
        isNullable: true,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('guardians', 'address');
    await queryRunner.dropColumn('students', 'address');
  }
}
```

---

## Database Schema Updates

### Students Table

**New Column:**
- `address` (varchar(500), **NOT NULL**)
  - Stores the student's residential address
  - Required for all students

### Guardians Table

**New Column:**
- `address` (varchar(500), **NULLABLE**)
  - Stores the guardian's residential address
  - Optional, but should be provided when guardian exists

---

## Validation Rules

### Student Address
- **Required:** Yes
- **Type:** String
- **Max Length:** 500 characters (adjust based on your needs)
- **Validation:** Must not be empty

### Guardian Address
- **Required:** Only if `hasGuardian` is `true`
- **Type:** String
- **Max Length:** 500 characters (adjust based on your needs)
- **Validation:** Must not be empty when guardian exists

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
      }
    ]
  }
}
```

### Test Cases

1. **Test with student address only (no guardian)**
   - `hasGuardian: false`
   - `studentAddress` must be provided
   - `guardianAddress` can be omitted

2. **Test with both addresses (with guardian)**
   - `hasGuardian: true`
   - Both `studentAddress` and `guardianAddress` must be provided

3. **Test validation errors**
   - Missing `studentAddress` → Should return 400 error
   - `hasGuardian: true` but missing `guardianAddress` → Should return 400 error

---

## Summary Checklist

- [ ] Update `CreateStudentEnrollmentDto` to include `studentAddress` and `guardianAddress`
- [ ] Add `address` field to Student entity
- [ ] Add `address` field to Guardian entity
- [ ] Update service method to save addresses
- [ ] Add validation decorators
- [ ] Create database migration
- [ ] Run migration
- [ ] Update API documentation
- [ ] Test with frontend
- [ ] Verify addresses are saved correctly
- [ ] Test validation rules

---

## Notes

1. **Student Address is Required**: All students must have an address. This is a required field.

2. **Guardian Address is Conditional**: Guardian address is only required when `hasGuardian` is `true`. If there's no guardian, this field can be `null`.

3. **Data Migration**: If you have existing students/guardians without addresses, you'll need to:
   - Either make the field nullable temporarily
   - Or provide default values during migration
   - Or update existing records manually

4. **Field Length**: Consider the maximum address length. 500 characters is usually sufficient, but adjust based on your needs.

5. **Address Format**: The frontend sends addresses as plain text strings. If you need structured address data (street, city, state, etc.), you'll need to update the frontend form to collect these separately.

