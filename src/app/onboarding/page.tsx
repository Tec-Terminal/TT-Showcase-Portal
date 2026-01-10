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
import {
  logoutUser,
  getProfileClient,
  verifyOnboardingPaymentClient,
} from "@/lib/network";
import { decodeJWT } from "@/lib/utils/jwt";

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
  const [userFullName, setUserFullName] = useState<string>("");
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
  const [isSavingLead, setIsSavingLead] = useState(false);

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

  // Helper function to extract full name from various data sources
  const extractFullName = (data: any): string => {
    if (!data) return "";

    // Check for fullName first
    if (data.fullName) return data.fullName;

    // Check for firstname/lastname (lowercase)
    if (data.firstname && data.lastname) {
      return `${data.firstname} ${data.lastname}`.trim();
    }

    // Check for firstName/lastName (camelCase)
    if (data.firstName && data.lastName) {
      return `${data.firstName} ${data.lastName}`.trim();
    }

    return "";
  };
  console.log("email", userEmail);
  // Helper function to validate email format
  const isValidEmail = (email: any): boolean => {
    if (!email || typeof email !== "string") return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  // Helper function to get email from userInfo cookie (most reliable - set during login)
  const getEmailFromCookie = (): string | null => {
    if (typeof window === "undefined") return null;

    try {
      const cookies = document.cookie.split(";");
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split("=");
        if (name === "userInfo" && value) {
          try {
            const userInfo = JSON.parse(decodeURIComponent(value));
            const email = userInfo?.email;
            if (email && isValidEmail(email)) {
              console.log("✅ Found email in userInfo cookie:", email);
              return email;
            }
          } catch (parseError) {
            console.error("Error parsing userInfo cookie:", parseError);
          }
        }
      }
    } catch (error) {
      console.error("Error reading userInfo cookie:", error);
    }
    return null;
  };

  // Helper function to get email from JWT token (client-side fallback)
  const getEmailFromToken = (): string | null => {
    if (typeof window === "undefined") return null;

    try {
      // Try to get token from localStorage or sessionStorage
      let token: string | null =
        localStorage.getItem("accessToken") ||
        sessionStorage.getItem("accessToken");

      if (!token) {
        // Try to get from cookies (httpOnly cookies won't work, but some implementations store non-httpOnly tokens)
        const cookies = document.cookie.split(";");
        for (const cookie of cookies) {
          const [name, value] = cookie.trim().split("=");
          if (name === "accessToken" && value) {
            token = value;
            break;
          }
        }
      }

      if (!token) return null;

      const decoded = decodeJWT(token);
      if (!decoded) return null;

      // Only use email fields, never fallback to sub (which is user ID)
      const email = decoded.email || decoded.userEmail || null;
      return email && isValidEmail(email) ? email : null;
    } catch (error) {
      console.error("Error getting email from token:", error);
      return null;
    }
  };

  useEffect(() => {
    if (formData.profile) {
      const name = extractFullName(formData.profile);
      if (name) {
        setUserFullName(name);
      }
    }
  }, [formData.profile]);

  // Get user email and full name from multiple sources
  useEffect(() => {
    if (isAuthLoading || !isRestored) return;

    const fetchUserData = async () => {
      console.log("🔍 Fetching user data...");

      // First, try to get email from userInfo cookie (most reliable - set during login)
      const cookieEmail = getEmailFromCookie();
      if (cookieEmail) {
        console.log("✅ Using email from userInfo cookie");
        setUserEmail(cookieEmail);
        // Continue to get name from other sources
      }

      // Second, try to get from sessionStorage
      if (typeof window !== "undefined") {
        try {
          const lastLoginResponse = sessionStorage.getItem("lastLoginResponse");
          console.log(
            "📦 SessionStorage login response:",
            lastLoginResponse ? "Found" : "Not found"
          );
          if (lastLoginResponse) {
            const loginData = JSON.parse(lastLoginResponse);
            console.log("📦 Login data:", loginData);
            if (loginData?.user?.fullName) {
              console.log(
                "✅ Found name in sessionStorage:",
                loginData.user.fullName
              );
              setUserFullName(loginData.user.fullName);
              // Only set email if we don't already have one from cookie
              if (
                !cookieEmail &&
                loginData.user.email &&
                isValidEmail(loginData.user.email)
              ) {
                console.log(
                  "✅ Found email in sessionStorage:",
                  loginData.user.email
                );
                setUserEmail(loginData.user.email);
              }
              // If we have both name and email, we're done
              if (
                cookieEmail ||
                (loginData.user.email && isValidEmail(loginData.user.email))
              ) {
                return;
              }
            }
          }
        } catch (error) {
          console.error("Error reading sessionStorage:", error);
        }
      }

      // Second, try to get user info from auth API (from JWT token)
      try {
        console.log("Fetching from /api/auth/user-info...");
        const response = await fetch("/api/auth/user-info", {
          credentials: "include",
        });
        console.log("Response status:", response.status);
        if (response.ok) {
          const data = await response.json();
          console.log("User info from API:", data);

          // Set name if available
          if (data.user?.fullName) {
            console.log("✅ Found name in API:", data.user.fullName);
            setUserFullName(data.user.fullName);
          }

          // Set email if available (don't overwrite cookie email)
          if (
            !cookieEmail &&
            data.user?.email &&
            isValidEmail(data.user.email)
          ) {
            console.log("✅ Found email in API:", data.user.email);
            setUserEmail(data.user.email);
            // If we have both name and email, we're done
            if (data.user?.fullName) {
              return;
            }
          } else if (cookieEmail) {
            console.log("✅ Using email from cookie, skipping API email");
            // If we have both name and email, we're done
            if (data.user?.fullName) {
              return;
            }
          } else {
            console.log(
              "⚠️ API returned user but no valid email:",
              data.user?.email
            );
          }
        } else {
          const errorText = await response.text();
          console.error("❌ API error:", response.status, errorText);
        }
      } catch (error) {
        console.error("❌ Could not fetch user info:", error);
      }

      // Third, try to get name from initialData
      if (initialData) {
        console.log("📝 Checking initialData:", initialData);
        const name = extractFullName(initialData);
        if (name) {
          console.log("✅ Found name in initialData:", name);
          setUserFullName(name);
          // Only set email if we don't already have one from cookie
          if (
            !cookieEmail &&
            initialData.email &&
            isValidEmail(initialData.email)
          ) {
            setUserEmail(initialData.email);
          }
          return; // Found it, we're done
        }
      }

      // Try to get email from JWT token directly (client-side fallback)
      // Only if we don't already have email from cookie
      if (!cookieEmail && !userEmail) {
        console.log("🔑 Trying to get email from JWT token...");
        const tokenEmail = getEmailFromToken();
        if (tokenEmail) {
          console.log("✅ Found email in token:", tokenEmail);
          setUserEmail(tokenEmail);
        } else {
          console.log("⚠️ Could not get email from token");
        }
      }

      // Last resort: try to fetch from student profile API (will fail during onboarding)
      // Only if we don't already have email from cookie
      if (!cookieEmail && !userEmail) {
        try {
          console.log("🎓 Trying student profile API...");
          const profileData = await getProfileClient();
          const profile = profileData?.data || profileData;
          if (profile) {
            const name = extractFullName(profile);
            if (name) {
              console.log("✅ Found name in profile:", name);
              setUserFullName(name);
            }
            if (profile.email && isValidEmail(profile.email)) {
              setUserEmail(profile.email);
            }
          }
        } catch (error) {
          // Expected to fail during onboarding - user doesn't have profile yet
          console.log(
            "ℹ️ Could not fetch profile (expected during onboarding):",
            error
          );
        }
      }

      console.log("❌ No name found from any source");
    };

    fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, isAuthLoading, isRestored]);

  // Restore saved data on mount
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

  // Handle Paystack callback (similar to payments page)
  useEffect(() => {
    if (typeof window !== "undefined" && !isAuthLoading) {
      const urlParams = new URLSearchParams(window.location.search);
      const reference = urlParams.get("reference");
      const trxref = urlParams.get("trxref");
      const status = urlParams.get("status");

      // If we have payment callback params, handle them
      const paymentReference = reference || trxref;
      if (paymentReference) {
        const handlePaymentCallback = async () => {
          try {
            const pendingOnboardingRef = sessionStorage.getItem(
              "pendingOnboardingPayment"
            );
            const isOnboardingPayment =
              pendingOnboardingRef !== null || paymentReference;

            if (isOnboardingPayment) {
              // Get saved payment plan and form data for enrollment
              const savedPaymentPlan = localStorage.getItem(
                "pending_payment_plan"
              );
              if (!savedPaymentPlan) {
                throw new Error(
                  "Payment plan data not found. Please contact support."
                );
              }

              const paymentInfo = JSON.parse(savedPaymentPlan);

              // Get guardian email from form data if available
              let guardianEmail: string | undefined;
              if (
                formData.profile?.guardianEmail &&
                formData.profile?.hasGuardian
              ) {
                guardianEmail = formData.profile.guardianEmail;
              }

              // Call verify with enrollment data - backend will create student automatically
              const verificationResult = await verifyOnboardingPaymentClient({
                reference: paymentReference,
                guardianEmail,
                profile: formData.profile,
                selectedCenter:
                  paymentInfo.selectedCenter || formData.selectedCenter,
                selectedCourse: paymentInfo.course || formData.selectedCourse,
                paymentPlan: paymentInfo.paymentPlan,
              });

              // Clear the stored reference after successful verification
              sessionStorage.removeItem("pendingOnboardingPayment");

              // Store student data if returned from verification
              if (verificationResult.student) {
                // Save student data for success page
                const studentData = {
                  studentId: verificationResult.student.studentId,
                  fullName: verificationResult.student.fullName,
                  email: verificationResult.student.email,
                  center: verificationResult.student.center,
                  course: verificationResult.student.course,
                };

                // Store in localStorage for success page (before cleanup)
                localStorage.setItem(
                  `payment_data_${paymentReference}`,
                  JSON.stringify({
                    paymentPlan: paymentInfo.paymentPlan,
                    courseName:
                      verificationResult.student.course?.name ||
                      paymentInfo.course?.name,
                    userName: verificationResult.student.fullName,
                    userEmail: verificationResult.student.email,
                    paymentMethod: "Paystack",
                    centerName:
                      verificationResult.student.center?.name ||
                      paymentInfo.selectedCenter?.name,
                    studentId: verificationResult.student.studentId,
                  })
                );

                // Clean up pending data since enrollment is complete
                localStorage.removeItem("pending_payment_plan");
                localStorage.removeItem("onboarding_form_data");
              }

              // Clean up URL
              window.history.replaceState(
                {},
                document.title,
                window.location.pathname
              );

              // If we're on step 3 (payment configuration), move to success step
              if (step === 3) {
                // Payment plan should already be saved from verification response
                if (verificationResult.student) {
                  setFormData((prev) => ({
                    ...prev,
                    paymentPlan: paymentInfo.paymentPlan,
                  }));
                  setStep(4); // Move to success page
                }
              }
            }
          } catch (err: any) {
            console.error("Error verifying payment:", err);
            const errorMessage =
              err.response?.data?.message ||
              err.message ||
              "Payment verification failed. Please contact support if the payment was successful.";

            // Show error but don't block the user
            alert(errorMessage);

            // Clear stored reference on error
            sessionStorage.removeItem("pendingOnboardingPayment");

            // Clean up URL
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );
          }
        };

        // Only verify if status indicates success or if no status (Paystack sometimes doesn't include it)
        if (
          status === "success" ||
          urlParams.get("success") === "true" ||
          !status
        ) {
          handlePaymentCallback();
        } else if (
          status === "failed" ||
          urlParams.get("success") === "false"
        ) {
          // Payment failed
          console.error("Payment failed");
          alert("Payment was not successful. Please try again.");

          // Clear stored reference on failure
          sessionStorage.removeItem("pendingOnboardingPayment");

          // Clean up URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading]);

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
    let maxStep = 1;
    if (formData.profile && Object.keys(formData.profile).length > 0)
      maxStep = 2;
    if (formData.selectedCourse) maxStep = 3;
    if (formData.paymentPlan) maxStep = 4;

    // Allow going to any step up to maxStep or current step
    if (stepNumber <= Math.max(step, maxStep)) {
      setStep(stepNumber);
    }
  };

  const handleSaveAndExit = async () => {
    // Prevent multiple clicks
    if (isSavingLead) return;

    try {
      setIsSavingLead(true);

      // Prepare payload for backend lead creation
      const payload = {
        profile: {
          trainingLocation: formData.profile?.trainingLocation || null,
          centre:
            formData.profile?.centre || formData.selectedCenter?.id || null,
          studentAddress: formData.profile?.studentAddress || null,
          hasGuardian: formData.profile?.hasGuardian || false,
          guardianName: formData.profile?.guardianName || null,
          guardianPhone: formData.profile?.guardianPhone || null,
          guardianEmail: formData.profile?.guardianEmail || null,
          guardianAddress: formData.profile?.guardianAddress || null,
        },
        selectedCenter: formData.selectedCenter
          ? {
              id: formData.selectedCenter.id,
              name: formData.selectedCenter.name,
            }
          : null,
        selectedCourse: formData.selectedCourse
          ? {
              id: formData.selectedCourse.id,
              name: formData.selectedCourse.name,
            }
          : null,
        step: step,
        source: "onboarding_save_and_exit",
      };

      // Save to backend (don't block if it fails)
      try {
        const response = await fetch("/api/onboarding/save-lead", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          console.log("✅ Lead saved successfully");
        } else {
          const errorData = await response.json();
          console.warn(
            "⚠️ Lead save warning:",
            errorData.warning || errorData.error
          );
          // Continue anyway - data is saved locally
        }
      } catch (apiError) {
        console.error("❌ Error saving lead to backend:", apiError);
        // Continue anyway - data is saved locally
      }

      // Always save to localStorage for frontend restoration
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
      }

      // Redirect to dashboard
      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Error in handleSaveAndExit:", error);
      setIsSavingLead(false);
      // Still redirect even if there's an error
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
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      // Preserve localStorage so user can continue onboarding after logging back in
      // Redirect to login
      router.push("/auth/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/auth/login");
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
          <Link href="/">
            <div className="flex items-center gap-8">
              <Image
                src="/images/Logo.png"
                alt="TT Showcase"
                width={180}
                height={60}
                className="object-contain"
              />
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-800 leading-none">
                {userFullName || "Loading..."}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">ID: Not assigned</p>
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
                Your progress has been restored. You can continue from where you
                left off.
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

        <div
          className={`${
            step === 4 ? "hidden" : "flex"
          }  flex-col md:flex-row md:items-center justify-between pb-4 gap-4`}
        >
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
            type="button"
            onClick={handleSaveAndExit}
            disabled={isSavingLead}
            className={`flex items-center gap-2 text-gray-500 hover:text-gray-800 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isSavingLead ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            {isSavingLead ? "Saving..." : "Save and exit"}
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
                onNext={(data) =>
                  nextStep({
                    profile: data,
                    selectedCenter: data.selectedCenter,
                  })
                }
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
              userEmail={
                userEmail ||
                (formData.profile?.email && isValidEmail(formData.profile.email)
                  ? formData.profile.email
                  : null)
              }
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
