import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Google OAuth Callback API Route Handler
// This route stores the tokens from the OAuth callback in httpOnly cookies
export async function POST(request: NextRequest) {
  try {
    const { userId, email, accessToken, refreshToken } = await request.json();

    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { error: 'Access token and refresh token are required' },
        { status: 400 }
      );
    }

    // Set cookies
    const cookieStore = await cookies();
    cookieStore.set('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    cookieStore.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json({ 
      success: true,
      message: 'Authentication successful',
      user: {
        id: userId,
        email: email,
      }
    });
  } catch (error: any) {
    console.error('Google callback error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

