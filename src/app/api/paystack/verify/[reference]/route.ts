import { NextRequest, NextResponse } from 'next/server';

/**
 * Verify Paystack Payment
 * GET /api/paystack/verify/[reference]
 * 
 * This endpoint verifies a Paystack payment transaction
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { reference: string } | Promise<{ reference: string }> }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { reference } = resolvedParams;

    if (!reference) {
      return NextResponse.json(
        { error: 'Payment reference is required' },
        { status: 400 }
      );
    }

    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecretKey) {
      return NextResponse.json(
        { error: 'Paystack secret key not configured' },
        { status: 500 }
      );
    }

    // Call Paystack API to verify transaction
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Failed to verify payment' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Paystack verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

