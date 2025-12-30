# Bulk Upload Students - Frontend Implementation Guide

## Overview

This guide provides instructions for implementing the bulk upload feature for students on the frontend. The feature allows administrators to upload a list of students from an Excel file, similar to the archive bulk upload functionality.

## Backend Endpoint

### Endpoint

```
POST {BASE_URL}/students/bulk-upload
```

### Headers

```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

### Request Payload Structure

```typescript
{
  centerId: string;  // REQUIRED - Selected from modal
  records: [
    {
      oldId: string;  // REQUIRED - Old Student ID from Excel
      fullName: string;  // REQUIRED
      email: string;  // REQUIRED
      phone: string;  // REQUIRED
      address: string;  // REQUIRED
      birthDate: string;  // REQUIRED - ISO 8601 format: YYYY-MM-DD
      enrolledDate: string;  // REQUIRED - ISO 8601 format: YYYY-MM-DD
      courseId: string;  // REQUIRED - Course oldId to match with course.oldId in database
      courseFee: number;  // REQUIRED - Total course fee, must be >= 0
      payments: [  // REQUIRED - Array of payment installments
        {
          amount: number;  // REQUIRED - Payment amount, must be >= 0
          date: string;  // REQUIRED - Payment date in ISO 8601 format: YYYY-MM-DD
          balance: number;  // REQUIRED - Remaining balance after this payment, must be >= 0
        },
        // ... more payment installments (Payment 2, Payment 3, etc.)
      ]
    },
    // ... more student records
  ]
}
```

### Response Structure

```typescript
{
  success: number; // Number of successfully created students
  failed: number; // Number of failed records
  skipped: number; // Number of skipped records (duplicates)
  errors: Array<{
    row: number;
    oldId?: string;
    email?: string;
    fullName?: string;
    error: string;
  }>;
  skippedRecords: Array<{
    row: number;
    oldId?: string;
    email?: string;
    fullName?: string;
    reason: string;
  }>;
  total: number; // Total number of records processed
}
```

## Frontend Implementation Steps

### 1. Add Upload Button

Add a button to trigger the bulk upload modal. This should be placed in the students list page, similar to the archive bulk upload button.

```tsx
<Button
  onClick={() => setShowUploadModal(true)}
  variant="outline"
  startIcon={<UploadIcon />}
>
  Upload Students
</Button>
```

### 2. Create Upload Modal Component

Create a modal component that includes:

- File upload input (Excel file)
- Center selection dropdown
- Upload button
- Progress indicator
- Results display

```tsx
interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const BulkUploadStudentsModal: React.FC<UploadModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCenterId, setSelectedCenterId] = useState<string>('');
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  // Fetch centers on mount
  useEffect(() => {
    fetchCenters().then(setCenters);
  }, []);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile || !selectedCenterId) {
      alert('Please select a file and center');
      return;
    }

    setLoading(true);
    try {
      // Parse Excel file
      const records = await parseExcelFile(selectedFile);

      // Transform to API format
      const payload = transformExcelDataToApiFormat(records, selectedCenterId);

      // Call API
      const response = await bulkUploadStudents(payload);
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
        <ModalHeader>Bulk Upload Students</ModalHeader>

        <ModalBody>
          {/* Center Selection */}
          <FormControl fullWidth margin="normal">
            <InputLabel>Select Center</InputLabel>
            <Select
              value={selectedCenterId}
              onChange={(e) => setSelectedCenterId(e.target.value)}
            >
              {centers.map((center) => (
                <MenuItem key={center.id} value={center.id}>
                  {center.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* File Upload */}
          <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />

          {/* Upload Results */}
          {uploadResult && <UploadResults result={uploadResult} />}
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !selectedCenterId || loading}
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

### 3. Excel File Parsing

Parse the Excel file to extract student data. The Excel file should have columns matching the expected format:

**Expected Excel Columns:**

- Old Student ID (oldId)
- Full Name (fullName)
- Email (email)
- Phone (phone)
- Address (address)
- Birth Date (birthDate)
- Enrollment Date (enrolledDate)
- Course ID (courseId) - This should match the course.oldId in the database
- Course Fee (courseFee)
- Payment 1 Amount
- Payment 1 Date
- Payment 1 Balance
- Payment 2 Amount (if applicable)
- Payment 2 Date (if applicable)
- Payment 2 Balance (if applicable)
- ... (Payment 3, Payment 4, etc. for multiple installments)

**Example using xlsx library:**

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

### 4. Data Transformation

Transform the parsed Excel data into the API payload format:

```typescript
function transformExcelDataToApiFormat(
  excelData: any[],
  centerId: string,
): BulkUploadStudentDto {
  const records: BulkUploadStudentRecordDto[] = excelData.map((row, index) => {
    // Extract payment installments
    const payments: PaymentInstallmentDto[] = [];
    let paymentIndex = 1;

    while (
      row[`Payment ${paymentIndex} Amount`] !== undefined &&
      row[`Payment ${paymentIndex} Amount`] !== null &&
      row[`Payment ${paymentIndex} Amount`] !== ''
    ) {
      payments.push({
        amount: parseFloat(row[`Payment ${paymentIndex} Amount`]) || 0,
        date: formatDate(row[`Payment ${paymentIndex} Date`]),
        balance: parseFloat(row[`Payment ${paymentIndex} Balance`]) || 0,
      });
      paymentIndex++;
    }

    return {
      oldId: String(row['Old Student ID'] || row['oldId'] || ''),
      fullName: String(row['Full Name'] || row['fullName'] || ''),
      email: String(row['Email'] || row['email'] || ''),
      phone: String(row['Phone'] || row['phone'] || ''),
      address: String(row['Address'] || row['address'] || ''),
      birthDate: formatDate(row['Birth Date'] || row['birthDate']),
      enrolledDate: formatDate(row['Enrollment Date'] || row['enrolledDate']),
      courseId: String(row['Course ID'] || row['courseId'] || ''),
      courseFee: parseFloat(row['Course Fee'] || row['courseFee'] || 0),
      payments: payments,
    };
  });

  return {
    centerId,
    records,
  };
}

function formatDate(dateValue: any): string {
  if (!dateValue) return '';

  // Handle Excel date serial numbers
  if (typeof dateValue === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + dateValue * 86400000);
    return date.toISOString().split('T')[0];
  }

  // Handle string dates
  if (typeof dateValue === 'string') {
    const date = new Date(dateValue);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  return '';
}
```

### 5. API Service Function

Create an API service function to call the backend:

```typescript
import axios from 'axios';

export async function bulkUploadStudents(
  payload: BulkUploadStudentDto,
): Promise<BulkUploadResponse> {
  const response = await axios.post(
    `${API_BASE_URL}/students/bulk-upload`,
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

### 1. Course Matching

- The `courseId` in the Excel file should match the `oldId` field of courses in the database
- The backend will search for courses where `course.oldId` matches the provided `courseId`
- If no matching course is found, the record will fail with an error

### 2. Payment Handling

- Payments are created with `LEGACY` status
- Bank balance is **NOT** updated for legacy payments
- Default values:
  - `paymentPlan`: "installment"
  - `paymentType`: "Monthly"
  - `paymentMethod`: "CASH"
  - `note`: empty string

### 3. Student Status

- All students created via bulk upload will have status set to `ACTIVE`
- This is different from regular enrollment which sets status to `PENDING_APPROVAL`

### 4. Duplicate Handling

- Records with duplicate `oldId` will be skipped
- Records with duplicate `email` will be skipped
- Skipped records are returned in the `skippedRecords` array

### 5. Error Handling

- Validate file format before upload
- Show clear error messages for validation failures
- Display detailed results after upload completion
- Allow users to download error/skipped records for review

## Example Excel File Structure

| Old Student ID | Full Name | Email            | Phone      | Address     | Birth Date | Enrollment Date | Course ID  | Course Fee | Payment 1 Amount | Payment 1 Date | Payment 1 Balance | Payment 2 Amount | Payment 2 Date | Payment 2 Balance |
| -------------- | --------- | ---------------- | ---------- | ----------- | ---------- | --------------- | ---------- | ---------- | ---------------- | -------------- | ----------------- | ---------------- | -------------- | ----------------- |
| OLD-001        | John Doe  | john@example.com | 1234567890 | 123 Main St | 1990-01-01 | 2024-01-15      | COURSE-001 | 50000      | 25000            | 2024-01-15     | 25000             | 25000            | 2024-02-15     | 0                 |

## Testing Checklist

- [ ] Upload button is visible and accessible
- [ ] Modal opens when button is clicked
- [ ] Center selection dropdown is populated
- [ ] File upload accepts .xlsx and .xls files
- [ ] Excel file is parsed correctly
- [ ] Data transformation works for all payment installments
- [ ] API call is made with correct payload
- [ ] Success/error messages are displayed
- [ ] Upload results show correct counts
- [ ] Error details are shown for failed records
- [ ] Skipped records are shown with reasons
- [ ] Students are created with ACTIVE status
- [ ] Payments are created with LEGACY status
- [ ] Bank balance is NOT updated
- [ ] Course matching works correctly
- [ ] Duplicate handling works as expected




