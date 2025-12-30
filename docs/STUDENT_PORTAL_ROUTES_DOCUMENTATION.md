# Student Portal - Routes Documentation

This document provides a comprehensive list of all routes used by both the frontend (Next.js) and backend (NestJS) applications for the Student Portal feature.

## Table of Contents

1. [Frontend Routes (Next.js)](#frontend-routes-nextjs)
2. [Backend API Routes](#backend-api-routes)
3. [Authentication Routes](#authentication-routes)
4. [Route Mapping](#route-mapping)

---

## Frontend Routes (Next.js)

### Public Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `src/app/page.tsx` | Home page - redirects to `/login` or `/dashboard` based on auth status |
| `/login` | `src/app/login/page.tsx` | Student login page |

### Protected Routes (Require Authentication)

All protected routes use the `MainLayout` component which includes the sidebar navigation.

| Route | Component | Description |
|-------|-----------|-------------|
| `/dashboard` | `src/app/dashboard/page.tsx` | Student dashboard with overview statistics |
| `/profile` | `src/app/profile/page.tsx` | View and edit student profile |
| `/courses` | `src/app/courses/page.tsx` | List of enrolled courses |
| `/payments` | `src/app/payments/page.tsx` | Payment history and invoices |
| `/attendance` | `src/app/attendance/page.tsx` | Attendance records with filtering |
| `/batches` | `src/app/batches/page.tsx` | Batch schedules and faculty information |
| `/notifications` | `src/app/notifications/page.tsx` | Notifications list with mark as read |
| `/tickets` | `src/app/tickets/page.tsx` | Support tickets view |
| `/academic-progress` | `src/app/academic-progress/page.tsx` | Academic progress and statistics |

### API Proxy Routes (Next.js API Routes)

These routes act as a proxy between the frontend and backend API.

| Route | Method | Handler | Description |
|-------|--------|---------|-------------|
| `/api/proxy/[...path]` | GET, POST, PATCH, PUT, DELETE | `src/app/api/proxy/[...path]/route.ts` | Generic proxy route for all backend API calls |
| `/api/auth/login` | POST | `src/app/api/auth/login/route.ts` | Student login endpoint |
| `/api/auth/logout` | POST | `src/app/api/auth/logout/route.ts` | Student logout endpoint |

---

## Backend API Routes

All backend routes are prefixed with `/portal/student` and require:
- **Authentication:** JWT Bearer Token
- **Role:** `STUDENT`
- **Header:** `Authorization: Bearer <access_token>`

### Dashboard

| Method | Route | Description | Response Type |
|--------|-------|-------------|---------------|
| GET | `/portal/student/dashboard` | Get comprehensive dashboard data | `DashboardData` |

**Frontend Usage:**
- Server Component: `src/app/dashboard/page.tsx`
- API Call: `apiClient('/portal/student/dashboard')`

---

### Profile Management

| Method | Route | Description | Request Body | Response Type |
|--------|-------|-------------|--------------|---------------|
| GET | `/portal/student/profile` | Get student profile | - | `StudentProfile` |
| PATCH | `/portal/student/profile` | Update student profile | `UpdateProfileDto` | `StudentProfile` |

**Frontend Usage:**
- Server Component: `src/app/profile/page.tsx`
- Client Component: `src/components/profile/ProfileForm.tsx`
- API Calls:
  - `apiClient('/portal/student/profile')` (server)
  - `clientApiClient('/portal/student/profile', { method: 'PATCH', body: ... })` (client)

---

### Courses

| Method | Route | Description | Response Type |
|--------|-------|-------------|---------------|
| GET | `/portal/student/courses` | Get enrolled courses | `Course[]` |

**Frontend Usage:**
- Server Component: `src/app/courses/page.tsx`
- API Call: `apiClient('/portal/student/courses')`

---

### Payments

| Method | Route | Description | Query Params | Response Type |
|--------|-------|-------------|--------------|---------------|
| GET | `/portal/student/payments` | Get payment history | `page`, `limit` | `PaymentHistoryResponse` |
| GET | `/portal/student/invoices` | Get all invoices | - | `Invoice[]` |

**Frontend Usage:**
- Client Component: `src/app/payments/page.tsx`
- API Calls:
  - `clientApiClient('/portal/student/payments?page=1&limit=10')`
  - `clientApiClient('/portal/student/invoices')`

---

### Attendance

| Method | Route | Description | Query Params | Response Type |
|--------|-------|-------------|--------------|---------------|
| GET | `/portal/student/attendance` | Get attendance records | `year`, `month` | `AttendanceRecord[]` |

**Frontend Usage:**
- Client Component: `src/app/attendance/page.tsx`
- API Call: `clientApiClient('/portal/student/attendance?year=2024&month=1')`

---

### Batches

| Method | Route | Description | Response Type |
|--------|-------|-------------|---------------|
| GET | `/portal/student/batches` | Get student batches with schedules | `Batch[]` |

**Frontend Usage:**
- Server Component: `src/app/batches/page.tsx`
- API Call: `apiClient('/portal/student/batches')`

---

### Notifications

| Method | Route | Description | Query Params | Request Body | Response Type |
|--------|-------|-------------|--------------|--------------|---------------|
| GET | `/portal/student/notifications` | Get notifications | `page`, `limit` | - | `NotificationResponse` |
| PATCH | `/portal/student/notifications/:id/read` | Mark notification as read | - | - | `Notification` |
| PATCH | `/portal/student/notifications/read-all` | Mark all notifications as read | - | - | `{ count: number }` |

**Frontend Usage:**
- Client Component: `src/app/notifications/page.tsx`
- API Calls:
  - `clientApiClient('/portal/student/notifications?page=1&limit=20')`
  - `clientApiClient('/portal/student/notifications/:id/read', { method: 'PATCH' })`
  - `clientApiClient('/portal/student/notifications/read-all', { method: 'PATCH' })`

---

### Support Tickets

| Method | Route | Description | Query Params | Response Type |
|--------|-------|-------------|--------------|---------------|
| GET | `/portal/student/tickets` | Get support tickets | `page`, `limit` | `TicketResponse` |

**Note:** To create tickets, use the main tickets endpoint: `POST /tickets`

**Frontend Usage:**
- Client Component: `src/app/tickets/page.tsx`
- API Call: `clientApiClient('/portal/student/tickets?page=1&limit=10')`

---

### Academic Progress

| Method | Route | Description | Response Type |
|--------|-------|-------------|---------------|
| GET | `/portal/student/academic-progress` | Get academic progress summary | `AcademicProgress` |

**Frontend Usage:**
- Server Component: `src/app/academic-progress/page.tsx`
- API Call: `apiClient('/portal/student/academic-progress')`

---

### Certificates

| Method | Route | Description | Response Type |
|--------|-------|-------------|---------------|
| GET | `/portal/student/certificates` | Get student certificates | `Certificate[]` |

**Frontend Usage:**
- Not yet implemented in frontend (backend endpoint available)

---

### Files

| Method | Route | Description | Query Params | Response Type |
|--------|-------|-------------|--------------|---------------|
| GET | `/portal/student/files` | Get student files/documents | `fileType` | `File[]` |

**Frontend Usage:**
- Not yet implemented in frontend (backend endpoint available)

---

## Authentication Routes

### Backend Authentication

| Method | Route | Description | Request Body | Response |
|--------|-------|-------------|--------------|----------|
| POST | `/auth/login` | Student login | `{ email, password }` | `{ accessToken, refreshToken, user }` |
| POST | `/auth/refresh` | Refresh access token | - | `{ accessToken }` |

### Frontend Authentication

| Method | Route | Handler | Description |
|--------|-------|---------|-------------|
| POST | `/api/auth/login` | `src/app/api/auth/login/route.ts` | Proxy to backend login, sets cookies |
| POST | `/api/auth/logout` | `src/app/api/auth/logout/route.ts` | Clears authentication cookies |

---

## Route Mapping

### Complete Flow Example: Viewing Dashboard

1. **User navigates to:** `/dashboard`
2. **Frontend Route:** `src/app/dashboard/page.tsx`
3. **Authentication Check:** `requireAuth()` from `src/lib/auth.ts`
4. **API Call:** `apiClient('/portal/student/dashboard')` from `src/lib/api/client.ts`
5. **Backend Route:** `GET /portal/student/dashboard`
6. **Backend Handler:** `PortalController.getDashboard()` in backend
7. **Response:** Dashboard data rendered in the page

### Complete Flow Example: Updating Profile

1. **User navigates to:** `/profile`
2. **Frontend Route:** `src/app/profile/page.tsx` (Server Component)
3. **Initial Data Fetch:** `apiClient('/portal/student/profile')`
4. **User edits form:** `src/components/profile/ProfileForm.tsx` (Client Component)
5. **Form Submission:** `clientApiClient('/portal/student/profile', { method: 'PATCH', body: ... })`
6. **Frontend Proxy:** `/api/proxy/portal/student/profile` → `src/app/api/proxy/[...path]/route.ts`
7. **Backend Route:** `PATCH /portal/student/profile`
8. **Backend Handler:** `PortalController.updateProfile()` in backend
9. **Response:** Updated profile data, page refreshes

---

## Environment Variables

### Frontend (.env.local)

```env
# Backend API URL
API_BASE_URL=https://your-api-domain.com
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.com

# Node Environment
NODE_ENV=production
```

### Backend (.env)

```env
# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d

# Database
DATABASE_URL=postgresql://...

# API Base URL
API_BASE_URL=https://your-api-domain.com
```

---

## Error Handling

### Frontend Error Handling

- **401 Unauthorized:** Redirects to `/login`
- **403 Forbidden:** Shows error message
- **404 Not Found:** Shows "Resource not found" message
- **500 Server Error:** Shows "Server error" message
- **Network Error:** Shows "Network error" message

### Backend Error Responses

All endpoints may return standard HTTP error responses:

- **401 Unauthorized:** `{ statusCode: 401, message: "Unauthorized" }`
- **403 Forbidden:** `{ statusCode: 403, message: "Forbidden" }`
- **404 Not Found:** `{ statusCode: 404, message: "Resource not found" }`
- **500 Internal Server Error:** `{ statusCode: 500, message: "Internal server error" }`

---

## Type Definitions

All TypeScript types are defined in:
- **Frontend:** `src/types/student-portal.types.ts`
- **Backend:** DTOs in the backend project

---

## Best Practices

1. **Server Components:** Use for initial data fetching (dashboard, courses, batches, academic progress)
2. **Client Components:** Use for interactive features (forms, pagination, filtering)
3. **API Client:** Use `apiClient()` for server-side, `clientApiClient()` for client-side
4. **Authentication:** Always check authentication before accessing protected routes
5. **Error Handling:** Implement comprehensive error handling at all levels
6. **Loading States:** Show loading indicators during data fetching
7. **Pagination:** Implement pagination for list endpoints
8. **Type Safety:** Use TypeScript types throughout

---

## Testing Routes

### Manual Testing Checklist

- [ ] Login flow works correctly
- [ ] Dashboard loads with all data
- [ ] Profile view and update works
- [ ] Courses list displays correctly
- [ ] Payments history with pagination works
- [ ] Invoices display correctly
- [ ] Attendance filtering works (year/month)
- [ ] Batches display with schedules
- [ ] Notifications mark as read works
- [ ] Tickets list displays correctly
- [ ] Academic progress shows correct statistics
- [ ] Logout clears session
- [ ] Protected routes redirect to login when not authenticated

---

## Support

For questions or issues:
1. Refer to the integration guides in `docs/`
2. Check the API routes reference: `docs/STUDENT_PORTAL_API_ROUTES.md`
3. Review the Next.js integration guide: `docs/STUDENT_PORTAL_NEXTJS_INTEGRATION_GUIDE.md`
4. Contact the development team

---

## Version History

- **v1.0.0** - Initial implementation with all core features
- All routes documented and tested

