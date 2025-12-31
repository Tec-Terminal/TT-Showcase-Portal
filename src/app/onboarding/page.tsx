"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PaymentConfiguration from "./PaymentConfiguration";
import Image from "next/image";
import Link from "next/link";
import PaymentSuccess from "./PaymentSuccess";
import ProfileForm from "./ProfileForm";
import SelectCourse from "./SelectCourse";
import { LogOut, ArrowRightLeft } from "lucide-react";
import { HiLogout } from "react-icons/hi";
import { useRequireAuth } from "@/hooks/useAuth";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { logoutUser } from "@/lib/network";

const STORAGE_KEY = "onboarding_form_data";

interface PaymentPlan {
  initialDeposit: number;
  duration: number;
  installments: Array<{
    title: string;
    date: string;
    amount: number;
    status?: string;
  }>;
}

export default function OnboardingFlow({ initialData }: { initialData: any }) {
  const { isLoading: isAuthLoading } = useRequireAuth();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>("");
  
  // Load saved data from localStorage on mount
  const loadSavedData = () => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed;
      }
    } catch (error) {
      console.error("Error loading saved data:", error);
    }
    return null;
  };

  // Initialize state - will be updated by useEffect if saved data exists
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<{
    profile: any;
    selectedCenter: any;
    selectedCourse: any;
    paymentPlan: PaymentPlan | null;
  }>({
    profile: initialData || {},
    selectedCenter: null,
    selectedCourse: null,
    paymentPlan: null,
  });
  const [isRestored, setIsRestored] = useState(false);
  const [showRestoredMessage, setShowRestoredMessage] = useState(false);

  // Get user email from initialData or profile
  useEffect(() => {
    if (initialData?.email) {
      setUserEmail(initialData.email);
    } else if (typeof window !== 'undefined') {
      // Try to get from localStorage or make API call
      // For now, we'll get it from the profile form or require it
    }
  }, [initialData]);

  // Restore saved data on mount (client-side only)
  useEffect(() => {
    const savedData = loadSavedData();
    if (savedData && savedData.step > 1) {
      // Restore the step and form data
      setStep(savedData.step || 1);
      setFormData({
        profile: savedData.profile || initialData || {},
        selectedCenter: savedData.selectedCenter || null,
        selectedCourse: savedData.selectedCourse || null,
        paymentPlan: savedData.paymentPlan || null,
      });
      // Show message that progress was restored
      setShowRestoredMessage(true);
      // Hide message after 5 seconds
      setTimeout(() => setShowRestoredMessage(false), 5000);
    }
    setIsRestored(true);
  }, [initialData]);

  // Save data to localStorage whenever formData or step changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            step,
            profile: formData.profile,
            selectedCenter: formData.selectedCenter,
            selectedCourse: formData.selectedCourse,
            paymentPlan: formData.paymentPlan,
          })
        );
      } catch (error) {
        console.error("Error saving data:", error);
      }
    }
  }, [step, formData]);

  const steps = [
    { id: 1, label: "Basic Information" },
    { id: 2, label: "Course Selection" },
    { id: 3, label: "Payment" },
  ];

  const nextStep = (data?: any) => {
    if (data) {
      setFormData((prev) => ({ ...prev, ...data }));
    }
    setStep((s) => s + 1);
  };

  const goToStep = (stepNumber: number) => {
    // Allow moving to any step that has been visited or is the next step
    // Calculate max step based on completed data
    let maxStep = 1;
    if (formData.profile && Object.keys(formData.profile).length > 0) maxStep = 2;
    if (formData.selectedCourse) maxStep = 3;
    if (formData.paymentPlan) maxStep = 4;
    
    // Allow going to any step up to maxStep or current step
    if (stepNumber <= Math.max(step, maxStep)) {
      setStep(stepNumber);
    }
  };

  const handleSaveAndExit = () => {
    // Save current progress and redirect to dashboard
    if (typeof window !== "undefined") {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          step,
          profile: formData.profile,
          selectedCourse: formData.selectedCourse,
          paymentPlan: formData.paymentPlan,
        })
      );
      window.location.href = "/dashboard";
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      // Preserve localStorage so user can continue onboarding after logging back in
      // Redirect to login
      router.push('/auth/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
      // Still redirect even if logout API call fails
      router.push('/auth/login');
    }
  };

  // Show loading while auth is loading or data is being restored
  if (isAuthLoading || !isRestored) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* --- Header --- */}
      <nav className="bg-white border-b border-gray-100 px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Image
              src="/images/Logo.png"
              alt="TT Showcase"
              width={140}
              height={35}
              className="object-contain"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-800 leading-none">
                Confidence Isaiah
              </p>
              <p className="text-[11px] text-gray-500 mt-1">ID: TT-637N</p>
            </div>
            <button 
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      {/* Progress Steps */}
      <div className="max-w-7xl mx-auto mt-8">
        {/* Restoration Message */}
        {showRestoredMessage && (
          <div className="mb-4 mx-4 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium">
                Your progress has been restored. You can continue from where you left off.
              </span>
            </div>
            <button
              onClick={() => setShowRestoredMessage(false)}
              className="text-blue-600 hover:text-blue-800 ml-4"
            >
              <svg
                className="w-4 h-4"
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
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
          <div className="flex items-center gap-6">
            {steps.map((s) => (
              <button
                key={s.id}
                onClick={() => goToStep(s.id)}
                disabled={step < s.id}
                className="flex items-center gap-2 group disabled:cursor-not-allowed cursor-pointer"
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    step >= s.id
                      ? "bg-[#6344F5] text-white shadow-md shadow-gray-400"
                      : "bg-gray-100 text-gray-400 shadow-md shadow-gray-400"
                  }`}
                >
                  {s.id}
                </div>
                <span
                  className={`text-sm font-medium transition-all ${
                    step >= s.id ? "text-[#6344F5]" : "text-gray-400"
                  }`}
                >
                  {s.label}
                </span>
              </button>
            ))}
          </div>

          {/* Action Button */}
          <button 
            onClick={handleSaveAndExit}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
          >
            Save and exit
            <div className="border-l border-gray-300 pl-2">
              <HiLogout size={17} color="#000" />
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="pt-10 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          {step === 1 && (
            <div className="bg-white rounded-2xl shadow-[0_4px_25px_rgba(0,0,0,0.03)] border border-gray-50 p-8 md:p-12">
              <ProfileForm
                initialData={formData.profile}
                onNext={(data) => nextStep({ profile: data, selectedCenter: data.selectedCenter })}
              />
            </div>
          )}
        </div>

        <div className="max-w-7xl mx-auto">
          {step === 2 && (
            <SelectCourse
              selectedCourse={formData.selectedCourse}
              selectedCenter={formData.selectedCenter}
              onSelect={(course) => nextStep({ selectedCourse: course })}
              onBack={() => setStep(1)}
            />
          )}
        </div>

        <div className="max-w-7xl mx-auto">
          {step === 3 && (
            <PaymentConfiguration
              course={formData.selectedCourse}
              selectedCenter={formData.selectedCenter}
              savedPaymentPlan={formData.paymentPlan}
              userEmail={userEmail || formData.profile?.guardianEmail || initialData?.email}
              onComplete={(paymentPlan) => {
                setFormData((prev) => ({ ...prev, paymentPlan }));
                nextStep();
              }}
              onBack={() => setStep(2)}
            />
          )}
        </div>

        <div className="max-w-7xl mx-auto">
          {step === 4 && (
            <PaymentSuccess 
              courseName={formData.selectedCourse?.name}
              paymentPlan={formData.paymentPlan}
              onComplete={() => {
                if (typeof window !== "undefined") {
                  localStorage.removeItem(STORAGE_KEY);
                }
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
