"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Image from "next/image";
import { loginUser, EmailNotVerifiedError } from "@/lib/network";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth.schema";
import { AppRoutes } from "@/constants/appRoutes";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [verifiedMessage, setVerifiedMessage] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      setVerifiedMessage("Email verified successfully! You can now log in.");
      router.replace("/auth/login");
    }

    // Check for error parameters
    const error = searchParams.get("error");
    if (error === "email_not_verified") {
      setVerifiedMessage(
        "Please verify your email before accessing the dashboard. Check your inbox for the verification link."
      );
    } else if (error === "forbidden") {
      setVerifiedMessage(
        "Your email needs to be verified to access the dashboard. Please check your inbox for the verification link. If you didn't receive it, you can register again or contact support."
      );
    } else if (error === "unauthorized") {
      setVerifiedMessage("Your session has expired. Please log in again.");
    } else if (error === "api_error") {
      setVerifiedMessage("An error occurred. Please try again.");
    }
  }, [searchParams, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (data) => {

      // Also log to sessionStorage so it persists across redirects
      try {
        sessionStorage.setItem("lastLoginResponse", JSON.stringify(data));
        sessionStorage.setItem("lastLoginTime", new Date().toISOString());
      } catch (e) {
        console.warn("Could not save login response to sessionStorage:", e);
      }

      // Check if email is verified
      const user = data?.user;
      const emailVerified = (user as any)?.emailVerified;
      const email = user?.email;

      // If email is verified, redirect to dashboard
      // The dashboard will handle the profile/onboarding check server-side
      if (emailVerified !== false && email) {
        // Redirect to dashboard - it will check profile status server-side
        // This is more reliable than checking client-side immediately after login
        router.push("/dashboard");
      }
    },
    onError: (error: Error) => {
      console.error("Error details:", JSON.stringify(error, null, 2));
      
      // Check if error is about email not being verified
      if (error instanceof EmailNotVerifiedError) {
        // Redirect to verify-email page with the email parameter
        const email = error.email || '';
        if (email) {
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        } else {
          router.push("/verify-email");
        }
      } else {
        const errorMessage = error.message?.toLowerCase() || '';
        if (errorMessage.includes('email not verified') || errorMessage.includes('verify your email')) {
          // Fallback: redirect to verify-email page if error message suggests email verification
          router.push("/verify-email");
        }
      }
    },
  });


  const onSubmit = async (data: LoginFormData) => {
    loginMutation.mutate({ email: data.email, password: data.password });
  };

  return (
    <div className="flex min-h-screen bg-[#F9FAFB] p-4 lg:p-8">
      {/* Branding */}
      <div className="hidden lg:flex lg:w-100 relative rounded-3xl overflow-hidden shrink-0">
        <div className="absolute inset-0">
          <Image
            src="/images/login.png"
            alt="Students"
            fill
            className="object-contain"
            priority
          />
          <div className="absolute inset-0 bg-[#3B2A82]/0"></div>
        </div>
      </div>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-160 px-4">
          <div className="bg-white w-full h-130 overflow-y-auto custom-scroll rounded-2xl border border-gray-100 shadow-sm p-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Welcome to your Portal
              </h2>
              <p className="text-sm text-gray-500">Log in to your account</p>
            </div>

            {/* Google Login Error */}
            {googleError && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 mb-6">
                <p className="text-sm">{googleError}</p>
              </div>
            )}

            {/* Google Login */}
            <button
              type="button"
              onClick={() => {
                const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
                if (!apiBaseUrl) {
                  setGoogleError('Google login is not configured. Please set NEXT_PUBLIC_API_BASE_URL in your environment variables.');
                  return;
                }
                setGoogleError(null);
                // Redirect to backend Google login endpoint
                window.location.href = `${apiBaseUrl}/api/auth/google/login`;
              }}
              disabled={true}
              className="w-full flex items-center justify-center gap-3 px-4 py-1.5 border border-gray-200 rounded-xl font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all mb-6"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-[12px] uppercase tracking-wider">
                <span className="px-4 bg-white text-gray-400 font-medium">
                  Or Continue with
                </span>
              </div>
            </div>

            {verifiedMessage && (
              <div
                className={`rounded-lg p-3 mb-6 ${
                  searchParams.get("error") === "forbidden"
                    ? "bg-yellow-50 border border-yellow-200 text-yellow-800"
                    : "bg-green-50 border border-green-200 text-green-800"
                }`}
              >
                <p className="text-sm">{verifiedMessage}</p>
                {searchParams.get("error") === "forbidden" && (
                  <div className="mt-3 flex gap-3">
                    <a
                      href="/register"
                      className="text-sm font-semibold text-yellow-700 hover:text-yellow-900 underline"
                    >
                      Go to Registration
                    </a>
                    <span className="text-yellow-600">or</span>
                    <a
                      href="/verify-email"
                      className="text-sm font-semibold text-yellow-700 hover:text-yellow-900 underline"
                    >
                      Resend Verification Email
                    </a>
                  </div>
                )}
              </div>
            )}

            {loginMutation.isError && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 mb-6">
                <p className="text-sm">
                  {loginMutation.error?.message ||
                    "Login failed. Please check your credentials and try again."}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  {...register("email")}
                  type="email"
                  className="w-full px-4 py-1.5 text-gray-700 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-300"
                  placeholder="Email"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    className="w-full px-4 py-1.5 pr-10 text-gray-700 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-300"
                    placeholder="•••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m13.42 13.42l-3.29-3.29M3 3l18 18"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="ml-2 text-sm text-gray-500 group-hover:text-gray-700 transition-colors">
                    Remember me
                  </span>
                </label>
                <a
                  href="/forgot-password"
                  className="text-sm text-[#6366F1] hover:underline font-medium"
                >
                  Forgot Password?
                </a>
              </div>

              {/* Login */}
              <button
                type="submit"
                disabled={isSubmitting || loginMutation.isPending}
                className="w-full bg-[#6366F1] text-white py-3 rounded-xl font-bold hover:bg-[#4F46E5] shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting || loginMutation.isPending
                  ? "Logging in..."
                  : "Log in"}
              </button>
            </form>

            {/* Apply Now */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Not a current student or applicant?{" "}
                <a
                  href={AppRoutes.REGISTER}
                  className="text-[#6366F1] font-bold hover:underline"
                >
                  Apply Now
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
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
      <LoginPageContent />
    </Suspense>
  );
}
