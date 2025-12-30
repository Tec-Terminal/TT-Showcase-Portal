"use client";
import { useState } from "react";
import { HiXMark } from "react-icons/hi2";
import { fundWalletClient } from "@/lib/network";

interface Props {
  showFundModal: boolean;
  setShowFundModal: (show: boolean) => void;
  fundAmount: string;
  setFundAmount: (amount: string) => void;
  onclose?: () => void;
  onSuccess?: () => void;
}

export default function FundWallet({
  showFundModal,
  setShowFundModal,
  fundAmount,
  setFundAmount,
  onclose,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!showFundModal) return null;

  const handleClose = () => {
    setShowFundModal(false);
    setError(null);
    if (onclose) onclose();
  };

  const handleAddFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate amount
    const amount = parseFloat(fundAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    if (amount < 100) {
      setError("Minimum funding amount is ₦100");
      return;
    }

    setLoading(true);

    try {
      // Call backend to initialize Paystack payment
      const response = await fundWalletClient({ amount });

      if (response.authorizationUrl) {
        // Redirect to Paystack payment page
        window.location.href = response.authorizationUrl;
      } else {
        throw new Error("Failed to initialize payment. Please try again.");
      }
    } catch (err: any) {
      console.error("Error funding wallet:", err);
      setError(
        err.response?.data?.message ||
        err.message ||
        "Failed to initialize payment. Please try again."
      );
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div
        className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()} // Prevents closing when clicking inside the modal
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Fund your wallet</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            disabled={loading}
          >
            <HiXMark className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleAddFunds} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-2">
              Amount to fund
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                ₦
              </span>
              <input
                type="number"
                placeholder="0.00"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                className="w-full pl-10 pr-4 py-4 text-gray-600 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2
            focus:ring-[#6342E9]/20 focus:border-[#6342E9] outline-none transition-all font-medium"
                disabled={loading}
                min="100"
                step="0.01"
                required
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Minimum amount: ₦100</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#6342E9] text-white py-4 rounded-xl font-bold hover:bg-[#5235c4] transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Add Funds"}
          </button>
        </form>
      </div>
    </div>
  );
}
