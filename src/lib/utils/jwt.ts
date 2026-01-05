/**
 * JWT Token Utilities
 * Helper functions to decode and extract information from JWT tokens
 */

/**
 * Decode JWT token without verification (client-side only)
 * Note: This does NOT verify the token signature. For production, always verify on the backend.
 */
export function decodeJWT(token: string): any | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) {
      return null;
    }
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

/**
 * Extract user ID from JWT token
 * Returns null if token is invalid or user ID is not found
 */
export function getUserIdFromToken(token: string | null): string | null {
  if (!token) {
    return null;
  }
  
  const decoded = decodeJWT(token);
  if (!decoded) {
    return null;
  }
  
  // Try common JWT payload fields for user ID
  return decoded.sub || decoded.userId || decoded.id || decoded.user?.id || null;
}

/**
 * Extract user email from JWT token (client-side)
 * Returns null if token is invalid or email is not found
 */
export function getEmailFromToken(token: string | null): string | null {
  if (!token) {
    return null;
  }
  
  const decoded = decodeJWT(token);
  if (!decoded) {
    return null;
  }
  
  // Try common JWT payload fields for email
  return decoded.email || decoded.userEmail || decoded.user?.email || null;
}

/**
 * Get token from API endpoint and decode it (client-side)
 * Since httpOnly cookies aren't accessible from client, we use an API endpoint
 */
export async function getDecodedTokenFromAPI(): Promise<any | null> {
  try {
    const response = await fetch('/api/auth/user-info', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    // The API returns user info, but we need the actual token to decode
    // Let's create a helper that gets the token from a new endpoint
    return null;
  } catch (error) {
    console.error('Error fetching user info:', error);
    return null;
  }
}

