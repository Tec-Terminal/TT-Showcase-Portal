# Student Portal API Routes Reference

This document provides a complete reference of all Student Portal API routes for both React Native (Mobile) and Next.js (Web) applications.

## Base URL

All Student Portal endpoints are prefixed with: `/portal/student`

**Full Base URL:** `https://your-api-domain.com/portal/student`

## Authentication

All endpoints require:
- **Authentication:** JWT Bearer Token
- **Role:** `STUDENT`
- **Header:** `Authorization: Bearer <access_token>`

## API Routes

### 1. Dashboard

**Endpoint:** `GET /portal/student/dashboard`

**Description:** Returns comprehensive dashboard data including profile, courses, payments, attendance, and notifications.

**Response:**
```json
{
  "profile": {
    "id": "string",
    "fullName": "string",
    "email": "string",
    "phone": "string",
    "address": "string",
    "image": "string",
    "studentId": "string",
    "status": "ACTIVE",
    "programType": "REGULAR_STUDENT",
    "enrolledDate": "string",
    "center": {
      "id": "string",
      "name": "string",
      "code": "string"
    }
  },
  "coursesCount": 3,
  "batchesCount": 2,
  "totalPayments": 50000,
  "pendingPayments": 20000,
  "attendancePercentage": 85.5,
  "recentNotifications": [],
  "upcomingPayments": [],
  "recentActivities": []
}
```

**Usage:**
- **React Native:** `GET /portal/student/dashboard`
- **Next.js:** `GET /portal/student/dashboard` (Server Component) or via API proxy

---

### 2. Profile

#### Get Profile
**Endpoint:** `GET /portal/student/profile`

**Description:** Returns detailed student profile information.

**Response:**
```json
{
  "id": "string",
  "fullName": "string",
  "email": "string",
  "phone": "string",
  "address": "string",
  "image": "string",
  "studentId": "string",
  "status": "ACTIVE",
  "programType": "REGULAR_STUDENT",
  "enrolledDate": "string",
  "birthDate": "string",
  "center": {
    "id": "string",
    "name": "string",
    "code": "string",
    "email": "string",
    "phone": "string",
    "address": "string"
  },
  "guardians": [
    {
      "id": "string",
      "fullname": "string",
      "email": "string",
      "phone": "string",
      "address": "string"
    }
  ]
}
```

#### Update Profile
**Endpoint:** `PATCH /portal/student/profile`

**Description:** Updates student profile information.

**Request Body:**
```json
{
  "fullName": "string (optional)",
  "email": "string (optional)",
  "phone": "string (optional)",
  "address": "string (optional)",
  "image": "string (optional)"
}
```

**Response:**
```json
{
  "id": "string",
  "fullName": "string",
  "email": "string",
  "phone": "string",
  "address": "string",
  "image": "string",
  "updatedAt": "2024-01-15T00:00:00.000Z"
}
```

**Usage:**
- **React Native:** `GET /portal/student/profile`, `PATCH /portal/student/profile`
- **Next.js:** `GET /portal/student/profile`, `PATCH /portal/student/profile`

---

### 3. Courses

**Endpoint:** `GET /portal/student/courses`

**Description:** Returns list of enrolled courses with batch information.

**Response:**
```json
[
  {
    "id": "string",
    "name": "string",
    "code": "string",
    "duration": 6,
    "type": "TEC_TERMINAL",
    "enrolledAt": "2024-01-15T00:00:00.000Z",
    "batches": [
      {
        "id": "string",
        "code": "string",
        "startDate": "2024-01-15",
        "endDate": "2024-07-15"
      }
    ]
  }
]
```

**Usage:**
- **React Native:** `GET /portal/student/courses`
- **Next.js:** `GET /portal/student/courses`

---

### 4. Payments

#### Get Payment History
**Endpoint:** `GET /portal/student/payments`

**Description:** Returns paginated payment history.

**Query Parameters:**
- `page` (optional, number): Page number (default: 1)
- `limit` (optional, number): Items per page (default: 10)

**Response:**
```json
{
  "data": [
    {
      "id": "string",
      "amount": 10000,
      "paymentDate": "2024-01-15T00:00:00.000Z",
      "status": "APPROVED",
      "paymentMethod": "string",
      "paymentType": "string",
      "course": {
        "id": "string",
        "name": "string",
        "code": "string"
      },
      "paymentPlan": {
        "id": "string",
        "name": "string"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

**Usage:**
- **React Native:** `GET /portal/student/payments?page=1&limit=10`
- **Next.js:** `GET /portal/student/payments?page=1&limit=10`

---

### 5. Invoices

**Endpoint:** `GET /portal/student/invoices`

**Description:** Returns all invoices for the student.

**Response:**
```json
[
  {
    "id": "string",
    "amount": 10000,
    "dueDate": "2024-02-15",
    "message": "string",
    "disclaimer": "string",
    "course": {
      "id": "string",
      "name": "string",
      "code": "string"
    },
    "paymentPlan": {
      "id": "string",
      "name": "string"
    },
    "createdAt": "2024-01-15T00:00:00.000Z"
  }
]
```

**Usage:**
- **React Native:** `GET /portal/student/invoices`
- **Next.js:** `GET /portal/student/invoices`

---

### 6. Attendance

**Endpoint:** `GET /portal/student/attendance`

**Description:** Returns attendance records, optionally filtered by year and month.

**Query Parameters:**
- `year` (optional, number): Filter by year (e.g., 2024)
- `month` (optional, number): Filter by month (1-12)

**Response:**
```json
[
  {
    "id": "string",
    "date": "2024-01-15T00:00:00.000Z",
    "status": "PRESENT",
    "studentId": "string",
    "createdAt": "2024-01-15T00:00:00.000Z"
  }
]
```

**Usage:**
- **React Native:** `GET /portal/student/attendance?year=2024&month=1`
- **Next.js:** `GET /portal/student/attendance?year=2024&month=1`

---

### 7. Batches

**Endpoint:** `GET /portal/student/batches`

**Description:** Returns student batches with schedules and faculty information.

**Response:**
```json
[
  {
    "id": "string",
    "code": "string",
    "duration": "6 months",
    "startDate": "2024-01-15",
    "endDate": "2024-07-15",
    "status": "ACTIVE",
    "course": {
      "id": "string",
      "name": "string",
      "code": "string"
    },
    "schedules": [
      {
        "day": "Monday",
        "startTime": "09:00",
        "endTime": "12:00",
        "faculty": {
          "id": "string",
          "fullname": "string",
          "phone": "string"
        }
      }
    ],
    "faculties": [
      {
        "faculty": {
          "id": "string",
          "fullname": "string",
          "phone": "string"
        },
        "course": {
          "id": "string",
          "name": "string",
          "code": "string"
        }
      }
    ]
  }
]
```

**Usage:**
- **React Native:** `GET /portal/student/batches`
- **Next.js:** `GET /portal/student/batches`

---

### 8. Certificates

**Endpoint:** `GET /portal/student/certificates`

**Description:** Returns student certificates (if available).

**Response:**
```json
[]
```

**Usage:**
- **React Native:** `GET /portal/student/certificates`
- **Next.js:** `GET /portal/student/certificates`

---

### 9. Files

**Endpoint:** `GET /portal/student/files`

**Description:** Returns student files/documents.

**Query Parameters:**
- `fileType` (optional, string): Filter by file type (e.g., "payment_receipt", "profile_image")

**Response:**
```json
[
  {
    "id": "string",
    "fileName": "string",
    "fileType": "payment_receipt",
    "fileUrl": "string",
    "fileSize": 1024,
    "mimeType": "application/pdf",
    "uploadedAt": "2024-01-15T00:00:00.000Z",
    "createdAt": "2024-01-15T00:00:00.000Z"
  }
]
```

**Usage:**
- **React Native:** `GET /portal/student/files?fileType=payment_receipt`
- **Next.js:** `GET /portal/student/files?fileType=payment_receipt`

---

### 10. Notifications

#### Get Notifications
**Endpoint:** `GET /portal/student/notifications`

**Description:** Returns paginated notifications.

**Query Parameters:**
- `page` (optional, number): Page number (default: 1)
- `limit` (optional, number): Items per page (default: 20)

**Response:**
```json
{
  "data": [
    {
      "id": "string",
      "type": "PAYMENT_CREATED",
      "title": "string",
      "message": "string",
      "read": false,
      "link": "string",
      "metadata": {},
      "sentAt": "2024-01-15T00:00:00.000Z",
      "createdAt": "2024-01-15T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

#### Mark Notification as Read
**Endpoint:** `PATCH /portal/student/notifications/:id/read`

**Description:** Marks a specific notification as read.

**Path Parameters:**
- `id` (string): Notification ID

**Response:**
```json
{
  "id": "string",
  "read": true,
  "updatedAt": "2024-01-15T00:00:00.000Z"
}
```

#### Mark All Notifications as Read
**Endpoint:** `PATCH /portal/student/notifications/read-all`

**Description:** Marks all notifications as read.

**Response:**
```json
{
  "count": 10
}
```

**Usage:**
- **React Native:** 
  - `GET /portal/student/notifications?page=1&limit=20`
  - `PATCH /portal/student/notifications/:id/read`
  - `PATCH /portal/student/notifications/read-all`
- **Next.js:** 
  - `GET /portal/student/notifications?page=1&limit=20`
  - `PATCH /portal/student/notifications/:id/read`
  - `PATCH /portal/student/notifications/read-all`

---

### 11. Tickets

**Endpoint:** `GET /portal/student/tickets`

**Description:** Returns paginated support tickets.

**Query Parameters:**
- `page` (optional, number): Page number (default: 1)
- `limit` (optional, number): Items per page (default: 10)

**Response:**
```json
{
  "data": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "category": "PAYMENT_ISSUE",
      "priority": "MEDIUM",
      "status": "OPEN",
      "createdBy": "string",
      "assignedTo": "string",
      "createdAt": "2024-01-15T00:00:00.000Z",
      "comments": []
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  }
}
```

**Usage:**
- **React Native:** `GET /portal/student/tickets?page=1&limit=10`
- **Next.js:** `GET /portal/student/tickets?page=1&limit=10`

**Note:** To create tickets, use the main tickets endpoint: `POST /tickets`

---

### 12. Academic Progress

**Endpoint:** `GET /portal/student/academic-progress`

**Description:** Returns academic progress summary.

**Response:**
```json
{
  "coursesEnrolled": 3,
  "activeBatches": 2,
  "attendanceRate": 85.5,
  "totalAttendanceDays": 50,
  "presentDays": 43,
  "absentDays": 7,
  "courses": [
    {
      "id": "string",
      "name": "string",
      "code": "string",
      "enrolledAt": "2024-01-15T00:00:00.000Z"
    }
  ]
}
```

**Usage:**
- **React Native:** `GET /portal/student/academic-progress`
- **Next.js:** `GET /portal/student/academic-progress`

---

## Error Responses

All endpoints may return the following error responses:

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error"
}
```

## Quick Reference Table

| Feature | Method | Endpoint | React Native | Next.js |
|---------|--------|----------|--------------|---------|
| Dashboard | GET | `/portal/student/dashboard` | ✅ | ✅ |
| Get Profile | GET | `/portal/student/profile` | ✅ | ✅ |
| Update Profile | PATCH | `/portal/student/profile` | ✅ | ✅ |
| Courses | GET | `/portal/student/courses` | ✅ | ✅ |
| Payment History | GET | `/portal/student/payments` | ✅ | ✅ |
| Invoices | GET | `/portal/student/invoices` | ✅ | ✅ |
| Attendance | GET | `/portal/student/attendance` | ✅ | ✅ |
| Batches | GET | `/portal/student/batches` | ✅ | ✅ |
| Certificates | GET | `/portal/student/certificates` | ✅ | ✅ |
| Files | GET | `/portal/student/files` | ✅ | ✅ |
| Notifications | GET | `/portal/student/notifications` | ✅ | ✅ |
| Mark Notification Read | PATCH | `/portal/student/notifications/:id/read` | ✅ | ✅ |
| Mark All Read | PATCH | `/portal/student/notifications/read-all` | ✅ | ✅ |
| Tickets | GET | `/portal/student/tickets` | ✅ | ✅ |
| Academic Progress | GET | `/portal/student/academic-progress` | ✅ | ✅ |

## Notes

1. **Authentication:** All endpoints require a valid JWT token in the Authorization header.

2. **Role Requirement:** The authenticated user must have the `STUDENT` role.

3. **Pagination:** Endpoints that support pagination use query parameters `page` and `limit`.

4. **Date Formats:** All dates are returned in ISO 8601 format (e.g., `2024-01-15T00:00:00.000Z`).

5. **Currency:** Payment amounts are in the base currency (e.g., Naira for Nigeria).

6. **File URLs:** File URLs returned are presigned URLs or direct S3 URLs depending on configuration.

## Support

For additional support or questions about these endpoints, refer to:
- React Native Integration Guide: `docs/STUDENT_PORTAL_REACT_NATIVE_INTEGRATION_GUIDE.md`
- Next.js Integration Guide: `docs/STUDENT_PORTAL_NEXTJS_INTEGRATION_GUIDE.md`

