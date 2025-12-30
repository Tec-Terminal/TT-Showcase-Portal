import { NextRequest, NextResponse } from 'next/server';

/**
 * Initialize Paystack Payment
 * POST /api/paystack/initialize
 * 
 * This endpoint initializes a Paystack payment transaction
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, amount, reference, callback_url, metadata, channels } = body;

    // Validate required fields
    if (!email || !amount || !reference) {
      return NextResponse.json(
        { error: 'Email, amount, and reference are required' },
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

    // Prepare Paystack request
    const paystackRequest = {
      email,
      amount: amount * 100, // Convert Naira to kobo
      reference,
      callback_url: callback_url || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/onboarding/payment/callback`,
      metadata: metadata || {},
      channels: channels || ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
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

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Paystack initialization error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

