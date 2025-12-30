# Backend Implementation Guide: Multiple Faculty Selection for Batches

## Overview
This guide outlines the backend changes required to support multiple faculty members for a single batch. Previously, a batch could only have one faculty. Now, a batch can have multiple faculty members, but still has a single course assigned to the batch.

## API Changes

### Request Payload Structure

#### Before (Old Structure)
```json
{
  "courseId": "course-123",
  "centerId": "center-456",
  "startDate": "2025-01-15",
  "endDate": "2025-04-15",
  "duration": "3",
  "status": "Active",
  "schedules": [
    {
      "day": "Monday",
      "startTime": "02:00 PM",
      "endTime": "04:00 PM",
      "duration": 2
    }
  ],
  "facultyId": "faculty-789",
  "students": ["student-1", "student-2"]
}
```

#### After (New Structure)
```json
{
  "courseId": "course-123",
  "centerId": "center-456",
  "startDate": "2025-01-15",
  "endDate": "2025-04-15",
  "duration": "3",
  "status": "Active",
  "schedules": [
    {
      "day": "Monday",
      "startTime": "02:00 PM",
      "endTime": "04:00 PM",
      "duration": 2
    }
  ],
  "facultyIds": ["faculty-789", "faculty-790"],
  "students": ["student-1", "student-2"]
}
```

## Database Schema Changes

### Option 1: Junction Table (Recommended)
Create a new junction table to store the many-to-many relationship between batches and faculty.

#### New Table: `batch_faculties`
```sql
CREATE TABLE batch_faculties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(batch_id, faculty_id)
);

CREATE INDEX idx_batch_faculties_batch_id ON batch_faculties(batch_id);
CREATE INDEX idx_batch_faculties_faculty_id ON batch_faculties(faculty_id);
```

#### Update `batches` Table
Remove the single `faculty_id` column if it exists, but keep `course_id`:
```sql
-- If column exists, migrate data first, then drop
-- First, create batch_faculties entries for existing batches
INSERT INTO batch_faculties (batch_id, faculty_id)
SELECT id, faculty_id
FROM batches
WHERE faculty_id IS NOT NULL;

-- Then drop the old column
ALTER TABLE batches DROP COLUMN IF EXISTS faculty_id;

-- Keep course_id as it's still a single course per batch
-- ALTER TABLE batches DROP COLUMN IF EXISTS course_id; -- DO NOT DROP
```

### Option 2: JSON Column (Alternative)
If using PostgreSQL, you can store the faculty IDs as a JSON array:

```sql
ALTER TABLE batches 
ADD COLUMN faculty_ids JSONB DEFAULT '[]'::jsonb;

-- Example structure:
-- ["faculty-789", "faculty-790"]

CREATE INDEX idx_batches_faculty_ids ON batches USING GIN (faculty_ids);
```

**Note:** Option 1 (Junction Table) is recommended for better data integrity, query performance, and normalization.

## Backend Implementation Steps

### 1. Update DTO/Request Models

#### TypeScript/Node.js Example
```typescript
// DTO for creating a batch
export interface CreateBatchDto {
  courseId: string;
  centerId: string;
  startDate: string;
  endDate: string;
  duration: string;
  status: string | null;
  schedules: BatchScheduleDto[];
  facultyIds: string[];
  students: string[];
}

export interface BatchScheduleDto {
  day: string;
  startTime: string;
  endTime: string;
  duration: number;
}
```

#### Python/Django Example
```python
# serializers.py
from rest_framework import serializers

class CreateBatchSerializer(serializers.Serializer):
    course_id = serializers.UUIDField()
    center_id = serializers.UUIDField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    duration = serializers.CharField()
    status = serializers.CharField(required=False, allow_null=True)
    schedules = BatchScheduleSerializer(many=True)
    faculty_ids = serializers.ListField(child=serializers.UUIDField())
    students = serializers.ListField(child=serializers.UUIDField())
```

### 2. Update Validation

#### Validation Rules:
1. **courseId** must be provided and exist in the `courses` table
2. **facultyIds** must be a non-empty array
3. No duplicate faculty IDs within the same batch
4. All faculty IDs must exist in the `faculties` table

#### Example Validation (Node.js/Express)
```typescript
import { z } from 'zod';

const createBatchSchema = z.object({
  courseId: z.string().uuid('Invalid course ID'),
  centerId: z.string().uuid('Invalid center ID'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  duration: z.string(),
  status: z.string().nullable().optional(),
  schedules: z.array(/* schedule schema */).min(1),
  facultyIds: z.array(z.string().uuid())
    .min(1, 'At least one faculty is required')
    .refine(
      (arr) => {
        const unique = new Set(arr);
        return unique.size === arr.length;
      },
      { message: 'Duplicate faculty IDs are not allowed' }
    ),
  students: z.array(z.string().uuid()).min(1),
});
```

### 3. Update Service Layer

#### Create Batch Service (Node.js Example)
```typescript
async function createBatch(dto: CreateBatchDto): Promise<Batch> {
  // Validate course ID exists
  const course = await CourseRepository.findById(dto.courseId);
  if (!course) {
    throw new Error('Course ID is invalid');
  }

  // Validate all faculty IDs exist
  const faculties = await FacultyRepository.findByIds(dto.facultyIds);
  if (faculties.length !== dto.facultyIds.length) {
    throw new Error('One or more faculty IDs are invalid');
  }

  // Create batch
  const batch = await BatchRepository.create({
    courseId: dto.courseId,
    centerId: dto.centerId,
    startDate: dto.startDate,
    endDate: dto.endDate,
    duration: dto.duration,
    status: dto.status,
    schedules: dto.schedules,
  });

  // Create batch-faculty relationships
  const batchFaculties = dto.facultyIds.map(facultyId => ({
    batchId: batch.id,
    facultyId: facultyId,
  }));

  await BatchFacultyRepository.createMany(batchFaculties);

  // Associate students (existing logic)
  await BatchStudentRepository.associateStudents(batch.id, dto.students);

  return batch;
}
```

### 4. Update Repository/Data Access Layer

#### Batch Repository
```typescript
// Create batch
async create(data: Omit<Batch, 'id' | 'facultyIds'>): Promise<Batch> {
  const query = `
    INSERT INTO batches (course_id, center_id, start_date, end_date, duration, status, schedules)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;
  const result = await db.query(query, [
    data.courseId,
    data.centerId,
    data.startDate,
    data.endDate,
    data.duration,
    data.status,
    JSON.stringify(data.schedules),
  ]);
  return result.rows[0];
}
```

#### Batch-Faculty Repository
```typescript
// Create multiple relationships
async createMany(relationships: Array<{
  batchId: string;
  facultyId: string;
}>): Promise<void> {
  const values = relationships.map((_, i) => 
    `($${i * 2 + 1}, $${i * 2 + 2})`
  ).join(', ');
  
  const query = `
    INSERT INTO batch_faculties (batch_id, faculty_id)
    VALUES ${values}
  `;
  
  const params = relationships.flatMap(r => [r.batchId, r.facultyId]);
  await db.query(query, params);
}

// Get batch with faculty
async findFacultiesByBatchId(batchId: string): Promise<Array<{
  facultyId: string;
  faculty: Faculty;
}>> {
  const query = `
    SELECT 
      bf.faculty_id,
      json_build_object(
        'id', f.id,
        'fullname', f.fullname,
        'phone', f.phone
      ) as faculty
    FROM batch_faculties bf
    JOIN faculties f ON f.id = bf.faculty_id
    WHERE bf.batch_id = $1
  `;
  const result = await db.query(query, [batchId]);
  return result.rows;
}
```

### 5. Update Response Models

When returning batch data, include the faculty relationships:

```typescript
export interface BatchResponse {
  id: string;
  code: string;
  courseId: string;
  course: {
    id: string;
    name: string;
    type: string;
  };
  centerId: string;
  startDate: string;
  endDate: string;
  duration: string;
  status: string;
  schedules: BatchSchedule[];
  facultyIds: string[];
  faculties: Array<{
    id: string;
    fullname: string;
    phone: string;
  }>;
  students: Student[];
}
```

### 6. Update Batch Update Endpoint

When updating a batch, handle faculty-course relationships:

```typescript
async function updateBatch(
  batchId: string,
  dto: UpdateBatchDto
): Promise<Batch> {
  // Update batch basic info
  await BatchRepository.update(batchId, {
    courseId: dto.courseId,
    centerId: dto.centerId,
    startDate: dto.startDate,
    endDate: dto.endDate,
    duration: dto.duration,
    status: dto.status,
    schedules: dto.schedules,
  });

  // Replace all faculty relationships
  await BatchFacultyRepository.deleteByBatchId(batchId);
  
  if (dto.facultyIds && dto.facultyIds.length > 0) {
    const batchFaculties = dto.facultyIds.map(facultyId => ({
      batchId: batchId,
      facultyId: facultyId,
    }));
    await BatchFacultyRepository.createMany(batchFaculties);
  }

  return await BatchRepository.findById(batchId);
}
```

## Migration Strategy

### Step 1: Create Migration Script
```sql
-- Migration: Add batch_faculties table
BEGIN;

-- Create new junction table
CREATE TABLE batch_faculties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(batch_id, faculty_id)
);

-- Migrate existing data (if batches table has faculty_id)
INSERT INTO batch_faculties (batch_id, faculty_id)
SELECT id, faculty_id
FROM batches
WHERE faculty_id IS NOT NULL;

-- Add indexes
CREATE INDEX idx_batch_faculties_batch_id ON batch_faculties(batch_id);
CREATE INDEX idx_batch_faculties_faculty_id ON batch_faculties(faculty_id);

-- Drop old column (after verifying migration)
-- ALTER TABLE batches DROP COLUMN IF EXISTS faculty_id;
-- Note: Keep course_id as it's still a single course per batch

COMMIT;
```

### Step 2: Update API Endpoints

1. **POST /api/batches** - Update to accept new structure with facultyIds array
2. **PUT /api/batches/:id** - Update to handle facultyIds array
3. **GET /api/batches/:id** - Include facultyIds and faculties in response
4. **GET /api/batches** - Include facultyIds and faculties in list response

### Step 3: Backward Compatibility (Optional)

If you need to support both old and new formats temporarily:

```typescript
function normalizeBatchPayload(payload: any): CreateBatchDto {
  // If old format (has facultyId as string instead of array)
  if (payload.facultyId && typeof payload.facultyId === 'string' && !payload.facultyIds) {
    return {
      ...payload,
      facultyIds: [payload.facultyId],
      // Remove old field
      facultyId: undefined,
    };
  }
  return payload;
}
```

## Testing Checklist

- [ ] Create batch with single faculty
- [ ] Create batch with multiple faculty
- [ ] Validate duplicate faculty IDs are rejected
- [ ] Validate invalid faculty ID is rejected
- [ ] Validate invalid course ID is rejected
- [ ] Update batch to change faculty list
- [ ] Delete batch (cascade delete faculty relationships)
- [ ] Get batch includes all faculty relationships
- [ ] List batches includes faculty relationships
- [ ] Query batches by faculty ID
- [ ] Query batches by course ID

## Example API Requests

### Create Batch
```bash
POST /api/batches
Content-Type: application/json

{
  "courseId": "course-123",
  "centerId": "center-456",
  "startDate": "2025-01-15",
  "endDate": "2025-04-15",
  "duration": "3",
  "status": "Active",
  "schedules": [
    {
      "day": "Monday",
      "startTime": "02:00 PM",
      "endTime": "04:00 PM",
      "duration": 2
    }
  ],
  "facultyIds": ["faculty-789", "faculty-790"],
  "students": ["student-1", "student-2"]
}
```

### Get Batch Response
```json
{
  "id": "batch-123",
  "code": "BATCH-2025-001",
  "courseId": "course-123",
  "course": {
    "id": "course-123",
    "name": "Web Development",
    "type": "TEC_TERMINAL"
  },
  "centerId": "center-456",
  "startDate": "2025-01-15",
  "endDate": "2025-04-15",
  "duration": "3",
  "status": "Active",
  "schedules": [
    {
      "day": "Monday",
      "startTime": "02:00 PM",
      "endTime": "04:00 PM",
      "duration": 2
    }
  ],
  "facultyIds": ["faculty-789", "faculty-790"],
  "faculties": [
    {
      "id": "faculty-789",
      "fullname": "Akim Shittu",
      "phone": "08012345678"
    },
    {
      "id": "faculty-790",
      "fullname": "John Doe",
      "phone": "08087654321"
    }
  ],
  "students": [...]
}
```

## Notes

1. **Data Integrity**: Use foreign key constraints to ensure faculty IDs are valid
2. **Performance**: Index the junction table for efficient queries
3. **Cascading**: Set up CASCADE DELETE so removing a batch removes its faculty relationships
4. **Validation**: Ensure no duplicate faculty IDs within the same batch
5. **Backward Compatibility**: Consider supporting both old and new formats during migration period
6. **Single Course**: The batch still has a single course assigned to it, shared by all faculty

