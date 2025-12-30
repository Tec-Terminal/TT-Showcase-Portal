# Student Portal - React Native Integration Guide

This guide provides comprehensive instructions for integrating the Student Portal API with a React Native mobile application.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Base Configuration](#api-base-configuration)
4. [API Endpoints Reference](#api-endpoints-reference)
5. [Implementation Examples](#implementation-examples)
6. [Error Handling](#error-handling)
7. [State Management](#state-management)
8. [Best Practices](#best-practices)

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
// Example: Login and store tokens
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const login = async (email: string, password: string) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email,
      password,
    });

    const { accessToken, refreshToken, user } = response.data;

    // Store tokens securely
    await AsyncStorage.setItem('accessToken', accessToken);
    await AsyncStorage.setItem('refreshToken', refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(user));

    return { accessToken, refreshToken, user };
  } catch (error) {
    throw error;
  }
};
```

### Token Refresh

```typescript
// Example: Refresh token when expired
const refreshAccessToken = async () => {
  try {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    
    const response = await axios.post(
      `${API_BASE_URL}/auth/refresh`,
      {},
      {
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      }
    );

    const { accessToken } = response.data;
    await AsyncStorage.setItem('accessToken', accessToken);
    
    return accessToken;
  } catch (error) {
    // Redirect to login
    await AsyncStorage.clear();
    throw error;
  }
};
```

## API Base Configuration

### Setup Axios Instance

```typescript
// api/client.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://your-api-domain.com'; // Replace with your API URL

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Redirect to login
        await AsyncStorage.clear();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
```

## API Endpoints Reference

### Base URL
All Student Portal endpoints are prefixed with: `/portal/student`

### Endpoints

#### 1. Get Dashboard
**GET** `/portal/student/dashboard`

Returns comprehensive dashboard data including profile, courses, payments, attendance, and notifications.

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
  "recentNotifications": [...],
  "upcomingPayments": [...],
  "recentActivities": [...]
}
```

#### 2. Get Profile
**GET** `/portal/student/profile`

Returns detailed student profile information.

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
  "center": {...},
  "guardians": [...]
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

#### 4. Get Courses
**GET** `/portal/student/courses`

Returns list of enrolled courses.

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
    "batches": [...]
  }
]
```

#### 5. Get Payment History
**GET** `/portal/student/payments?page=1&limit=10`

Returns paginated payment history.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response:**
```json
{
  "data": [
    {
      "id": "string",
      "amount": 10000,
      "paymentDate": "2024-01-15T00:00:00.000Z",
      "status": "APPROVED",
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

#### 6. Get Invoices
**GET** `/portal/student/invoices`

Returns all invoices for the student.

**Response:**
```json
[
  {
    "id": "string",
    "amount": 10000,
    "dueDate": "2024-02-15",
    "message": "string",
    "disclaimer": "string",
    "course": {...},
    "paymentPlan": {...},
    "createdAt": "2024-01-15T00:00:00.000Z"
  }
]
```

#### 7. Get Attendance
**GET** `/portal/student/attendance?year=2024&month=1`

Returns attendance records, optionally filtered by year and month.

**Query Parameters:**
- `year` (optional): Filter by year
- `month` (optional): Filter by month (1-12)

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

#### 8. Get Batches
**GET** `/portal/student/batches`

Returns student batches with schedules and faculty information.

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
    "course": {...},
    "schedules": [
      {
        "day": "Monday",
        "startTime": "09:00",
        "endTime": "12:00",
        "faculty": {...}
      }
    ],
    "faculties": [...]
  }
]
```

#### 9. Get Certificates
**GET** `/portal/student/certificates`

Returns student certificates (if available).

#### 10. Get Files
**GET** `/portal/student/files?fileType=payment_receipt`

Returns student files/documents.

**Query Parameters:**
- `fileType` (optional): Filter by file type (e.g., "payment_receipt", "profile_image")

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
    "uploadedAt": "2024-01-15T00:00:00.000Z"
  }
]
```

#### 11. Get Notifications
**GET** `/portal/student/notifications?page=1&limit=20`

Returns paginated notifications.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

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

#### 12. Mark Notification as Read
**PATCH** `/portal/student/notifications/:id/read`

Marks a specific notification as read.

**Path Parameters:**
- `id`: Notification ID

#### 13. Mark All Notifications as Read
**PATCH** `/portal/student/notifications/read-all`

Marks all notifications as read.

#### 14. Get Tickets
**GET** `/portal/student/tickets?page=1&limit=10`

Returns paginated support tickets.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

#### 15. Get Academic Progress
**GET** `/portal/student/academic-progress`

Returns academic progress summary.

**Response:**
```json
{
  "coursesEnrolled": 3,
  "activeBatches": 2,
  "attendanceRate": 85.5,
  "totalAttendanceDays": 50,
  "presentDays": 43,
  "absentDays": 7,
  "courses": [...]
}
```

## Implementation Examples

### Dashboard Screen

```typescript
// screens/DashboardScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import apiClient from '../api/client';

const DashboardScreen = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/portal/student/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" />;
  }

  return (
    <ScrollView>
      <View>
        <Text>Welcome, {dashboardData?.profile?.fullName}</Text>
        <Text>Courses: {dashboardData?.coursesCount}</Text>
        <Text>Total Payments: ₦{dashboardData?.totalPayments}</Text>
        <Text>Pending: ₦{dashboardData?.pendingPayments}</Text>
        <Text>Attendance: {dashboardData?.attendancePercentage}%</Text>
      </View>
    </ScrollView>
  );
};

export default DashboardScreen;
```

### Profile Screen

```typescript
// screens/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import apiClient from '../api/client';

const ProfileScreen = () => {
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/portal/student/profile');
      setProfile(response.data);
      setFormData({
        fullName: response.data.fullName,
        phone: response.data.phone,
        address: response.data.address,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile');
    }
  };

  const updateProfile = async () => {
    try {
      await apiClient.patch('/portal/student/profile', formData);
      Alert.alert('Success', 'Profile updated successfully');
      fetchProfile();
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  return (
    <View>
      <TextInput
        value={formData.fullName}
        onChangeText={(text) => setFormData({ ...formData, fullName: text })}
        placeholder="Full Name"
      />
      <TextInput
        value={formData.phone}
        onChangeText={(text) => setFormData({ ...formData, phone: text })}
        placeholder="Phone"
      />
      <TextInput
        value={formData.address}
        onChangeText={(text) => setFormData({ ...formData, address: text })}
        placeholder="Address"
      />
      <Button title="Update Profile" onPress={updateProfile} />
    </View>
  );
};

export default ProfileScreen;
```

### Payments Screen

```typescript
// screens/PaymentsScreen.tsx
import React, { useState, useEffect } from 'react';
import { FlatList, View, Text } from 'react-native';
import apiClient from '../api/client';

const PaymentsScreen = () => {
  const [payments, setPayments] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, [page]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/portal/student/payments?page=${page}&limit=10`
      );
      setPayments(response.data.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPaymentItem = ({ item }) => (
    <View>
      <Text>{item.course.name}</Text>
      <Text>₦{item.amount}</Text>
      <Text>{new Date(item.paymentDate).toLocaleDateString()}</Text>
      <Text>{item.status}</Text>
    </View>
  );

  return (
    <FlatList
      data={payments}
      renderItem={renderPaymentItem}
      keyExtractor={(item) => item.id}
      onEndReached={() => setPage(page + 1)}
      onEndReachedThreshold={0.5}
    />
  );
};

export default PaymentsScreen;
```

### Notifications Screen

```typescript
// screens/NotificationsScreen.tsx
import React, { useState, useEffect } from 'react';
import { FlatList, View, Text, TouchableOpacity } from 'react-native';
import apiClient from '../api/client';

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchNotifications();
  }, [page]);

  const fetchNotifications = async () => {
    try {
      const response = await apiClient.get(
        `/portal/student/notifications?page=${page}&limit=20`
      );
      setNotifications(response.data.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.patch(`/portal/student/notifications/${notificationId}/read`);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => markAsRead(item.id)}
      style={{ backgroundColor: item.read ? '#fff' : '#e3f2fd' }}
    >
      <Text style={{ fontWeight: item.read ? 'normal' : 'bold' }}>
        {item.title}
      </Text>
      <Text>{item.message}</Text>
      <Text>{new Date(item.createdAt).toLocaleDateString()}</Text>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={notifications}
      renderItem={renderNotificationItem}
      keyExtractor={(item) => item.id}
    />
  );
};

export default NotificationsScreen;
```

## Error Handling

### Centralized Error Handler

```typescript
// utils/errorHandler.ts
export const handleApiError = (error: any) => {
  if (error.response) {
    // Server responded with error status
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
    // Request made but no response
    return 'Network error. Please check your connection.';
  } else {
    // Something else happened
    return error.message || 'An unexpected error occurred';
  }
};
```

## State Management

### Using React Context

```typescript
// context/StudentContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

const StudentContext = createContext(null);

export const StudentProvider = ({ children }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
    fetchProfile();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await apiClient.get('/portal/student/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/portal/student/profile');
      setProfile(response.data);
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
};

export const useStudent = () => useContext(StudentContext);
```

## Best Practices

1. **Token Management**: Always store tokens securely using `@react-native-async-storage/async-storage` or a secure storage solution.

2. **Error Handling**: Implement comprehensive error handling for all API calls.

3. **Loading States**: Show loading indicators during API calls.

4. **Pagination**: Implement pagination for list endpoints (payments, notifications, tickets).

5. **Caching**: Consider caching dashboard and profile data to reduce API calls.

6. **Offline Support**: Implement offline support using libraries like `@react-native-community/netinfo`.

7. **Refresh Tokens**: Implement automatic token refresh to maintain user sessions.

8. **Error Messages**: Display user-friendly error messages.

9. **Pull to Refresh**: Implement pull-to-refresh for list screens.

10. **Optimistic Updates**: Use optimistic updates for better UX (e.g., marking notifications as read).

## Dependencies

Install required packages:

```bash
npm install axios @react-native-async-storage/async-storage
# or
yarn add axios @react-native-async-storage/async-storage
```

For TypeScript:

```bash
npm install --save-dev @types/react-native
```

## Testing

Test your integration using tools like:
- Postman for API testing
- React Native Debugger for debugging
- Flipper for network inspection

## Support

For issues or questions, refer to the main API documentation or contact the backend team.

