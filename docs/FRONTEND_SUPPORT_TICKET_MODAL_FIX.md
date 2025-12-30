# Frontend Support Ticket Modal Implementation Guide

## Overview
This guide provides the exact implementation needed to:
1. Fix the "Add Support Ticket" button to open a modal
2. Remove the "Add Refunds" button
3. Ensure proper integration with the backend API

## Backend API Endpoint

**POST** `/tickets`

**Request Body:**
```typescript
{
  title: string;           // Required
  description: string;     // Required
  category: TicketCategory; // Required - enum: PAYMENT_ISSUE, ENROLLMENT_ISSUE, TECHNICAL_ISSUE, REFUND_REQUEST, ACCOUNT_ISSUE, OTHER
  priority?: TicketPriority; // Optional - enum: LOW, MEDIUM, HIGH, URGENT (defaults to MEDIUM)
  paymentId?: string;      // Optional
  studentId?: string;      // Optional
  attachments?: string[];  // Optional
}
```

**Response:**
```typescript
{
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus; // OPEN, IN_PROGRESS, RESOLVED, CLOSED, CANCELLED
  createdBy: string;
  createdAt: string;
  // ... other fields
}
```

## Step 1: Create Support Ticket Modal Component

Create or update `src/components/modals/support/CreateTicketModal.tsx`:

```tsx
'use client';

import React, { useState } from 'react';
import { createTicketClient } from '@/lib/client-network';

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  paymentId?: string;
  studentId?: string;
}

type TicketCategory = 
  | 'PAYMENT_ISSUE'
  | 'ENROLLMENT_ISSUE'
  | 'TECHNICAL_ISSUE'
  | 'REFUND_REQUEST'
  | 'ACCOUNT_ISSUE'
  | 'OTHER';

type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export const CreateTicketModal: React.FC<CreateTicketModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  paymentId,
  studentId,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'OTHER' as TicketCategory,
    priority: 'MEDIUM' as TicketPriority,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories: { value: TicketCategory; label: string }[] = [
    { value: 'PAYMENT_ISSUE', label: 'Payment Issue' },
    { value: 'ENROLLMENT_ISSUE', label: 'Enrollment Issue' },
    { value: 'TECHNICAL_ISSUE', label: 'Technical Issue' },
    { value: 'REFUND_REQUEST', label: 'Refund Request' },
    { value: 'ACCOUNT_ISSUE', label: 'Account Issue' },
    { value: 'OTHER', label: 'Other' },
  ];

  const priorities: { value: TicketPriority; label: string }[] = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
    { value: 'URGENT', label: 'Urgent' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.title.trim() || !formData.description.trim()) {
        throw new Error('Title and description are required');
      }

      await createTicketClient({
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        paymentId: paymentId || undefined,
        studentId: studentId || undefined,
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        category: 'OTHER',
        priority: 'MEDIUM',
      });

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create support ticket');
      console.error('Error creating ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-semibold text-gray-800">Create Support Ticket</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter ticket title"
              disabled={loading}
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              {priorities.map((pri) => (
                <option key={pri.value} value={pri.value}>
                  {pri.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe your issue in detail..."
              disabled={loading}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title.trim() || !formData.description.trim()}
              className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
```

## Step 2: Update Client Network Function

Ensure `src/lib/client-network.ts` has the `createTicketClient` function:

```typescript
export async function createTicketClient(data: {
  title: string;
  description: string;
  category: string;
  priority?: string;
  paymentId?: string;
  studentId?: string;
  attachments?: string[];
}) {
  try {
    const response = await fetch('/api/tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to create ticket');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Failed to create ticket:', error);
    throw error;
  }
}
```

## Step 3: Update Transaction Details Page (or wherever the buttons are)

Find the file that contains the "Add Support Ticket" and "Add Refunds" buttons (likely in `src/content/dashboard/finance/banking/transactions/helpers.tsx` or similar).

**Remove the "Add Refunds" button and fix the "Add Support Ticket" button:**

```tsx
'use client';

import React, { useState } from 'react';
import { CreateTicketModal } from '@/components/modals/support/CreateTicketModal';

// In your component where the buttons are:
export const AdditionalActions = ({ paymentId, studentId }: { paymentId?: string; studentId?: string }) => {
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  const handleTicketSuccess = () => {
    // Refresh the page or update the UI as needed
    window.location.reload(); // Or use your state management to refresh
  };

  return (
    <>
      {/* Remove the "Add Refunds" button completely */}
      
      {/* Fix the "Add Support Ticket" button */}
      <button
        onClick={() => setIsTicketModalOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Add Support Ticket
      </button>

      {/* Add the modal */}
      <CreateTicketModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        onSuccess={handleTicketSuccess}
        paymentId={paymentId}
        studentId={studentId}
      />
    </>
  );
};
```

## Step 4: Update API Route (if using Next.js API routes)

Ensure `src/app/api/tickets/route.ts` exists and proxies to your backend:

```typescript
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = request.headers.get('authorization');
    const centerId = request.headers.get('x-center-id');

    const response = await fetch(`${BACKEND_URL}/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: token }),
        ...(centerId && { 'X-Center-Id': centerId }),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to create ticket' },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = request.headers.get('authorization');
    const centerId = request.headers.get('x-center-id');

    const queryString = searchParams.toString();
    const url = `${BACKEND_URL}/tickets${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: token }),
        ...(centerId && { 'X-Center-Id': centerId }),
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to fetch tickets' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## Summary of Changes

1. ✅ **Create/Update** `CreateTicketModal.tsx` component with proper form handling
2. ✅ **Remove** the "Add Refunds" button from the transaction details page
3. ✅ **Fix** the "Add Support Ticket" button to open the modal
4. ✅ **Ensure** `createTicketClient` function exists in `client-network.ts`
5. ✅ **Verify** API route `/api/tickets` proxies correctly to backend

## Testing Checklist

- [ ] Click "Add Support Ticket" button opens the modal
- [ ] Modal form validation works (title and description required)
- [ ] Category dropdown shows all options
- [ ] Priority defaults to MEDIUM
- [ ] Form submission creates ticket successfully
- [ ] Error messages display correctly
- [ ] Success callback refreshes the page/UI
- [ ] "Add Refunds" button is completely removed
- [ ] Modal closes on cancel or after successful submission

