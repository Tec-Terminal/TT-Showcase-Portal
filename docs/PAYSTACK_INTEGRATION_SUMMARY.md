# Paystack Integration Summary

## Overview

This document summarizes the Paystack payment integration for the onboarding flow.

## Flow Diagram

```
1. User fills onboarding form (Steps 1-3)
   ↓
2. User clicks "Pay" button
   ↓
3. Frontend initializes Paystack payment
   ↓
4. User redirected to Paystack payment page
   ↓
5. User selects bank account and completes payment
   ↓
6. Paystack redirects to callback URL
   ↓
7. Frontend verifies payment with Paystack
   ↓
8. If successful, redirect to success page
   ↓
9. Success page submits onboarding data to backend
   ↓
10. Backend creates all records (student, guardian, payments, etc.)
   ↓
11. User sees success page with confirmation
```

## Files Created/Modified

### Frontend Files

1. **`src/lib/services/paystack.service.ts`**
   - Paystack service for payment initialization and verification

2. **`src/app/api/paystack/initialize/route.ts`**
   - API route to initialize Paystack payments

3. **`src/app/api/paystack/verify/[reference]/route.ts`**
   - API route to verify Paystack payments

4. **`src/app/api/onboarding/submit/route.ts`**
   - API route to submit onboarding data to backend after payment

5. **`src/app/onboarding/payment/callback/page.tsx`**
   - Callback page that verifies payment and redirects to success

6. **`src/app/onboarding/success/page.tsx`**
   - Success page that submits data to backend and shows confirmation

7. **`src/app/onboarding/PaymentConfiguration.tsx`** (Modified)
   - Updated to integrate Paystack payment initialization

8. **`src/app/onboarding/page.tsx`** (Modified)
   - Updated to pass user email to PaymentConfiguration

## Environment Variables Required

Add these to your `.env.local` file:

```env
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx  # Your Paystack secret key

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Your frontend URL

# Backend API
API_BASE_URL=http://localhost:8000  # Your backend API URL
```

## Paystack Setup

1. **Get Paystack API Keys**
   - Sign up at https://paystack.com
   - Get your Secret Key from the dashboard
   - Use test keys for development, live keys for production

2. **Configure Webhook (Optional but Recommended)**
   - Set webhook URL: `https://your-domain.com/api/paystack/webhook`
   - This allows Paystack to notify your backend directly about payment status

## Center Bank Accounts

To display bank accounts for centers in Paystack:

1. **Option 1: Use Paystack's Bank Transfer Feature**
   - Paystack automatically shows bank accounts when user selects "Bank Transfer"
   - You need to configure bank accounts in your Paystack dashboard
   - Each center should have its bank accounts configured

2. **Option 2: Custom Bank Account Display**
   - Fetch center bank accounts from your backend
   - Display them before redirecting to Paystack
   - Pass the selected bank account in metadata

### Backend Endpoint for Center Bank Accounts

If you want to fetch bank accounts before payment:

**Endpoint:** `GET /centers/:centerId/banks`

**Response:**
```json
{
  "center": {
    "id": "clx789ghi",
    "name": "Umuahia Centre"
  },
  "banks": [
    {
      "id": "bank_123",
      "name": "Access Bank",
      "accountNumber": "1234567890",
      "accountName": "TecTerminal Umuahia"
    }
  ]
}
```

## Testing

### Test Payment Flow

1. Use Paystack test cards:
   - **Success:** `4084084084084081`
   - **Decline:** `5060666666666666666`
   - **3DS:** `4084084084084081` (will require OTP)

2. Test email: Use any valid email format

3. Test amount: Use any amount (test mode)

### Testing Checklist

- [ ] Payment initialization works
- [ ] Redirect to Paystack works
- [ ] Payment callback verification works
- [ ] Success page submission works
- [ ] Backend receives correct payload
- [ ] All records created correctly
- [ ] Error handling works for failed payments

## Error Handling

The integration handles errors at multiple points:

1. **Payment Initialization Failure**
   - Shows error message to user
   - Allows retry

2. **Payment Verification Failure**
   - Shows error page
   - Allows return to onboarding

3. **Backend Submission Failure**
   - Shows error message
   - Payment is verified but enrollment failed
   - User should contact support

## Security Considerations

1. **Never expose Paystack Secret Key on frontend**
   - All Paystack API calls go through backend API routes

2. **Verify payments server-side**
   - Always verify payment status before creating records

3. **Validate payment reference**
   - Ensure payment reference matches what was sent

4. **Use HTTPS in production**
   - Required for secure payment processing

## Backend Integration

See `docs/ONBOARDING_BACKEND_INTEGRATION_GUIDE.md` for complete backend implementation guide.

## Support

For Paystack issues:
- Documentation: https://paystack.com/docs
- Support: support@paystack.com

For integration issues:
- Check console logs
- Verify environment variables
- Test API endpoints individually

