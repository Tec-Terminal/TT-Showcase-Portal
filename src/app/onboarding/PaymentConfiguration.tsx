"use client";
import { useState, useEffect, useMemo } from "react";
import { Calendar, Lock, Sliders } from "lucide-react";
import BreakdownItem from "./BreakdownItem";
import CustomPriceRange from "./CustomPriceRange";
import { GoShieldCheck } from "react-icons/go";
import { Course, Center, onboardingService } from "@/lib/services/onboarding.service";
import { formatNairaWithSymbolDirect } from "@/lib/utils/currency";
import { initializePaystackPayment } from "@/lib/services/paystack.service";

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

interface PaymentConfigurationProps {
  course: Course | null;
  selectedCenter?: Center | null;
  savedPaymentPlan?: PaymentPlan | null;
  userEmail?: string;
  onComplete: (paymentPlan: PaymentPlan) => void;
  onBack?: () => void;
}

export default function PaymentConfiguration({
  course,
  selectedCenter,
  savedPaymentPlan,
  userEmail,
  onComplete,
  onBack,
}: PaymentConfigurationProps) {
  const [processing, setProcessing] = useState(false);
  // Get payment info for the selected center
  const getPaymentInfo = () => {
    if (!course?.paymentInfo?.byCenter || course.paymentInfo.byCenter.length === 0) {
      return null;
    }
    
    if (selectedCenter) {
      const centerInfo = course.paymentInfo.byCenter.find(
        (info) => info.centerId === selectedCenter.id
      );
      if (centerInfo) return centerInfo;
    }
    
    return course.paymentInfo.byCenter[0];
  };

  const paymentInfo = getPaymentInfo();
  
  // Use payment info from API or fallback values
  const fullTuition = paymentInfo?.lumpSumFee || course?.paymentInfo?.maxFee || 800000;
  const minDeposit = paymentInfo?.baseFee || course?.paymentInfo?.minFee || 300000;
  const maxDeposit = fullTuition;
  const maxInstallments = paymentInfo?.maxInstallments || course?.paymentInfo?.maxInstallments || 5;

  const [initialDeposit, setInitialDeposit] = useState(
    savedPaymentPlan?.initialDeposit || minDeposit
  );
  const [duration, setDuration] = useState(
    savedPaymentPlan?.duration || Math.min(2, maxInstallments)
  );

  // Check if paying full amount
  const isFullPayment = initialDeposit >= fullTuition;

  // Auto-set duration to 0 when full payment is made
  useEffect(() => {
    if (isFullPayment && duration > 0) {
      setDuration(0);
    } else if (!isFullPayment && duration === 0) {
      // Reset to default duration when not paying full amount
      setDuration(Math.min(2, maxInstallments));
    }
  }, [isFullPayment, duration, maxInstallments]);

  // Calculate payment breakdown
  const paymentBreakdown = useMemo(() => {
    const installments = [];
    const today = new Date();
    
    // Enrollment deposit (due today)
    installments.push({
      step: 1,
      title: "Enrolment Deposit",
      date: today.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      amount: initialDeposit,
      status: "DUE TODAY",
    });

    // Only add installments if not paying full amount
    if (!isFullPayment && duration > 0) {
      const remainingBalance = fullTuition - initialDeposit;
      const installmentCount = duration;
      const installmentAmount = Math.ceil(remainingBalance / installmentCount);

      // Calculate installments
      for (let i = 0; i < installmentCount; i++) {
        const installmentDate = new Date(today);
        installmentDate.setMonth(today.getMonth() + i + 1);
        
        // Last installment gets any remainder
        const amount =
          i === installmentCount - 1
            ? remainingBalance - installmentAmount * (installmentCount - 1)
            : installmentAmount;

        installments.push({
          step: i + 2,
          title: `Installment ${i + 1} of ${installmentCount}`,
          date: installmentDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          amount: amount,
        });
      }
    }

    return installments;
  }, [initialDeposit, duration, fullTuition, isFullPayment]);

  const outstandingBalance = fullTuition - initialDeposit;

  const handlePayment = async () => {
    if (!userEmail) {
      alert("User email is required for payment");
      return;
    }

    if (!selectedCenter) {
      alert("Center selection is required for payment");
      return;
    }

    try {
      setProcessing(true);
      
      // Try to fetch center details with bank accounts (optional - won't block payment)
      try {
        await onboardingService.getCenterDetails(selectedCenter.id);
      } catch (error: any) {
        // Silently fail - bank accounts will be displayed on Paystack payment page
      }
      
      // Generate unique reference
      const reference = `TT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Initialize Paystack payment
      const paymentInit = await initializePaystackPayment({
        email: userEmail,
        amount: initialDeposit, // Amount in Naira (will be converted to kobo in API)
        reference,
        callback_url: `${window.location.origin}/onboarding/payment/callback`,
        metadata: {
          courseId: course?.id,
          courseName: course?.name,
          centerId: selectedCenter?.id,
          centerName: selectedCenter?.name,
          initialDeposit,
          duration,
          fullTuition,
        },
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
      });

      if (paymentInit.status && paymentInit.data.authorization_url) {
        // Save payment plan to localStorage before redirecting
        const paymentPlan: PaymentPlan = {
          initialDeposit,
          duration: isFullPayment ? 0 : duration, // Set duration to 0 for full payment
          installments: paymentBreakdown.map((item) => ({
            title: item.title,
            date: item.date,
            amount: item.amount,
            status: item.status,
          })),
        };
        
        // Save to localStorage for retrieval after payment
        if (typeof window !== 'undefined') {
          localStorage.setItem('pending_payment_plan', JSON.stringify({
            paymentPlan,
            reference,
            course: course,
            selectedCenter: selectedCenter,
          }));
        }
        
        // Redirect to Paystack
        window.location.href = paymentInit.data.authorization_url;
      } else {
        throw new Error('Failed to initialize payment');
      }
    } catch (error: any) {
      console.error('Payment initialization error:', error);
      const errorMessage = error.message || 'Failed to initialize payment. Please check your Paystack configuration and try again.';
      alert(errorMessage);
      setProcessing(false);
    }
  };

  if (!course) {
    return (
      <div className="max-w-7xl mx-auto py-8 px-4 text-center">
        <p className="text-gray-500">Please select a course first.</p>
        {onBack && (
          <button
            onClick={onBack}
            className="mt-4 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition-all"
          >
            Go Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h2 className="text-[28px] font-bold text-gray-900">
            Configure Your Payment Plan
          </h2>
          <p className="text-gray-500 text-sm">
            Customize your initial deposit and repayment schedule for {course.name}
          </p>
        </div>

        {/* Slider Card */}
        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
          <div className="flex items-center gap-2 mb-6 font-semibold text-gray-900">
            <Sliders size={20} className="text-indigo-600" />
            <span>Initial Deposit Amount</span>
          </div>
          <div className="bg-gray-50 px-6 py-2.5 rounded-xl border border-gray-200 mb-4">
            <div className="flex gap-4  text-gray-900">
              <span className="text-sm text-gray-400 font-medium">₦</span>
              <input
                type="text"
                value={formatNairaWithSymbolDirect(initialDeposit).replace('₦', '')}
                className="bg-transparent text-left text-gray-600 text-sm font-semibold outline-none w-full"
                readOnly
              />
            </div>
          </div>

          <CustomPriceRange
            min={minDeposit}
            max={maxDeposit}
            value={initialDeposit}
            onChange={(value) => {
              // If user sets to max (full payment), ensure it's exactly full tuition
              if (value >= fullTuition) {
                setInitialDeposit(fullTuition);
              } else {
                setInitialDeposit(value);
              }
            }}
          />

          {/* Repayment Duration */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-6 font-semibold text-gray-900">
              <Calendar size={20} className="text-indigo-600" />
              <span>Repayment Duration</span>
            </div>
            <div className={`grid grid-cols-5 gap-3 ${isFullPayment ? 'opacity-50 pointer-events-none' : ''}`}>
              {Array.from({ length: Math.min(5, maxInstallments) }, (_, i) => i + 1).map((months) => (
                <button
                  key={months}
                  onClick={() => setDuration(months)}
                  disabled={isFullPayment}
                  className={`py-3 rounded-xl border text-sm font-medium transition-all ${
                    duration === months
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300"
                  } ${isFullPayment ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {months} {months === 1 ? "Month" : "Months"}
                </button>
              ))}
            </div>
            {isFullPayment ? (
              <p className="mt-4 text-sm text-gray-500 font-normal">
                Full payment selected. No installments required.
              </p>
            ) : outstandingBalance > 0 && (
              <p className="mt-4 text-sm text-gray-400 font-normal italic">
                Spread the remaining balance of{" "}
                <span className="font-bold">{formatNairaWithSymbolDirect(outstandingBalance)}</span> over {duration} {duration === 1 ? "month" : "months"}.
              </p>
            )}
          </div>
        </div>

        {/* Payment Breakdown */}
        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-8">
            Payment Breakdown
          </h3>
          <div className="space-y-6">
            {paymentBreakdown.map((item) => (
              <BreakdownItem
                key={item.step}
                step={item.step}
                title={item.title}
                date={item.date}
                amount={formatNairaWithSymbolDirect(item.amount).replace('₦', '')}
                status={item.status}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="lg:col-span-1">
        <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm sticky top-8">
          <p className="text-xs font-normal text-gray-400 uppercase tracking-widest mb-2">
            Payment Summary
          </p>
          <div className="mb-6">
            <h2 className="text-4xl font-semibold text-indigo-600 leading-none">
              {formatNairaWithSymbolDirect(initialDeposit)}
            </h2>
            <p className="text-sm text-gray-900 mt-2 font-normal">To Pay Now</p>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-200 mb-8">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Course Tuition</span>
              <span className="font-bold text-gray-900">
                {formatNairaWithSymbolDirect(fullTuition)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Initial Deposit</span>
              <span className="font-bold text-indigo-600">
                - {formatNairaWithSymbolDirect(initialDeposit)}
              </span>
            </div>
            <div className="flex justify-between text-base pt-4 border-t border-dashed">
              <span className="font-semibold text-gray-900">
                Outstanding Balance
              </span>
              <span className="font-semibold text-gray-900 text-lg">
                {formatNairaWithSymbolDirect(outstandingBalance)}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {onBack && (
              <button
                onClick={onBack}
                className="w-full py-3 border border-gray-200 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-50 transition-all"
              >
                Back
              </button>
            )}
            <button
              onClick={handlePayment}
              disabled={processing}
              className="w-full py-4 bg-indigo-600 text-white rounded-xl font-normal shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? "Processing..." : `Pay ${formatNairaWithSymbolDirect(initialDeposit)}`}
            </button>
          </div>
          <p className="flex items-center justify-center gap-2 text-xs font-normal text-gray-400 mt-4 uppercase tracking-widest">
            <GoShieldCheck size={12} /> Secure Payment Processing
          </p>
        </div>
      </div>
    </div>
  );
}
