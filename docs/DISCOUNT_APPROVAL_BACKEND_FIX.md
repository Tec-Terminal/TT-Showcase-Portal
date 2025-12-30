# Backend Fix Required for Discount Approval

## Issue
When ADMIN or REGIONAL_MANAGER users try to approve/reject discounts, they receive a "Forbidden" (403) error. This is because the backend is currently only allowing CEO users to approve/reject discounts.

## Frontend Changes Made
✅ Frontend has been updated to allow ADMIN, REGIONAL_MANAGER, and CEO users to see approve/reject buttons
✅ Error handling improved to show detailed backend error messages
✅ Enhanced logging added for debugging

## Required Backend Changes

### 1. Update Discount Approval Endpoint Authorization

**Endpoint:** `PATCH /discounts/:id/approve`

**Current Behavior:**
- Only allows CEO role to approve discounts
- Returns 403 Forbidden for other roles

**Required Change:**
Update the authorization middleware/guard to allow:
- `CEO`
- `ADMIN` 
- `REGIONAL_MANAGER`

**Example Implementation (if using role-based guards):**
```typescript
// Before
@Roles('CEO')
@Patch(':id/approve')
async approveDiscount(@Param('id') id: string, @Body() body: { notes?: string }) {
  // ...
}

// After
@Roles('CEO', 'ADMIN', 'REGIONAL_MANAGER')
@Patch(':id/approve')
async approveDiscount(@Param('id') id: string, @Body() body: { notes?: string }) {
  // ...
}
```

### 2. Update Discount Rejection Endpoint Authorization

**Endpoint:** `PATCH /discounts/:id/reject`

**Current Behavior:**
- Only allows CEO role to reject discounts
- Returns 403 Forbidden for other roles

**Required Change:**
Update the authorization middleware/guard to allow:
- `CEO`
- `ADMIN`
- `REGIONAL_MANAGER`

**Example Implementation:**
```typescript
// Before
@Roles('CEO')
@Patch(':id/reject')
async rejectDiscount(@Param('id') id: string, @Body() body: { rejectionReason: string }) {
  // ...
}

// After
@Roles('CEO', 'ADMIN', 'REGIONAL_MANAGER')
@Patch(':id/reject')
async rejectDiscount(@Param('id') id: string, @Body() body: { rejectionReason: string }) {
  // ...
}
```

### 3. Alternative: Update Role Check Logic

If using custom role checking logic instead of decorators:

```typescript
// Before
if (user.role !== 'CEO') {
  throw new ForbiddenException('Only CEO can approve discounts');
}

// After
const allowedRoles = ['CEO', 'ADMIN', 'REGIONAL_MANAGER'];
if (!allowedRoles.includes(user.role?.toUpperCase())) {
  throw new ForbiddenException('Only CEO, Admin, or Regional Manager can approve discounts');
}
```

### 4. Verify Role Names

Ensure the backend uses these exact role names (case-insensitive matching recommended):
- `CEO` or `ceo`
- `ADMIN` or `admin`
- `REGIONAL_MANAGER` or `REGIONAL_MANAGER` or `regionalManager`

## Testing Checklist

After backend changes:
- [ ] ADMIN user can approve pending discounts
- [ ] ADMIN user can reject pending discounts
- [ ] REGIONAL_MANAGER user can approve pending discounts
- [ ] REGIONAL_MANAGER user can reject pending discounts
- [ ] CEO user can still approve/reject (backward compatibility)
- [ ] Other roles (e.g., CENTER_MANAGER) cannot approve/reject (security check)

## Error Messages

The frontend will now display detailed error messages from the backend. If you see:
- `"Forbidden"` - Backend authorization issue (needs the fix above)
- `"Unauthorized"` - Session/token issue
- `"Discount not found"` - Discount ID doesn't exist
- Other errors - Will be displayed as returned from backend

## Debugging

After implementing backend changes, check the console logs:
- `[API /discounts/[id]/approve]` - Shows request details and backend response
- `[approveDiscountClient]` - Shows client-side request/response
- `[API /discounts/[id]/reject]` - Shows request details and backend response
- `[rejectDiscountClient]` - Shows client-side request/response

These logs will help identify if the issue is:
1. Authorization (403) - Backend role check
2. Authentication (401) - Session/token
3. Not Found (404) - Discount doesn't exist
4. Validation (400) - Invalid request data
5. Server Error (500) - Backend processing error

