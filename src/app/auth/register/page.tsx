"use client";

import { useState, useEffect } from "react";
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
import { EyeIcon, EyeOffIcon } from "lucide-react";

const RegistrationPage = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema) as any,
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: undefined,
      password: "",
      confirmPassword: "",
    },
  });

  // Watch email field to clear error when user modifies it
  const emailValue = watch("email");
  const [lastSubmittedEmail, setLastSubmittedEmail] = useState<string>("");

  // Clear error when user modifies the email field after a failed submission
  useEffect(() => {
    if (
      registrationError &&
      emailValue &&
      emailValue !== lastSubmittedEmail &&
      lastSubmittedEmail
    ) {
      setRegistrationError(null);
    }
  }, [emailValue, registrationError, lastSubmittedEmail]);

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: (data, variables) => {
      const userEmail =
        data?.email || (data as any)?.user?.email || variables.email;
      setRegistrationError(null);
      router.push(`/verify-email?email=${encodeURIComponent(userEmail)}`);
    },
    onError: (error: Error) => {
      console.error("Registration error:", error);
      setRegistrationError(error.message || "Registration failed. Please try again.");
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    // Clear any previous errors and track submitted email
    setRegistrationError(null);
    setLastSubmittedEmail(data.email);
    const formattedPhone = data.phone
      ? `0${data.phone.replace(/^\0/, "")}`
      : undefined;
    registerMutation.mutate({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: formattedPhone,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        {/* Branding */}
        <div className="relative w-full md:w-1/2 min-h-125 flex flex-col justify-between p-8 md:p-12 text-white">
          <div
            className="absolute inset-0 z-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/images/register-image.jpeg')" }}
          >
            <div className="absolute inset-0 bg-indigo-900/40 mix-blend-multiply"></div>
          </div>

          {/* Logo */}
          <div className="relative z-10">
            <Image
              src="/images/Auth-Logo.png"
              alt="TT Showcase Logo"
              width={180}
              height={60}
              className="h-10 w-auto"
              priority
            />
          </div>

          {/* Content */}
          <div className="relative z-10 mb-12">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-4">
              Start Your <br /> Journey Today
            </h1>
            <p className="text-lg text-gray-100 max-w-md leading-relaxed">
              Join the TT Showcase Student Portal to access world-class
              resources, mentorship, and opportunities designed to elevate your
              career.
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
                Student Registration
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Enter your details to create your account
              </p>
            </div>

            {/* Google Sign Up */}
            <button className="w-full hidden items-center justify-center gap-2 border border-gray-300 rounded-lg py-2.5 px-4 text-gray-700 font-medium hover:bg-gray-50 transition-colors mb-6">
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-5 h-5"
              />
              Sign up with Google
            </button>

            <div className="relative hidden items-center mb-6">
              <div className="grow border-t border-gray-200"></div>
              <span className="shrink mx-4 text-gray-400 text-sm">
                Or Continue with
              </span>
              <div className="grow border-t border-gray-200"></div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-10">
              {/* Registration Error Alert */}
              {registrationError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  <p className="font-semibold">Registration Error</p>
                  <p>{registrationError}</p>
                </div>
              )}

              {/* First Name and Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">
                    First Name*
                  </label>
                  <input
                    {...register("firstName")}
                    type="text"
                    placeholder="First Name"
                    className="w-full px-4 py-2 text-gray-600 placeholder:text-gray-400 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.firstName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">
                    Last Name*
                  </label>
                  <input
                    {...register("lastName")}
                    type="text"
                    placeholder="Last Name"
                    className="w-full px-4 py-2 text-gray-600 placeholder:text-gray-400 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-xs text-red-500">
                      {errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">
                  Email*
                </label>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="Email"
                  className={`w-full px-4 py-2 text-gray-600 placeholder:text-gray-400 border rounded-lg focus:ring-2 outline-none ${
                    errors.email ||
                    (registrationError &&
                      (registrationError.toLowerCase().includes("email") ||
                        registrationError
                          .toLowerCase()
                          .includes("already exists") ||
                        registrationError.toLowerCase().includes("duplicate") ||
                        registrationError.toLowerCase().includes("taken")))
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-300 focus:ring-indigo-500"
                  }`}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">
                    {errors.email.message}
                  </p>
                )}
                {registrationError &&
                  (registrationError.toLowerCase().includes("email") ||
                    registrationError
                      .toLowerCase()
                      .includes("already exists") ||
                    registrationError.toLowerCase().includes("duplicate") ||
                    registrationError.toLowerCase().includes("taken")) &&
                  !errors.email && (
                    <p className="mt-1 text-xs text-red-500">
                      {registrationError}
                    </p>
                  )}
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">
                  Phone Number*
                </label>
                <div className="flex border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                  <div className="flex items-center gap-1 bg-gray-50 px-3 border-r border-gray-300">
                    <span className="text-sm text-gray-600">🇳🇬</span>
                    <span className="text-gray-600 text-sm">+234</span>
                  </div>
                  <input
                    {...register("phone")}
                    type="tel"
                    placeholder="800 123 4567"
                    className="w-full px-4 py-2 text-gray-600 placeholder:text-gray-400 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">
                  Password*
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register("password")}
                    placeholder="Create a strong password"
                    className="w-full px-4 py-2 text-gray-600 placeholder:text-gray-400 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="w-4 h-4" />
                    ) : (
                      <EyeIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-[10px] text-red-500">
                    {errors.password.message}
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  Must contain at least 8 characters
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-700">
                  Confirm Password*
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    {...register("confirmPassword")}
                    placeholder="Confirm a strong password"
                    className="w-full px-4 py-2 text-gray-600 placeholder:text-gray-400 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOffIcon className="w-4 h-4" />
                    ) : (
                      <EyeIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-[10px] text-red-500">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex items-start gap-2 py-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  I accept the{" "}
                  <a href="#" className="text-indigo-600 underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-indigo-600 underline">
                    Privacy Policy
                  </a>
                  .
                </label>
              </div>

              <button
                type="submit"
                disabled={
                  isSubmitting || registerMutation.isPending || !termsAccepted
                }
                className="w-full bg-[#6344E7] text-white py-3 rounded-xl font-semibold hover:bg-[#5235c9] transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#6344E7]"
              >
                {isSubmitting || registerMutation.isPending
                  ? "Creating Account..."
                  : "Sign up for free"}
              </button>

              <p className="text-center text-sm text-gray-600 mt-4">
                Got an account?{" "}
                <Link
                  href={AppRoutes.LOGIN}
                  className="text-[#6344E7] font-bold"
                >
                  Login
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPage;
