import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserIdFromToken } from '@/lib/utils/jwt';

/**
 * Save Lead from Onboarding (Save and Exit)
 * POST /api/onboarding/save-lead
 * 
 * This endpoint saves partial onboarding data to the leads table
 * when users click "Save and Exit" during onboarding
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Extract user ID from JWT token
    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    const userId = token ? getUserIdFromToken(token) : null;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Prepare payload for backend
    const payload = {
      ...body,
      userId, // Add userId from token
    };

    // Submit to backend API
    const apiBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!apiBaseUrl) {
      console.error("API_BASE_URL is not configured");
      return NextResponse.json(
        { 
          error: 'API server not configured',
          message: 'Please set API_BASE_URL in your .env.local file'
        },
        { status: 500 }
      );
    }

    const response = await fetch(`${apiBaseUrl}/leads/save-from-onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(payload),
    }).catch((fetchError: any) => {
      console.error("Connection error:", {
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
        `Failed to save lead: ${fetchError.message || 'Unknown error'}`
      );
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to save lead' }));
      console.error("Backend API error:", {
        status: response.status,
        statusText: response.statusText,
        error: error,
      });
      
      // Don't fail completely - still allow the user to continue
      // The lead can be created later when backend is available
      return NextResponse.json(
        { 
          error: error.message || error.error || 'Failed to save lead',
          warning: 'Lead was not saved to backend, but your progress is saved locally'
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: data,
      message: 'Lead saved successfully',
    });
  } catch (error: any) {
    console.error('Save lead error:', error);
    
    // Don't fail completely - still allow the user to continue
    // The lead can be created later when backend is available
    const errorMessage = error.message || 'Failed to save lead';
    
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Cannot connect')) {
      return NextResponse.json(
        { 
          error: errorMessage,
          warning: 'Backend server is offline. Your progress is saved locally and will be synced when backend is available.',
          hint: 'Make sure your backend API server is running and API_BASE_URL is correctly set in .env.local'
        },
        { status: 503 } // Service Unavailable
      );
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        warning: 'Lead was not saved to backend, but your progress is saved locally'
      },
      { status: 500 }
    );
  }
}

