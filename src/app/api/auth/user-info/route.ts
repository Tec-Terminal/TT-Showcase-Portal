import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;

    if (!token) {
      console.log('❌ No access token found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // First, check if user info is stored in cookie (from login)
    const userInfoCookie = cookieStore.get('userInfo')?.value;
    if (userInfoCookie) {
      try {
        const storedUserInfo = JSON.parse(userInfoCookie);
        if (storedUserInfo.fullName) {
          console.log('✅ Found user info in cookie:', storedUserInfo);
          return NextResponse.json({ user: storedUserInfo });
        }
      } catch (error) {
        console.log('⚠️ Error parsing userInfo cookie:', error);
      }
    }

    console.log('✅ Token found, decoding...');

    // Decode JWT token (server-side compatible)
    let decoded: any;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.log('❌ Invalid token format');
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }

      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const buffer = Buffer.from(base64, 'base64');
      const jsonPayload = buffer.toString('utf-8');
      decoded = JSON.parse(jsonPayload);

      console.log('📋 Decoded token payload:', decoded);
    } catch (decodeError) {
      console.error('❌ Error decoding token:', decodeError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Extract user ID from token
    const userId = decoded.sub || decoded.userId || decoded.id || decoded.user?.id || null;
    // Only use email fields, never fallback to sub (which is user ID)
    const userEmail = decoded.email || decoded.userEmail || null;

    // First, try to get user info from token
    let userInfo = {
      email: userEmail,
      fullName: decoded.fullName || decoded.name || decoded.userName || null,
      firstName: decoded.firstName || null,
      lastName: decoded.lastName || null,
    };

    // If we have firstName and lastName but no fullName, construct it
    if (!userInfo.fullName && userInfo.firstName && userInfo.lastName) {
      userInfo.fullName = `${userInfo.firstName} ${userInfo.lastName}`;
    }

    // If we still don't have a name, try common backend endpoints
    if (!userInfo.fullName && userId && API_BASE_URL) {
      const endpointsToTry = [
        `/users/${userId}`,
        `/users/me`,
        `/auth/me`,
        `/auth/user`,
      ];

      for (const endpoint of endpointsToTry) {
        try {
          console.log(`🌐 Trying backend endpoint: ${endpoint}`);
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const userData = await response.json();
            console.log(`✅ User data from ${endpoint}:`, userData);
            
            // Try to extract name from various possible structures
            const extractedName = userData.fullName || userData.name || userData.userName || 
                                 userData.user?.fullName || userData.user?.name || 
                                 (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : null);
            
            if (extractedName) {
              userInfo.fullName = extractedName;
              userInfo.firstName = userData.firstName || userData.user?.firstName || userInfo.firstName;
              userInfo.lastName = userData.lastName || userData.user?.lastName || userInfo.lastName;
              break; // Found it, stop trying other endpoints
            }
          } else {
            console.log(`⚠️ ${endpoint} returned:`, response.status);
          }
        } catch (error) {
          console.log(`⚠️ Error calling ${endpoint}:`, error);
        }
      }
    }

    console.log('✅ Final user info:', userInfo);
    return NextResponse.json({ user: userInfo });
  } catch (error) {
    console.error('❌ Error getting user info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

