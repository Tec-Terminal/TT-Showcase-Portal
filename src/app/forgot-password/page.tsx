"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Image from "next/image";
import { forgotPassword } from "@/lib/network";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/validations/auth.schema";
import { AppRoutes } from "@/constants/appRoutes";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: ({ email }: ForgotPasswordFormData) => forgotPassword(email),
    onSuccess: () => {
      setSuccess(true);
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    forgotPasswordMutation.mutate(data);
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

      {/* Forgot Password Form */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-160 px-4">
          <div className="bg-white w-full h-auto rounded-2xl border border-gray-100 shadow-sm p-10">
            {success ? (
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
                    Check Your Email
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    If an account with that email exists, a password reset link
                    has been sent. Please check your email and click the link to
                    reset your password.
                  </p>
                  <p className="text-xs text-gray-500 mb-6">
                    The link will expire in 1 hour.
                  </p>
                </div>
                <a
                  href={AppRoutes.LOGIN}
                  className="inline-block text-[#6366F1] font-semibold hover:underline mb-4"
                >
                  Back to Login
                </a>
              </div>
            ) : (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    Forgot Password?
                  </h2>
                  <p className="text-sm text-gray-500">
                    Enter your email address and we'll send you a link to reset
                    your password.
                  </p>
                </div>

                {forgotPasswordMutation.isError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 mb-6">
                    <p className="text-sm">
                      {forgotPasswordMutation.error?.message ||
                        "An error occurred. Please try again."}
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
                      placeholder="Enter your email"
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting || forgotPasswordMutation.isPending}
                    className="w-full bg-[#6366F1] text-white py-3 rounded-xl font-bold hover:bg-[#4F46E5] shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting || forgotPasswordMutation.isPending
                      ? "Sending..."
                      : "Send Reset Link"}
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

