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
import Link from "next/link";

const LoginPageContent = () => {
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

      if (emailVerified !== false && email) {
        router.push("/dashboard");
      }
    },
    onError: (error: Error) => {
      console.error("Error details:", JSON.stringify(error, null, 2));

      // Check if error is about email not being verified
      if (error instanceof EmailNotVerifiedError) {
        const email = error.email || "";
        if (email) {
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        } else {
          router.push("/verify-email");
        }
      } else {
        const errorMessage = error.message?.toLowerCase() || "";
        if (
          errorMessage.includes("email not verified") ||
          errorMessage.includes("verify your email")
        ) {
          router.push("/verify-email");
        }
      }
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    loginMutation.mutate({ email: data.email, password: data.password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        {/*Branding */}
        <div className="relative w-full md:w-1/2 min-h-125 flex flex-col justify-between p-8 md:p-12 text-white">
          <div
            className="absolute inset-0 z-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/images/login-image.jpeg')" }}
          >
            <div className="absolute inset-0 bg-indigo-900/50 mix-blend-multiply"></div>
          </div>

          {/* Logo */}
          <div className="relative z-10">
            <Link href="/">
              <Image
                src="/images/Auth-Logo.png"
                alt="TT Showcase Logo"
                width={180}
                height={60}
                className="h-10 w-auto"
                priority
              />
            </Link>
          </div>

          {/* Content */}
          <div className="relative z-10 mb-12">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-4">
              Empower Your <br /> Academic Journey
            </h1>
            <p className="text-lg text-gray-100 max-w-md leading-relaxed">
              Manage your registration payments, and course schedules in one
              secure, centralized portal.
            </p>
          </div>

          {/* Footer Text */}
          <p className="relative z-10 text-sm text-gray-200">
            2026 TecTerminal Student Portal. All rights reserved.
          </p>
        </div>

        {/* Form */}
        <div className="w-full md:w-1/2 p-8 md:p-16 bg-white flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                Welcome to your Portal
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Log in to your account
              </p>
            </div>

            {/* Google Login Error */}
            {googleError && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 mb-6">
                <p className="text-sm">{googleError}</p>
              </div>
            )}

            {/* Google Login */}
            <button className="w-full hidden items-center justify-center gap-2 border border-gray-300 rounded-lg py-2.5 px-4 text-gray-700 font-medium hover:bg-gray-50 transition-colors mb-6">
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-5 h-5"
              />
              Continue with Google
            </button>

            <div className="relative hidden items-center mb-6">
              <div className="grow border-t border-gray-200"></div>
              <span className="shrink mx-4 text-gray-400 text-sm">
                Or Continue with
              </span>
              <div className="grow border-t border-gray-200"></div>
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

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-10">
              {/* Email */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">
                  Email
                </label>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="Email"
                  className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    placeholder="•••••"
                    className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="remember"
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label
                    htmlFor="remember"
                    className="text-sm text-gray-600 cursor-pointer"
                  >
                    Remember me
                  </label>
                </div>
                <Link
                  href="/forgot-password"
                  className="text-sm text-[#6344E7] font-medium hover:underline"
                >
                  Forgot Password
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting || loginMutation.isPending}
                className="w-full bg-[#6344E7] text-white py-3 rounded-xl font-semibold hover:bg-[#5235c9] transition-all shadow-lg shadow-indigo-100 mt-2"
              >
                {isSubmitting || loginMutation.isPending
                  ? "Logging in..."
                  : "Log in"}
              </button>

              {/* Apply Now */}
              <p className="text-center text-sm text-gray-600 mt-6">
                Not a current student or applicant?{" "}
                <Link
                  href={AppRoutes.REGISTER}
                  className="text-[#6344E7] font-bold hover:underline"
                >
                  Apply Now
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen bg-[#F9FAFB] items-center justify-center">
          <div className="text-center">
            <div className="mb-4">
              <div className="mx-auto w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Loading...</h2>
          </div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
