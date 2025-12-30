# Billing Calculation Fix - Frontend Implementation Guide

## Overview

This guide provides instructions for implementing the updated billing calculation logic on the frontend. The backend now correctly calculates:

- **Billing**: Sum of all course prices for students enrolled in each center
- **Pending Payments**: Billing - Revenue (instead of using payment plan pending amounts)
- **Collection Rate**: (Revenue / Billing) × 100

## Backend API Changes

### Endpoint

```
GET {BASE_URL}/payments/overview
GET {BASE_URL}/finance/overview
```

Both endpoints return the same data structure.

### Updated Response Structure

```typescript
interface FinanceOverviewResponse {
  totalRevenue: number; // Sum of all payment amounts (collected)
  totalBilling: number; // Sum of all course prices (expected) - NEW
  totalPending: number; // Billing - Revenue (updated calculation)
  totalPayments: number; // Count of payment records
  collectionRate: number; // (Revenue / Billing) × 100 - NEW
  topCenters: Array<{
    center: string;
    status: string;
    revenue: number;
    billing: number; // NEW
    pending: number;
    collectionRate: number; // NEW
  }>;
  topPendingCenters: Array<{
    center: string;
    status: string;
    revenue: number;
    billing: number; // NEW
    pending: number;
    collectionRate: number; // NEW
  }>;
  topPerformingCenter: {
    id: string;
    name: string;
    bankCount: number;
    revenue: number;
  } | null;
  centerPerformanceMatrix: Array<{
    // NEW - For Center Performance Matrix table
    center: string;
    status: string;
    revenue: number;
    billing: number;
    pending: number;
    enrollments: number;
    conversion: number; // Same as collectionRate
    collectionRate: number;
  }>;
}
```

## Frontend Implementation Steps

### Step 1: Update TypeScript Types/Interfaces

Create or update the type definitions file (e.g., `types/finance.ts` or `types/dashboard.ts`):

```typescript
// types/finance.ts or types/dashboard.ts

export interface FinanceOverview {
  totalRevenue: number;
  totalBilling: number; // NEW
  totalPending: number;
  totalPayments: number;
  collectionRate: number; // NEW
  topCenters: CenterMetric[];
  topPendingCenters: CenterMetric[];
  topPerformingCenter: TopPerformingCenter | null;
  centerPerformanceMatrix: CenterPerformanceRow[]; // NEW
}

export interface CenterMetric {
  center: string;
  status: string;
  revenue: number;
  billing: number; // NEW
  pending: number;
  collectionRate: number; // NEW
}

export interface CenterPerformanceRow {
  center: string;
  status: string;
  revenue: number;
  billing: number;
  pending: number;
  enrollments: number;
  conversion: number; // Collection rate percentage
  collectionRate: number;
}

export interface TopPerformingCenter {
  id: string;
  name: string;
  bankCount: number;
  revenue: number;
}
```

### Step 2: Update API Service/Client

Update your API service file (e.g., `services/finance.service.ts` or `api/finance.ts`):

```typescript
// services/finance.service.ts or api/finance.ts

import { FinanceOverview } from '@/types/finance';

export const getFinanceOverview = async (): Promise<FinanceOverview> => {
  try {
    const response = await fetch(`${API_BASE_URL}/payments/overview`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${getAccessToken()}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch finance overview: ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching finance overview:', error);
    throw error;
  }
};

// Alternative: If using axios
import axios from 'axios';
import { FinanceOverview } from '@/types/finance';

export const getFinanceOverview = async (): Promise<FinanceOverview> => {
  try {
    const response = await axios.get<FinanceOverview>(
      `${API_BASE_URL}/payments/overview`,
      {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching finance overview:', error);
    throw error;
  }
};
```

### Step 3: Update Financial Performance Cards Component

Update the component that displays the four Financial Performance cards (TOTAL COLLECTION, TOTAL BILLING, PENDING PAYMENTS, COLLECTION RATE).

**Example Component (React/Next.js):**

```tsx
// components/dashboard/FinancialPerformanceCards.tsx

import React from 'react';
import { FinanceOverview } from '@/types/finance';

interface FinancialPerformanceCardsProps {
  data: FinanceOverview;
}

export const FinancialPerformanceCards: React.FC<
  FinancialPerformanceCardsProps
> = ({ data }) => {
  // Format currency (Nigerian Naira)
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* TOTAL COLLECTION Card */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">
            TOTAL COLLECTION
          </h3>
          <span className="text-green-600">💰</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {formatCurrency(data.totalRevenue)}
        </p>
        <div className="mt-4 h-1 bg-green-200 rounded-full">
          <div
            className="h-1 bg-green-500 rounded-full"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* TOTAL BILLING Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">TOTAL BILLING</h3>
          <span className="text-blue-600">📊</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {formatCurrency(data.totalBilling)}
        </p>
        <div className="mt-4 h-1 bg-blue-200 rounded-full">
          <div
            className="h-1 bg-blue-500 rounded-full"
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* PENDING PAYMENTS Card */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">
            PENDING PAYMENTS
          </h3>
          <span className="text-orange-600">⚠️</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {formatCurrency(data.totalPending)}
        </p>
        <div className="mt-4 h-1 bg-orange-200 rounded-full">
          <div
            className="h-1 bg-orange-500 rounded-full"
            style={{
              width:
                data.totalBilling > 0
                  ? `${(data.totalPending / data.totalBilling) * 100}%`
                  : '0%',
            }}
          />
        </div>
      </div>

      {/* COLLECTION RATE Card */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">COLLECTION RATE</h3>
          <span className="text-yellow-600">📈</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">
          {formatPercentage(data.collectionRate)}
        </p>
        <div className="mt-4 h-1 bg-yellow-200 rounded-full">
          <div
            className="h-1 bg-yellow-500 rounded-full"
            style={{ width: `${Math.min(data.collectionRate, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
```

**Alternative: Using Tailwind CSS with different styling:**

```tsx
// If your cards have different styling, update the values:

// TOTAL COLLECTION - Use data.totalRevenue
// TOTAL BILLING - Use data.totalBilling (NEW - was showing 0 before)
// PENDING PAYMENTS - Use data.totalPending (now correctly calculated as billing - revenue)
// COLLECTION RATE - Use data.collectionRate (NEW - was showing 0% before)
```

### Step 4: Update Center Performance Matrix Table

Update the component that displays the Center Performance Matrix table.

**Example Component:**

```tsx
// components/dashboard/CenterPerformanceMatrix.tsx

import React from 'react';
import { FinanceOverview } from '@/types/finance';

interface CenterPerformanceMatrixProps {
  data: FinanceOverview;
}

export const CenterPerformanceMatrix: React.FC<
  CenterPerformanceMatrixProps
> = ({ data }) => {
  const formatCurrency = (amount: number): string => {
    if (amount === 0) return 'NO';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const getConversionIcon = (rate: number) => {
    if (rate > 0) {
      return <span className="text-green-500">↑</span>; // Up arrow
    }
    return <span className="text-red-500">↓</span>; // Down arrow
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span>📊</span>
          Center Performance Matrix
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                CENTER
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                REVENUE
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                BILLING
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                PENDING
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ENROLLMENTS
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                CONVERSION
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                STATUS
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ACTION
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.centerPerformanceMatrix.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {row.center}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(row.revenue)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(row.billing)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(row.pending)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row.enrollments}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex items-center gap-2">
                    {formatPercentage(row.conversion)}
                    {getConversionIcon(row.conversion)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      row.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-purple-600 hover:text-purple-900">
                    →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

### Step 5: Update Dashboard Page/Component

Update your main dashboard component to use the new data structure:

```tsx
// pages/dashboard.tsx or components/dashboard/Dashboard.tsx

import React, { useEffect, useState } from 'react';
import { getFinanceOverview } from '@/services/finance.service';
import { FinanceOverview } from '@/types/finance';
import { FinancialPerformanceCards } from '@/components/dashboard/FinancialPerformanceCards';
import { CenterPerformanceMatrix } from '@/components/dashboard/CenterPerformanceMatrix';

export const Dashboard: React.FC = () => {
  const [financeData, setFinanceData] = useState<FinanceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        setLoading(true);
        const data = await getFinanceOverview();
        setFinanceData(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch finance overview:', err);
        setError('Failed to load finance data');
      } finally {
        setLoading(false);
      }
    };

    fetchFinanceData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error || !financeData) {
    return <div>Error: {error || 'No data available'}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Executive Dashboard Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold">Executive Dashboard</h1>
        <p className="text-sm opacity-90">• All Centers</p>
      </div>

      {/* Key Metrics Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Key Metrics</h2>
        {/* Add your date range and export controls here */}
      </div>

      {/* Financial Performance Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>📊</span>
          Financial Performance
        </h2>
        <FinancialPerformanceCards data={financeData} />
      </div>

      {/* Center Performance Matrix Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span>📈</span>
          Center Performance Matrix
        </h2>
        <CenterPerformanceMatrix data={financeData} />
      </div>
    </div>
  );
};
```

### Step 6: Handle Edge Cases

Add proper handling for edge cases:

```typescript
// utils/finance.utils.ts

/**
 * Format currency with fallback for zero/null values
 */
export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || amount === 0) {
    return 'NO'; // Or '₦0' depending on your design
  }
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format percentage with proper handling
 */
export const formatPercentage = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0.0%';
  }
  return `${Math.max(0, Math.min(100, value)).toFixed(1)}%`;
};

/**
 * Calculate collection rate safely
 */
export const calculateCollectionRate = (
  revenue: number,
  billing: number,
): number => {
  if (billing === 0 || billing === null || billing === undefined) {
    return 0;
  }
  return (revenue / billing) * 100;
};
```

## Migration Checklist

- [ ] Update TypeScript types/interfaces to include new fields
- [ ] Update API service/client to handle new response structure
- [ ] Update Financial Performance Cards component:
  - [ ] Replace TOTAL BILLING value with `data.totalBilling`
  - [ ] Replace PENDING PAYMENTS calculation (now uses `data.totalPending`)
  - [ ] Add COLLECTION RATE card using `data.collectionRate`
- [ ] Update Center Performance Matrix table:
  - [ ] Use `data.centerPerformanceMatrix` array
  - [ ] Display billing column (was showing "NO" before)
  - [ ] Display correct pending values (billing - revenue)
  - [ ] Display conversion/collection rate
- [ ] Test with real data to verify calculations
- [ ] Handle edge cases (zero values, null/undefined)
- [ ] Update any related components that use finance overview data

## Testing

1. **Test with multiple centers:**
   - Verify billing is calculated correctly for each center
   - Verify pending = billing - revenue
   - Verify collection rate = (revenue / billing) × 100

2. **Test edge cases:**
   - Center with no students (should show 0 for all metrics)
   - Center with students but no payments (billing > 0, revenue = 0)
   - Center with all payments complete (pending = 0)

3. **Test UI:**
   - Verify cards display correct values
   - Verify table shows all centers with correct data
   - Verify formatting (currency, percentages)

## Example: Before vs After

### Before (Incorrect):

```typescript
// TOTAL BILLING was showing 0 or incorrect value
totalBilling: 0; // ❌ Wrong

// PENDING PAYMENTS was using paymentPlan.pending
totalPending: sumOfPaymentPlanPending; // ❌ Wrong calculation

// COLLECTION RATE was not calculated
collectionRate: undefined; // ❌ Missing
```

### After (Correct):

```typescript
// TOTAL BILLING = sum of all course prices
totalBilling: 3300000; // ✅ Correct (e.g., 5 students with courses: 1M + 500K + 300K + 500K + 700K + 300K)

// PENDING PAYMENTS = billing - revenue
totalPending: 2700000; // ✅ Correct (if revenue = 600K, billing = 3.3M, then pending = 2.7M)

// COLLECTION RATE = (revenue / billing) × 100
collectionRate: 18.2; // ✅ Correct (600K / 3.3M × 100 = 18.2%)
```

## Notes

- The backend now calculates billing based on actual course enrollments (`StudentOnCourse` + `CourseOnCenter.baseFee`)
- Pending payments are now calculated as `billing - revenue` instead of using payment plan pending amounts
- Collection rate is automatically calculated and included in the response
- The `centerPerformanceMatrix` array provides all data needed for the Center Performance Matrix table
- All monetary values are in Nigerian Naira (₦)

## Support

If you encounter any issues:

1. Check the browser console for API errors
2. Verify the API response structure matches the TypeScript interface
3. Ensure all new fields are being used in the components
4. Check that currency and percentage formatting functions handle edge cases




