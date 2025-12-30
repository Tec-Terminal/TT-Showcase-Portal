import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName, phone } = await request.json();

    const apiBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://your-api-domain.com';

    // Validate that API_BASE_URL is configured
    if (apiBaseUrl === 'https://your-api-domain.com') {
      return NextResponse.json(
        { error: 'API_BASE_URL is not configured. Please set API_BASE_URL in your environment variables.' },
        { status: 500 }
      );
    }

    const response = await fetch(`${apiBaseUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, fullName, phone }),
    });

    // Check content type before parsing
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      // Try to parse error response as JSON, fallback to text
      let errorMessage = 'Registration failed';
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
          // If it's HTML, provide a more helpful error
          if (text.includes('<html>') || text.includes('<!DOCTYPE')) {
            errorMessage = `Backend API returned an error page. Please check that ${apiBaseUrl} is accessible and the /auth/register endpoint exists.`;
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

    // Registration response does not include tokens - user must verify email first
    // Return user data only (email, id, etc.)
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

