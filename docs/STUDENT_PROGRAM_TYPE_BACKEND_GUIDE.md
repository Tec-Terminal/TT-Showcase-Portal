# Student Program Type - Backend Implementation Guide

## Overview

This guide implements a program type system for students. Students can be enrolled in one of three program types: `REGULAR_STUDENT`, `JPTP`, or `INTERNSHIP`. The system allows finance officers or administrators to enroll students to JPTP or Internship programs directly from the student actions menu.

## Workflow Summary

1. **Student Program Types:**
   - Default: `REGULAR_STUDENT` (when student is first enrolled)
   - Can be changed to `JPTP` or `INTERNSHIP` via action buttons
   - Filter students by program type

2. **Enrollment Process:**
   - Finance officer/admin clicks "Enroll to JPTP" or "Enroll to Internship" button
   - Student's `programType` field is updated
   - Student list refreshes to show updated program type

## Database Schema Updates

### 1. Update Student Model

Add `programType` field to the students table:

```sql
-- Add program_type field to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS program_type ENUM('REGULAR_STUDENT', 'JPTP', 'INTERNSHIP') DEFAULT 'REGULAR_STUDENT';

-- Add index for filtering performance
CREATE INDEX IF NOT EXISTS idx_student_program_type ON students(program_type);

-- Set existing students to REGULAR_STUDENT if null
UPDATE students 
SET program_type = 'REGULAR_STUDENT' 
WHERE program_type IS NULL;
```

## API Endpoints

### 1. Enroll Student to Program

**Endpoint:** `PATCH /students/:id/enroll-program`

**Description:** Updates a student's program type to JPTP or INTERNSHIP.

**Authorization:** Finance Officer, COO, or CEO

**Request Body:**
```json
{
  "programType": "JPTP"  // or "INTERNSHIP"
}
```

**Response:**
```json
{
  "id": "student_123",
  "fullName": "John Doe",
  "programType": "JPTP",
  "status": "ACTIVE",
  // ... other student fields
}
```

**Implementation:**

```typescript
// student.controller.ts
@Patch(':id/enroll-program')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('financeOfficer', 'coo', 'ceo', 'admin')
async enrollStudentToProgram(
  @Param('id') studentId: string,
  @Body() enrollDto: EnrollStudentToProgramDto,
  @Request() req: any,
): Promise<Student> {
  return this.studentService.enrollStudentToProgram(
    studentId,
    enrollDto.programType,
    req.user.id,
  );
}
```

```typescript
// student.service.ts
async enrollStudentToProgram(
  studentId: string,
  programType: 'JPTP' | 'INTERNSHIP',
  userId: string,
): Promise<Student> {
  const student = await this.studentRepository.findOne({
    where: { id: studentId },
  });

  if (!student) {
    throw new NotFoundException('Student not found');
  }

  // Validate program type
  if (programType !== 'JPTP' && programType !== 'INTERNSHIP') {
    throw new BadRequestException('Invalid program type. Must be JPTP or INTERNSHIP');
  }

  // Check if student is already in this program
  if (student.programType === programType) {
    throw new BadRequestException(`Student is already enrolled in ${programType} program`);
  }

  // Update student program type
  await this.studentRepository.update(studentId, {
    programType: programType as ProgramType,
  });

  const updatedStudent = await this.studentRepository.findOne({
    where: { id: studentId },
    relations: ['center', 'courses', 'guardians'],
  });

  // Optional: Log the enrollment change
  await this.auditLogService.log({
    action: 'student_program_enrolled',
    entityType: 'student',
    entityId: studentId,
    userId,
    metadata: {
      previousProgramType: student.programType,
      newProgramType: programType,
      studentName: student.fullName,
    },
  });

  // Optional: Send notification to student
  if (updatedStudent.userId) {
    await this.notificationService.create({
      userId: updatedStudent.userId,
      type: 'program_enrolled',
      title: `Enrolled to ${programType} Program`,
      message: `You have been enrolled to the ${programType} program.`,
      link: `/dashboard/student/profile`,
      metadata: {
        programType,
        studentId,
      },
    });
  }

  return updatedStudent;
}
```

### 2. Get Students (Update Existing)

**Endpoint:** `GET /students`

**Query Parameters:**
- `programType` (optional): Filter by program type (`REGULAR_STUDENT`, `JPTP`, `INTERNSHIP`)

**Example:**
```
GET /students?programType=JPTP
```

**Updated Response:** Include `programType` in student objects:

```json
[
  {
    "id": "student_123",
    "fullName": "John Doe",
    "programType": "JPTP",
    "status": "ACTIVE",
    // ... other student fields
  }
]
```

**Implementation:**

```typescript
// student.service.ts
async findAll(
  filters?: {
    centerId?: string;
    status?: string;
    programType?: ProgramType;
  },
): Promise<Student[]> {
  const queryBuilder = this.studentRepository
    .createQueryBuilder('student')
    .leftJoinAndSelect('student.center', 'center')
    .leftJoinAndSelect('student.courses', 'courses')
    .leftJoinAndSelect('student.guardians', 'guardians')
    .where('student.deletedAt IS NULL');

  if (filters?.centerId) {
    queryBuilder.andWhere('student.centerId = :centerId', {
      centerId: filters.centerId,
    });
  }

  if (filters?.status) {
    queryBuilder.andWhere('student.status = :status', {
      status: filters.status,
    });
  }

  if (filters?.programType) {
    queryBuilder.andWhere('student.programType = :programType', {
      programType: filters.programType,
    });
  }

  return queryBuilder.getMany();
}
```

### 3. Create Student (Update Existing)

**Endpoint:** `POST /students`

**Updated Request:** Include `programType` (optional, defaults to `REGULAR_STUDENT`):

```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "programType": "REGULAR_STUDENT",  // Optional, defaults to REGULAR_STUDENT
  // ... other student fields
}
```

**Implementation:**

```typescript
// student.service.ts
async createStudent(
  createStudentDto: CreateStudentDto,
  userId: string,
): Promise<Student> {
  const studentData = {
    ...createStudentDto,
    programType: createStudentDto.programType || 'REGULAR_STUDENT',
    status: 'PENDING_APPROVAL', // As per previous implementation
  };

  const student = await this.studentRepository.save({
    ...studentData,
    createdBy: userId,
  });

  return student;
}
```

### 4. Update Student (Update Existing)

**Endpoint:** `PATCH /students/:id`

**Updated Request:** Include `programType` (optional):

```json
{
  "fullName": "John Doe",
  "programType": "JPTP",  // Optional
  // ... other student fields
}
```

## DTOs

### EnrollStudentToProgramDto

```typescript
// dto/enroll-student-to-program.dto.ts
import { IsEnum, IsNotEmpty } from 'class-validator';

export class EnrollStudentToProgramDto {
  @IsNotEmpty({ message: 'Program type is required' })
  @IsEnum(['JPTP', 'INTERNSHIP'], {
    message: 'Program type must be either JPTP or INTERNSHIP',
  })
  programType: 'JPTP' | 'INTERNSHIP';
}
```

### Update CreateStudentDto and UpdateStudentDto

```typescript
// dto/create-student.dto.ts
import { IsEnum, IsOptional } from 'class-validator';

export class CreateStudentDto {
  // ... existing fields
  
  @IsOptional()
  @IsEnum(['REGULAR_STUDENT', 'JPTP', 'INTERNSHIP'], {
    message: 'Program type must be REGULAR_STUDENT, JPTP, or INTERNSHIP',
  })
  programType?: 'REGULAR_STUDENT' | 'JPTP' | 'INTERNSHIP';
}
```

```typescript
// dto/update-student.dto.ts
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateStudentDto {
  // ... existing fields
  
  @IsOptional()
  @IsEnum(['REGULAR_STUDENT', 'JPTP', 'INTERNSHIP'], {
    message: 'Program type must be REGULAR_STUDENT, JPTP, or INTERNSHIP',
  })
  programType?: 'REGULAR_STUDENT' | 'JPTP' | 'INTERNSHIP';
}
```

## TypeScript Types

### ProgramType Enum

```typescript
// types/program-type.enum.ts
export enum ProgramType {
  REGULAR_STUDENT = 'REGULAR_STUDENT',
  JPTP = 'JPTP',
  INTERNSHIP = 'INTERNSHIP',
}
```

### Student Entity Update

```typescript
// entities/student.entity.ts
import { Column, Entity, ... } from 'typeorm';
import { ProgramType } from '../enums/program-type.enum';

@Entity('students')
export class Student {
  // ... existing fields

  @Column({
    type: 'enum',
    enum: ProgramType,
    default: ProgramType.REGULAR_STUDENT,
  })
  programType: ProgramType;
}
```

## Migration Script

```sql
-- Migration: Add program_type field to students table

-- 1. Add program_type column
ALTER TABLE students
ADD COLUMN IF NOT EXISTS program_type ENUM('REGULAR_STUDENT', 'JPTP', 'INTERNSHIP') DEFAULT 'REGULAR_STUDENT';

-- 2. Add index for filtering performance
CREATE INDEX IF NOT EXISTS idx_student_program_type ON students(program_type);

-- 3. Set existing students to REGULAR_STUDENT
UPDATE students 
SET program_type = 'REGULAR_STUDENT' 
WHERE program_type IS NULL;

-- 4. Verify the update
SELECT program_type, COUNT(*) as count 
FROM students 
GROUP BY program_type;
```

## Business Logic

### Enrollment Rules

1. **Authorization:**
   - Only finance officers, COO, CEO, and admins can enroll students to programs
   - Regular users cannot change program types

2. **Validation:**
   - Cannot enroll to the same program type (e.g., JPTP → JPTP)
   - Can switch between programs (e.g., REGULAR_STUDENT → JPTP → INTERNSHIP)
   - Program type must be valid enum value

3. **Default Behavior:**
   - New students default to `REGULAR_STUDENT`
   - Existing students without program type are set to `REGULAR_STUDENT`

4. **Audit Trail:**
   - All program enrollment changes must be logged
   - Track previous and new program types
   - Record who made the change and when

## Frontend Integration Notes

The frontend has been updated to:
1. Show "Enroll to JPTP" and "Enroll to Internship" buttons in student actions dropdown
2. Hide buttons if student is already in that program
3. Filter students by program type
4. Display program type in student table (if needed)
5. Call `/api/students/:id/enroll-program` endpoint

Backend should:
1. Validate program type enum
2. Check authorization (finance officer or higher)
3. Update student program type
4. Return updated student data
5. Log the enrollment change
6. Send notifications (optional)

## Testing Checklist

### Program Enrollment
- [ ] Finance officer can enroll student to JPTP
- [ ] Finance officer can enroll student to Internship
- [ ] Cannot enroll to same program type
- [ ] Can switch between programs (REGULAR → JPTP → INTERNSHIP)
- [ ] Non-authorized users cannot enroll students
- [ ] Student not found returns 404
- [ ] Invalid program type returns 400

### Filtering
- [ ] Can filter students by REGULAR_STUDENT
- [ ] Can filter students by JPTP
- [ ] Can filter students by INTERNSHIP
- [ ] Multiple program type filters work correctly
- [ ] Filter works with status filter simultaneously

### Edge Cases
- [ ] Student already in JPTP cannot be enrolled to JPTP again
- [ ] Student already in INTERNSHIP cannot be enrolled to INTERNSHIP again
- [ ] Program type defaults to REGULAR_STUDENT for new students
- [ ] Existing students without program type are set to REGULAR_STUDENT

## Security Considerations

1. **Authorization:**
   - Use role-based access control (RBAC)
   - Verify user has finance officer role or higher
   - Consider adding IP restrictions for sensitive operations

2. **Validation:**
   - Validate program type enum
   - Check student exists before enrollment
   - Prevent duplicate enrollments

3. **Audit Trail:**
   - Log all program enrollment changes
   - Track who enrolled what and when
   - Store previous and new program types

4. **Data Integrity:**
   - Use database transactions for atomic updates
   - Ensure enum constraints are enforced
   - Handle concurrent enrollment attempts

## Notification Templates

### Program Enrolled (Student)
```
Title: Enrolled to {ProgramType} Program
Message: You have been enrolled to the {ProgramType} program.
Link: /dashboard/student/profile
```

## Summary

This implementation provides:
1. ✅ Program type field in student model (REGULAR_STUDENT, JPTP, INTERNSHIP)
2. ✅ Enrollment endpoint to change program type
3. ✅ Action buttons in frontend to enroll students
4. ✅ Program type filter in student list
5. ✅ Proper authorization and validation
6. ✅ Audit trail support
7. ✅ Default value handling

The system allows flexible program management while maintaining data integrity and proper access control.

