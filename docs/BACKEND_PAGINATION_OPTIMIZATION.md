Drafting a backend pagination specification document for your backend team:


[5 tools called]


Drafting the backend pagination specification document:


[3 tools called]


Backend pagination specification (copy and save as `BACKEND_PAGINATION_SPEC.md`):

```markdown
# Backend Pagination & Performance Optimization Specification

## Executive Summary

This document outlines the backend API changes required to support efficient pagination, filtering, and aggregation for academic entities (Students, Courses, Leads, Centers, Batches). These changes are critical for application scalability and performance.

**Current State**: All endpoints return complete datasets (potentially thousands of records)  
**Target State**: Paginated responses with filtering, sorting, and summary endpoints

---

## 1. Pagination Requirements

### 1.1 Standard Pagination Parameters

All list endpoints should support the following query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number (1-indexed) |
| `limit` | number | 10 | Records per page (max: 100) |
| `sort` | string | `createdAt` | Field to sort by |
| `order` | `asc` \| `desc` | `desc` | Sort direction |
| `search` | string | - | Search query (searches relevant fields) |
| `fields` | string[] | all | Comma-separated list of fields to return (optional) |

### 1.2 Standard Response Format

All paginated endpoints should return this structure:

```typescript
interface PaginatedResponse<T> {
  data: T[];                    // Array of entities
  pagination: {
    page: number;               // Current page
    limit: number;              // Records per page
    total: number;              // Total records matching filters
    totalPages: number;         // Total pages available
    hasNext: boolean;            // Has next page
    hasPrev: boolean;           // Has previous page
  };
  meta?: {
    filters?: Record<string, any>;  // Applied filters
    sort?: { field: string; order: string };  // Applied sort
  };
}
```

### 1.3 Example Response

```json
{
  "data": [
    {
      "id": "1",
      "fullName": "John Doe",
      "email": "john@example.com",
      "status": "Active",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1250,
    "totalPages": 125,
    "hasNext": true,
    "hasPrev": false
  },
  "meta": {
    "filters": {
      "status": "Active",
      "centerId": "center-123"
    },
    "sort": {
      "field": "createdAt",
      "order": "desc"
    }
  }
}
```

---

## 2. Entity-Specific Endpoint Specifications

### 2.1 Students Endpoint

**Current**: `GET /students` (returns all)  
**New**: `GET /students` (paginated)

#### Query Parameters

```typescript
interface StudentsQueryParams {
  page?: number;              // Default: 1
  limit?: number;             // Default: 10, Max: 100
  sort?: string;              // Default: "createdAt"
  order?: "asc" | "desc";    // Default: "desc"
  search?: string;            // Searches: fullName, email, phone, studentId
  status?: string;            // Filter by status
  centerId?: string;         // Filter by center
  courseId?: string;          // Filter by course
  batchId?: string;          // Filter by batch
  enrolledDateFrom?: string;  // ISO date string
  enrolledDateTo?: string;   // ISO date string
  fields?: string;            // Comma-separated: "id,fullName,email,status"
  includeDeleted?: boolean;   // Default: false (exclude soft-deleted)
}
```

#### Example Requests

```bash
# Basic pagination
GET /students?page=1&limit=10

# With search and filters
GET /students?page=1&limit=20&search=john&status=Active&centerId=center-123

# With date range
GET /students?enrolledDateFrom=2024-01-01&enrolledDateTo=2024-12-31

# With sorting
GET /students?sort=fullName&order=asc

# Selective fields (reduces payload)
GET /students?fields=id,fullName,email,status&page=1&limit=10
```

---

### 2.2 Courses Endpoint

**Current**: `GET /courses` (returns all)  
**New**: `GET /courses` (paginated)

#### Query Parameters

```typescript
interface CoursesQueryParams {
  page?: number;
  limit?: number;
  sort?: string;              // Default: "createdAt"
  order?: "asc" | "desc";
  search?: string;            // Searches: name, code
  status?: string;            // Filter by status: "Active", "Inactive", "Draft"
  type?: string;              // Filter by type: "TecTerminal", "ApTech", "CPMS"
  fields?: string;
  includeDeleted?: boolean;
}
```

---

### 2.3 Leads Endpoint

**Current**: `GET /leads/active` (returns all)  
**New**: `GET /leads` (paginated, filters out deleted by default)

#### Query Parameters

```typescript
interface LeadsQueryParams {
  page?: number;
  limit?: number;
  sort?: string;              // Default: "enquiryDate"
  order?: "asc" | "desc";
  search?: string;            // Searches: fullName, email, phone, code
  status?: string;            // Filter by lead status
  centerId?: string;
  courseId?: string;
  enquiryDateFrom?: string;   // ISO date string
  enquiryDateTo?: string;     // ISO date string
  fields?: string;
  includeDeleted?: boolean;
}
```

---

### 2.4 Centers Endpoint

**Current**: `GET /centers` (returns all)  
**New**: `GET /centers` (paginated)

#### Query Parameters

```typescript
interface CentersQueryParams {
  page?: number;
  limit?: number;
  sort?: string;              // Default: "name"
  order?: "asc" | "desc";
  search?: string;            // Searches: name, email, phone, address
  status?: string;            // Filter by status
  type?: string;              // Filter by center type
  fields?: string;
  includeDeleted?: boolean;
}
```

---

### 2.5 Batches Endpoint

**Current**: `GET /batches` (returns all)  
**New**: `GET /batches` (paginated)

#### Query Parameters

```typescript
interface BatchesQueryParams {
  page?: number;
  limit?: number;
  sort?: string;              // Default: "createdAt"
  order?: "asc" | "desc";
  search?: string;            // Searches: code, course name
  status?: string;            // Filter by status
  courseId?: string;
  startDateFrom?: string;     // ISO date string
  startDateTo?: string;       // ISO date string
  fields?: string;
  includeDeleted?: boolean;
}
```

---

## 3. Summary/Aggregate Endpoints

### 3.1 Academic Summary Endpoint

**Purpose**: Provide overview statistics without fetching all records

**Endpoint**: `GET /academic/summary`

#### Query Parameters

```typescript
interface SummaryQueryParams {
  dateFrom?: string;          // ISO date string
  dateTo?: string;            // ISO date string
  centerId?: string;         // Optional: filter by center
}
```

#### Response

```json
{
  "students": {
    "total": 1250,
    "active": 1100,
    "inRange": 45,
    "byStatus": {
      "Active": 1100,
      "On Hold": 100,
      "Graduated": 50
    }
  },
  "leads": {
    "total": 3500,
    "inRange": 120,
    "byStatus": {
      "New": 500,
      "Contacted": 2000,
      "Deposited": 800,
      "Enrolled": 200
    },
    "conversionRate": 5.7
  },
  "courses": {
    "total": 25,
    "active": 18,
    "inactive": 7
  },
  "centers": {
    "total": 12,
    "active": 10
  },
  "batches": {
    "total": 150,
    "active": 45,
    "upcoming": 10
  },
  "dateRange": {
    "from": "2024-01-01T00:00:00Z",
    "to": "2024-12-31T23:59:59Z"
  }
}
```

---

### 3.2 Entity Count Endpoints

**Purpose**: Quick count queries without fetching data

```bash
GET /students/count?status=Active&centerId=center-123
GET /leads/count?status=Contacted
GET /courses/count?status=Active
```

#### Response

```json
{
  "count": 1250,
  "filters": {
    "status": "Active",
    "centerId": "center-123"
  }
}
```

---

## 4. Backend Implementation Requirements

### 4.1 Database Query Optimization

1. **Indexes Required**:
   - `createdAt`, `updatedAt` on all entities
   - `status` on all entities
   - `deletedAt` on all entities (for soft delete filtering)
   - `centerId`, `courseId`, `batchId` (foreign keys)
   - Full-text indexes on searchable fields (name, email, etc.)

2. **Query Patterns**:
   ```sql
   -- Example: Paginated students query
   SELECT * FROM students
   WHERE deletedAt IS NULL
     AND status = 'Active'
     AND (fullName ILIKE '%search%' OR email ILIKE '%search%')
   ORDER BY createdAt DESC
   LIMIT 10 OFFSET 0;
   
   -- Count query (separate, optimized)
   SELECT COUNT(*) FROM students
   WHERE deletedAt IS NULL
     AND status = 'Active'
     AND (fullName ILIKE '%search%' OR email ILIKE '%search%');
   ```

3. **Performance Targets**:
   - Paginated queries: < 200ms (with indexes)
   - Count queries: < 100ms
   - Summary endpoint: < 500ms

### 4.2 Soft Delete Handling

- **Default Behavior**: Exclude soft-deleted records (`deletedAt IS NULL`)
- **Override**: Use `includeDeleted=true` to include deleted records
- **Backend Filter**: Apply at database level, not in application code

### 4.3 Search Implementation

- **Multi-field Search**: Search across relevant fields (name, email, phone, etc.)
- **Case-insensitive**: Use `ILIKE` (PostgreSQL) or equivalent
- **Performance**: Use full-text search indexes for large datasets

### 4.4 Field Selection (Optional Enhancement)

If `fields` parameter is provided:
- Return only specified fields
- Reduce payload size significantly
- Example: `fields=id,fullName,email` returns minimal data

---

## 5. Migration Strategy

### Phase 1: Backward Compatibility (Week 1)

1. **Add pagination support** to existing endpoints
2. **Default behavior**: If no pagination params, return first 100 records (not all)
3. **Response format**: Support both old (array) and new (paginated) formats based on query params

```typescript
// Backend logic
if (req.query.page || req.query.limit) {
  // Return paginated response
  return { data: [...], pagination: {...} };
} else {
  // Legacy: return first 100 (with deprecation warning)
  return [...].slice(0, 100);
}
```

### Phase 2: Frontend Integration (Week 2)

1. Update frontend to use pagination params
2. Handle paginated responses
3. Update React Query cache keys to include pagination

### Phase 3: Summary Endpoints (Week 3)

1. Implement `/academic/summary` endpoint
2. Update overview page to use summary endpoint
3. Remove full data fetching from overview

### Phase 4: Full Migration (Week 4)

1. Remove legacy array responses
2. Enforce pagination on all list endpoints
3. Performance testing and optimization

---

## 6. Frontend Integration Examples

### 6.1 Updated Network Functions

```typescript
// src/lib/network.ts

interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
  search?: string;
  [key: string]: any; // Additional filters
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const getStudents = async (params?: PaginationParams): Promise<PaginatedResponse<Student>> => {
  try {
    const api = await server();
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
    }
    
    const res = await api.get(`/students?${queryParams.toString()}`);
    return res.data;
  } catch (err: any) {
    console.error("Failed to fetch students:", err.message);
    return { data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false } };
  }
};

// Summary endpoint
export const getAcademicSummary = async (params?: { dateFrom?: string; dateTo?: string; centerId?: string }) => {
  try {
    const api = await server();
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });
    }
    
    const res = await api.get(`/academic/summary?${queryParams.toString()}`);
    return res.data;
  } catch (err: any) {
    console.error("Failed to fetch academic summary:", err.message);
    return null;
  }
};
```

---

## 7. Performance Targets

| Metric | Target | Current (Estimated) |
|--------|--------|---------------------|
| Initial page load | < 1s | 3-5s |
| Pagination navigation | < 200ms | N/A (no pagination) |
| Search/filter | < 300ms | 1-2s |
| Summary endpoint | < 500ms | 3-5s (fetches all) |
| API response size | < 50KB per page | 500KB-2MB+ |

---

## 8. Testing Requirements

### 8.1 Backend Tests

- [ ] Pagination with various page/limit combinations
- [ ] Search functionality across all fields
- [ ] Filter combinations
- [ ] Sorting (asc/desc) on all sortable fields
- [ ] Soft delete filtering (default exclude, include with flag)
- [ ] Edge cases: page 0, negative limits, invalid sort fields
- [ ] Performance: response time < 200ms for paginated queries
- [ ] Large dataset handling (10,000+ records)

---

## 9. Backend Team Checklist

- [ ] Implement pagination for `/students`
- [ ] Implement pagination for `/courses`
- [ ] Implement pagination for `/leads`
- [ ] Implement pagination for `/centers`
- [ ] Implement pagination for `/batches`
- [ ] Create `/academic/summary` endpoint
- [ ] Add database indexes for performance
- [ ] Implement search functionality
- [ ] Add soft delete filtering
- [ ] Add sorting support
- [ ] Add field selection (optional)
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Performance testing
- [ ] Update API documentation

---

## 10. Expected Impact

### Before (Current)
- **Initial Load**: 3-5 seconds (fetching 10,000+ records)
- **Memory Usage**: High (all records in memory)
- **Network**: 500KB-2MB+ per request
- **Scalability**: Poor (degrades with data growth)

### After (With Pagination)
- **Initial Load**: < 1 second (fetching 10 records)
- **Memory Usage**: Low (only current page in memory)
- **Network**: < 50KB per request
- **Scalability**: Excellent (consistent performance)

### Performance Improvement
- **90%+ reduction** in payload size
- **80%+ faster** initial page loads
- **Consistent performance** regardless of dataset size
- **Better user experience** with instant pagination

---

## 11. Questions for Backend Team

1. What database are you using? (PostgreSQL, MySQL, MongoDB, etc.)
2. What ORM/framework? (Prisma, TypeORM, Sequelize, etc.)
3. Current API framework? (Express, NestJS, Fastify, etc.)
4. Estimated record counts? (students, courses, leads, etc.)
5. Timeline for implementation?

---

## 12. Support & Contact

For questions or clarifications, please refer to this document or contact the frontend team.

**Priority**: High  
**Timeline**: 4 weeks (phased approach)  
**Impact**: Critical for production scalability
```

## Summary

The spec includes:
1. Standard pagination parameters and response format
2. Entity-specific endpoint specs (Students, Courses, Leads, Centers, Batches)
3. Summary/aggregate endpoints for the overview page
4. Database optimization requirements (indexes, query patterns)
5. Migration strategy (4-week phased approach)
6. Frontend integration examples
7. Performance targets and testing requirements
8. Backend team checklist

## Next steps

1. Save this as `BACKEND_PAGINATION_SPEC.md` in your project root
2. Share with your backend team
3. Schedule a review meeting to discuss implementation details
4. Agree on timeline and priorities

This spec provides what the backend needs to implement pagination and improve performance. The frontend is ready to integrate once the backend supports these endpoints.

Should I create a frontend integration plan that shows exactly how the frontend will consume these new paginated endpoints?