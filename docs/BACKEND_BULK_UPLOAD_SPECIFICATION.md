# Backend Bulk Upload Archive - Implementation Specification

## Frontend → Backend Request

### Endpoint
```
POST {BASE_URL}/archive/bulk-upload
```

### Headers
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

### Request Payload Structure

```json
{
  "records": [
    {
      "centerId": "string (REQUIRED)",
      "userOldId": "string (REQUIRED)",
      "userNewId": "string | null (OPTIONAL)",
      "fullname": "string (REQUIRED)",
      "email": "string (REQUIRED)",
      "phone": "string (REQUIRED)",
      "courseEnrolled": "string (REQUIRED)",
      "coursePrice": number (REQUIRED, >= 0),
      "enrollmentDate": "string (REQUIRED, ISO 8601 format: YYYY-MM-DD)",
      "birthDate": "string (REQUIRED, ISO 8601 format: YYYY-MM-DD)",
      "oldStudentId": "string (REQUIRED)",
      "newStudentId": "string | null (OPTIONAL)",
      "totalPayment": number (REQUIRED, >= 0),
      "pendingPayment": number (REQUIRED, >= 0),
      "status": "string (REQUIRED)",
      "source": "legacy_erp" | "graduated" | null (OPTIONAL)
    }
  ]
}
```

### Example Payload

```json
{
  "records": [
    {
      "centerId": "cm1234567890",
      "userOldId": "LEGACY-001",
      "userNewId": null,
      "fullname": "John Doe",
      "email": "john.doe@example.com",
      "phone": "08012345678",
      "courseEnrolled": "Graphic Design",
      "coursePrice": 500000,
      "enrollmentDate": "2011-08-22",
      "birthDate": "1995-05-15",
      "oldStudentId": "TT-JD-00001",
      "newStudentId": null,
      "totalPayment": 300000,
      "pendingPayment": 200000,
      "status": "archived",
      "source": "legacy_erp"
    },
    {
      "centerId": "cm1234567890",
      "userOldId": "LEGACY-002",
      "userNewId": null,
      "fullname": "Jane Smith",
      "email": "jane.smith@example.com",
      "phone": "08023456789",
      "courseEnrolled": "Web Development",
      "coursePrice": 600000,
      "enrollmentDate": "2012-03-10",
      "birthDate": "1996-07-20",
      "oldStudentId": "TT-JS-00002",
      "newStudentId": null,
      "totalPayment": 600000,
      "pendingPayment": 0,
      "status": "graduated",
      "source": "graduated"
    }
  ]
}
```

---

## Backend Implementation Requirements

### 1. Endpoint Setup

**Route:** `POST /archive/bulk-upload`

**Authentication:** Required (JWT Bearer token)

**Authorization:** Admin only (for now)

### 2. Request Validation

The backend MUST validate:

#### Required Fields (for each record):
- ✅ `centerId` - Must exist in Center table
- ✅ `userOldId` - String, not empty
- ✅ `fullname` - String, not empty
- ✅ `email` - Valid email format
- ✅ `phone` - String, not empty
- ✅ `courseEnrolled` - String, not empty
- ✅ `coursePrice` - Number, >= 0
- ✅ `enrollmentDate` - ISO 8601 date string (YYYY-MM-DD)
- ✅ `birthDate` - ISO 8601 date string (YYYY-MM-DD)
- ✅ `oldStudentId` - String, not empty
- ✅ `totalPayment` - Number, >= 0
- ✅ `pendingPayment` - Number, >= 0
- ✅ `status` - String, not empty

#### Optional Fields:
- `userNewId` - String or null
- `newStudentId` - String or null
- `source` - "legacy_erp" | "graduated" | null

### 3. Date Format Handling

**Frontend sends dates as:** `"2011-08-22"` (ISO 8601 format: YYYY-MM-DD)

**Backend should:**
- Accept ISO 8601 format strings
- Parse and validate dates
- Store in database date format

### 4. Expected Response Format

#### Success Response (200 OK)
```json
{
  "success": 5,
  "failed": 2,
  "errors": [
    {
      "row": 3,
      "error": "Invalid email format"
    },
    {
      "row": 7,
      "error": "Center ID not found"
    }
  ]
}
```

#### Error Response (400 Bad Request)
```json
{
  "error": "Validation failed",
  "message": "Invalid payload structure",
  "details": [
    "records must be an array",
    "centerId is required for all records"
  ]
}
```

#### Error Response (401 Unauthorized)
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing authentication token"
}
```

#### Error Response (403 Forbidden)
```json
{
  "error": "Forbidden",
  "message": "Admin access required"
}
```

### 5. Backend Processing Logic

```typescript
// Pseudo-code for backend implementation

POST /archive/bulk-upload
1. Validate authentication token
2. Check user role (must be ADMIN)
3. Validate request body structure:
   - Must have "records" property
   - "records" must be an array
   - Array must not be empty
4. For each record in records array:
   a. Validate all required fields
   b. Validate centerId exists in Center table
   c. Validate email format
   d. Validate dates are valid ISO 8601 format
   e. Validate numbers are >= 0
5. Process records:
   - Insert valid records into Archive table
   - Track successful inserts
   - Track failed records with error messages
6. Return response with success/failed counts and errors
```

### 6. Database Schema Requirements

The Archive table MUST have these columns:

```sql
CREATE TABLE archive_records (
  id VARCHAR PRIMARY KEY,
  centerId VARCHAR NOT NULL, -- Foreign key to centers table
  userOldId VARCHAR NOT NULL,
  userNewId VARCHAR NULL,
  fullname VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  phone VARCHAR NOT NULL,
  courseEnrolled VARCHAR NOT NULL,
  coursePrice DECIMAL(10,2) NOT NULL,
  enrollmentDate DATE NOT NULL,
  birthDate DATE NOT NULL,
  oldStudentId VARCHAR NOT NULL,
  newStudentId VARCHAR NULL,
  totalPayment DECIMAL(10,2) NOT NULL,
  pendingPayment DECIMAL(10,2) NOT NULL,
  status VARCHAR NOT NULL,
  source VARCHAR NULL, -- 'legacy_erp' | 'graduated' | NULL
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (centerId) REFERENCES centers(id)
);
```

### 7. Validation Rules

#### Field-Specific Validations:

1. **centerId**
   - Required
   - Must exist in `centers` table
   - Foreign key constraint

2. **email**
   - Required
   - Valid email format (RFC 5322)
   - Example: `user@example.com`

3. **enrollmentDate & birthDate**
   - Required
   - ISO 8601 format: `YYYY-MM-DD`
   - Must be valid dates
   - `birthDate` should be before `enrollmentDate` (logical validation)

4. **coursePrice, totalPayment, pendingPayment**
   - Required
   - Must be numbers (not strings)
   - Must be >= 0
   - Can be decimal values

5. **oldStudentId**
   - Required
   - String, not empty
   - Frontend auto-generates if missing: `TT-{INITIALS}-{00001}`

6. **status**
   - Required
   - String value
   - Common values: "archived", "graduated", "owing", "dropout"

7. **source**
   - Optional
   - Must be one of: `"legacy_erp"`, `"graduated"`, or `null`

### 8. Error Handling

The backend should:

1. **Validate request structure first** (before processing records)
2. **Process records individually** (don't fail entire batch on one error)
3. **Return detailed errors** for each failed record
4. **Continue processing** even if some records fail
5. **Return success count** for successfully inserted records
6. **Return failed count** with specific error messages

### 9. Transaction Handling

**Recommended Approach:**
- Process each record in a transaction
- If a record fails validation, rollback only that record
- Continue with next record
- Return summary of all successes and failures

**Alternative Approach:**
- Validate all records first
- If all valid, insert all in batch transaction
- If any invalid, return errors without inserting any

### 10. Response Time Considerations

- For large uploads (100+ records), consider:
  - Processing in batches
  - Returning progress updates (if using WebSocket/SSE)
  - Or returning immediately with async processing notification

---

## Testing Checklist for Backend

- [ ] Endpoint accepts POST requests to `/archive/bulk-upload`
- [ ] Requires authentication (JWT token)
- [ ] Requires admin role
- [ ] Validates `records` is an array
- [ ] Validates each record has all required fields
- [ ] Validates `centerId` exists in database
- [ ] Validates email format
- [ ] Validates date formats (YYYY-MM-DD)
- [ ] Validates numbers are >= 0
- [ ] Handles optional fields (userNewId, newStudentId, source)
- [ ] Inserts valid records successfully
- [ ] Returns success count
- [ ] Returns failed count
- [ ] Returns detailed error messages for failed records
- [ ] Handles empty records array (should return error)
- [ ] Handles malformed JSON (should return 400)
- [ ] Handles missing authentication (should return 401)
- [ ] Handles non-admin user (should return 403)

---

## Example Backend Implementation (Node.js/Express)

```typescript
// Example backend route handler

router.post('/archive/bulk-upload', authenticate, requireAdmin, async (req, res) => {
  try {
    const { records } = req.body;

    // Validate request structure
    if (!records || !Array.isArray(records)) {
      return res.status(400).json({
        error: "Invalid request",
        message: "records must be an array"
      });
    }

    if (records.length === 0) {
      return res.status(400).json({
        error: "Invalid request",
        message: "records array cannot be empty"
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ row: number; error: string }>
    };

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = i + 1;

      try {
        // Validate required fields
        if (!record.centerId) throw new Error("centerId is required");
        if (!record.fullname) throw new Error("fullname is required");
        if (!record.email) throw new Error("email is required");
        if (!record.oldStudentId) throw new Error("oldStudentId is required");
        // ... validate all other required fields

        // Validate centerId exists
        const center = await Center.findById(record.centerId);
        if (!center) throw new Error(`Center ID ${record.centerId} not found`);

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(record.email)) {
          throw new Error("Invalid email format");
        }

        // Validate dates
        const enrollmentDate = new Date(record.enrollmentDate);
        const birthDate = new Date(record.birthDate);
        if (isNaN(enrollmentDate.getTime())) {
          throw new Error("Invalid enrollmentDate format");
        }
        if (isNaN(birthDate.getTime())) {
          throw new Error("Invalid birthDate format");
        }

        // Validate numbers
        if (record.coursePrice < 0 || record.totalPayment < 0 || record.pendingPayment < 0) {
          throw new Error("Payment amounts must be >= 0");
        }

        // Insert record
        await ArchiveRecord.create({
          centerId: record.centerId,
          userOldId: record.userOldId,
          userNewId: record.userNewId || null,
          fullname: record.fullname,
          email: record.email,
          phone: record.phone,
          courseEnrolled: record.courseEnrolled,
          coursePrice: record.coursePrice,
          enrollmentDate: record.enrollmentDate,
          birthDate: record.birthDate,
          oldStudentId: record.oldStudentId,
          newStudentId: record.newStudentId || null,
          totalPayment: record.totalPayment,
          pendingPayment: record.pendingPayment,
          status: record.status,
          source: record.source || null,
        });

        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          error: error.message || "Validation failed"
        });
      }
    }

    return res.status(200).json(results);
  } catch (error: any) {
    return res.status(500).json({
      error: "Internal server error",
      message: error.message
    });
  }
});
```

---

## Summary

**Frontend sends:**
- POST request to `/archive/bulk-upload`
- Payload: `{ records: ArchiveRecord[] }`
- Each record has all required fields
- Dates in ISO 8601 format (YYYY-MM-DD)
- Numbers as actual numbers (not strings)

**Backend needs to:**
- Accept POST `/archive/bulk-upload`
- Validate authentication & admin role
- Validate each record in the array
- Insert valid records
- Return success/failed counts with error details

The frontend is ready - backend just needs to implement the endpoint!

