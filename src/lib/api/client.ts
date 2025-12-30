import { cookies } from 'next/headers';

const API_BASE_URL = process.env.API_BASE_URL;

export async function apiClient(
  endpoint: string,
  options: RequestInit = {}
) {
  const cookieStore = await cookies();
  const token = cookieStore.get('accessToken')?.value;

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  // Handle token refresh on 401
  if (response.status === 401) {
    try {
      const newToken = await refreshAccessToken();
      // Retry request with new token
      return fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newToken}`,
          ...options.headers,
        },
      }).then((res) => {
        if (!res.ok) {
          const error = new Error('API request failed');
          (error as any).status = res.status;
          (error as any).statusText = res.statusText;
          throw error;
        }
        return res.json();
      });
    } catch (error: any) {
      // If refresh fails, mark as 401 so it gets handled as authentication error
      const authError = new Error(error.message || 'Authentication failed');
      (authError as any).status = 401;
      (authError as any).statusText = 'Unauthorized';
      throw authError;
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'API request failed' }));
    const errorMessage = error.message || 'API request failed';
    // Include status code in error for better handling
    const errorWithStatus = new Error(errorMessage);
    (errorWithStatus as any).status = response.status;
    (errorWithStatus as any).statusText = response.statusText;
    throw errorWithStatus;
  }

  return response.json();
}

export async function refreshAccessToken() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refreshToken')?.value;

    if (!refreshToken) {
      throw new Error('No refresh token');
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshToken}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      cookieStore.set('accessToken', data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });

      return data.accessToken;
    }

    throw new Error('Token refresh failed');
  } catch (error) {
    // Clear cookies and redirect to login
    const cookieStore = await cookies();
    cookieStore.delete('accessToken');
    cookieStore.delete('refreshToken');
    throw error;
  }
}

