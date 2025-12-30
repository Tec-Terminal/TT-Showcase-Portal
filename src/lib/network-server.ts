import axios from 'axios';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://your-api-domain.com';

// Server-side API client
export const getServerApiClient = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    withCredentials: true,
  });
};

// ==================== STUDENT PORTAL - SERVER SIDE ====================

// Dashboard
export const getDashboard = async () => {
  const api = await getServerApiClient();
  const res = await api.get('/portal/student/dashboard');
  return res.data;
};

// Student Dashboard Data (course, batch, schedule)
// Uses the portal/student/dashboard endpoint which includes currentBatch
export const getStudentDashboardData = async () => {
  const api = await getServerApiClient();
  const res = await api.get('/portal/student/dashboard');
  return res.data;
};

// Profile
export const getProfile = async () => {
  const api = await getServerApiClient();
  const res = await api.get('/portal/student/profile');
  return res.data;
};

// Get student profile by email (for onboarding check)
export const getStudentProfileByEmail = async (studentEmail: string) => {
  const api = await getServerApiClient();
  const res = await api.get(`/students/profile/${encodeURIComponent(studentEmail)}`);
  return res.data;
};

export interface UpdateProfileData {
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  image?: string;
}

export const updateProfile = async (data: UpdateProfileData) => {
  const api = await getServerApiClient();
  const res = await api.patch('/portal/student/profile', data);
  return res.data;
};

// Courses
export const getCourses = async () => {
  const api = await getServerApiClient();
  const res = await api.get('/portal/student/courses');
  return res.data;
};

// Payments
export interface PaymentHistoryParams {
  page?: number;
  limit?: number;
}

export const getPayments = async (params?: PaymentHistoryParams) => {
  const api = await getServerApiClient();
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  const res = await api.get(`/portal/student/payments?${queryParams.toString()}`);
  return res.data;
};

export const getPaymentsOverview = async () => {
  const api = await getServerApiClient();
  const res = await api.get('/portal/student/payments-overview');
  return res.data;
};

// Invoices
export const getInvoices = async () => {
  const api = await getServerApiClient();
  const res = await api.get('/portal/student/invoices');
  return res.data;
};

// Attendance
export interface AttendanceParams {
  year?: number;
  month?: number;
}

export const getAttendance = async (params?: AttendanceParams) => {
  const api = await getServerApiClient();
  const queryParams = new URLSearchParams();
  if (params?.year) queryParams.append('year', params.year.toString());
  if (params?.month) queryParams.append('month', params.month.toString());
  const res = await api.get(`/portal/student/attendance?${queryParams.toString()}`);
  return res.data;
};

// Batches
export const getBatches = async () => {
  const api = await getServerApiClient();
  const res = await api.get('/portal/student/batches');
  return res.data;
};

// Certificates
export const getCertificates = async () => {
  const api = await getServerApiClient();
  const res = await api.get('/portal/student/certificates');
  return res.data;
};

// Files
export interface FilesParams {
  fileType?: string;
}

export const getFiles = async (params?: FilesParams) => {
  const api = await getServerApiClient();
  const queryParams = new URLSearchParams();
  if (params?.fileType) queryParams.append('fileType', params.fileType);
  const res = await api.get(`/portal/student/files?${queryParams.toString()}`);
  return res.data;
};

// Notifications
export interface NotificationsParams {
  page?: number;
  limit?: number;
}

export const getNotifications = async (params?: NotificationsParams & { read?: boolean; offset?: number }) => {
  const api = await getServerApiClient();
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.read !== undefined) queryParams.append('read', params.read.toString());
  if (params?.offset !== undefined) queryParams.append('offset', params.offset.toString());
  const res = await api.get(`/notifications?${queryParams.toString()}`);
  const data = res.data;
  
  // Normalize response format: handle both { notifications: [...] } and { data: [...] } formats
  if (data.notifications && Array.isArray(data.notifications)) {
    // New format: { notifications: [...], total: ..., unread: ... }
    return {
      data: data.notifications,
      pagination: {
        page: params?.page || 1,
        limit: params?.limit || 20,
        total: data.total || data.notifications.length,
        totalPages: Math.ceil((data.total || data.notifications.length) / (params?.limit || 20)),
      },
    };
  }
  // Old format: { data: [...], pagination: {...} } or already normalized
  return data;
};

export const getUnreadCount = async () => {
  const api = await getServerApiClient();
  const res = await api.get('/notifications/unread-count');
  return res.data;
};

export const markNotificationAsRead = async (id: string) => {
  const api = await getServerApiClient();
  const res = await api.patch(`/notifications/${id}/read`);
  return res.data;
};

export const markAllNotificationsAsRead = async () => {
  const api = await getServerApiClient();
  const res = await api.patch('/notifications/read-all');
  return res.data;
};

export const deleteNotification = async (id: string) => {
  const api = await getServerApiClient();
  const res = await api.delete(`/notifications/${id}`);
  return res.data;
};

// Tickets
export interface TicketsParams {
  page?: number;
  limit?: number;
}

export const getTickets = async (params?: TicketsParams) => {
  const api = await getServerApiClient();
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  const res = await api.get(`/portal/student/tickets?${queryParams.toString()}`);
  return res.data;
};

// Academic Progress
export const getAcademicProgress = async () => {
  const api = await getServerApiClient();
  const res = await api.get('/portal/student/academic-progress');
  return res.data;
};

