import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * Verify Onboarding Payment
 * POST /api/onboarding/verify-payment
 * 
 * This endpoint verifies a Paystack payment for onboarding
 * Works the same way as wallet funding and installment payment verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reference, guardianEmail, profile, selectedCenter, selectedCourse, paymentPlan } = body;

    // Validate required fields
    if (!reference) {
      return NextResponse.json(
        { error: 'Payment reference is required' },
        { status: 400 }
      );
    }

    // Check if backend endpoint is available, if so forward to it
    const apiBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;

    if (apiBaseUrl && apiBaseUrl !== 'https://your-api-domain.com') {
      try {
        // Forward to backend endpoint which will verify payment AND create enrollment
        const backendResponse = await fetch(`${apiBaseUrl}/portal/onboarding/verify-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            reference,
            guardianEmail,
            profile,
            selectedCenter,
            selectedCourse,
            paymentPlan,
          }),
        });

        if (backendResponse.ok) {
          const backendData = await backendResponse.json();
          return NextResponse.json(backendData);
        }

        // If backend returns error, continue with frontend verification as fallback
        console.warn('Backend verification endpoint returned error, using frontend fallback');
      } catch (backendError) {
        // Backend not available, continue with frontend verification as fallback
        console.warn('Backend verification endpoint not available, using frontend fallback:', backendError);
      }
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      console.error("❌ PAYSTACK_SECRET_KEY is not configured in environment variables");
      return NextResponse.json(
        { error: 'Paystack secret key not configured' },
        { status: 500 }
      );
    }

    // Verify payment with Paystack
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Paystack verification error:', {
        status: response.status,
        statusText: response.statusText,
        data: data,
        reference
      });
      
      const errorMessage = data.message || data.error || 'Failed to verify payment with Paystack';
      return NextResponse.json(
        { 
          error: errorMessage,
          details: data,
          status: response.status 
        },
        { status: response.status }
      );
    }

    if (!data.status || !data.data) {
      console.error('❌ Invalid Paystack verification response:', data);
      return NextResponse.json(
        { error: 'Invalid response from Paystack' },
        { status: 500 }
      );
    }

    const transaction = data.data;

    // Check if payment was successful
    if (transaction.status !== 'success') {
      return NextResponse.json(
        { 
          error: 'Payment was not successful',
          status: transaction.status,
          gatewayResponse: transaction.gateway_response
        },
        { status: 400 }
      );
    }

    // Frontend-only verification (fallback when backend is not available)
    // Note: This does NOT create enrollment - that must be handled by backend
    // When backend endpoint is implemented, enrollment will be created automatically
    
    // If enrollment data was provided but backend is not available, warn
    if (profile && selectedCenter && selectedCourse && paymentPlan) {
      console.warn(
        '⚠️ Enrollment data provided but backend endpoint not available. ' +
        'Payment verified but enrollment NOT created. ' +
        'Please implement backend endpoint: POST /portal/onboarding/verify-payment'
      );
    }

    // Return verification result (similar to backend verification endpoints)
    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      reference: transaction.reference,
      amount: transaction.amount / 100, // Convert from kobo to Naira
      currency: transaction.currency,
      status: transaction.status,
      transactionDate: transaction.transaction_date,
      customer: transaction.customer,
      metadata: transaction.metadata,
      // Note: student data will be included when backend endpoint is implemented
    });
  } catch (error: any) {
    console.error('Onboarding payment verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
