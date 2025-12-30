# Bulk Upload Students - Implementation Summary

## Overview

The bulk upload feature for students has been implemented on the backend. This feature allows administrators to upload a list of students from an Excel file, similar to the archive bulk upload functionality.

## What Was Implemented

### 1. Database Schema Changes

**File: `prisma/schema.prisma`**

- Added `oldId` field to `Student` model to track the ID from the legacy system
- Added `LEGACY` status to `PaymentStatus` enum to track bulk upload payments
- Added index on `oldId` field for better query performance

### 2. DTOs (Data Transfer Objects)

**Files:**
- `src/student/dto/bulk-upload-student.dto.ts` - Main DTO for bulk upload request
- `src/student/dto/bulk-upload-student-record.dto.ts` - DTO for individual student records

**Key Fields:**
- `centerId` - Selected from modal on frontend
- `records` - Array of student records with:
  - `oldId` - Old Student ID from legacy system
  - `fullName`, `email`, `phone`, `address`
  - `birthDate`, `enrolledDate`
  - `courseId` - Course oldId to match with course.oldId in database
  - `courseFee` - Total course fee
  - `payments` - Array of payment installments (Payment 1, Payment 2, etc.)

### 3. Service Implementation

**File: `src/student/student.service.ts`**

Added `bulkUploadStudents()` method that:
- Validates center exists
- Processes each record in a transaction
- Checks for duplicate `oldId` and `email`
- Matches courses by `oldId` (searches for `course.oldId` matching the provided `courseId`)
- Creates students with `ACTIVE` status
- Sets `oldId` field on student record
- Creates payment plans with:
  - `paymentPlan`: "installment"
  - `paymentType`: "Monthly"
  - `paymentMethod`: "CASH"
- Creates payments with `LEGACY` status
- **Does NOT update bank balance** (as required)
- Handles multiple payment installments
- Returns detailed results (success, failed, skipped counts and errors)

### 4. Controller Endpoint

**File: `src/student/student.controller.ts`**

Added `POST /students/bulk-upload` endpoint:
- Protected with `@Roles(UserRole.ADMIN)` decorator
- Accepts `BulkUploadStudentDto` in request body
- Returns upload results with success/failed/skipped counts

### 5. Frontend Implementation Guide

**File: `docs/BULK_UPLOAD_STUDENTS_FRONTEND_GUIDE.md`**

Complete guide for frontend implementation including:
- API endpoint details
- Request/response structures
- Excel file parsing
- Data transformation
- Modal component structure
- Error handling
- Testing checklist

## Next Steps

### 1. Run Database Migration

You need to create and apply a database migration for the schema changes:

```bash
# Create migration
npx prisma migrate dev --name add_oldid_and_legacy_status

# This will:
# - Create a new migration file
# - Apply the migration to your database
# - Regenerate the Prisma client
```

**Note:** If you encounter file lock errors on Windows, try:
- Closing your IDE/editor
- Stopping any running processes
- Running the command again

### 2. Regenerate Prisma Client

If the migration doesn't automatically regenerate the client:

```bash
npx prisma generate
```

### 3. Verify Implementation

After running the migration, verify that:
- The `oldId` field exists on the `Student` table
- The `LEGACY` value exists in the `PaymentStatus` enum
- The Prisma client types are updated (no TypeScript errors)

### 4. Test the Endpoint

You can test the endpoint using a tool like Postman or curl:

```bash
curl -X POST http://localhost:3000/students/bulk-upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "centerId": "center_id_here",
    "records": [
      {
        "oldId": "OLD-001",
        "fullName": "John Doe",
        "email": "john@example.com",
        "phone": "1234567890",
        "address": "123 Main St",
        "birthDate": "1990-01-01",
        "enrolledDate": "2024-01-15",
        "courseId": "COURSE-OLD-ID",
        "courseFee": 50000,
        "payments": [
          {
            "amount": 25000,
            "date": "2024-01-15",
            "balance": 25000
          },
          {
            "amount": 25000,
            "date": "2024-02-15",
            "balance": 0
          }
        ]
      }
    ]
  }'
```

### 5. Frontend Implementation

Follow the guide in `docs/BULK_UPLOAD_STUDENTS_FRONTEND_GUIDE.md` to implement:
- Upload button
- Modal with center selection
- Excel file parsing
- API integration
- Results display

## Key Features

### Course Matching
- The backend searches for courses where `course.oldId` matches the provided `courseId`
- If no match is found, the record fails with an error message

### Payment Handling
- All payments are created with `LEGACY` status
- Bank balance is **NOT** updated (as required)
- Default values are set automatically:
  - `paymentPlan`: "installment"
  - `paymentType`: "Monthly"
  - `paymentMethod`: "CASH"

### Student Status
- All students created via bulk upload have `ACTIVE` status
- This differs from regular enrollment which uses `PENDING_APPROVAL`

### Duplicate Handling
- Records with duplicate `oldId` are skipped
- Records with duplicate `email` are skipped
- Skipped records are returned in the response for review

### Error Reporting
- Detailed error messages for each failed record
- Row numbers for easy identification
- Reasons for skipped records

## Files Modified/Created

### Modified Files:
1. `prisma/schema.prisma` - Added `oldId` field and `LEGACY` status
2. `src/student/student.service.ts` - Added `bulkUploadStudents()` method
3. `src/student/student.controller.ts` - Added bulk upload endpoint

### Created Files:
1. `src/student/dto/bulk-upload-student.dto.ts` - Main DTO
2. `src/student/dto/bulk-upload-student-record.dto.ts` - Record DTO
3. `docs/BULK_UPLOAD_STUDENTS_FRONTEND_GUIDE.md` - Frontend guide
4. `docs/BULK_UPLOAD_STUDENTS_IMPLEMENTATION_SUMMARY.md` - This file

## Important Notes

1. **Bank Balance**: Legacy payments do NOT update bank balance, as per requirements
2. **Payment Status**: All bulk upload payments use `LEGACY` status for tracking
3. **Student Status**: Bulk upload students are created with `ACTIVE` status
4. **Course Matching**: Ensure courses have `oldId` values set to match the Excel data
5. **Transaction Safety**: Each record is processed in its own transaction for data integrity

## Support

If you encounter any issues:
1. Check that the migration was applied successfully
2. Verify Prisma client was regenerated
3. Check that courses have `oldId` values set
4. Review error messages in the API response
5. Check the frontend guide for implementation details





