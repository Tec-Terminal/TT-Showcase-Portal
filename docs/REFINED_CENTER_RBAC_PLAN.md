# Refined Center-Based RBAC Implementation Plan (CTO Review)

## Executive Summary

**Original Plan Issues:**
- Manual updates to 13+ services (error-prone, doesn't scale)
- No automatic enforcement (security risk)
- Header-based center selection (vulnerable to manipulation)
- High maintenance burden

**Refined Approach:**
- **Request-scoped context** using AsyncLocalStorage (no passing context around)
- **Prisma Client Extension** for automatic center filtering at database layer
- **Centralized configuration** (single source of truth)
- **Minimal service changes** (automatic filtering)
- **Server-side center context** (secure, not client-controlled)

---

## Phase 1: Request Context Infrastructure (Critical Foundation)

### 1.1 AsyncLocalStorage-Based Request Context
**Why**: Ensures center context is available across entire request without passing parameters

**New File**: `src/common/context/request-context.service.ts`
```typescript
// Uses AsyncLocalStorage to store user/center per request
// Automatically available in all services without injection
```

**Benefits**:
- No need to pass user/center context between services
- Thread-safe per request
- Clean, transparent API

### 1.2 Request Context Interceptor
**New File**: `src/common/interceptors/context.interceptor.ts`
- Extracts user from JWT (via existing auth guard)
- Extracts/validates center from header/query
- Stores in AsyncLocalStorage context
- Validates user has access to requested center

### 1.3 Enhanced JWT Strategy
**File**: `src/auth/strategies/jwt.strategy.ts`
- Return user with center assignments:
```typescript
{
  id: string;
  role: UserRole;
  centers: Array<{ centerId: string; role: UserRole }>;
  primaryCenterId?: string;
}
```

**File**: `src/auth/auth.service.ts`
- `validateJwtUser()` to fetch user with UserOnCenter relationships
- Include all accessible centers

---

## Phase 2: Automatic Database Filtering (Core Innovation)

### 2.1 Prisma Client Extension for Center Filtering
**Why**: Automatic filtering at database layer - impossible to forget, more secure

**New File**: `src/prisma/prisma-center-filter.extension.ts`
```typescript
// Extends Prisma client to automatically inject center filters
// Works for all models with centerId relationship
```

**Approach**:
1. Extend PrismaService with `$extends()` method
2. Create middleware that intercepts all queries
3. Automatically inject `centerId: { in: allowedCenters }` filter
4. Works for `findMany`, `findFirst`, `findUnique`, `count`, etc.

**Models to Auto-Filter**:
- Student (centerId)
- Lead (centerId)
- Batch (centerId)
- Staff (centerId)
- Faculty (centerId)
- Bank (centerId)
- Manager (centerId)
- Report (centerId via user)
- CenterNote (centerId)
- Document (centerId)

**Models Requiring Custom Logic**:
- Attendance (via Student/Batch)
- Payment (via Student)
- LeaveRequest (via Staff)
- ProcurementRequest (via Staff)

### 2.2 Updated PrismaService
**File**: `src/prisma/prisma.service.ts`
```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private _client: PrismaClient;

  async onModuleInit() {
    await this.$connect();
    this._client = this.$extends(centerFilterExtension);
  }

  get client() {
    return this._client;
  }
}
```

**Benefits**:
- **Automatic**: All queries filtered without service changes
- **Secure**: Can't bypass filtering
- **Performance**: Single point of optimization
- **Maintainable**: Add new models to config, not every service

---

## Phase 3: Center Context Management (Secure & Scalable)

### 3.1 Server-Side Center Context Storage
**Why**: Security - center selection stored server-side, not client-controlled

**New File**: `src/common/services/center-context.service.ts`
- Store selected center in user session/preferences
- Validate center access on context retrieval
- For center-specific users: auto-lock to assigned center
- For admin users: allow switching between accessible centers

**Storage Options**:
1. **Database**: User preferences table (recommended for persistence)
2. **Redis**: For high-performance, scalable (if using Redis)
3. **JWT Claims**: Limited (can't update without re-login)

**Recommended**: Database + JWT combination
- Store in database for persistence
- Include in JWT for quick access
- Update database when switching

### 3.2 Center Access Validation
**New File**: `src/common/services/center-access.service.ts`
```typescript
// Centralized logic for:
// - Determining allowed centers based on role
// - Validating center access
// - Getting primary/default center
```

**Roles That Can Switch Centers**:
- ADMIN, CEO, COO_HEAD_OFFICE, REGIONAL_MANAGER, FINANCE_OFFICER, EXECUTIVE_ASSISTANT

**Roles Locked to Assigned Center**:
- CENTER_MANAGER, CENTER_ACADEMIC_HEAD, FACULTY, STAFF, USER

### 3.3 Center Context API Endpoints
**New Endpoints**:
- `GET /auth/user/centers` - Get accessible centers
- `GET /auth/user/center-context` - Get current center context
- `POST /auth/user/center-context` - Switch center (admin only)

---

## Phase 4: Service Layer Updates (Minimal Changes)

### 4.1 Services Using Prisma Extension
**Services**: Student, Lead, Batch, Staff, Faculty, Bank, Manager, Center

**Changes Required**: **NONE** (automatic filtering via extension)

**Before**:
```typescript
async getAllStudents() {
  return this.prisma.student.findMany({
    where: { deletedAt: null }
  });
}
```

**After**: Same code, but automatically filtered by center!

### 4.2 Services Requiring Custom Logic
**Services**: Attendance, Payment, Leave, Procurement

**Approach**: Use request context helper

**New File**: `src/common/services/center-filter-helper.service.ts`
```typescript
// Helper methods for custom filtering scenarios
// - Get allowed center IDs
// - Build center filter clause
// - Filter by related models (e.g., student.centerId)
```

**Example**:
```typescript
async getAllPayments() {
  const allowedCenterIds = this.centerFilterHelper.getAllowedCenterIds();
  
  return this.prisma.payment.findMany({
    where: {
      student: {
        centerId: { in: allowedCenterIds }
      }
    }
  });
}
```

**Minimal Changes**: Only 4-5 services need updates

---

## Phase 5: Controller & Guard Updates

### 5.1 Context Interceptor (Global)
**New File**: `src/common/interceptors/context.interceptor.ts`
- Registered globally in `app.module.ts`
- Runs after authentication
- Sets up request context automatically

### 5.2 Remove @Public() Where Needed
- Audit controllers
- Remove `@Public()` from endpoints requiring authentication
- Keep only for: auth endpoints, health checks, public docs

### 5.3 CurrentUser Decorator (Optional Enhancement)
**New File**: `src/auth/decorators/current-user.decorator.ts`
- Type-safe access to user from request
- Uses AsyncLocalStorage context

---

## Phase 6: Frontend Integration

### 6.1 Center Context API
**Endpoints**:
- `GET /auth/user/centers` - Returns accessible centers
- `GET /auth/user/center-context` - Returns current center
- `POST /auth/user/center-context` - Switch center (returns updated JWT)

### 6.2 Frontend Requirements
1. **Store Center Context**:
   - In JWT (after login/center switch)
   - In localStorage for UI state

2. **Include Center in Requests**:
   - `X-Center-Id` header for admin users (optional, server validates)
   - For center-specific users: header not needed (auto-locked)

3. **Center Filter UI**:
   - Admin: Dropdown to switch centers
   - Center-specific: Display center name (disabled)

---

## Phase 7: Database Optimization

### 7.1 Indexes for Performance
```sql
-- Critical indexes for center filtering
CREATE INDEX IF NOT EXISTS idx_student_center ON "Student"("centerId");
CREATE INDEX IF NOT EXISTS idx_lead_center ON "Lead"("center");
CREATE INDEX IF NOT EXISTS idx_batch_center ON "Batch"("centerId");
CREATE INDEX IF NOT EXISTS idx_staff_center ON "Staff"("centerId");
-- ... etc
```

### 7.2 Query Optimization
- Prisma extension ensures consistent filtering
- Single optimization point
- Easy to add query hints if needed

---

## Implementation Comparison

| Aspect | Original Plan | Refined Plan |
|--------|--------------|---------------|
| **Service Changes** | 13+ services manually updated | 4-5 services (automatic for rest) |
| **Maintenance** | High (must remember filtering) | Low (automatic) |
| **Security** | Header-based (manipulable) | Server-side validated |
| **Scalability** | Poor (manual updates) | Excellent (automatic) |
| **Performance** | Distributed filtering | Centralized, optimized |
| **Error-Prone** | High (easy to miss) | Low (automatic) |
| **New Services** | Must manually add filtering | Automatically filtered |
| **Testing** | Test each service | Test extension once |

---

## Security Enhancements

### 1. Server-Side Validation
- Center context stored server-side
- Client can request center switch, but server validates access
- Center-specific users auto-locked (can't switch)

### 2. Automatic Filtering
- Impossible to bypass (database layer)
- No developer error possible

### 3. Request Validation
- Context interceptor validates center access
- Rejects unauthorized center access attempts

---

## Implementation Steps

### Step 1: Foundation (Days 1-2)
1. Create AsyncLocalStorage request context service
2. Create context interceptor
3. Update JWT strategy to include centers
4. Register interceptor globally

### Step 2: Database Filtering (Days 3-4)
1. Create Prisma client extension
2. Implement automatic center filtering
3. Test with one service (Student)
4. Update PrismaService to use extension

### Step 3: Center Context (Days 5-6)
1. Create center context service
2. Create center access validation service
3. Create API endpoints
4. Update JWT to include center context

### Step 4: Service Updates (Days 7-8)
1. Update custom services (Attendance, Payment, etc.)
2. Verify automatic filtering works for other services
3. Add indexes for performance

### Step 5: Testing & Polish (Days 9-10)
1. Test admin center switching
2. Test center-specific user isolation
3. Test security (unauthorized access attempts)
4. Performance testing
5. Documentation

**Total Estimated Time**: ~10 days (vs 14-20 days original)

---

## Risk Mitigation

### 1. AsyncLocalStorage Compatibility
- **Risk**: NestJS async context management
- **Mitigation**: Use `@nestjs/cls` or custom implementation with proper cleanup

### 2. Prisma Extension Complexity
- **Risk**: Extension API learning curve
- **Mitigation**: Start simple, test thoroughly, iterate

### 3. Performance Impact
- **Risk**: Extension adds overhead
- **Mitigation**: Profile, optimize, use indexes

### 4. Breaking Changes
- **Risk**: Existing queries may break
- **Mitigation**: Feature flag, gradual rollout, comprehensive testing

---

## Success Metrics

1. ✅ Zero manual filtering in services (automatic)
2. ✅ 100% query coverage (no bypass possible)
3. ✅ < 5ms overhead per query (performance)
4. ✅ Zero security vulnerabilities (server-side validation)
5. ✅ Easy to add new models (configuration-only)

---

## Alternative Approaches Considered

### 1. Database RLS (Row Level Security)
- **Pros**: Most secure, database-level
- **Cons**: Complex setup, PostgreSQL-specific, harder to debug

### 2. Repository Pattern
- **Pros**: Clear abstraction
- **Cons**: More code, still manual updates needed

### 3. Decorator-Based Filtering
- **Pros**: Explicit, clear intent
- **Cons**: Still manual, can be forgotten

**Chosen Approach**: Prisma Extension + Request Context
- Best balance of security, maintainability, and performance
- Automatic enforcement
- Minimal code changes
- Easy to understand and maintain

