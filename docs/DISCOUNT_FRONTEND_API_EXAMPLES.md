# Frontend API Call Examples for Discounts

## Base URL

The base URL depends on your environment:

- Development: `http://localhost:8000` (or your backend port)
- Production: Your production API URL

## API Endpoint

`GET /discounts`

## Authentication

All requests require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## 1. Fetch All Discounts (Vanilla JavaScript/Fetch)

```javascript
async function getAllDiscounts() {
  try {
    const token = localStorage.getItem('token'); // or however you store your token

    const response = await fetch('http://localhost:8000/discounts', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    return result;
  } catch (error) {
    console.error('Error fetching discounts:', error);
    throw error;
  }
}

// Usage
getAllDiscounts().then((result) => {
  const discounts = result.data;
  // Use discounts array
});
```

---

## 2. Fetch with Query Parameters (Filtering)

```javascript
async function getDiscounts(filters = {}) {
  try {
    const token = localStorage.getItem('token');

    // Build query string
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.studentId) params.append('studentId', filters.studentId);
    if (filters.courseId) params.append('courseId', filters.courseId);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const url = `http://localhost:8000/discounts${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error fetching discounts:', error);
    throw error;
  }
}

// Usage examples
// Get all pending discounts
getDiscounts({ status: 'PENDING' }).then((result) => {
  // Handle result
});

// Get discounts for a specific student
getDiscounts({ studentId: 'student_123' }).then((result) => {
  // Handle result
});

// Get with pagination
getDiscounts({ page: 1, limit: 20 }).then((result) => {
  // Handle result
});
```

---

## 3. Using Axios

```javascript
import axios from 'axios';

// Create axios instance with base config
const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Fetch all discounts
async function getAllDiscounts() {
  try {
    const response = await apiClient.get('/discounts');
    return response.data;
  } catch (error) {
    console.error('Error fetching discounts:', error);
    throw error;
  }
}

// Fetch with filters
async function getDiscounts(filters = {}) {
  try {
    const response = await apiClient.get('/discounts', { params: filters });
    return response.data;
  } catch (error) {
    console.error('Error fetching discounts:', error);
    throw error;
  }
}

// Usage
getAllDiscounts().then((result) => {
  // Handle result
});
```

---

## 4. React Hook Example (Custom Hook)

```typescript
import { useState, useEffect } from 'react';
import axios from 'axios';

interface DiscountFilters {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED' | 'CANCELLED';
  studentId?: string;
  courseId?: string;
  page?: number;
  limit?: number;
}

interface DiscountResponse {
  data: Discount[];
  total: number;
  page: number;
  limit: number;
}

interface Discount {
  id: string;
  studentId: string;
  student: {
    id: string;
    fullName: string;
    email: string;
  };
  courseId: string;
  course: {
    id: string;
    name: string;
    code: string;
  };
  paymentPlanId: string;
  requestedBy: string;
  requestedByName: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  originalAmount: number;
  discountedAmount: number;
  reason: string;
  notes?: string;
  status: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  appliedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

function useDiscounts(filters?: DiscountFilters) {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function fetchDiscounts() {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.studentId) params.append('studentId', filters.studentId);
        if (filters?.courseId) params.append('courseId', filters.courseId);
        if (filters?.page) params.append('page', filters.page.toString());
        if (filters?.limit) params.append('limit', filters.limit.toString());

        const response = await fetch(
          `http://localhost:8000/discounts${params.toString() ? `?${params.toString()}` : ''}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch discounts: ${response.statusText}`);
        }

        const result: DiscountResponse = await response.json();
        setDiscounts(result.data);
        setTotal(result.total);
        setError(null);
      } catch (err) {
        setError(err as Error);
        setDiscounts([]);
      } finally {
        setLoading(false);
      }
    }

    fetchDiscounts();
  }, [filters?.status, filters?.studentId, filters?.courseId, filters?.page, filters?.limit]);

  return { discounts, loading, error, total };
}

// Usage in component
function DiscountsList() {
  const { discounts, loading, error, total } = useDiscounts();

  if (loading) return <div>Loading discounts...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Discounts ({total})</h2>
      {discounts.map((discount) => (
        <div key={discount.id}>
          <h3>{discount.student.fullName}</h3>
          <p>Course: {discount.course.name}</p>
          <p>Status: {discount.status}</p>
          <p>Discount: {discount.discountType === 'PERCENTAGE'
            ? `${discount.discountValue}%`
            : `₦${discount.discountValue.toLocaleString()}`}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 5. React Query Example

```typescript
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function useDiscounts(filters?: DiscountFilters) {
  return useQuery({
    queryKey: ['discounts', filters],
    queryFn: async () => {
      const response = await apiClient.get<DiscountResponse>('/discounts', {
        params: filters,
      });
      return response.data;
    },
    staleTime: 30000, // 30 seconds
  });
}

// Usage
function DiscountsList() {
  const { data, isLoading, error } = useDiscounts();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading discounts</div>;

  return (
    <div>
      <h2>Discounts ({data?.total || 0})</h2>
      {data?.data.map((discount) => (
        <div key={discount.id}>
          {/* Render discount */}
        </div>
      ))}
    </div>
  );
}
```

---

## 6. Create Discount Request

```javascript
async function createDiscountRequest(discountData) {
  try {
    const token = localStorage.getItem('token');

    const response = await fetch('http://localhost:8000/discounts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentId: discountData.studentId,
        courseId: discountData.courseId,
        paymentPlanId: discountData.paymentPlanId, // optional
        discountType: discountData.discountType, // 'PERCENTAGE' or 'FIXED_AMOUNT'
        discountValue: discountData.discountValue,
        reason: discountData.reason,
        notes: discountData.notes, // optional
        // Note: originalAmount and discountedAmount are optional - backend calculates them
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create discount request');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error creating discount request:', error);
    throw error;
  }
}

// Usage
createDiscountRequest({
  studentId: 'student_123',
  courseId: 'course_456',
  discountType: 'FIXED_AMOUNT',
  discountValue: 30000,
  reason: 'Financial hardship',
  notes: 'Student has demonstrated need',
}).then((result) => {
  // Handle result
});
```

---

## 7. Approve/Reject Discount

```javascript
// Approve discount (CEO only)
async function approveDiscount(discountId, notes) {
  try {
    const token = localStorage.getItem('token');

    const response = await fetch(
      `http://localhost:8000/discounts/${discountId}/approve`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: notes || undefined, // optional
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to approve discount: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error approving discount:', error);
    throw error;
  }
}

// Reject discount (CEO only)
async function rejectDiscount(discountId, rejectionReason) {
  try {
    const token = localStorage.getItem('token');

    const response = await fetch(
      `http://localhost:8000/discounts/${discountId}/reject`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rejectionReason: rejectionReason,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to reject discount: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error rejecting discount:', error);
    throw error;
  }
}
```

---

## 8. Get Single Discount

```javascript
async function getDiscountById(discountId) {
  try {
    const token = localStorage.getItem('token');

    const response = await fetch(
      `http://localhost:8000/discounts/${discountId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch discount: ${response.statusText}`);
    }

    const discount = await response.json();
    return discount;
  } catch (error) {
    console.error('Error fetching discount:', error);
    throw error;
  }
}
```

---

## Response Format

```typescript
interface DiscountResponse {
  data: Discount[];
  total: number;
  page: number;
  limit: number;
}

interface Discount {
  id: string;
  studentId: string;
  student: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    center: {
      id: string;
      name: string;
    };
  };
  courseId: string;
  course: {
    id: string;
    name: string;
    code: string;
  };
  paymentPlanId: string;
  paymentPlan: {
    id: string;
    amount: number;
    pending: number;
    paid: number;
  };
  requestedBy: string;
  requestedByName: string; // Computed field
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  originalAmount: number;
  discountedAmount: number;
  reason: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED' | 'CANCELLED';
  approvedBy?: string;
  approvedByName?: string; // Computed field
  approvedAt?: string;
  appliedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Quick Example for Your Current Implementation

If you're using fetch in your React component:

```javascript
// In your DiscountsContent component or similar
useEffect(() => {
  async function fetchDiscounts() {
    try {
      const token = localStorage.getItem('token'); // or your auth method
      const response = await fetch('http://localhost:8000/discounts', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch discounts');
      }

      const result = await response.json();
      // Handle result

      // result.data contains array of discounts
      // result.total contains total count
      setDiscounts(result.data || []);
      setTotalDiscounts(result.total || 0);
    } catch (error) {
      console.error('[DiscountsContent] Error:', error);
      setDiscounts([]);
      setTotalDiscounts(0);
    }
  }

  fetchDiscounts();
}, []);
```

This should return all discounts from your database.
