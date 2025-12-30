# File Upload Implementation - Student Payment Receipts & Profile Images

## Overview

This document describes the implementation of file upload functionality for student payment receipts and profile images. Files are uploaded to Amazon S3 and metadata is stored in a `Files` table in the database.

## Frontend Implementation

### Files Created/Modified

1. **API Routes:**
   - `src/app/api/files/upload/route.ts` - Handles file upload requests
   - `src/app/api/files/student/[studentId]/route.ts` - Fetches files for a student

2. **Types:**
   - `src/types/academic/file.interface.ts` - TypeScript interfaces for File model

3. **Client Functions:**
   - `src/lib/client-network.ts` - Added `uploadFileClient` and `getStudentFilesClient` functions

4. **Components:**
   - `src/content/dashboard/academic/students/ProofOfPaymentUpload.tsx` - Updated with drag & drop upload functionality
   - `src/content/dashboard/academic/students/StudentDetails.tsx` - Added profile image upload functionality

## Features Implemented

### 1. Payment Receipt Upload
- Drag & drop file upload
- Click to upload
- File validation (PDF, JPG, PNG, max 5MB)
- Display of recently uploaded receipts
- Real-time upload status

### 2. Profile Image Upload
- Upload button on student profile (appears on hover)
- File validation (JPG, PNG, max 5MB)
- Automatic display of uploaded image
- Fallback to existing student.image if no uploaded image

## Database Schema Requirements

The backend needs to implement a `Files` table with the following structure:

```prisma
model File {
  id          String   @id @default(uuid())
  studentId   String
  fileName    String
  fileType    String   // "payment_receipt" | "profile_image"
  fileUrl     String   // S3 object URL
  fileSize    Int      // Size in bytes
  mimeType    String   // e.g., "image/jpeg", "application/pdf"
  uploadedBy  String?  // User ID who uploaded the file
  uploadedAt  DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  student     Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@index([studentId])
  @@index([fileType])
  @@index([studentId, fileType])
  @@map("files")
}
```

And update the Student model to include the relation:

```prisma
model Student {
  // ... existing fields
  files       File[]
}
```

## Backend API Requirements

### 1. POST `/files/upload`

**Purpose:** Upload a file to S3 and save metadata to database

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body:
  - `file`: File (PDF, JPG, or PNG, max 5MB)
  - `studentId`: string (required)
  - `fileType`: "payment_receipt" | "profile_image" (required)

**Response:**
```json
{
  "id": "file-uuid",
  "studentId": "student-uuid",
  "fileName": "receipt.pdf",
  "fileType": "payment_receipt",
  "fileUrl": "https://s3.amazonaws.com/bucket/path/to/file.pdf",
  "fileSize": 1024000,
  "mimeType": "application/pdf",
  "uploadedBy": "user-uuid",
  "uploadedAt": "2025-12-03T15:00:00Z",
  "createdAt": "2025-12-03T15:00:00Z",
  "updatedAt": "2025-12-03T15:00:00Z"
}
```

**Backend Implementation Steps:**
1. Validate file (type, size)
2. Generate unique filename (e.g., `{studentId}/{fileType}/{timestamp}-{originalName}`)
3. Upload to S3 using AWS SDK
4. Get S3 object URL
5. Save file metadata to database
6. Return file record

### 2. GET `/files/student/:studentId`

**Purpose:** Fetch all files for a student

**Query Parameters:**
- `fileType` (optional): Filter by "payment_receipt" or "profile_image"

**Response:**
```json
[
  {
    "id": "file-uuid",
    "studentId": "student-uuid",
    "fileName": "receipt.pdf",
    "fileType": "payment_receipt",
    "fileUrl": "https://s3.amazonaws.com/bucket/path/to/file.pdf",
    "fileSize": 1024000,
    "mimeType": "application/pdf",
    "uploadedBy": "user-uuid",
    "uploadedAt": "2025-12-03T15:00:00Z",
    "createdAt": "2025-12-03T15:00:00Z",
    "updatedAt": "2025-12-03T15:00:00Z"
  }
]
```

## S3 Configuration

The backend needs to configure AWS S3 with:
- Bucket name (store in environment variable)
- AWS credentials (Access Key ID, Secret Access Key)
- Region
- CORS configuration (if needed for direct browser uploads)

### Recommended S3 Bucket Structure:
``` 
bucket-name/
  students/
    {studentId}/
      payment_receipts/
        {timestamp}-{originalFileName}
      profile_images/
        {timestamp}-{originalFileName}
```

## Environment Variables

Backend should have:
```env
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name
``` 

## Security Considerations

1. **File Validation:**
   - Validate file type (MIME type, not just extension)
   - Validate file size (5MB max)
   - Scan for malware (optional but recommended)

2. **Access Control:**
   - Verify user has permission to upload files for the student
   - Verify student belongs to user's center (if using RBAC)

3. **S3 Security:**
   - Use IAM roles with least privilege
   - Enable S3 bucket encryption
   - Set appropriate bucket policies
   - Consider using presigned URLs for temporary access

4. **File Naming:**
   - Use unique filenames to prevent overwrites
   - Sanitize filenames to prevent path traversal

## Testing Checklist

- [ ] Upload payment receipt (PDF)
- [ ] Upload payment receipt (JPG)
- [ ] Upload payment receipt (PNG)
- [ ] Upload profile image (JPG)
- [ ] Upload profile image (PNG)
- [ ] Verify file size validation (reject > 5MB)
- [ ] Verify file type validation (reject invalid types)
- [ ] Verify files appear in "Recently Uploaded" list
- [ ] Verify profile image displays correctly
- [ ] Verify files are linked to correct student
- [ ] Verify S3 upload works
- [ ] Verify database records are created correctly
- [ ] Test drag & drop functionality
- [ ] Test click to upload functionality

## Notes

- The frontend proxies file uploads through Next.js API routes to avoid CORS issues
- Files are validated on both frontend and backend (defense in depth)
- The `uploadedBy` field should be populated with the current user's ID from the session
- For profile images, consider updating the `student.image` field to point to the uploaded file URL (optional)

