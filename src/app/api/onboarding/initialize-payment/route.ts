import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Initialize Onboarding Payment
 * POST /api/onboarding/initialize-payment
 * 
 * This endpoint initializes a Paystack payment for onboarding
 * Works the same way as wallet funding and installment payments
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, amount, courseId, centerId, initialDeposit, duration, fullTuition, metadata } = body;

    // Validate required fields
    if (!email || !amount || !courseId || !centerId) {
      return NextResponse.json(
        { error: 'Email, amount, courseId, and centerId are required' },
        { status: 400 }
      );
    }

    // Validate amount
    if (amount < 100) {
      return NextResponse.json(
        { error: 'Minimum payment amount is ₦100' },
        { status: 400 }
      );
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      console.error("❌ PAYSTACK_SECRET_KEY is not configured in environment variables");
      return NextResponse.json(
        { error: 'Paystack secret key not configured' },
        { status: 500 }
      );
    }

    // Get user info from token for metadata
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    let userId: string | null = null;
    
    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const base64Url = parts[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const buffer = Buffer.from(base64, 'base64');
          const jsonPayload = buffer.toString('utf-8');
          const decoded = JSON.parse(jsonPayload);
          userId = decoded.sub || decoded.userId || decoded.id || null;
        }
      } catch (error) {
        console.warn('Could not decode token for userId:', error);
      }
    }

    // Generate unique reference
    const reference = `ONBOARD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Prepare callback URL - redirect to onboarding page with query params (same pattern as payments page)
    const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    const callbackUrl = `${frontendUrl}/onboarding?success=true&reference=${reference}`;

    // Prepare Paystack request
    const paystackRequest = {
      email,
      amount: Math.round(amount * 100), // Convert Naira to kobo
      reference,
      callback_url: callbackUrl,
      metadata: {
        type: 'onboarding_payment',
        userId: userId,
        courseId,
        centerId,
        initialDeposit,
        duration,
        fullTuition,
        ...(metadata || {}),
      },
      channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
    };

    // Call Paystack API
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paystackRequest),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Paystack API error:', {
        status: response.status,
        statusText: response.statusText,
        data: data,
        request: { email, amount, reference }
      });
      
      // Return more detailed error message
      const errorMessage = data.message || data.error || 'Failed to initialize payment with Paystack';
      return NextResponse.json(
        { 
          error: errorMessage,
          details: data,
          status: response.status 
        },
        { status: response.status }
      );
    }

    if (!data.status || !data.data?.authorization_url) {
      console.error('❌ Invalid Paystack response:', data);
      return NextResponse.json(
        { error: 'Invalid response from Paystack' },
        { status: 500 }
      );
    }

    // Return in the same format as wallet funding and installment payments
    return NextResponse.json({
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: data.data.reference,
    });
  } catch (error: any) {
    console.error('Onboarding payment initialization error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
