"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Image from "next/image";
import Link from "next/link";
import { registerUser } from "@/lib/network";
import {
  registerSchema,
  type RegisterFormData,
} from "@/lib/validations/auth.schema";
import { AppRoutes } from "@/constants/appRoutes";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema) as any,
    defaultValues: {
      fullName: "",
      email: "",
      phone: undefined,
      password: "",
      confirmPassword: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (data, variables) => {
      const userEmail = data?.email || (data as any)?.user?.email || variables.email;
      router.push(`/verify-email?email=${encodeURIComponent(userEmail)}`);
    },
    onError: (error: Error) => {
      console.error("Registration error:", error);
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    const formattedPhone = data.phone ? `+234${data.phone.replace(/^\+234/, "")}` : undefined;
    
    registerMutation.mutate({
      email: data.email,
      password: data.password,
      fullName: data.fullName,
      phone: formattedPhone,
    });
  };

  return (
    <div className="flex min-h-screen bg-[#F9FAFB] p-4 lg:p-8">
      {/* Branding */}
      <div className="hidden lg:flex lg:w-112.5 relative rounded-4xl overflow-hidden shrink-0">
        <Image
          src="/images/signup.png"
          alt="Registration"
          fill
          className="object-contain"
          priority
        />
      </div>

      {/* Right Registration Form Section */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-160 px-3">
          <div className="bg-white w-full h-140 rounded-3xl border border-gray-100 shadow-sm p-8 lg:p-12 max-h-[90vh] overflow-y-auto custom-scroll">
            <div className="text-center mb-8">
              <h2 className="text-[28px] font-bold text-gray-900 mb-2">
                Student Registration
              </h2>
              <p className="text-gray-500 font-medium">
                Enter your details to create your account
              </p>
            </div>

            <button
              type="button"
              disabled={true}
              className="w-full flex items-center justify-center gap-3 px-4 py-1.5 border border-gray-200 rounded-xl font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-all mb-6"
            >
              <Image
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                width={18}
                height={18}
              />
              Sign up with Google
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                <span className="px-4 bg-white text-gray-400 font-bold">
                  Or Continue with
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                  Full Name*
                </label>
                <input
                  {...register("fullName")}
                  className="w-full px-4 py-1.5 text-gray-500 placeholder:text-gray-300 bg-[#F9FAFB] border border-gray-200 rounded-xl focus:border-indigo-500 outline-none transition-all"
                  placeholder="Full Name"
                />
                {errors.fullName && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                  Email Address*
                </label>
                <input
                  {...register("email")}
                  className="w-full px-4 py-1.5 text-gray-500 placeholder:text-gray-300 bg-[#F9FAFB] border border-gray-200 rounded-xl focus:border-indigo-500 outline-none transition-all"
                  placeholder="Email"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                  Phone Number*
                </label>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2 px-3 bg-[#F9FAFB] border border-gray-200 rounded-xl text-sm text-gray-500">
                    <span>🇳🇬</span> <span>+234</span>
                  </div>
                  <input
                    {...register("phone")}
                    className="flex-1 px-4 py-1.5 text-gray-500 placeholder:text-gray-300 bg-[#F9FAFB] border border-gray-200 rounded-xl focus:border-indigo-500 outline-none transition-all"
                    placeholder="80..."
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                    Password*
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      {...register("password")}
                      className="w-full px-4 py-1.5 pr-10 text-gray-500 placeholder:text-gray-300 bg-[#F9FAFB] border border-gray-200 rounded-xl focus:border-indigo-500 outline-none transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
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
                <div>
                  <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                    Confirm Password*
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      {...register("confirmPassword")}
                      className="w-full px-4 py-1.5 pr-10 text-gray-500 placeholder:text-gray-300 bg-[#F9FAFB] border border-gray-200 rounded-xl focus:border-indigo-500 outline-none transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
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
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 py-2">
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4 text-indigo-600 rounded border-gray-300"
                  required
                />
                <span className="text-xs text-gray-500 leading-normal">
                  I accept the{" "}
                  <Link
                    href="#"
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="#"
                    className="text-indigo-600 font-semibold hover:underline"
                  >
                    Privacy Policy
                  </Link>
                  .
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || registerMutation.isPending}
                className="w-full bg-[#7C3AED] text-white py-3 rounded-xl font-bold hover:bg-[#6D28D9] shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting || registerMutation.isPending
                  ? "Creating Account..."
                  : "Sign up for free"}
              </button>
              {registerMutation.isError && (
                <p className="mt-2 text-xs text-red-500 text-center">
                  {registerMutation.error?.message || "Registration failed. Please try again."}
                </p>
              )}
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500 font-medium">
                Got an account?{" "}
                <Link
                  href={AppRoutes.LOGIN}
                  className="text-[#7C3AED] font-bold hover:underline ml-1"
                >
                  Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
