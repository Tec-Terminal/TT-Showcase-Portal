import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserIdFromToken } from '@/lib/utils/jwt';

/**
 * Submit Onboarding Data
 * POST /api/onboarding/submit
 * 
 * This endpoint submits the complete onboarding data to the backend
 * after successful payment verification
 */
// Track in-flight requests to prevent duplicates
const inFlightRequests = new Map<string, Promise<any>>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['profile', 'selectedCenter', 'selectedCourse', 'paymentPlan', 'paymentReference'];
    for (const field of requiredFields) {
      if (!body[field]) {
        console.error(`Missing required field: ${field}`);
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    const paymentReference = body.paymentReference;
    
    // Check if this payment reference is already being processed
    if (inFlightRequests.has(paymentReference)) {
      try {
        const result = await inFlightRequests.get(paymentReference);
        return NextResponse.json({
          success: true,
          data: result,
          message: "Request already processed",
        });
      } catch (error: any) {
        return NextResponse.json(
          { error: error.message || "Request already being processed" },
          { status: 409 }
        );
      }
    }

    // Extract user ID from JWT token BEFORE creating payload
    // This ensures the student is tied to the user account
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    const userId = token ? getUserIdFromToken(token) : null;
    
    // Prepare the payload for backend
    const payload = {
      // User ID to link student to authenticated user
      // This ensures the student is tied to the user account
      userId: userId || undefined, // Include only if we have it
      
      // Profile information
      profile: {
        trainingLocation: body.profile.trainingLocation,
        centre: body.profile.centre,
        studentAddress: body.profile.studentAddress || null,
        guardianName: body.profile.guardianName || null,
        guardianPhone: body.profile.guardianPhone || null,
        guardianEmail: body.profile.guardianEmail || null,
        guardianAddress: body.profile.guardianAddress || null,
        hasGuardian: body.profile.hasGuardian || false,
      },
      
      // Center information
      centerId: body.selectedCenter.id,
      
      // Course information
      courseId: body.selectedCourse.id,
      
      // Payment information
      payment: {
        amount: body.paymentPlan.initialDeposit,
        courseFee: body.selectedCourse.paymentInfo?.lumpSumFee || body.selectedCourse.paymentInfo?.maxFee,
        numberOfInstallments: body.paymentPlan.duration,
        paymentPlan: 'installment',
        paymentType: 'monthly',
        paymentMethod: 'paystack',
        paymentReference: body.paymentReference,
        installments: body.paymentPlan.installments.map((inst: any) => ({
          title: inst.title,
          date: inst.date,
          amount: inst.amount,
          status: inst.status,
        })),
      },
    };

    // Submit to backend API
    const apiBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!apiBaseUrl) {
      console.error("❌ API_BASE_URL is not configured");
      return NextResponse.json(
        { 
          error: 'API server not configured',
          message: 'Please set API_BASE_URL in your .env.local file (e.g., API_BASE_URL=http://localhost:8000)'
        },
        { status: 500 }
      );
    }

    // Step 1: Verify payment with Paystack BEFORE creating student
    const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
    
    if (paystackSecretKey) {
      try {
        const verifyResponse = await fetch(
          `https://api.paystack.co/transaction/verify/${paymentReference}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${paystackSecretKey}`,
            },
          }
        );

        const verifyData = await verifyResponse.json();

        if (!verifyResponse.ok || !verifyData.status || verifyData.data.status !== 'success') {
          console.error("❌ Payment verification failed:", verifyData);
          return NextResponse.json(
            { 
              error: 'Payment verification failed',
              message: 'The payment could not be verified. Please ensure the payment was successful before submitting.',
              details: verifyData.message || 'Payment not found or not successful'
            },
            { status: 400 }
          );
        }
      } catch (verifyError: any) {
        console.error("❌ Error verifying payment:", verifyError);
        return NextResponse.json(
          { 
            error: 'Payment verification error',
            message: 'Could not verify payment with Paystack. Please try again or contact support.',
            details: verifyError.message
          },
          { status: 500 }
        );
      }
    } else {
      console.warn("⚠️ PAYSTACK_SECRET_KEY not configured, skipping payment verification");
    }

    // Step 2: Create a promise for this request to prevent duplicates
    const submissionPromise = (async () => {
      const response = await fetch(`${apiBaseUrl}/students/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      }).catch((fetchError: any) => {
      console.error("❌ Connection error:", {
        message: fetchError.message,
        code: fetchError.cause?.code,
        apiBaseUrl: apiBaseUrl,
      });
      
      // Check if it's a connection refused error
      if (fetchError.cause?.code === 'ECONNREFUSED' || fetchError.message.includes('ECONNREFUSED')) {
        throw new Error(
          `Cannot connect to backend API at ${apiBaseUrl}. ` +
          `The backend server appears to be offline. ` +
          `Please start your backend server and ensure it's running on the correct port.`
        );
      }
      
        throw new Error(
          `Failed to submit onboarding data: ${fetchError.message || 'Unknown error'}`
        );
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to submit onboarding data' }));
        console.error("❌ Backend API error:", {
          status: response.status,
          statusText: response.statusText,
          error: error,
        });
        throw new Error(error.message || error.error || 'Failed to submit onboarding data');
      }

      const data = await response.json();

      return data;
    })();

    // Store the promise to prevent duplicate requests
    inFlightRequests.set(paymentReference, submissionPromise);

    try {
      const data = await submissionPromise;
      
      // Remove from in-flight requests after completion
      inFlightRequests.delete(paymentReference);
      
      return NextResponse.json({
        success: true,
        data: data,
      });
    } catch (error: any) {
      // Remove from in-flight requests on error
      inFlightRequests.delete(paymentReference);
      throw error;
    }
  } catch (error: any) {
    console.error('❌ Onboarding submission error:', error);
    const errorMessage = error.message || 'Failed to submit onboarding data';
    
    // Provide helpful error message
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Cannot connect')) {
      return NextResponse.json(
        { 
          error: errorMessage,
          hint: 'Make sure your backend API server is running and API_BASE_URL is correctly set in .env.local'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

