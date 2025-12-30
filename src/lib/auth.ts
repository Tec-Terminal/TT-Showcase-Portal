import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { apiClient } from './api/client';

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;
  return token || null;
}

export async function requireAuth() {
  const token = await getAuthToken();
  if (!token) {
    redirect('/auth/login');
  }
  return token;
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getAuthToken();
  return !!token;
}

/**
 * Decodes JWT token to extract user email
 */
async function getUserEmailFromToken(): Promise<string | null> {
  try {
    const token = await getAuthToken();
    if (!token) {
      return null;
    }

    // Decode JWT token (without verification since we trust our own tokens)
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    // Use Buffer which is available in Node.js environment
    const buffer = Buffer.from(base64, 'base64');
    const jsonPayload = buffer.toString('utf-8');
    const decoded = JSON.parse(jsonPayload);
    
    return decoded.email || decoded.userEmail || decoded.sub || null;
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    return null;
  }
}

/**
 * Checks if the authenticated user has a student profile and has completed onboarding.
 * Uses GET /students/my-profile endpoint which extracts user ID from JWT token.
 * Returns an object with hasStudentProfile and onboardingCompleted flags.
 */
export async function checkStudentProfileStatus(): Promise<{
  hasStudentProfile: boolean;
  onboardingCompleted: boolean;
}> {
  try {
    // Check if we have a token first
    const token = await getAuthToken();
    
    const response = await apiClient('/students/my-profile');
    
    // Handle response that might be wrapped in 'data' property
    const data = response.data || response;
    
    // hasStudentProfile is at the top level
    const hasStudentProfile = data.hasStudentProfile === true || 
                             data.hasStudentProfile === 'true' ||
                             data.hasStudentProfile === 1;
    
    // onboardingCompleted is inside the student object (when student exists)
    const onboardingCompleted = data.student?.onboardingCompleted === true || 
                                data.student?.onboardingCompleted === 'true' ||
                                data.student?.onboardingCompleted === 1;
    
    return {
      hasStudentProfile,
      onboardingCompleted,
    };
  } catch (error: any) {
    console.error('❌ Error checking student profile status:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      stack: error.stack,
    });
    
    // If endpoint returns 401, user is not authenticated - redirect to login
    if (error.status === 401) {
      redirect('/auth/login');
      // This will never be reached, but TypeScript needs it
      return {
        hasStudentProfile: false,
        onboardingCompleted: false,
      };
    }
    
    // If endpoint returns 404 or 403, user doesn't have a student profile
    if (error.status === 404 || error.status === 403) {
      return {
        hasStudentProfile: false,
        onboardingCompleted: false,
      };
    }
    
    // For other errors, log and assume no profile
    return {
      hasStudentProfile: false,
      onboardingCompleted: false,
    };
  }
}

/**
 * Requires authentication and checks if user has a student profile and has completed onboarding.
 * Redirects to login if not authenticated, or onboarding if no profile or onboarding not completed.
 */
export async function requireAuthAndProfile() {
  const token = await requireAuth(); // This will redirect to login if not authenticated
  
  // Check student profile status using the new endpoint
  const profileStatus = await checkStudentProfileStatus();
  
  // Redirect to onboarding if user doesn't have a student profile OR hasn't completed onboarding
  if (!profileStatus.hasStudentProfile || !profileStatus.onboardingCompleted) {
    redirect('/onboarding');
  }
  
  return token;
}

