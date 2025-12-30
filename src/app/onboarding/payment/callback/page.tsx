"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyPaystackPayment } from "@/lib/services/paystack.service";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

function PaymentCallbackPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [error, setError] = useState<string | null>(null);
  const hasVerifiedRef = useRef(false);

  useEffect(() => {
    const verifyPayment = async () => {
      // Prevent duplicate verification
      if (hasVerifiedRef.current) {
        return;
      }

      try {
        const reference = searchParams.get("reference");
        
        if (!reference) {
          setError("Payment reference not found");
          setStatus("error");
          return;
        }

        // Check if already processed
        const processedRefs = JSON.parse(
          localStorage.getItem("processed_payment_references") || "[]"
        );
        
        if (processedRefs.includes(reference)) {
          router.push(`/onboarding/success?reference=${reference}`);
          return;
        }

        hasVerifiedRef.current = true;

        // Verify payment with Paystack
        const verification = await verifyPaystackPayment(reference);

        if (verification.status && verification.data.status === "success") {
          // Payment successful - redirect to success page with reference
          router.push(`/onboarding/success?reference=${reference}`);
        } else {
          console.error("❌ Payment verification failed:", verification);
          setError("Payment verification failed");
          setStatus("error");
          hasVerifiedRef.current = false; // Allow retry
        }
      } catch (err: any) {
        console.error("Payment verification error:", err);
        setError(err.message || "Failed to verify payment");
        setStatus("error");
        hasVerifiedRef.current = false; // Allow retry
      }
    };

    verifyPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  if (status === "verifying") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push("/onboarding")}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            Return to Onboarding
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <PaymentCallbackPageContent />
    </Suspense>
  );
}

