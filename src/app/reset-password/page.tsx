"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Image from "next/image";
import { resetPassword } from "@/lib/network";
import { resetPasswordSchema, type ResetPasswordFormData } from "@/lib/validations/auth.schema";
import { AppRoutes } from "@/constants/appRoutes";

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      setError("Invalid reset link. Please request a new password reset.");
    } else {
      setToken(tokenParam);
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: yupResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const newPassword = watch("newPassword");

  const resetPasswordMutation = useMutation({
    mutationFn: ({ newPassword }: ResetPasswordFormData) => {
      if (!token) {
        throw new Error("Invalid reset link. Please request a new password reset.");
      }
      return resetPassword(token, newPassword);
    },
    onSuccess: () => {
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push(AppRoutes.LOGIN);
      }, 3000);
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
      return;
    }
    resetPasswordMutation.mutate(data);
  };

  if (success) {
    return (
      <div className="flex min-h-screen bg-[#F9FAFB] p-4 lg:p-8">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-160 px-4">
            <div className="bg-white w-full h-auto rounded-2xl border border-gray-100 shadow-sm p-10">
              <div className="text-center">
                <div className="mb-6">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <svg
                      className="w-8 h-8 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Password Reset Successful!
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Your password has been reset successfully. You can now log in
                    with your new password.
                  </p>
                  <p className="text-xs text-gray-500 mb-6">
                    Redirecting to login page...
                  </p>
                </div>
                <a
                  href={AppRoutes.LOGIN}
                  className="inline-block text-[#6366F1] font-semibold hover:underline"
                >
                  Go to Login
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!token || error) {
    return (
      <div className="flex min-h-screen bg-[#F9FAFB] p-4 lg:p-8">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-160 px-4">
            <div className="bg-white w-full h-auto rounded-2xl border border-gray-100 shadow-sm p-10">
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
                    Invalid Reset Link
                  </h2>
                  <p className="text-sm text-gray-600 mb-6">
                    {error ||
                      "The password reset link is invalid or has expired. Please request a new password reset."}
                  </p>
                </div>
                <a
                  href={AppRoutes.FORGOT_PASSWORD}
                  className="inline-block text-[#6366F1] font-semibold hover:underline mb-4"
                >
                  Request New Reset Link
                </a>
                <div>
                  <a
                    href={AppRoutes.LOGIN}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Back to Login
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

      {/* Reset Password Form */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-160 px-4">
          <div className="bg-white w-full h-auto rounded-2xl border border-gray-100 shadow-sm p-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Reset Your Password
              </h2>
              <p className="text-sm text-gray-500">
                Please enter your new password below.
              </p>
            </div>

            {resetPasswordMutation.isError && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 mb-6">
                <p className="text-sm">
                  {resetPasswordMutation.error?.message ||
                    "An error occurred. Please try again."}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* New Password */}
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-2">
                  New Password
                </label>
                <input
                  {...register("newPassword")}
                  type="password"
                  className="w-full px-4 py-1.5 text-gray-700 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-300"
                  placeholder="Enter new password"
                />
                {errors.newPassword && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.newPassword.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  {...register("confirmPassword")}
                  type="password"
                  className="w-full px-4 py-1.5 text-gray-700 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-gray-300"
                  placeholder="Confirm new password"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting || resetPasswordMutation.isPending}
                className="w-full bg-[#6366F1] text-white py-3 rounded-xl font-bold hover:bg-[#4F46E5] shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting || resetPasswordMutation.isPending
                  ? "Resetting..."
                  : "Reset Password"}
              </button>
            </form>

            {/* Back to Login */}
            <div className="mt-6 text-center">
              <a
                href={AppRoutes.LOGIN}
                className="text-sm text-[#6366F1] font-semibold hover:underline"
              >
                Back to Login
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordPageContent />
    </Suspense>
  );
}

