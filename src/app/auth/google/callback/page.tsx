"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppRoutes } from "@/constants/appRoutes";

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract tokens from URL query parameters
        const userId = searchParams.get("userId");
        const email = searchParams.get("name");
        const accessToken = searchParams.get("accessToken");
        const refreshToken = searchParams.get("refreshToken");

        if (!accessToken || !refreshToken) {
          setError("Authentication failed. Missing tokens.");
          setLoading(false);
          return;
        }

        // Store tokens in httpOnly cookies via API route
        const response = await fetch("/api/auth/google/callback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            userId,
            email,
            accessToken,
            refreshToken,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          setError(
            errorData.error ||
              errorData.message ||
              "Failed to complete authentication. Please try again."
          );
          setLoading(false);
          return;
        }

        // Redirect to dashboard
        router.push(AppRoutes.DASHBOARD);
      } catch (err: any) {
        console.error("Google callback error:", err);
        setError(
          "An error occurred during authentication. Please try again."
        );
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#F9FAFB] items-center justify-center">
        <div className="text-center">
          <div className="mb-4">
            <div className="mx-auto w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Completing sign in...
          </h2>
          <p className="text-sm text-gray-500">
            Please wait while we complete your Google sign in.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-[#F9FAFB] items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10">
            <div className="text-center">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Authentication Error
                </h2>
                <p className="text-sm text-gray-600 mb-6">{error}</p>
              </div>
              <a
                href={AppRoutes.LOGIN}
                className="inline-block text-[#6366F1] font-semibold hover:underline"
              >
                Return to Login
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen bg-[#F9FAFB] items-center justify-center">
          <div className="text-center">
            <div className="mb-4">
              <div className="mx-auto w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Loading...
            </h2>
          </div>
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}

