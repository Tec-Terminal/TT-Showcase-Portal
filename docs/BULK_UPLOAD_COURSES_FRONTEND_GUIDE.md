# Bulk Upload Courses - Frontend Implementation Guide

## Overview

This guide provides instructions for implementing the bulk upload feature for courses on the frontend. The feature allows administrators to upload a list of courses from a CSV or Excel file, similar to the student bulk upload functionality.

## Backend Endpoint

### Endpoint

```
POST {BASE_URL}/courses/bulk-upload
```

### Headers

```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

### Request Payload Structure

```typescript
{
  records: [
    {
      oldId: string;  // REQUIRED - Old Course ID from CSV/Excel (_id column)
      title: string;  // REQUIRED - Course title/name (title column)
      duration: number;  // REQUIRED - Course duration in months (duration column), must be >= 1
      course_type?: string;  // OPTIONAL - Course type from CSV/Excel (course_type column). Accepts: "Tec Terminal", "ApTech", "CPMS", "TEC_TERMINAL", "APTECH", etc. Defaults to TEC_TERMINAL if not provided or invalid
    },
    // ... more course records
  ]
}
```

### Response Structure

```typescript
{
  success: number; // Number of successfully created courses
  failed: number; // Number of failed records
  skipped: number; // Number of skipped records (duplicates)
  errors: Array<{
    row: number;
    oldId?: string;
    title?: string;
    error: string;
  }>;
  skippedRecords: Array<{
    row: number;
    oldId?: string;
    title?: string;
    reason: string;
  }>;
  total: number; // Total number of records processed
}
```

## Frontend Implementation Steps

### 1. Add Upload Button

Add a button to trigger the bulk upload modal. This should be placed in the courses list page.

```tsx
<Button
  onClick={() => setShowUploadModal(true)}
  variant="outline"
  startIcon={<UploadIcon />}
>
  Upload Courses
</Button>
```

### 2. Create Upload Modal Component

Create a modal component that includes:

- File upload input (CSV/Excel file)
- Upload button
- Progress indicator
- Results display

```tsx
interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const BulkUploadCoursesModal: React.FC<UploadModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file');
      return;
    }

    setLoading(true);
    try {
      // Parse CSV/Excel file
      const records = await parseFile(selectedFile);

      // Transform to API format
      const payload = transformDataToApiFormat(records);

      // Call API
      const response = await bulkUploadCourses(payload);
      setUploadResult(response);

      if (response.success > 0 && onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please check the file format and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalContent>
        <ModalHeader>Bulk Upload Courses</ModalHeader>

        <ModalBody>
          {/* File Upload */}
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
          />

          {/* Upload Results */}
          {uploadResult && <UploadResults result={uploadResult} />}
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || loading}
            variant="contained"
          >
            {loading ? 'Uploading...' : 'Upload'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
```

### 3. File Parsing

Parse the CSV or Excel file to extract course data. The file should have columns matching the expected format:

**Expected CSV/Excel Columns:**

- `_id` or `oldId` - Old Course ID from legacy system
- `title` - Course title/name
- `duration` - Course duration in months
- `course_type` - (Optional) Course type. Accepts: "Tec Terminal", "ApTech", "CPMS", "TEC_TERMINAL", "APTECH", etc. Defaults to "Tec Terminal" if not provided or invalid

**Example using xlsx library for Excel:**

```typescript
import * as XLSX from 'xlsx';

async function parseExcelFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
```

**Example using PapaParse for CSV:**

```typescript
import Papa from 'papaparse';

async function parseCsvFile(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}
```

**Unified parser:**

```typescript
async function parseFile(file: File): Promise<any[]> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return await parseCsvFile(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return await parseExcelFile(file);
  } else {
    throw new Error('Unsupported file format. Please use CSV or Excel files.');
  }
}
```

### 4. Data Transformation

Transform the parsed file data into the API payload format:

```typescript
function transformDataToApiFormat(fileData: any[]): BulkUploadCourseDto {
  const records: BulkUploadCourseRecordDto[] = fileData
    .filter((row) => {
      // Filter out empty rows
      return row._id || row.oldId || row.title;
    })
    .map((row) => {
      return {
        oldId: String(row._id || row.oldId || ''),
        title: String(row.title || ''),
        duration: parseInt(String(row.duration || 0), 10),
        course_type: row.course_type ? String(row.course_type) : undefined,
      };
    })
    .filter((record) => {
      // Validate required fields
      return record.oldId && record.title && record.duration > 0;
    });

  return {
    records,
  };
}
```

### 5. API Service Function

Create an API service function to call the backend:

```typescript
import axios from 'axios';

export async function bulkUploadCourses(
  payload: BulkUploadCourseDto,
): Promise<BulkUploadResponse> {
  const response = await axios.post(
    `${API_BASE_URL}/courses/bulk-upload`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
    },
  );

  return response.data;
}
```

### 6. Upload Results Component

Create a component to display upload results:

```tsx
interface UploadResultsProps {
  result: BulkUploadResponse;
}

const UploadResults: React.FC<UploadResultsProps> = ({ result }) => {
  return (
    <Box>
      <Typography variant="h6">Upload Results</Typography>
      <Typography>Total: {result.total}</Typography>
      <Typography color="success.main">Success: {result.success}</Typography>
      <Typography color="error.main">Failed: {result.failed}</Typography>
      <Typography color="warning.main">Skipped: {result.skipped}</Typography>

      {result.errors.length > 0 && (
        <Box mt={2}>
          <Typography variant="subtitle2">Errors:</Typography>
          {result.errors.map((error, index) => (
            <Typography key={index} variant="body2" color="error">
              Row {error.row}: {error.error}
            </Typography>
          ))}
        </Box>
      )}

      {result.skippedRecords.length > 0 && (
        <Box mt={2}>
          <Typography variant="subtitle2">Skipped Records:</Typography>
          {result.skippedRecords.map((record, index) => (
            <Typography key={index} variant="body2" color="warning">
              Row {record.row}: {record.reason}
            </Typography>
          ))}
        </Box>
      )}
    </Box>
  );
};
```

## Important Notes

### 1. Course Type

- Course type is read from the `course_type` column in the CSV/Excel file
- Supported values: "Tec Terminal", "ApTech", "CPMS", "TEC_TERMINAL", "APTECH", etc. (case-insensitive, spaces/underscores are normalized)
- If `course_type` is not provided or contains an invalid value, it defaults to `TEC_TERMINAL`
- The backend maps the string value to the appropriate `CourseType` enum value

### 2. Course Status

- All courses created via bulk upload will have status set to `ACTIVE`
- This differs from regular course creation which can be set to `DRAFT` or `ACTIVE`

### 3. Course Code Generation

- Course codes are automatically generated by the backend
- Format: `TT-{INITIALS}-{SEQUENCE}` (e.g., `TT-CEH-001`)
- The code is based on the course name and type

### 4. Duplicate Handling

- Records with duplicate `oldId` will be skipped
- Records with duplicate course names (case-insensitive) will be skipped
- Skipped records are returned in the `skippedRecords` array

### 5. Error Handling

- Validate file format before upload
- Show clear error messages for validation failures
- Display detailed results after upload completion
- Allow users to download error/skipped records for review

## Example CSV File Structure

```csv
_id,title,duration,course_type
66e1b6d442a23f4ad1e2a215,CERTIFIED ETHICAL HACKING (CEH),7,Tec Terminal
66e7237d718b286147ac2ec6,Digital Marketing,3,ApTech
66e723da718b286147ac2ed2,Graphic and Multimedia,3,CPMS
66e72427718b286147ac2ede,CCNA,4,TEC_TERMINAL
66e724aa718b286147ac2ef6,Ms Power BI,2,
```

Note: The `course_type` column is optional. If omitted or empty, courses will default to "Tec Terminal" type.

## Example Excel File Structure

| \_id                     | title                           | duration | course_type  |
| ------------------------ | ------------------------------- | -------- | ------------ |
| 66e1b6d442a23f4ad1e2a215 | CERTIFIED ETHICAL HACKING (CEH) | 7        | Tec Terminal |
| 66e7237d718b286147ac2ec6 | Digital Marketing               | 3        | ApTech       |
| 66e723da718b286147ac2ed2 | Graphic and Multimedia          | 3        | CPMS         |
| 66e72427718b286147ac2ede | CCNA                            | 4        | TEC_TERMINAL |
| 66e724aa718b286147ac2ef6 | Ms Power BI                     | 2        |              |

Note: The `course_type` column is optional. If omitted or empty, courses will default to "Tec Terminal" type.

## Data Mapping

The CSV/Excel columns map to the API payload as follows:

| CSV/Excel Column | API Field     | Description                                                                                                                   |
| ---------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `_id`            | `oldId`       | Old Course ID from legacy system                                                                                              |
| `title`          | `title`       | Course name/title                                                                                                             |
| `duration`       | `duration`    | Course duration in months                                                                                                     |
| `course_type`    | `course_type` | (Optional) Course type. Accepts: "Tec Terminal", "ApTech", "CPMS", etc. Defaults to "Tec Terminal" if not provided or invalid |

## Testing Checklist

- [ ] Upload button is visible and accessible
- [ ] Modal opens when button is clicked
- [ ] File upload accepts .csv, .xlsx, and .xls files
- [ ] CSV file is parsed correctly
- [ ] Excel file is parsed correctly
- [ ] Data transformation works correctly
- [ ] API call is made with correct payload
- [ ] Success/error messages are displayed
- [ ] Upload results show correct counts
- [ ] Error details are shown for failed records
- [ ] Skipped records are shown with reasons
- [ ] Courses are created with the correct course type from CSV/Excel (or TEC_TERMINAL as default)
- [ ] Courses are created with ACTIVE status
- [ ] Course codes are generated correctly
- [ ] Duplicate handling works as expected
- [ ] oldId is stored correctly

## TypeScript Types

```typescript
interface BulkUploadCourseDto {
  records: BulkUploadCourseRecordDto[];
}

interface BulkUploadCourseRecordDto {
  oldId: string;
  title: string;
  duration: number;
  course_type?: string; // Optional - Course type from CSV/Excel. Defaults to TEC_TERMINAL if not provided or invalid
}

interface BulkUploadResponse {
  success: number;
  failed: number;
  skipped: number;
  errors: Array<{
    row: number;
    oldId?: string;
    title?: string;
    error: string;
  }>;
  skippedRecords: Array<{
    row: number;
    oldId?: string;
    title?: string;
    reason: string;
  }>;
  total: number;
}
```
