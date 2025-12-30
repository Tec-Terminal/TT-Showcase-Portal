import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const apiBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://your-api-domain.com';

    // Validate that API_BASE_URL is configured
    if (apiBaseUrl === 'https://your-api-domain.com') {
      return NextResponse.json(
        { error: 'API_BASE_URL is not configured. Please set API_BASE_URL in your environment variables.' },
        { status: 500 }
      );
    }

    const response = await fetch(`${apiBaseUrl}/auth/resend-verification-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    // Check content type before parsing
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      // Try to parse error response as JSON, fallback to text
      let errorMessage = 'Failed to resend verification email';
      if (isJson) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use default message
        }
      } else {
        // If response is HTML or other format, get text
        try {
          const text = await response.text();
          if (text.includes('<html>') || text.includes('<!DOCTYPE')) {
            errorMessage = `Backend API returned an error page. Please check that ${apiBaseUrl} is accessible.`;
          } else {
            errorMessage = text || errorMessage;
          }
        } catch {
          // Use default message if text parsing fails
        }
      }

      // If email is already verified, return success message instead of error
      if (
        response.status === 400 &&
        (errorMessage.toLowerCase().includes('already verified') ||
         errorMessage.toLowerCase().includes('email is already verified'))
      ) {
        return NextResponse.json(
          { message: 'Email is already verified. You can now log in.', alreadyVerified: true },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    // Parse successful response
    if (!isJson) {
      return NextResponse.json(
        { error: 'Backend API returned an invalid response format' },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Resend verification email error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

