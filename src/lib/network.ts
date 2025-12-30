import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'https://your-api-domain.com';

const clientApi = axios.create({
  baseURL: '',
  withCredentials: true,
});

if (typeof window !== 'undefined') {
  clientApi.interceptors.request.use((config) => {
    if (config.url && !config.url.startsWith('/api/')) {
      config.url = `/api/proxy${config.url}`;
    }
    return config;
  });
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName?: string;
    emailVerified?: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

export class EmailNotVerifiedError extends Error {
  email?: string;
  constructor(message: string, email?: string) {
    super(message);
    this.name = 'EmailNotVerifiedError';
    this.email = email;
  }
}

export const loginUser = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    
    let errorMessage = 'Login failed';
    let errorEmail: string | undefined;
    
    if (isJson) {
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
        if (response.status === 403 && (error.email || error.error?.includes('verify'))) {
          errorEmail = error.email || credentials.email;
        }
      } catch {
      }
    } else {
      try {
        const text = await response.text();
        errorMessage = text || errorMessage;
      } catch {
      }
    }
    
    if (response.status === 403 && (errorMessage.includes('verify') || errorMessage.includes('Email not verified'))) {
      throw new EmailNotVerifiedError(errorMessage, errorEmail || credentials.email);
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
};

export const registerUser = async (data: RegisterData): Promise<any> => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    
    let errorMessage = 'Registration failed';
    if (isJson) {
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch {
      }
    } else {
      try {
        const text = await response.text();
        errorMessage = text || errorMessage;
      } catch {
      }
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
};

export const logoutUser = async (): Promise<void> => {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
};

export const resendVerificationEmail = async (email: string): Promise<{ message: string; alreadyVerified?: boolean }> => {
  const response = await fetch('/api/auth/resend-verification-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    
    let errorMessage = 'Failed to resend verification email';
    if (isJson) {
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch {
      }
    } else {
      try {
        const text = await response.text();
        errorMessage = text || errorMessage;
      } catch {
      }
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
};

export const verifyEmail = async (token: string): Promise<{ message: string; verified: boolean; accessToken?: string; refreshToken?: string }> => {
  const response = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    
    let errorMessage = 'Email verification failed';
    if (isJson) {
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch {
      }
    } else {
      try {
        const text = await response.text();
        errorMessage = text || errorMessage;
      } catch {
      }
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
};

export const forgotPassword = async (email: string): Promise<{ message: string }> => {
  const response = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    
    let errorMessage = 'Failed to send password reset email';
    if (isJson) {
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch {
      }
    } else {
      try {
        const text = await response.text();
        errorMessage = text || errorMessage;
      } catch {
      }
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
};

export const resetPassword = async (token: string, newPassword: string): Promise<{ message: string }> => {
  const response = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ token, newPassword }),
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');
    
    let errorMessage = 'Failed to reset password';
    if (isJson) {
      try {
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
      } catch {
      }
    } else {
      try {
        const text = await response.text();
        errorMessage = text || errorMessage;
      } catch {
      }
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
};

export const getDashboardClient = async () => {
  const res = await clientApi.get('/portal/student/dashboard');
  return res.data;
};

export const getProfileClient = async () => {
  const res = await clientApi.get('/portal/student/profile');
  return res.data;
};

export const getStudentProfileByEmailClient = async (studentEmail: string) => {
  const res = await clientApi.get(`/students/profile/${encodeURIComponent(studentEmail)}`);
  return res.data;
};

export interface UpdateProfileData {
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  image?: string;
}

export const updateProfileClient = async (data: UpdateProfileData) => {
  const res = await clientApi.patch('/portal/student/profile', data);
  return res.data;
};

export const getCoursesClient = async () => {
  const res = await clientApi.get('/portal/student/courses');
  return res.data;
};

export interface PaymentHistoryParams {
  page?: number;
  limit?: number;
}

export const getPaymentsClient = async (params?: PaymentHistoryParams) => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  const res = await clientApi.get(`/portal/student/payments?${queryParams.toString()}`);
  return res.data;
};

export const getPaymentsOverviewClient = async () => {
  const res = await clientApi.get('/portal/student/payments-overview');
  return res.data;
};

export const getInvoicesClient = async () => {
  const res = await clientApi.get('/portal/student/invoices');
  return res.data;
};

export interface AttendanceParams {
  year?: number;
  month?: number;
}

export const getAttendanceClient = async (params?: AttendanceParams) => {
  const queryParams = new URLSearchParams();
  if (params?.year) queryParams.append('year', params.year.toString());
  if (params?.month) queryParams.append('month', params.month.toString());
  const res = await clientApi.get(`/portal/student/attendance?${queryParams.toString()}`);
  return res.data;
};

export const getBatchesClient = async () => {
  const res = await clientApi.get('/portal/student/batches');
  return res.data;
};

export const getCertificatesClient = async () => {
  const res = await clientApi.get('/portal/student/certificates');
  return res.data;
};

export interface FilesParams {
  fileType?: string;
}

export const getFilesClient = async (params?: FilesParams) => {
  const queryParams = new URLSearchParams();
  if (params?.fileType) queryParams.append('fileType', params.fileType);
  const res = await clientApi.get(`/portal/student/files?${queryParams.toString()}`);
  return res.data;
};

export interface NotificationsParams {
  page?: number;
  limit?: number;
}

export const getNotificationsClient = async (params?: NotificationsParams & { read?: boolean; offset?: number }) => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.read !== undefined) queryParams.append('read', params.read.toString());
  if (params?.offset !== undefined) queryParams.append('offset', params.offset.toString());
  const res = await clientApi.get(`/notifications?${queryParams.toString()}`);
  const data = res.data;
  
  if (data.notifications && Array.isArray(data.notifications)) {
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
  return data;
};

export const getUnreadCountClient = async () => {
  const res = await clientApi.get('/notifications/unread-count');
  return res.data;
};

export const markNotificationAsReadClient = async (id: string) => {
  const res = await clientApi.patch(`/notifications/${id}/read`);
  return res.data;
};

export const markAllNotificationsAsReadClient = async () => {
  const res = await clientApi.patch('/notifications/read-all');
  return res.data;
};

export const deleteNotificationClient = async (id: string) => {
  const res = await clientApi.delete(`/notifications/${id}`);
  return res.data;
};

export interface TicketsParams {
  page?: number;
  limit?: number;
}

export const getTicketsClient = async (params?: TicketsParams) => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  const res = await clientApi.get(`/portal/student/tickets?${queryParams.toString()}`);
  return res.data;
};

export const getAcademicProgressClient = async () => {
  const res = await clientApi.get('/portal/student/academic-progress');
  return res.data;
};

export interface FundWalletRequest {
  amount: number;
}

export interface FundWalletResponse {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export const fundWalletClient = async (data: FundWalletRequest): Promise<FundWalletResponse> => {
  const res = await clientApi.post('/portal/student/wallet/fund', data);
  return res.data;
};

export interface PayInstallmentRequest {
  installmentId: string;
  paymentSource: 'wallet' | 'paystack';
}

export interface PayInstallmentResponse {
  success: boolean;
  message?: string;
  authorizationUrl?: string;
  accessCode?: string;
  reference?: string;
}

export const payInstallmentClient = async (data: PayInstallmentRequest): Promise<PayInstallmentResponse> => {
  try {
    const res = await clientApi.post('/portal/student/payments/pay-installment', data);
    return res.data;
  } catch (error: any) {
    console.error('Payment request error:', {
      url: '/portal/student/payments/pay-installment',
      data,
      error: error.response?.data || error.message,
      status: error.response?.status,
    });
    throw error;
  }
};

export const verifyWalletFundingClient = async (reference: string) => {
  const res = await clientApi.post('/portal/student/wallet/verify', { reference });
  return res.data;
};

export const verifyInstallmentPaymentClient = async (reference: string) => {
  const res = await clientApi.post('/portal/student/payments/verify', { reference });
  return res.data;
};
