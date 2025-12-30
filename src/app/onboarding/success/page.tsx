"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PaymentSuccess from "../PaymentSuccess";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { verifyPaystackPayment } from "@/lib/services/paystack.service";

function OnboardingSuccessPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  
  // Use ref to prevent duplicate submissions
  const hasSubmittedRef = useRef(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    const submitOnboardingData = async () => {
      // Prevent duplicate submissions
      if (hasSubmittedRef.current || isSubmittingRef.current) {
        return;
      }

      const reference = searchParams.get("reference");
      
      if (!reference) {
        setError("Payment reference not found");
        setSubmitting(false);
        return;
      }

      // Check if this reference was already processed
      const processedRefs = JSON.parse(
        localStorage.getItem("processed_payment_references") || "[]"
      );
      
      if (processedRefs.includes(reference)) {
        // Load saved data if already processed
        const savedData = localStorage.getItem(`payment_data_${reference}`);
        if (savedData) {
          const paymentInfo = JSON.parse(savedData);
          setPaymentData({
            paymentPlan: paymentInfo.paymentPlan,
            courseName: paymentInfo.courseName,
            reference,
            userName: paymentInfo.userName || "Student",
            userEmail: paymentInfo.userEmail || null,
            paymentMethod: paymentInfo.paymentMethod || "Paystack",
            centerName: paymentInfo.centerName || "N/A",
            studentId: paymentInfo.studentId || null,
          });
          setSubmitting(false);
          return;
        }
      }

      try {
        isSubmittingRef.current = true;

        // Step 1: Verify payment with Paystack FIRST
        const verification = await verifyPaystackPayment(reference);

        if (!verification.status || verification.data.status !== "success") {
          throw new Error("Payment verification failed. Payment was not successful.");
        }
        
        // Extract payment method from verification response
        const paymentMethod = verification.data?.authorization?.channel 
          ? `${verification.data.authorization.channel.toUpperCase()}${verification.data.authorization.last4 ? ` ending in ${verification.data.authorization.last4}` : ''}`
          : verification.data?.authorization?.bank 
          ? `${verification.data.authorization.bank} Bank`
          : "Paystack";

        // Step 2: Only proceed if payment is confirmed successful
        // Get saved payment data from localStorage
        const savedData = localStorage.getItem("pending_payment_plan");
        if (!savedData) {
          setError("Payment data not found. Please contact support.");
          setSubmitting(false);
          isSubmittingRef.current = false;
          return;
        }

        const paymentInfo = JSON.parse(savedData);
        
        // Verify the reference matches
        if (paymentInfo.reference !== reference) {
          throw new Error("Payment reference mismatch");
        }
        
        // Get onboarding form data
        const onboardingData = localStorage.getItem("onboarding_form_data");
        if (!onboardingData) {
          setError("Onboarding data not found. Please contact support.");
          setSubmitting(false);
          isSubmittingRef.current = false;
          return;
        }

        const formData = JSON.parse(onboardingData);
        
        // Extract student name and center from form data BEFORE submission
        // In the onboarding flow, guardianName is the student name
        const studentNameFromForm = formData.profile?.guardianName || 
                                   formData.profile?.fullName || 
                                   formData.profile?.name;
        
        // Extract center name - prioritize selectedCenter from paymentInfo or formData
        // Center object might have 'name', 'centerName', or other properties
        const centerNameFromForm = paymentInfo.selectedCenter?.name ||
                                  paymentInfo.selectedCenter?.centerName ||
                                  formData.selectedCenter?.name ||
                                  formData.selectedCenter?.centerName ||
                                  formData.profile?.center?.name ||
                                  formData.profile?.center?.centerName ||
                                  formData.profile?.selectedCenter?.name ||
                                  formData.profile?.selectedCenter?.centerName;

        // Step 3: Submit to backend (only after payment verification)
        const response = await fetch("/api/onboarding/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            profile: formData.profile,
            selectedCenter: paymentInfo.selectedCenter,
            selectedCourse: paymentInfo.course,
            paymentPlan: paymentInfo.paymentPlan,
            paymentReference: reference,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.error || errorData.message || "Failed to submit onboarding data";
          
          // Provide helpful hints for common errors
          let hint = "";
          if (errorMessage.includes("ECONNREFUSED") || errorMessage.includes("Cannot connect")) {
            hint = "Your payment was successful, but we couldn't connect to the backend server. Please contact support with your payment reference.";
          } else if (errorMessage.includes("not configured")) {
            hint = "The API server is not configured. Please contact support.";
          }
          
          throw new Error(hint ? `${errorMessage}\n\n${hint}` : errorMessage);
        }

        const result = await response.json();
        
        // Extract student data from backend response
        // The response structure from /students/enroll should be the student object
        // The API route returns { success: true, data: studentObject }
        const studentData = result.data || result;
        
        // Get student ID from backend response (this is the most reliable source)
        // Backend returns the student with 'id' field, and may have 'studentId' field
        const studentId = studentData?.studentId || 
                         studentData?.id || 
                         null;
        
        // Get student name - prioritize backend, then form data (which we extracted earlier), then Paystack
        // Backend should have fullName from the submission
        // In onboarding flow, guardianName is the student name (the person enrolling)
        // IMPORTANT: Always use form data as fallback since we have it from the form
        const backendStudentName = studentData?.fullName || studentData?.name;
        const studentName = backendStudentName || 
                           studentNameFromForm ||
                           (verification.data?.customer?.first_name && verification.data?.customer?.last_name
                           ? `${verification.data.customer.first_name} ${verification.data.customer.last_name}`
                           : verification.data?.customer?.first_name
                           ? verification.data.customer.first_name
                           : "Student");
        
        // Get center name - prioritize backend response, then form data (which we extracted earlier)
        // Backend response should have center relation populated, but if not, use form data
        // IMPORTANT: Always use form data as fallback since we have it from the form
        const backendCenterName = studentData?.center?.name || studentData?.center?.centerName;
        const centerName = backendCenterName ||
                          centerNameFromForm ||
                          "N/A";
        
        // Mark this reference as processed
        processedRefs.push(reference);
        localStorage.setItem("processed_payment_references", JSON.stringify(processedRefs));
        
        // Save payment data for this reference (including student details for receipt)
        localStorage.setItem(`payment_data_${reference}`, JSON.stringify({
          paymentPlan: paymentInfo.paymentPlan,
          courseName: paymentInfo.course?.name,
          userName: studentName,
          userEmail: verification.data?.customer?.email ||
                     formData.profile?.guardianEmail || 
                     formData.profile?.email || 
                     null,
          paymentMethod,
          centerName,
          studentId,
        }));
        
        // Clear pending data only after successful submission
        localStorage.removeItem("pending_payment_plan");
        localStorage.removeItem("onboarding_form_data");

        setPaymentData({
          paymentPlan: paymentInfo.paymentPlan,
          courseName: paymentInfo.course?.name,
          reference,
          userName: studentName,
          userEmail: verification.data?.customer?.email ||
                     formData.profile?.guardianEmail || 
                     formData.profile?.email || 
                     null,
          paymentMethod,
          centerName,
          studentId,
        });
        
        hasSubmittedRef.current = true;
        setSubmitting(false);
      } catch (err: any) {
        console.error("Onboarding submission error:", err);
        setError(err.message || "Failed to complete onboarding");
        setSubmitting(false);
      } finally {
        isSubmittingRef.current = false;
      }
    };

    submitOnboardingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  if (submitting) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Completing your registration...</p>
        </div>
      </div>
    );
  }

  if (error) {
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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Failed</h2>
          <div className="text-gray-600 mb-6 space-y-2">
            {error.split('\n\n').map((line, index) => (
              <p key={index} className={index > 0 ? "text-sm text-gray-500" : ""}>
                {line}
              </p>
            ))}
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Your payment was successful. Your payment reference has been saved. 
              Please contact support with your payment reference to complete your registration.
            </p>
          </div>
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

  return (
    <PaymentSuccess
      courseName={paymentData?.courseName}
      paymentPlan={paymentData?.paymentPlan}
      paymentReference={paymentData?.reference}
      userName={paymentData?.userName}
      userEmail={paymentData?.userEmail}
      paymentMethod={paymentData?.paymentMethod}
      centerName={paymentData?.centerName}
      studentId={paymentData?.studentId}
      onComplete={() => {
        // Clear any remaining data
        if (typeof window !== "undefined") {
          localStorage.removeItem("pending_payment_plan");
          localStorage.removeItem("onboarding_form_data");
        }
      }}
    />
  );
}

export default function OnboardingSuccessPage() {
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
      <OnboardingSuccessPageContent />
    </Suspense>
  );
}

