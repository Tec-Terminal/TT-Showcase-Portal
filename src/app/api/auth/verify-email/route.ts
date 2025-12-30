import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
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

    // Get refresh token from cookies (if user is logged in)
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refreshToken')?.value;

    // Build query params - include refreshToken if available for automatic token refresh
    const params = new URLSearchParams({ token });
    if (refreshToken) {
      params.append('refreshToken', refreshToken);
    }

    const response = await fetch(`${apiBaseUrl}/auth/verify-email?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Check content type before parsing
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      // Try to parse error response as JSON, fallback to text
      let errorMessage = 'Email verification failed';
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

    // If verification is successful and backend returns NEW tokens, set them
    // These tokens will have the updated emailVerified: true status
    if (data.accessToken && data.refreshToken) {
      cookieStore.set('accessToken', data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      cookieStore.set('refreshToken', data.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    } else {
      // If backend doesn't return tokens, clear old tokens to force fresh login
      cookieStore.delete('accessToken');
      cookieStore.delete('refreshToken');
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Verify email error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

