# Frontend Checklist: Display Discount Information

## ✅ Backend Changes Completed

The backend has been updated to:

1. ✅ Apply discounts correctly when approved (reduces `amount` and `pending` in payment plan)
2. ✅ Include discount information in payment plan responses
3. ✅ Return applied discount details with payment plans

## 📋 Frontend Checklist

### 1. **Update Payment Plan Display**

**Where:** Enrollment page, Student details page, Payment plan components

**Action Items:**

- [ ] Display discount badge/tag on payment plans that have an applied discount
  - Check if `paymentPlan.discountRequests` array has items with `status === 'APPLIED'`
  - Show a visual indicator (badge, icon, or colored tag) like "Discounted" or "Discount Applied"

- [ ] Show original amount vs discounted amount
  - Display both `originalAmount` and current `amount` from discount
  - Example: "Original: ₦650,000 → Discounted: ₦620,000"

### 2. **Update Pending Amount Display**

**Where:** Any component showing pending payment amount

**Action Items:**

- [ ] Ensure pending amount reflects the discount
  - The backend now calculates `pending = discountedAmount - paid`
  - Simply display `paymentPlan.pending` - it's already updated!

- [ ] Show discount savings amount
  - Calculate: `originalAmount - discountedAmount = discountAmount`
  - Display: "You saved ₦30,000" or "Discount: ₦30,000"

### 3. **Payment Plan Card/Component Updates**

**Where:** Components that render payment plan information

**Action Items:**

- [ ] Add discount indicator to payment plan cards

  ```typescript
  const appliedDiscount = paymentPlan.discountRequests?.find(
    (d) => d.status === 'APPLIED'
  );

  {appliedDiscount && (
    <Badge color="green">Discount Applied</Badge>
  )}
  ```

- [ ] Update fee display to show discount breakdown
  ```typescript
  {appliedDiscount && (
    <div>
      <span style={{textDecoration: 'line-through'}}>
        ₦{appliedDiscount.originalAmount.toLocaleString()}
      </span>
      {' → '}
      <span style={{color: 'green', fontWeight: 'bold'}}>
        ₦{paymentPlan.amount.toLocaleString()}
      </span>
      <span style={{color: 'green'}}>
        (Saved ₦{(appliedDiscount.originalAmount - appliedDiscount.discountedAmount).toLocaleString()})
      </span>
    </div>
  )}
  ```

### 4. **Student Enrollment Page**

**Where:** `/dashboard/academic/students/enrollment/[studentId]` or similar

**Action Items:**

- [ ] Show discount information in the courses/payment section
  - Check `paymentPlan.discountRequests` for applied discounts
  - Display discount details: type (percentage/fixed), value, reason
- [ ] Update pending balance display
  - Show the reduced pending amount after discount
- [ ] Add visual indicator for discounted courses
  - Badge or icon next to course name showing discount applied

### 5. **API Response Structure**

**What the backend now returns:**

```typescript
{
  paymentPlan: {
    id: string,
    amount: number, // Discounted amount
    pending: number, // Already reduced by discount
    paid: number,
    // ... other fields
    discountRequests: [{
      id: string,
      discountType: 'PERCENTAGE' | 'FIXED_AMOUNT',
      discountValue: number,
      originalAmount: number,
      discountedAmount: number,
      appliedAt: string,
      status: 'APPLIED'
    }] // Only includes APPLIED discounts
  }
}
```

**Action Items:**

- [ ] Update TypeScript interfaces/types to include `discountRequests` in payment plan type
  ```typescript
  interface PaymentPlan {
    // ... existing fields
    discountRequests?: Array<{
      id: string;
      discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
      discountValue: number;
      originalAmount: number;
      discountedAmount: number;
      appliedAt: string;
      status: 'APPLIED';
    }>;
  }
  ```

### 6. **Refresh Data After Discount Approval**

**Action Items:**

- [ ] Refresh payment plan data after discount is approved
  - Listen for discount approval notifications/events
  - Refetch student/payment plan data when discount status changes to 'APPLIED'
  - Or manually refresh the enrollment page data

### 7. **Visual Design Suggestions**

**Discount Badge/Indicator:**

- Use green color to indicate discount (savings)
- Icon: 💰, 🎁, or percentage symbol (%)
- Text: "Discounted", "Discount Applied", or show percentage/fixed amount

**Amount Display:**

- Strike through original amount
- Highlight discounted amount in green
- Show savings amount separately

**Pending Balance:**

- The pending amount is already updated on backend
- Just ensure it displays correctly
- Optionally show "Pending (after discount): ₦X"

### 8. **Testing Checklist**

- [ ] Verify discount appears after approval
- [ ] Check that pending amount is reduced correctly
- [ ] Ensure original amount is still visible for reference
- [ ] Test with both percentage and fixed amount discounts
- [ ] Verify discount displays on enrollment page
- [ ] Check discount shows on student details page
- [ ] Test multiple discounts (should only show most recent applied)

## 📝 Example Component Code Structure

```typescript
// Example: Payment Plan Display Component
const PaymentPlanDisplay = ({ paymentPlan }) => {
  const appliedDiscount = paymentPlan.discountRequests?.[0];
  const hasDiscount = appliedDiscount?.status === 'APPLIED';

  return (
    <div>
      {hasDiscount && (
        <div className="discount-badge">
          <Badge color="green">
            {appliedDiscount.discountType === 'PERCENTAGE'
              ? `${appliedDiscount.discountValue}% OFF`
              : `₦${appliedDiscount.discountValue.toLocaleString()} OFF`}
          </Badge>
        </div>
      )}

      <div className="amount-display">
        {hasDiscount ? (
          <>
            <span className="original-amount" style={{textDecoration: 'line-through'}}>
              ₦{appliedDiscount.originalAmount.toLocaleString()}
            </span>
            <span className="discounted-amount">
              ₦{paymentPlan.amount.toLocaleString()}
            </span>
            <span className="savings">
              (Saved ₦{(appliedDiscount.originalAmount - appliedDiscount.discountedAmount).toLocaleString()})
            </span>
          </>
        ) : (
          <span>₦{paymentPlan.amount.toLocaleString()}</span>
        )}
      </div>

      <div className="pending-amount">
        Pending: ₦{paymentPlan.pending.toLocaleString()}
        {hasDiscount && <small> (after discount)</small>}
      </div>
    </div>
  );
};
```

## 🎯 Key Points

1. **Backend already updates**: `amount`, `pending`, `perInstallment`, and `estimate` when discount is applied
2. **Discount info is included**: Payment plan responses now include `discountRequests` with applied discounts
3. **Only APPLIED discounts**: The backend only returns discounts with status `APPLIED`
4. **Most recent discount**: If multiple discounts exist, only the most recent applied one is returned

## ✅ Summary

The backend is fully functional. The frontend just needs to:

1. Display the discount information that's already in the API response
2. Show visual indicators for discounted payment plans
3. Update UI to reflect the already-calculated discounted amounts
4. Refresh data when discounts are approved
