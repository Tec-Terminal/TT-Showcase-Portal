'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useRequireAuth() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check authentication status using lightweight auth check endpoint
        const response = await fetch('/api/auth/check', {
          method: 'GET',
          credentials: 'include',
        });

        const data = await response.json();

        if (response.ok && data.authenticated) {
          setIsAuthenticated(true);
        } else {
          // If not authenticated, redirect to login
          router.push('/auth/login');
        }
      } catch (error) {
        // On error, redirect to login
        router.push('/auth/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  return { isLoading, isAuthenticated };
}

