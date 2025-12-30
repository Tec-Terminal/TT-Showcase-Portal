# Frontend Implementation Guide: Center Details Page

This guide provides step-by-step instructions for implementing the center details page with banks, regional manager, student count, and faculty count.

## Table of Contents
1. [API Response Structure](#api-response-structure)
2. [TypeScript Types](#typescript-types)
3. [API Service](#api-service)
4. [React Component Implementation](#react-component-implementation)
5. [UI Display Examples](#ui-display-examples)

---

## API Response Structure

The `GET /centers/:id` endpoint now returns:

```typescript
{
  id: string;
  name: string;
  email: string;
  code: string;
  phone: string;
  address: string;
  status: CenterStatus;
  type?: CenterType;
  createdAt: string;
  updatedAt: string;
  
  // New/Updated Fields
  banks: Bank[];                    // Array of all banks tied to center
  regionalManager: RegionalManager | null;  // Regional manager object
  studentCount: number;              // Computed student count
  facultyCount: number;              // Computed faculty count
  
  // Existing Relations
  students: Student[];               // Full student array (for reference)
  faculties: Faculty[];              // Full faculty array (for reference)
  manager: Manager | null;
  academicHead: AcademicHead | null;
  location: Location | null;
  // ... other relations
}
```

### Bank Object Structure
```typescript
{
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  balance: number;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  centerId: string;
  createdAt: string;
  updatedAt: string;
}
```

### Regional Manager Object Structure
```typescript
{
  id: string;
  fullname: string;
  phone: string;
  address: string;
  locationId: string;
  location: {
    id: string;
    state: string;
    capital: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

---

## TypeScript Types

Create or update your types file (e.g., `types/center.ts`):

```typescript
// types/center.ts

export enum CenterStatus {
  ACTIVE = 'ACTIVE',
  IN_SETUP = 'IN_SETUP',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED',
}

export enum CenterType {
  OWNED = 'OWNED',
  PARTNERED = 'PARTNERED',
}

export enum BankStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
}

export interface Bank {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  balance: number;
  status: BankStatus;
  centerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegionalManager {
  id: string;
  fullname: string;
  phone: string;
  address: string;
  locationId: string;
  location: {
    id: string;
    state: string;
    capital: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CenterDetails {
  id: string;
  name: string;
  email: string;
  code: string;
  phone: string;
  address: string;
  status: CenterStatus;
  type?: CenterType;
  createdAt: string;
  updatedAt: string;
  
  // New fields
  banks: Bank[];
  regionalManager: RegionalManager | null;
  studentCount: number;
  facultyCount: number;
  
  // Existing relations
  students: any[];
  faculties: any[];
  manager: any | null;
  academicHead: any | null;
  location: any | null;
}
```

---

## API Service

Create or update your API service (e.g., `services/centerService.ts`):

```typescript
// services/centerService.ts
import { CenterDetails } from '@/types/center';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const centerService = {
  /**
   * Fetch center details by ID
   * @param centerId - The center ID
   * @returns Center details with banks, regional manager, and counts
   */
  async getCenterDetails(centerId: string): Promise<CenterDetails> {
    const response = await fetch(`${API_BASE_URL}/centers/${centerId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add your auth token if needed
        // 'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch center details: ${response.statusText}`);
    }

    return response.json();
  },
};
```

---

## React Component Implementation

### Using React Query (Recommended)

```typescript
// components/centers/CenterDetails.tsx
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom'; // or 'next/router' for Next.js
import { centerService } from '@/services/centerService';
import { CenterDetails } from '@/types/center';

export const CenterDetails = () => {
  const { id } = useParams<{ id: string }>();

  const { data: center, isLoading, error } = useQuery<CenterDetails>({
    queryKey: ['center', id],
    queryFn: () => centerService.getCenterDetails(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return <div>Loading center details...</div>;
  }

  if (error) {
    return <div>Error loading center details: {error.message}</div>;
  }

  if (!center) {
    return <div>Center not found</div>;
  }

  return (
    <div className="center-details-container">
      {/* Center Basic Info */}
      <div className="center-basic-info">
        <h1>{center.name}</h1>
        <p>Code: {center.code}</p>
        <p>Email: {center.email}</p>
        <p>Phone: {center.phone}</p>
        <p>Address: {center.address}</p>
      </div>

      {/* Accounting Information Section */}
      <div className="accounting-section">
        <h2>Accounting Information</h2>
        
        {/* Banks Section */}
        <div className="banks-section">
          <h3>Bank Accounts ({center.banks.length})</h3>
          {center.banks.length > 0 ? (
            <div className="banks-list">
              {center.banks.map((bank) => (
                <div key={bank.id} className="bank-card">
                  <div className="bank-header">
                    <h4>{bank.bankName}</h4>
                    <span className={`status-badge status-${bank.status.toLowerCase()}`}>
                      {bank.status}
                    </span>
                  </div>
                  <div className="bank-details">
                    <p><strong>Account Name:</strong> {bank.accountName}</p>
                    <p><strong>Account Number:</strong> {bank.accountNumber}</p>
                    <p><strong>Balance:</strong> ₦{bank.balance.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">No bank accounts found</p>
          )}
        </div>
      </div>

      {/* Center Details Section */}
      <div className="center-details-section">
        <h2>Center Details</h2>
        
        {/* Regional Manager */}
        <div className="detail-row">
          <label>Regional Manager:</label>
          <span>
            {center.regionalManager ? (
              <div className="regional-manager-info">
                <p><strong>{center.regionalManager.fullname}</strong></p>
                <p>Phone: {center.regionalManager.phone}</p>
                <p>Address: {center.regionalManager.address}</p>
                {center.regionalManager.location && (
                  <p>Location: {center.regionalManager.location.state}</p>
                )}
              </div>
            ) : (
              <span className="no-data">N/A</span>
            )}
          </span>
        </div>

        {/* Student Count */}
        <div className="detail-row">
          <label>Student Count:</label>
          <span className="count-badge">{center.studentCount}</span>
        </div>

        {/* Faculty Count */}
        <div className="detail-row">
          <label>Faculty Count:</label>
          <span className="count-badge">{center.facultyCount}</span>
        </div>

        {/* Center Manager */}
        <div className="detail-row">
          <label>Center Manager:</label>
          <span>
            {center.manager ? center.manager.fullname : 'N/A'}
          </span>
        </div>

        {/* Academic Head */}
        <div className="detail-row">
          <label>Academic Head:</label>
          <span>
            {center.academicHead ? center.academicHead.fullname : 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
};
```

### Using useState and useEffect (Alternative)

```typescript
// components/centers/CenterDetails.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { centerService } from '@/services/centerService';
import { CenterDetails } from '@/types/center';

export const CenterDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [center, setCenter] = useState<CenterDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCenter = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        const data = await centerService.getCenterDetails(id);
        setCenter(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load center');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCenter();
  }, [id]);

  // ... rest of the component JSX (same as above)
};
```

---

## UI Display Examples

### Example 1: Banks Display (Card Layout)

```tsx
{/* Banks Section */}
<div className="banks-section">
  <h3>Bank Accounts</h3>
  {center.banks.length > 0 ? (
    <div className="banks-grid">
      {center.banks.map((bank) => (
        <div key={bank.id} className="bank-card">
          <div className="bank-card-header">
            <h4>{bank.bankName}</h4>
            <span className={`badge badge-${bank.status.toLowerCase()}`}>
              {bank.status}
            </span>
          </div>
          <div className="bank-card-body">
            <div className="info-item">
              <span className="label">Account Name:</span>
              <span className="value">{bank.accountName}</span>
            </div>
            <div className="info-item">
              <span className="label">Account Number:</span>
              <span className="value">{bank.accountNumber}</span>
            </div>
            <div className="info-item">
              <span className="label">Balance:</span>
              <span className="value amount">₦{bank.balance.toLocaleString()}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  ) : (
    <div className="empty-state">
      <p>No bank accounts registered for this center</p>
    </div>
  )}
</div>
```

### Example 2: Statistics Cards

```tsx
{/* Statistics Section */}
<div className="statistics-section">
  <div className="stat-card">
    <div className="stat-icon">👥</div>
    <div className="stat-content">
      <div className="stat-value">{center.studentCount}</div>
      <div className="stat-label">Students</div>
    </div>
  </div>

  <div className="stat-card">
    <div className="stat-icon">👨‍🏫</div>
    <div className="stat-content">
      <div className="stat-value">{center.facultyCount}</div>
      <div className="stat-label">Faculties</div>
    </div>
  </div>

  <div className="stat-card">
    <div className="stat-icon">🏦</div>
    <div className="stat-content">
      <div className="stat-value">{center.banks.length}</div>
      <div className="stat-label">Bank Accounts</div>
    </div>
  </div>
</div>
```

### Example 3: Regional Manager Display

```tsx
{/* Regional Manager Card */}
<div className="regional-manager-card">
  <h3>Regional Manager</h3>
  {center.regionalManager ? (
    <div className="manager-info">
      <div className="manager-avatar">
        {center.regionalManager.fullname.charAt(0)}
      </div>
      <div className="manager-details">
        <h4>{center.regionalManager.fullname}</h4>
        <div className="contact-info">
          <p>
            <span className="icon">📞</span>
            {center.regionalManager.phone}
          </p>
          <p>
            <span className="icon">📍</span>
            {center.regionalManager.address}
          </p>
          {center.regionalManager.location && (
            <p>
              <span className="icon">🌍</span>
              {center.regionalManager.location.state}
            </p>
          )}
        </div>
      </div>
    </div>
  ) : (
    <div className="no-manager">
      <p>No regional manager assigned</p>
    </div>
  )}
</div>
```

---

## CSS Styling Examples

```css
/* center-details.css */

.center-details-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* Banks Section */
.banks-section {
  margin: 2rem 0;
}

.banks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.bank-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.bank-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.bank-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.bank-card-header h4 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.status-active {
  background-color: #d4edda;
  color: #155724;
}

.status-badge.status-inactive {
  background-color: #f8d7da;
  color: #721c24;
}

.status-badge.status-pending {
  background-color: #fff3cd;
  color: #856404;
}

.bank-card-body .info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.bank-card-body .label {
  font-weight: 500;
  color: #666;
}

.bank-card-body .value {
  color: #333;
  font-weight: 600;
}

.bank-card-body .value.amount {
  color: #28a745;
  font-size: 1.1rem;
}

/* Statistics Cards */
.statistics-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 1.5rem;
  color: white;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  font-size: 2.5rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.9rem;
  opacity: 0.9;
}

/* Regional Manager Card */
.regional-manager-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  margin: 2rem 0;
}

.manager-info {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.manager-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
  font-weight: bold;
}

.manager-details h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  color: #333;
}

.contact-info p {
  margin: 0.5rem 0;
  color: #666;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.contact-info .icon {
  font-size: 1.2rem;
}

/* Detail Rows */
.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.detail-row label {
  font-weight: 600;
  color: #666;
}

.count-badge {
  background: #667eea;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-weight: 600;
}

.no-data {
  color: #999;
  font-style: italic;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #999;
}
```

---

## Next.js Specific Implementation

If using Next.js with App Router:

```typescript
// app/centers/[id]/page.tsx
import { centerService } from '@/services/centerService';
import { CenterDetails } from '@/types/center';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function CenterDetailsPage({ params }: PageProps) {
  const center: CenterDetails = await centerService.getCenterDetails(params.id);

  return (
    <div className="center-details-container">
      {/* Your component JSX here */}
    </div>
  );
}
```

---

## Testing the Implementation

1. **Test with a center that has banks:**
   - Verify all banks are displayed
   - Check bank status badges
   - Verify account numbers and balances

2. **Test with a center without banks:**
   - Verify "No bank accounts" message appears

3. **Test regional manager:**
   - With assigned manager: Verify all details display
   - Without manager: Verify "N/A" or empty state

4. **Test counts:**
   - Verify student count matches actual students array length
   - Verify faculty count matches actual faculties array length

---

## API Endpoint

**Endpoint:** `GET /centers/:id`

**Response Example:**
```json
{
  "id": "cmj2vxkio0028uci46p3ai1v5",
  "name": "Lagos Main Center",
  "code": "LAG001",
  "email": "lagos@tecterminal.com",
  "phone": "+234 123 456 7890",
  "address": "123 Main Street, Lagos",
  "status": "ACTIVE",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "banks": [
    {
      "id": "bank1",
      "accountName": "TecTerminal Lagos",
      "bankName": "First Bank",
      "accountNumber": "1234567890",
      "balance": 500000.00,
      "status": "ACTIVE",
      "centerId": "cmj2vxkio0028uci46p3ai1v5",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "regionalManager": {
    "id": "rm1",
    "fullname": "John Doe",
    "phone": "+234 987 654 3210",
    "address": "456 Manager Street",
    "locationId": "loc1",
    "location": {
      "id": "loc1",
      "state": "Lagos",
      "capital": "Ikeja"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "studentCount": 150,
  "facultyCount": 12,
  "students": [...],
  "faculties": [...],
  "manager": {...},
  "academicHead": {...},
  "location": {...}
}
```

---

## Notes

- The `studentCount` and `facultyCount` are computed properties for convenience, but you can also use `center.students.length` and `center.faculties.length` if needed.
- The `banks` array will be empty `[]` if no banks are tied to the center.
- The `regionalManager` will be `null` if no regional manager is assigned.
- Always handle loading and error states in your components.
- Consider implementing pagination or lazy loading if the banks list becomes very long.

