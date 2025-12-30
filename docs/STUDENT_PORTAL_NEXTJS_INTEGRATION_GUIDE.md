# Student Portal - Next.js Integration Guide

This guide provides comprehensive instructions for integrating the Student Portal API with a Next.js web application.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Client Setup](#api-client-setup)
4. [API Endpoints Reference](#api-endpoints-reference)
5. [Implementation Examples](#implementation-examples)
6. [Server-Side Rendering (SSR)](#server-side-rendering-ssr)
7. [Error Handling](#error-handling)
8. [State Management](#state-management)
9. [Best Practices](#best-practices)

## Overview

The Student Portal API provides endpoints for students to:
- View and update their profile
- View enrolled courses and batches
- Check payment history and invoices
- View attendance records
- Access academic progress
- Manage notifications
- View support tickets
- Access files and documents

## Authentication

All Student Portal endpoints require JWT authentication. The student must be authenticated and have the `STUDENT` role.

### Login Flow

```typescript
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const response = await fetch(`${process.env.API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok) {
      // Set cookies
      cookies().set('accessToken', data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      cookies().set('refreshToken', data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return NextResponse.json({ user: data.user });
    }

    return NextResponse.json(
      { error: data.message || 'Login failed' },
      { status: response.status }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Token Refresh

```typescript
// lib/api/refreshToken.ts
import { cookies } from 'next/headers';

export async function refreshAccessToken() {
  try {
    const refreshToken = cookies().get('refreshToken')?.value;

    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    const response = await fetch(`${process.env.API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshToken}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      cookies().set('accessToken', data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });

      return data.accessToken;
    }

    throw new Error('Token refresh failed');
  } catch (error) {
    // Clear cookies and redirect to login
    cookies().delete('accessToken');
    cookies().delete('refreshToken');
    throw error;
  }
}
```

## API Client Setup

### Server-Side API Client

```typescript
// lib/api/client.ts
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.API_BASE_URL || 'https://your-api-domain.com';

export async function apiClient(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = cookies().get('accessToken')?.value;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  // Handle token refresh on 401
  if (response.status === 401) {
    try {
      const newToken = await refreshAccessToken();
      // Retry request with new token
      return fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newToken}`,
          ...options.headers,
        },
      });
    } catch (error) {
      throw new Error('Authentication failed');
    }
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}
```

### Client-Side API Client

```typescript
// lib/api/client-client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export async function clientApiClient(
  endpoint: string,
  options: RequestInit = {}
) {
  const response = await fetch(`/api/proxy${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}
```

### API Proxy Route

```typescript
// app/api/proxy/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'POST');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'PATCH');
}

async function handleRequest(
  request: NextRequest,
  path: string[],
  method: string
) {
  try {
    const token = cookies().get('accessToken')?.value;
    const endpoint = `/${path.join('/')}`;
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${process.env.API_BASE_URL}${endpoint}${searchParams ? `?${searchParams}` : ''}`;

    const body = method !== 'GET' ? await request.json() : undefined;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## API Endpoints Reference

### Base URL
All Student Portal endpoints are prefixed with: `/portal/student`

### Endpoints

#### 1. Get Dashboard
**GET** `/portal/student/dashboard`

Returns comprehensive dashboard data.

**Server Component Example:**
```typescript
// app/dashboard/page.tsx
import { apiClient } from '@/lib/api/client';

export default async function DashboardPage() {
  const dashboardData = await apiClient('/portal/student/dashboard');

  return (
    <div>
      <h1>Welcome, {dashboardData.profile.fullName}</h1>
      <p>Courses: {dashboardData.coursesCount}</p>
      <p>Total Payments: ₦{dashboardData.totalPayments}</p>
      <p>Pending: ₦{dashboardData.pendingPayments}</p>
      <p>Attendance: {dashboardData.attendancePercentage}%</p>
    </div>
  );
}
```

#### 2. Get Profile
**GET** `/portal/student/profile`

**Client Component Example:**
```typescript
// app/profile/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { clientApiClient } from '@/lib/api/client-client';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await clientApiClient('/portal/student/profile');
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{profile.fullName}</h1>
      <p>{profile.email}</p>
      <p>{profile.phone}</p>
    </div>
  );
}
```

#### 3. Update Profile
**PATCH** `/portal/student/profile`

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

**Example:**
```typescript
// components/ProfileForm.tsx
'use client';

import { useState } from 'react';
import { clientApiClient } from '@/lib/api/client-client';

export default function ProfileForm({ initialData }) {
  const [formData, setFormData] = useState(initialData);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await clientApiClient('/portal/student/profile', {
        method: 'PATCH',
        body: JSON.stringify(formData),
      });
      alert('Profile updated successfully');
    } catch (error) {
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.fullName}
        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
      />
      <button type="submit" disabled={loading}>
        Update Profile
      </button>
    </form>
  );
}
```

#### 4. Get Courses
**GET** `/portal/student/courses`

**Server Component Example:**
```typescript
// app/courses/page.tsx
import { apiClient } from '@/lib/api/client';

export default async function CoursesPage() {
  const courses = await apiClient('/portal/student/courses');

  return (
    <div>
      <h1>My Courses</h1>
      {courses.map((course) => (
        <div key={course.id}>
          <h2>{course.name}</h2>
          <p>{course.code}</p>
          <p>Duration: {course.duration} months</p>
        </div>
      ))}
    </div>
  );
}
```

#### 5. Get Payment History
**GET** `/portal/student/payments?page=1&limit=10`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Example with Pagination:**
```typescript
// app/payments/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { clientApiClient } from '@/lib/api/client-client';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchPayments();
  }, [page]);

  const fetchPayments = async () => {
    try {
      const data = await clientApiClient(
        `/portal/student/payments?page=${page}&limit=10`
      );
      setPayments(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  return (
    <div>
      <h1>Payment History</h1>
      {payments.map((payment) => (
        <div key={payment.id}>
          <p>{payment.course.name}</p>
          <p>₦{payment.amount}</p>
          <p>{new Date(payment.paymentDate).toLocaleDateString()}</p>
        </div>
      ))}
      <button
        onClick={() => setPage(page - 1)}
        disabled={page === 1}
      >
        Previous
      </button>
      <button
        onClick={() => setPage(page + 1)}
        disabled={page >= pagination?.totalPages}
      >
        Next
      </button>
    </div>
  );
}
```

#### 6. Get Invoices
**GET** `/portal/student/invoices`

#### 7. Get Attendance
**GET** `/portal/student/attendance?year=2024&month=1`

**Query Parameters:**
- `year` (optional): Filter by year
- `month` (optional): Filter by month (1-12)

#### 8. Get Batches
**GET** `/portal/student/batches`

#### 9. Get Certificates
**GET** `/portal/student/certificates`

#### 10. Get Files
**GET** `/portal/student/files?fileType=payment_receipt`

**Query Parameters:**
- `fileType` (optional): Filter by file type

#### 11. Get Notifications
**GET** `/portal/student/notifications?page=1&limit=20`

**Example:**
```typescript
// components/NotificationsList.tsx
'use client';

import { useState, useEffect } from 'react';
import { clientApiClient } from '@/lib/api/client-client';

export default function NotificationsList() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await clientApiClient('/portal/student/notifications');
      setNotifications(data.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await clientApiClient(`/portal/student/notifications/${id}/read`, {
        method: 'PATCH',
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <div>
      {notifications.map((notification) => (
        <div
          key={notification.id}
          onClick={() => markAsRead(notification.id)}
          style={{
            backgroundColor: notification.read ? '#fff' : '#e3f2fd',
            cursor: 'pointer',
          }}
        >
          <h3>{notification.title}</h3>
          <p>{notification.message}</p>
        </div>
      ))}
    </div>
  );
}
```

#### 12. Mark Notification as Read
**PATCH** `/portal/student/notifications/:id/read`

#### 13. Mark All Notifications as Read
**PATCH** `/portal/student/notifications/read-all`

#### 14. Get Tickets
**GET** `/portal/student/tickets?page=1&limit=10`

#### 15. Get Academic Progress
**GET** `/portal/student/academic-progress`

## Server-Side Rendering (SSR)

### Server Component with Data Fetching

```typescript
// app/dashboard/page.tsx
import { apiClient } from '@/lib/api/client';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

export default async function DashboardPage() {
  const token = cookies().get('accessToken')?.value;

  if (!token) {
    redirect('/login');
  }

  try {
    const dashboardData = await apiClient('/portal/student/dashboard');

    return (
      <div>
        <h1>Dashboard</h1>
        {/* Render dashboard data */}
      </div>
    );
  } catch (error) {
    redirect('/login');
  }
}
```

### Server Actions

```typescript
// app/actions/profile.ts
'use server';

import { apiClient } from '@/lib/api/client';
import { revalidatePath } from 'next/cache';

export async function updateProfile(formData: FormData) {
  try {
    const data = {
      fullName: formData.get('fullName'),
      phone: formData.get('phone'),
      address: formData.get('address'),
    };

    await apiClient('/portal/student/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });

    revalidatePath('/profile');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

## Error Handling

### Error Boundary

```typescript
// app/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

### Error Handler Utility

```typescript
// lib/utils/errorHandler.ts
export function handleApiError(error: any): string {
  if (error.response) {
    const { status, data } = error.response;
    
    switch (status) {
      case 401:
        return 'Unauthorized. Please login again.';
      case 403:
        return 'Access forbidden.';
      case 404:
        return 'Resource not found.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return data?.message || 'An error occurred';
    }
  } else if (error.request) {
    return 'Network error. Please check your connection.';
  } else {
    return error.message || 'An unexpected error occurred';
  }
}
```

## State Management

### Using React Context

```typescript
// context/StudentContext.tsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { clientApiClient } from '@/lib/api/client-client';

const StudentContext = createContext(null);

export function StudentProvider({ children }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
    fetchProfile();
  }, []);

  const fetchDashboard = async () => {
    try {
      const data = await clientApiClient('/portal/student/dashboard');
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const data = await clientApiClient('/portal/student/profile');
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  return (
    <StudentContext.Provider
      value={{
        dashboardData,
        profile,
        loading,
        refreshDashboard: fetchDashboard,
        refreshProfile: fetchProfile,
      }}
    >
      {children}
    </StudentContext.Provider>
  );
}

export const useStudent = () => useContext(StudentContext);
```

## Best Practices

1. **Server Components**: Use Server Components for initial data fetching to improve performance.

2. **Client Components**: Use Client Components only when you need interactivity (forms, buttons, etc.).

3. **Caching**: Leverage Next.js caching for frequently accessed data.

4. **Error Handling**: Implement comprehensive error handling with error boundaries.

5. **Loading States**: Show loading states during data fetching.

6. **Pagination**: Implement pagination for list endpoints.

7. **Type Safety**: Use TypeScript for type safety.

8. **Environment Variables**: Store API URLs in environment variables.

9. **Security**: Never expose tokens in client-side code. Use httpOnly cookies.

10. **Optimistic Updates**: Use optimistic updates for better UX.

## Environment Variables

Create a `.env.local` file:

```env
API_BASE_URL=https://your-api-domain.com
NEXT_PUBLIC_API_BASE_URL=https://your-api-domain.com
```

## Dependencies

Install required packages:

```bash
npm install axios
# or
yarn add axios
```

## Testing

Test your integration using:
- Next.js built-in testing
- Playwright for E2E testing
- Jest for unit testing

## Support

For issues or questions, refer to the main API documentation or contact the backend team.

