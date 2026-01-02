// Student Portal Types

export interface StudentProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  address?: string;
  image?: string;
  studentId: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  programType: 'REGULAR_STUDENT' | 'CORPORATE_TRAINING' | 'ONLINE_STUDENT';
  enrolledDate: string;
  birthDate?: string;
  center: {
    id: string;
    name: string;
    code: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  guardians?: Array<{
    id: string;
    fullname: string;
    email?: string;
    phone?: string;
    address?: string;
  }>;
}

export interface DashboardData {
  profile: StudentProfile;
  coursesCount: number;
  batchesCount: number;
  totalPayments: number;
  pendingPayments: number;
  attendancePercentage: number;
  recentNotifications: Notification[];
  upcomingPayments: Payment[];
  recentActivities: Activity[];
}

export interface Course {
  id: string;
  name: string;
  code: string;
  duration: number;
  type: string;
  enrolledAt: string;
  batches: Array<{
    id: string;
    code: string;
    startDate: string;
    endDate: string;
  }>;
}

export interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  paymentMethod?: string;
  paymentType?: string;
  course: {
    id: string;
    name: string;
    code: string;
  };
  paymentPlan?: {
    id: string;
    name: string;
  };
}

export interface PaymentHistoryResponse {
  data: Payment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaymentScheduleItem {
  id: string;
  description: string;
  dueDate: string;
  amount: number;
  status: 'PAID' | 'PENDING';
  paymentPlanId: string;
  installmentNumber: number;
  totalInstallments: number;
  canPay: boolean;
  isPayment?: boolean; // true if this is an actual payment record, false if virtual installment
  minimumAmount?: number; // Minimum expected amount (for virtual installments)
}

export interface PaymentBreakdownItem {
  id: string;
  reference: string;
  amount: number;
  date: string;
  status: string;
  course: {
    id: string;
    name: string;
  };
  paymentMethod: string;
  hasReceipt: boolean;
}

export interface PaymentsOverview {
  walletBalance: number;
  paymentSchedule: PaymentScheduleItem[];
  paymentBreakdown: PaymentBreakdownItem[];
}

export interface Invoice {
  id: string;
  amount: number;
  dueDate: string;
  message?: string;
  disclaimer?: string;
  course: {
    id: string;
    name: string;
    code: string;
  };
  paymentPlan?: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'UNMARKED';
  studentId: string;
  createdAt: string;
}

export interface Batch {
  id: string;
  code: string;
  duration: string;
  startDate: string;
  endDate: string;
  status: string;
  course: {
    id: string;
    name: string;
    code: string;
  };
  schedules: Array<{
    day: string;
    startTime: string;
    endTime: string;
    faculty: {
      id: string;
      fullname: string;
      phone?: string;
    };
  }>;
  faculties: Array<{
    faculty: {
      id: string;
      fullname: string;
      phone?: string;
    };
    course: {
      id: string;
      name: string;
      code: string;
    };
  }>;
}

export interface Certificate {
  id: string;
  name: string;
  course: {
    id: string;
    name: string;
    code: string;
  };
  issuedDate: string;
  certificateUrl?: string;
}

export interface File {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  metadata?: Record<string, any>;
  sentAt: string;
  createdAt: string;
}

export interface NotificationResponse {
  data: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdBy: string;
  assignedTo?: string;
  createdAt: string;
  comments?: TicketComment[];
}

export interface TicketComment {
  id: string;
  content: string;
  createdBy: string;
  createdAt: string;
}

export interface TicketResponse {
  data: Ticket[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AcademicProgress {
  coursesEnrolled: number;
  activeBatches: number;
  attendanceRate: number;
  totalAttendanceDays: number;
  presentDays: number;
  absentDays: number;
  courses: Array<{
    id: string;
    name: string;
    code: string;
    enrolledAt: string;
  }>;
}

export interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface UpdateProfileDto {
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  image?: string;
}

