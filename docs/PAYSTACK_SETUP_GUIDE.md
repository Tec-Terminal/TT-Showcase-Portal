# Paystack Setup Guide

## Quick Setup

### 1. Get Paystack API Keys

1. Sign up at https://paystack.com
2. Go to Settings → API Keys & Webhooks
3. Copy your **Secret Key** (starts with `sk_test_` for test mode or `sk_live_` for live mode)

### 2. Configure Environment Variables

Create or update your `.env.local` file in the project root:

```env
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxx

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Backend API
API_BASE_URL=http://localhost:8000
```

### 3. Restart Development Server

After adding environment variables, restart your Next.js development server:

```bash
npm run dev
```

## Troubleshooting "Failed to initialize payment" Error

### Common Causes:

1. **Missing PAYSTACK_SECRET_KEY**
   - Check that `.env.local` exists in project root
   - Verify the key is set correctly (no quotes, no spaces)
   - Restart the dev server after adding

2. **Invalid Paystack Key**
   - Ensure you're using the correct key (test vs live)
   - Verify the key hasn't expired or been revoked
   - Check Paystack dashboard for key status

3. **Network Issues**
   - Check internet connection
   - Verify Paystack API is accessible
   - Check firewall/proxy settings

4. **Invalid Request Data**
   - Check browser console for detailed error
   - Verify email format is correct
   - Ensure amount is a valid number

### Debug Steps:

1. **Check Browser Console**
   - Open DevTools (F12)
   - Look for error messages in Console tab
   - Check Network tab for failed requests

2. **Check Server Logs**
   - Look at terminal where `npm run dev` is running
   - Check for error messages from API routes

3. **Test Paystack Key**
   - Use Paystack's test endpoint to verify key works
   - Test with Paystack's test cards

### Test Paystack Key

You can test your Paystack key using curl:

```bash
curl https://api.paystack.co/transaction/initialize \
  -H "Authorization: Bearer sk_test_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "amount": 300000
  }'
```

If this returns an error, your key is invalid or not configured correctly.

## Test Cards

Use these test cards in Paystack test mode:

- **Success:** `4084084084084081`
- **Decline:** `5060666666666666666`
- **3DS Required:** `4084084084084081` (will prompt for OTP)

Use any future expiry date and any CVV.

## Next Steps

Once payment initialization works:
1. Test the complete payment flow
2. Verify callback handling
3. Test backend submission
4. Switch to live keys for production

