# Refund Frontend Integration Guide

This guide explains how to fetch and display refunds on the frontend.

## API Endpoint

**GET** `/refunds`

### Query Parameters

| Parameter   | Type   | Required | Description                                                        |
| ----------- | ------ | -------- | ------------------------------------------------------------------ |
| `status`    | string | No       | Filter by status: `REQUESTED`, `APPROVED`, `REJECTED`, `COMPLETED` |
| `search`    | string | No       | Search by student name, payment ID, or requester name              |
| `studentId` | string | No       | Filter by specific student ID                                      |
| `paymentId` | string | No       | Filter by specific payment ID                                      |
| `page`      | number | No       | Page number (default: 1)                                           |
| `limit`     | number | No       | Items per page (default: 10)                                       |

### Response Format

```typescript
interface RefundResponse {
  data: Refund[];
  total: number;
  page: number;
  limit: number;
}

interface Refund {
  id: string;
  paymentId: string;
  studentId: string;
  requestedBy: string;
  amount: number;
  reason:
    | 'STUDENT_WITHDRAWAL'
    | 'COURSE_CANCELLATION'
    | 'PAYMENT_ERROR'
    | 'DUPLICATE_PAYMENT'
    | 'SERVICE_ISSUE'
    | 'OTHER';
  reasonDescription?: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  approvedBy?: string;
  approvedAt?: string;
  processedAt?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  payment: {
    id: string;
    amount: number;
    student: {
      id: string;
      fullname: string;
      email: string;
    };
    course: {
      id: string;
      name: string;
      code: string;
    };
  };
  student: {
    id: string;
    fullname: string;
    email: string;
    phone: string;
  };
  requester: {
    id: string;
    email: string;
    firstname: string;
    lastname: string;
  };
  approver?: {
    id: string;
    email: string;
    firstname: string;
    lastname: string;
  };
}
```

## Frontend Implementation

### 1. API Service Function

Create or update your API service file (e.g., `src/lib/api/refunds.ts`):

```typescript
import { server } from '@/lib/network'; // Adjust import path as needed

export interface Refund {
  id: string;
  paymentId: string;
  studentId: string;
  requestedBy: string;
  amount: number;
  reason: string;
  reasonDescription?: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  approvedBy?: string;
  approvedAt?: string;
  processedAt?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  payment: {
    id: string;
    amount: number;
    student: {
      id: string;
      fullname: string;
      email: string;
    };
    course: {
      id: string;
      name: string;
      code: string;
    };
  };
  student: {
    id: string;
    fullname: string;
    email: string;
    phone: string;
  };
  requester: {
    id: string;
    email: string;
    firstname: string;
    lastname: string;
  };
  approver?: {
    id: string;
    email: string;
    firstname: string;
    lastname: string;
  };
}

export interface RefundResponse {
  data: Refund[];
  total: number;
  page: number;
  limit: number;
}

export interface RefundFilters {
  status?: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  search?: string;
  studentId?: string;
  paymentId?: string;
  page?: number;
  limit?: number;
}

export const getRefunds = async (
  filters?: RefundFilters,
): Promise<RefundResponse> => {
  try {
    const api = await server();
    const queryParams = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }

    const response = await api.get(`/refunds?${queryParams.toString()}`);
    return response.data;
  } catch (error: any) {
    console.error('Failed to fetch refunds:', error);
    throw error;
  }
};

export const getRefund = async (id: string): Promise<Refund> => {
  try {
    const api = await server();
    const response = await api.get(`/refunds/${id}`);
    return response.data;
  } catch (error: any) {
    console.error(`Failed to fetch refund ${id}:`, error);
    throw error;
  }
};

export const approveRefund = async (
  id: string,
  notes?: string,
): Promise<Refund> => {
  try {
    const api = await server();
    const response = await api.patch(`/refunds/${id}/approve`, { notes });
    return response.data;
  } catch (error: any) {
    console.error(`Failed to approve refund ${id}:`, error);
    throw error;
  }
};

export const rejectRefund = async (
  id: string,
  rejectionReason: string,
): Promise<Refund> => {
  try {
    const api = await server();
    const response = await api.patch(`/refunds/${id}/reject`, {
      rejectionReason,
    });
    return response.data;
  } catch (error: any) {
    console.error(`Failed to reject refund ${id}:`, error);
    throw error;
  }
};

export const processRefund = async (id: string): Promise<Refund> => {
  try {
    const api = await server();
    const response = await api.patch(`/refunds/${id}/process`);
    return response.data;
  } catch (error: any) {
    console.error(`Failed to process refund ${id}:`, error);
    throw error;
  }
};
```

### 2. React Query Hook

Create a custom hook for fetching refunds (e.g., `src/hooks/useRefunds.ts`):

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRefunds,
  getRefund,
  approveRefund,
  rejectRefund,
  processRefund,
  RefundFilters,
} from '@/lib/api/refunds';

export const useRefunds = (filters?: RefundFilters) => {
  return useQuery({
    queryKey: ['refunds', filters],
    queryFn: () => getRefunds(filters),
    staleTime: 30000, // 30 seconds
  });
};

export const useRefund = (id: string) => {
  return useQuery({
    queryKey: ['refund', id],
    queryFn: () => getRefund(id),
    enabled: !!id,
  });
};

export const useApproveRefund = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      approveRefund(id, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
    },
  });
};

export const useRejectRefund = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      rejectionReason,
    }: {
      id: string;
      rejectionReason: string;
    }) => rejectRefund(id, rejectionReason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
    },
  });
};

export const useProcessRefund = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => processRefund(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['refunds'] });
    },
  });
};
```

### 3. Approval/Rejection Modal Components

Create modal components for approving and rejecting refunds (e.g., `src/components/refunds/ApproveRefundModal.tsx` and `src/components/refunds/RejectRefundModal.tsx`):

**ApproveRefundModal.tsx:**

```typescript
'use client';

import { useState } from 'react';
import { Refund } from '@/lib/api/refunds';

interface ApproveRefundModalProps {
  refund: Refund;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (id: string, notes?: string) => Promise<void>;
}

export default function ApproveRefundModal({
  refund,
  isOpen,
  onClose,
  onApprove,
}: ApproveRefundModalProps) {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(refund.id, notes || undefined);
      onClose();
      setNotes('');
    } catch (error) {
      console.error('Failed to approve refund:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Approve Refund Request</h2>

        <div className="space-y-4 mb-6">
          <div>
            <p className="text-sm text-gray-400 mb-1">Student</p>
            <p className="font-medium">{refund.student.fullname}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Amount</p>
            <p className="font-medium text-lg">₦{refund.amount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Reason</p>
            <p className="font-medium">{refund.reason}</p>
          </div>
          {refund.reasonDescription && (
            <div>
              <p className="text-sm text-gray-400 mb-1">Description</p>
              <p className="text-sm">{refund.reasonDescription}</p>
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Additional Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional notes about this approval..."
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
            rows={3}
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? 'Approving...' : 'Approve Refund'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**RejectRefundModal.tsx:**

```typescript
'use client';

import { useState } from 'react';
import { Refund } from '@/lib/api/refunds';

interface RejectRefundModalProps {
  refund: Refund;
  isOpen: boolean;
  onClose: () => void;
  onReject: (id: string, rejectionReason: string) => Promise<void>;
}

export default function RejectRefundModal({
  refund,
  isOpen,
  onClose,
  onReject,
}: RejectRefundModalProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Rejection reason is required');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onReject(refund.id, rejectionReason);
      onClose();
      setRejectionReason('');
    } catch (error) {
      console.error('Failed to reject refund:', error);
      setError('Failed to reject refund. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-red-400">Reject Refund Request</h2>

        <div className="space-y-4 mb-6">
          <div>
            <p className="text-sm text-gray-400 mb-1">Student</p>
            <p className="font-medium">{refund.student.fullname}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Amount</p>
            <p className="font-medium text-lg">₦{refund.amount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Reason</p>
            <p className="font-medium">{refund.reason}</p>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Rejection Reason <span className="text-red-400">*</span>
          </label>
          <textarea
            value={rejectionReason}
            onChange={(e) => {
              setRejectionReason(e.target.value);
              setError('');
            }}
            placeholder="Please provide a reason for rejecting this refund request..."
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-red-500 resize-none"
            rows={4}
            required
          />
          {error && (
            <p className="text-red-400 text-sm mt-1">{error}</p>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleReject}
            disabled={isSubmitting || !rejectionReason.trim()}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? 'Rejecting...' : 'Reject Refund'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 4. Refunds Page Component

Example component for displaying refunds with approve/reject functionality (e.g., `src/pages/dashboard/finance/refunds.tsx`):

```typescript
'use client';

import { useState } from 'react';
import { useRefunds, useApproveRefund, useRejectRefund } from '@/hooks/useRefunds';
import { Refund } from '@/lib/api/refunds';
import ApproveRefundModal from '@/components/refunds/ApproveRefundModal';
import RejectRefundModal from '@/components/refunds/RejectRefundModal';

const RefundStatusBadge = ({ status }: { status: string }) => {
  const statusColors = {
    REQUESTED: 'bg-yellow-500/20 text-yellow-500',
    APPROVED: 'bg-blue-500/20 text-blue-500',
    REJECTED: 'bg-red-500/20 text-red-500',
    COMPLETED: 'bg-green-500/20 text-green-500',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || ''}`}>
      {status}
    </span>
  );
};

const RefundReasonBadge = ({ reason }: { reason: string }) => {
  const reasonLabels: Record<string, string> = {
    STUDENT_WITHDRAWAL: 'Student Withdrawal',
    COURSE_CANCELLATION: 'Course Cancellation',
    PAYMENT_ERROR: 'Payment Error',
    DUPLICATE_PAYMENT: 'Duplicate Payment',
    SERVICE_ISSUE: 'Service Issue',
    OTHER: 'Other',
  };

  return <span className="text-sm text-gray-400">{reasonLabels[reason] || reason}</span>;
};

export default function RefundsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const limit = 10;

  const { data, isLoading, error, refetch } = useRefunds({
    status: statusFilter || undefined,
    search: searchQuery || undefined,
    page,
    limit,
  });

  const approveMutation = useApproveRefund();
  const rejectMutation = useRejectRefund();

  const handleApproveClick = (refund: Refund) => {
    setSelectedRefund(refund);
    setShowApproveModal(true);
  };

  const handleRejectClick = (refund: Refund) => {
    setSelectedRefund(refund);
    setShowRejectModal(true);
  };

  const handleApprove = async (id: string, notes?: string) => {
    try {
      await approveMutation.mutateAsync({ id, notes });
      setShowApproveModal(false);
      setSelectedRefund(null);
      refetch();
      // You can add a toast notification here
    } catch (error: any) {
      throw error; // Let the modal handle the error
    }
  };

  const handleReject = async (id: string, rejectionReason: string) => {
    try {
      await rejectMutation.mutateAsync({ id, rejectionReason });
      setShowRejectModal(false);
      setSelectedRefund(null);
      refetch();
      // You can add a toast notification here
    } catch (error: any) {
      throw error; // Let the modal handle the error
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading refunds...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Error loading refunds</div>;
  }

  const refunds = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Refunds</h1>
        <p className="text-gray-400">
          View and manage all refund requests. CEO, ADMIN, or Regional Manager approval required for processing.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search by student name, payment ID, or requester..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1); // Reset to first page on search
          }}
          className="flex-1 px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="REQUESTED">Requested</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {/* Refunds Table */}
      {refunds.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-2">No refunds found</div>
          <div className="text-sm text-gray-600">Try adjusting your search or filters</div>
        </div>
      ) : (
        <>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Student</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Payment</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Reason</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Requested By</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {refunds.map((refund: Refund) => (
                  <tr key={refund.id} className="hover:bg-gray-750">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">{refund.student.fullname}</div>
                      <div className="text-xs text-gray-400">{refund.student.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{refund.payment.course.name}</div>
                      <div className="text-xs text-gray-400">ID: {refund.paymentId.slice(0, 8)}...</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">₦{refund.amount.toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-3">
                      <RefundReasonBadge reason={refund.reason} />
                    </td>
                    <td className="px-4 py-3">
                      <RefundStatusBadge status={refund.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {refund.requester.firstname} {refund.requester.lastname}
                      </div>
                      <div className="text-xs text-gray-400">{refund.requester.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {new Date(refund.createdAt).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(refund.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {refund.status === 'REQUESTED' && (
                          <>
                            <button
                              onClick={() => handleApproveClick(refund)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectClick(refund)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                              className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {refund.status === 'APPROVED' && (
                          <button
                            onClick={() => {/* Handle process */}}
                            className="px-3 py-1 bg-green-500 hover:bg-green-600 rounded text-sm"
                          >
                            Process
                          </button>
                        )}
                        {refund.status === 'REJECTED' && refund.rejectionReason && (
                          <div className="text-xs text-gray-400 max-w-xs truncate" title={refund.rejectionReason}>
                            {refund.rejectionReason}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} refunds
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-gray-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Approval Modal */}
      {selectedRefund && (
        <ApproveRefundModal
          refund={selectedRefund}
          isOpen={showApproveModal}
          onClose={() => {
            setShowApproveModal(false);
            setSelectedRefund(null);
          }}
          onApprove={handleApprove}
        />
      )}

      {/* Rejection Modal */}
      {selectedRefund && (
        <RejectRefundModal
          refund={selectedRefund}
          isOpen={showRejectModal}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedRefund(null);
          }}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
```

### 4. Status Colors and Icons

You can enhance the UI with status-specific colors and icons:

```typescript
const getStatusConfig = (status: string) => {
  const configs = {
    REQUESTED: {
      color: 'yellow',
      icon: '⏳',
      label: 'Pending Approval',
    },
    APPROVED: {
      color: 'blue',
      icon: '✅',
      label: 'Approved',
    },
    REJECTED: {
      color: 'red',
      icon: '❌',
      label: 'Rejected',
    },
    COMPLETED: {
      color: 'green',
      icon: '✓',
      label: 'Completed',
    },
  };
  return configs[status] || configs.REQUESTED;
};
```

## Example API Calls

### Get All Refunds (No Filters)

```typescript
const response = await getRefunds();
// Returns all refunds with default pagination (page 1, limit 10)
```

### Get Refunds with Filters

```typescript
const response = await getRefunds({
  status: 'REQUESTED',
  search: 'john',
  page: 1,
  limit: 20,
});
```

### Get Refunds by Status

```typescript
const response = await getRefunds({
  status: 'APPROVED',
});
```

## Approval/Rejection Flow

### Flow Diagram

```
REQUESTED → [Approve] → APPROVED → [Process] → COMPLETED
         ↓
      [Reject] → REJECTED
```

### Step-by-Step Process

1. **View Refunds**: User navigates to the refunds page and sees all refund requests with status "REQUESTED"
2. **Approve Action**:
   - User clicks "Approve" button on a refund request
   - Approval modal opens showing refund details
   - User can optionally add notes
   - User clicks "Approve Refund" button
   - API call is made to `PATCH /refunds/:id/approve`
   - Status changes to "APPROVED"
   - Modal closes and list refreshes
   - Notification is sent to the requester

3. **Reject Action**:
   - User clicks "Reject" button on a refund request
   - Rejection modal opens showing refund details
   - User must provide a rejection reason (required)
   - User clicks "Reject Refund" button
   - API call is made to `PATCH /refunds/:id/reject`
   - Status changes to "REJECTED"
   - Modal closes and list refreshes
   - Notification is sent to the requester

4. **Process Action** (After Approval):
   - Once approved, Finance Officer or CEO can process the refund
   - API call is made to `PATCH /refunds/:id/process`
   - Status changes to "COMPLETED"
   - Payment plan balance is updated

### Role Permissions

| Role             | Can Approve | Can Reject | Can Process |
| ---------------- | ----------- | ---------- | ----------- |
| CEO              | ✅          | ✅         | ✅          |
| ADMIN            | ✅          | ✅         | ❌          |
| REGIONAL_MANAGER | ✅          | ✅         | ❌          |
| FINANCE_OFFICER  | ❌          | ❌         | ✅          |
| Others           | ❌          | ❌         | ❌          |

### Error Handling

The modals handle errors gracefully:

- **Network Errors**: Display error message in the modal
- **Validation Errors**: Show field-specific error messages
- **Permission Errors**: Display "You don't have permission" message
- **Status Errors**: Show "Refund is not pending approval" if status changed

### Success Feedback

After successful approval/rejection:

1. Modal closes automatically
2. Refunds list refreshes to show updated status
3. Toast notification can be shown (optional)
4. Status badge updates to new color
5. Action buttons change based on new status

## Notes

1. **Role-Based Access**: Only CEO, ADMIN, and REGIONAL_MANAGER can approve/reject refunds
2. **Center Filtering**: The API automatically filters refunds based on the user's center access
3. **Search**: The search functionality searches across student names, payment IDs, and requester names
4. **Pagination**: Default page size is 10, but can be customized up to a reasonable limit
5. **Real-time Updates**: Use React Query's `invalidateQueries` to refresh the list after approve/reject actions
6. **Required Fields**: Rejection reason is required when rejecting a refund
7. **Status Validation**: Backend validates that refunds can only be approved/rejected when status is "REQUESTED"
8. **Notifications**: Users receive notifications when refunds are approved or rejected
