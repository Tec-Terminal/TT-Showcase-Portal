import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const apiBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://your-api-domain.com';

    if (apiBaseUrl === 'https://your-api-domain.com') {
      return NextResponse.json(
        { error: 'API_BASE_URL is not configured. Please set API_BASE_URL in your environment variables.' },
        { status: 500 }
      );
    }

    const response = await fetch(`${apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      let errorMessage = 'Login failed';
      if (isJson) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
        }
      } else {
        try {
          const text = await response.text();
          if (text.includes('<html>') || text.includes('<!DOCTYPE')) {
            errorMessage = `Backend API returned an error page. Please check that ${apiBaseUrl} is accessible and the /auth/login endpoint exists.`;
          } else {
            errorMessage = text || errorMessage;
          }
        } catch {
        }
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    if (!isJson) {
      return NextResponse.json(
        { error: 'Backend API returned an invalid response format' },
        { status: 500 }
      );
    }

    const data = await response.json();

    if (!data.accessToken || !data.refreshToken) {
      return NextResponse.json(
        { error: 'Invalid response from server: tokens missing' },
        { status: 500 }
      );
    }

    const emailVerified = data.emailverified !== undefined 
      ? Boolean(data.emailverified) 
      : (data.emailVerified !== undefined ? Boolean(data.emailVerified) : false);
    
    const userEmail = data.email || email;

    if (!emailVerified) {
      return NextResponse.json(
        { 
          error: 'Email not verified. Please verify your email before logging in.',
          email: userEmail,
          emailVerified: false
        },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set('accessToken', data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    cookieStore.set('refreshToken', data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    const userData = {
      id: data.id,
      email: userEmail,
      fullName: data.fullName || data.name || data.userName || '',
      emailVerified: emailVerified,
    };

    // Store user data in a cookie for persistence (non-httpOnly so client can read it)
    if (userData.fullName) {
      cookieStore.set('userInfo', JSON.stringify(userData), {
        httpOnly: false, // Allow client-side access
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return NextResponse.json({ user: userData });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
