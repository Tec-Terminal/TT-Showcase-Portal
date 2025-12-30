"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { resendVerificationEmail, verifyEmail } from "@/lib/network";

function VerifyEmailContentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email");
  const tokenParam = searchParams.get("token");

  const [email, setEmail] = useState<string>(emailParam || "");
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isVerified, setIsVerified] = useState(false);
  const [hasAttemptedVerification, setHasAttemptedVerification] = useState(false);

  useEffect(() => {
    // Update email if it changes in URL
    if (emailParam && emailParam !== email) {
      setEmail(emailParam);
    }
    
    // Auto-verify if token is present and we haven't attempted yet
    if (tokenParam && !hasAttemptedVerification && !isVerified) {
      setHasAttemptedVerification(true);
      handleVerifyEmail(tokenParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenParam, emailParam]);

  const handleVerifyEmail = async (token: string) => {
    setIsVerifying(true);
    setError("");
    try {
      // Add timeout to prevent infinite spinning
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Verification request timed out. Please try again.')), 30000);
      });
      
      // Verify email - refreshToken is automatically sent from cookies if available
      const response = await Promise.race([
        verifyEmail(token),
        timeoutPromise
      ]) as any;
      
      // Handle different response structures
      const isVerified = response.verified === true || 
                        response.success === true || 
                        response.message?.toLowerCase().includes('verified') ||
                        response.message?.toLowerCase().includes('success');
      
      if (isVerified) {
        setIsVerified(true);
        setMessage(response.message || "Email verified successfully!");
        
        // Small delay to show success message, then redirect
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // If new tokens were returned, they're already set as httpOnly cookies by the API route
        // These tokens have the updated emailVerified: true status
        if (response.accessToken && response.refreshToken) {
          // Use window.location for hard redirect to ensure it works
          window.location.href = "/dashboard";
        } else {
          // No tokens returned, redirect to email-verified page immediately
          window.location.href = "/email-verified";
        }
      } else {
        console.error('❌ Verification failed - response:', response);
        setError(response.message || response.error || "Email verification failed. Please try again.");
        setIsVerifying(false);
      }
    } catch (err: any) {
      console.error('❌ Verification error:', err);
      setError(err.message || "Verification failed. Please try again or contact support.");
      setIsVerifying(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email) {
      setError("Email address is required. Please provide your email address.");
      return;
    }
    
    setIsResending(true);
    setError("");
    setMessage("");
    setResendSuccess(false);
    
    try {
      const result = await resendVerificationEmail(email);
      
      // Check if email is already verified
      if (result.alreadyVerified || result.message?.toLowerCase().includes("already verified")) {
        setMessage("Your email is already verified! Redirecting to login...");
        setIsVerified(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push("/auth/login?verified=true");
        }, 2000);
      } else {
        setResendSuccess(true);
        setMessage(result.message || "Verification email sent successfully! Please check your inbox.");
        // Clear message after 5 seconds
        setTimeout(() => {
          setMessage("");
          setResendSuccess(false);
        }, 5000);
      }
    } catch (err: any) {
      console.error("Resend verification email error:", err);
      const errorMsg = err.message || "Failed to resend verification email. Please try again.";
      
      // Handle "already verified" as a success case (fallback if API route didn't catch it)
      if (
        errorMsg.toLowerCase().includes("already verified") ||
        errorMsg.toLowerCase().includes("email is already verified")
      ) {
        setMessage("Your email is already verified! Redirecting to login...");
        setIsVerified(true);
        // Redirect to login after 2 seconds
        setTimeout(() => {
          router.push("/auth/login?verified=true");
        }, 2000);
      } else {
        setError(errorMsg);
        // Clear error after 5 seconds
        setTimeout(() => {
          setError("");
        }, 5000);
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-sans">
      <div className="w-full px-8 py-8 lg:px-12">
        <div className="flex items-center gap-3">
          <Image
            src="/images/Logo.png"
            alt="TecTerminal"
            width={160}
            height={40}
            className="object-contain"
          />
        </div>
      </div>

      {/* Main Content Container */}
      <div className="flex-1 flex items-start justify-center px-4 pt-10">
        <div className="w-full max-w-155">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 lg:p-6">
            {/* Illustration Area */}
            <div className="flex justify-center mb-8">
              <div className="w-full bg-[#F3F4F6] rounded-2xl py-3 flex items-center justify-center">
                <Image
                  src="/images/email open.png"
                  alt="Email Icon"
                  width={80}
                  height={80}
                  className="object-contain"
                />
              </div>
            </div>

            {/* Content */}
            <div className="text-center">
              {tokenParam ? (
                // Show only loading state when token is present
                <>
                  {!error ? (
                    <>
                      <div className="flex justify-center mb-6">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7C3AED]"></div>
                      </div>
                      <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        {isVerifying ? "Verifying your email..." : "Redirecting..."}
                      </h1>
                      <p className="text-gray-500 text-sm leading-relaxed">
                        {isVerifying 
                          ? "Please wait while we verify your email address."
                          : "Please wait while we redirect you."
                        }
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-center mb-6">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </div>
                      <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        Verification Failed
                      </h1>
                      <p className="text-gray-500 text-sm leading-relaxed mb-6">
                        {error}
                      </p>
                      <div className="space-y-4">
                        <button
                          onClick={() => {
                            setError("");
                            setHasAttemptedVerification(false);
                            setIsVerifying(false);
                            if (tokenParam) {
                              handleVerifyEmail(tokenParam);
                            }
                          }}
                          className="w-full bg-[#6366F1] text-white py-3 rounded-xl font-bold hover:bg-[#5558E3] transition-all shadow-md"
                        >
                          Try Again
                        </button>
                        <Link
                          href="/verify-email"
                          className="block text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors text-center"
                        >
                          Request New Verification Link
                        </Link>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">
                    Verify your email
                  </h1>

              <div className="space-y-4 mb-10">
                <p className="text-gray-500 text-sm leading-relaxed">
                  {emailParam ? "We've sent a verification link to" : "Enter your email address to receive a verification link"}
                </p>
                {emailParam ? (
                  <p className="text-[#6366F1] font-bold text-md">
                    {email}
                  </p>
                ) : (
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2 text-left">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    />
                    <p className="mt-1 text-xs text-gray-500 text-left">
                      Enter your email to resend the verification link
                    </p>
                  </div>
                )}
                <p className="text-gray-500 text-sm leading-relaxed max-w-100 mx-auto">
                  Please click the link in that email to secure your account and
                  access the portal.
                </p>
              </div>

              {/* Info Notification */}
              {!isVerified && (
                <div className="bg-[#EEF2FF] border border-[#5558E3] rounded-xl p-5 mb-10 flex items-start gap-3 text-left">
                  <div className="mt-1">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V9H11V15ZM11 7H9V5H11V7Z"
                        fill="#6366F1"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-gray-800 mb-0.5">
                      Don't see the email?
                    </p>
                    <p className="text-[13px] text-gray-600 leading-normal">
                      Check your spam or junk folder. It can take a few minutes
                      to arrive.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Button - Only show if not verifying with token */}
              {!isVerifying && !tokenParam && (
                <div className="space-y-6">
                  <button
                    onClick={handleResendEmail}
                    disabled={isResending || !email}
                    className="w-full bg-[#6366F1] text-white py-3 rounded-xl font-bold hover:bg-[#5558E3] transition-all shadow-md active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isResending ? "Sending..." : "Resend Verification Email"}
                  </button>

                  <Link
                    href="/auth/login"
                    className="block text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                  >
                    Back to login
                  </Link>
                </div>
              )}
                </>
              )}

              {message && (
                <div className="mt-4 bg-green-50 border border-green-200 text-green-800 rounded-lg p-3">
                  <p className="text-sm font-medium">{message}</p>
                </div>
              )}
              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-800 rounded-lg p-3">
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 lg:px-16 py-8 flex justify-between items-center">
        <p className="text-[13px] text-gray-400">
          2026 TT Showcase Student Portal. All rights reserved.
        </p>
        <Link href="#" className="text-[13px] text-gray-400 hover:underline">
          Contact Support
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailContent() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
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
      <VerifyEmailContentInner />
    </Suspense>
  );
}
