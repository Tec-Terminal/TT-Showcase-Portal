"use client";
import { useState, useEffect } from "react";
import { HiXMark } from "react-icons/hi2";
import { payInstallmentClient } from "@/lib/network";
import { PaymentScheduleItem } from "@/types/student-portal.types";

interface Props {
  show: boolean;
  onClose: () => void;
  amount: string;
  installment?: PaymentScheduleItem | null;
  walletBalance?: number;
  onSuccess?: () => void;
}

export default function PayInstallment({ 
  show, 
  onClose, 
  amount, 
  installment,
  walletBalance = 0,
  onSuccess 
}: Props) {
  const [method, setMethod] = useState<"wallet" | "card">("wallet");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (show) {
      setError(null);
      setLoading(false);
      // Set default method based on wallet balance
      const amountNum = parseFloat(amount.replace(/[₦,]/g, "")) || 0;
      const balance = walletBalance || 0;
      
      if (balance >= amountNum && amountNum > 0) {
        setMethod("wallet");
      } else {
        setMethod("card");
      }
    }
  }, [show, amount, walletBalance, installment]);

  if (!show) return null;

  const handleClose = () => {
    setError(null);
    setLoading(false);
    onClose();
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!installment || !installment.id) {
      console.error("Installment missing:", { installment, show });
      setError("Installment information is missing. Please close and try again.");
      return;
    }

    // Validate installment ID is a valid string
    if (typeof installment.id !== 'string' || installment.id.trim() === '') {
      console.error("Invalid installment ID:", { installmentId: installment.id, type: typeof installment.id });
      setError("Invalid installment ID. Please try again.");
      return;
    }

    const paymentSource = method === "wallet" ? "wallet" : "paystack";
    
    // Validate payment source
    if (paymentSource !== "wallet" && paymentSource !== "paystack") {
      console.error("Invalid payment source:", paymentSource);
      setError("Invalid payment method selected.");
      return;
    }

    setLoading(true);

    try {
      const requestData = {
        installmentId: installment.id.trim(),
        paymentSource: paymentSource as 'wallet' | 'paystack',
      };
      
      const response = await payInstallmentClient(requestData);

      if (response.success) {
        if (response.authorizationUrl && method === "card") {
          // Store the reference in sessionStorage so we can verify after Paystack redirect
          if (response.reference) {
            sessionStorage.setItem('pendingInstallmentPayment', response.reference);
          }
          // Redirect to Paystack for card payment
          window.location.href = response.authorizationUrl;
        } else if (method === "wallet") {
          // Wallet payment successful - close modal and refresh
          onSuccess?.();
          handleClose();
        } else {
          throw new Error("Payment initialization failed");
        }
      } else {
        throw new Error(response.message || "Payment failed. Please try again.");
      }
    } catch (err: any) {
      console.error("Error processing payment:", err);
      
      // Extract detailed error message from backend
      let errorMessage = "Failed to process payment. Please try again.";
      
      if (err.response) {
        // Backend returned an error response
        const errorData = err.response.data;
        const status = err.response.status;
        
        if (errorData) {
          // Try to get detailed validation errors
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (Array.isArray(errorData.message)) {
            // Handle validation error array
            errorMessage = errorData.message.join(", ");
          } else if (errorData.error) {
            errorMessage = errorData.error;
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
          
          // Add status code context
          if (status === 400) {
            errorMessage = `Validation Error: ${errorMessage}`;
          } else if (status === 404) {
            errorMessage = `Not Found: ${errorMessage}`;
          } else if (status === 403) {
            errorMessage = `Permission Denied: ${errorMessage}`;
          }
        } else {
          errorMessage = `Request failed with status ${status}`;
        }
        
        console.error("Backend error details:", {
          status,
          data: errorData,
          requestData: {
            installmentId: installment?.id,
            paymentSource: method === "wallet" ? "wallet" : "paystack",
          }
        });
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  const amountNum = parseFloat(amount.replace(/[₦,]/g, ""));
  const hasSufficientBalance = walletBalance >= amountNum;
  const balanceShortage = amountNum - walletBalance;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Pay Installment</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <HiXMark className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handlePayment} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* Amount Display */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Payment Amount
            </label>
            <div className="w-full pl-4 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-xl font-medium text-gray-600 flex items-center gap-2">
              <span>₦</span> {amount.replace("₦", "").replace(/,/g, "")}
            </div>
          </div>

          {/* Payment Source */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 block">
              Payment Source
            </label>

            {/* Wallet Option */}
            <div
              onClick={() => !loading && setMethod("wallet")}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                method === "wallet"
                  ? "border-[#6366F1] bg-[#6366F1]/5"
                  : "border-gray-100 bg-white"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    method === "wallet" ? "border-[#6366F1]" : "border-gray-300"
                  }`}
                >
                  {method === "wallet" && (
                    <div className="w-2.5 h-2.5 bg-[#6366F1] rounded-full" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">My Wallet</p>
                  {hasSufficientBalance ? (
                    <p className="text-[11px] text-green-600">
                      Sufficient balance available
                    </p>
                  ) : (
                    <p className="text-[11px] text-red-500">
                      Insufficient balance. Fund your wallet first.
                    </p>
                  )}
                </div>
              </div>
              <span className={`text-xs font-bold ${hasSufficientBalance ? "text-green-600" : "text-red-500"}`}>
                ₦{(walletBalance || 0).toLocaleString()}
              </span>
            </div>

            {/* Direct Bank/Card Option */}
            <div
              onClick={() => !loading && setMethod("card")}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                method === "card"
                  ? "border-[#6366F1] bg-[#6366F1]/5"
                  : "border-gray-100 bg-white"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  method === "card" ? "border-[#6366F1]" : "border-gray-300"
                }`}
              >
                {method === "card" && (
                  <div className="w-2.5 h-2.5 bg-[#6366F1] rounded-full" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">
                  Direct Bank/Card
                </p>
                <p className="text-[11px] text-gray-400">
                  Pay via external gateway
                </p>
              </div>
            </div>
          </div>

          {method === "wallet" && !hasSufficientBalance && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-xl text-sm">
              You need ₦{balanceShortage.toLocaleString()} more to complete this payment from your wallet.
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (method === "wallet" && !hasSufficientBalance)}
            className="w-full bg-[#6366F1] text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Processing..."
              : method === "wallet"
              ? "Make Payment"
              : "Pay Now"}
          </button>
        </form>
      </div>
    </div>
  );
}
