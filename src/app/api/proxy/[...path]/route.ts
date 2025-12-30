import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Helper to extract path from params (handles both Promise and direct access)
async function getPathFromParams(params: { path: string[] } | Promise<{ path: string[] }>): Promise<string[]> {
  const resolvedParams = await Promise.resolve(params);
  return resolvedParams.path || [];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } | Promise<{ path: string[] }> }
) {
  const path = await getPathFromParams(params);
  return handleRequest(request, path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } | Promise<{ path: string[] }> }
) {
  const path = await getPathFromParams(params);
  return handleRequest(request, path, 'POST');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } | Promise<{ path: string[] }> }
) {
  const path = await getPathFromParams(params);
  return handleRequest(request, path, 'PATCH');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } | Promise<{ path: string[] }> }
) {
  const path = await getPathFromParams(params);
  return handleRequest(request, path, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } | Promise<{ path: string[] }> }
) {
  const path = await getPathFromParams(params);
  return handleRequest(request, path, 'DELETE');
}

async function handleRequest(
  request: NextRequest,
  path: string[],
  method: string
) {
  try {
    // Validate path
    if (!path || !Array.isArray(path) || path.length === 0) {
      return NextResponse.json(
        { error: 'Invalid path parameter' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('accessToken')?.value;
    const endpoint = `/${path.join('/')}`;
    const searchParams = request.nextUrl.searchParams.toString();
    
    const apiBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
    
    if (!apiBaseUrl) {
      console.error('API_BASE_URL is not configured');
      return NextResponse.json(
        { error: 'API server not configured' },
        { status: 500 }
      );
    }
    
    const url = `${apiBaseUrl}${endpoint}${searchParams ? `?${searchParams}` : ''}`;

    let body: any = undefined;
    if (method !== 'GET' && method !== 'DELETE') {
      try {
        body = await request.json();
      } catch (e) {
        // No body or invalid JSON, continue without body
      }
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    // Debug logging for payments endpoint errors
    if (endpoint.includes('payments') && !response.ok) {
      console.error('❌ Payments endpoint error:', {
        status: response.status,
        statusText: response.statusText,
        url,
        endpoint,
      });
    }

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    let data;
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

