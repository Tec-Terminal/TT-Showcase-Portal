const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export async function clientApiClient(
  endpoint: string,
  options: RequestInit = {}
) {
  try {
    const response = await fetch(`/api/proxy${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        message: `API request failed with status ${response.status}` 
      }));
      const errorMessage = error.message || error.error || `API request failed with status ${response.status}`;
      console.error(`API Error (${response.status}):`, errorMessage, 'Endpoint:', endpoint);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Network error: Failed to connect to the server');
  }
}

