"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { AiFillPrinter } from "react-icons/ai";
import { HiMiniCreditCard, HiPlus } from "react-icons/hi2";
import { MdDashboard, MdOutlineAccountBalanceWallet } from "react-icons/md";
import { IoIosCheckmarkCircleOutline } from "react-icons/io";
import FundWallet from "@/components/modals/FundWallet";
import { BiWallet } from "react-icons/bi";
import PayInstallment from "@/components/modals/PayInstallment";
import { useRequireAuth } from "@/hooks/useAuth";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  getPaymentsOverviewClient,
  getProfileClient,
  getPaymentsClient,
  getInvoicesClient,
  verifyWalletFundingClient,
  verifyInstallmentPaymentClient,
} from "@/lib/network";
import {
  PaymentsOverview,
  PaymentScheduleItem,
  PaymentBreakdownItem,
} from "@/types/student-portal.types";
import PaymentReceipt from "@/components/receipt/PaymentReceipt";
import { formatDate } from "@/lib/utils/errorHandler";
import LogoutButton from "@/components/auth/LogoutButton";

export default function PaymentsPage() {
  const { isLoading: isAuthLoading } = useRequireAuth();
  const [showFundModal, setShowFundModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [fundAmount, setFundAmount] = useState("");
  const [selectedInstallment, setSelectedInstallment] =
    useState<PaymentScheduleItem | null>(null);
  const [paymentsData, setPaymentsData] = useState<PaymentsOverview | null>(
    null
  );
  const [studentProfile, setStudentProfile] = useState<{
    fullName: string;
    studentId: string;
    centerName?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] =
    useState<PaymentBreakdownItem | null>(null);
  const [customAmount, setCustomAmount] = useState<number | null>(null);
  const [showAmountInput, setShowAmountInput] = useState<string | null>(null);

  // Function to fetch payments data
  const fetchPaymentsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch payments overview from the backend
      const payments = await getPaymentsOverviewClient();

      // Validate response structure
      if (!payments) {
        throw new Error("Invalid response from server");
      }

      // Ensure all required fields exist
      const validatedPayments: PaymentsOverview = {
        walletBalance: payments.walletBalance ?? 0,
        paymentSchedule: Array.isArray(payments.paymentSchedule)
          ? payments.paymentSchedule
          : [],
        paymentBreakdown: Array.isArray(payments.paymentBreakdown)
          ? payments.paymentBreakdown
          : [],
      };

      setPaymentsData(validatedPayments);
    } catch (err: any) {
      console.error("Error fetching payments:", err);

      // Handle specific error cases
      if (err.response) {
        const status = err.response.status;
        const errorData = err.response.data;

        switch (status) {
          case 401:
            setError("Your session has expired. Please log in again.");
            // Redirect to login after a delay
            setTimeout(() => {
              window.location.href = "/auth/login";
            }, 2000);
            break;
          case 403:
            setError(
              "Access denied. You may not have permission to view payment information. Please contact support if you believe this is an error."
            );
            break;
          case 404:
            setError(
              "Payments endpoint not found (404). " +
                "Please ensure:\n" +
                "1. The backend server is running\n" +
                "2. The backend route '/portal/student/payments-overview' is implemented\n" +
                "3. The backend server has been restarted after the route change\n" +
                "4. Check the backend logs for route registration"
            );
            console.error("404 Error Details:", {
              endpoint: "/portal/student/payments-overview",
              fullUrl: err.config?.url,
              baseURL: err.config?.baseURL,
            });
            break;
          default:
            setError(
              errorData?.message ||
                err.message ||
                "Failed to load payments data. Please try again."
            );
        }
      } else if (err.request) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(
          err.message || "An unexpected error occurred. Please try again."
        );
      }

      // Set empty data on error
      setPaymentsData({
        walletBalance: 0,
        paymentSchedule: [],
        paymentBreakdown: [],
      });
    } finally {
      setLoading(false);
    }

    // Fetch student profile for header (separate try-catch so it doesn't block payments)
    try {
      const profileResponse = await getProfileClient();
      const profileData = profileResponse.data || profileResponse;
      if (profileData) {
        setStudentProfile({
          fullName: profileData.fullName || "Student",
          studentId: profileData.studentId || "N/A",
          centerName: profileData.center?.name || "N/A",
        });
      } else {
        setStudentProfile({
          fullName: "Student",
          studentId: "N/A",
          centerName: "N/A",
        });
      }
    } catch (profileError: any) {
      console.warn("Could not fetch student profile for header:", profileError);
      // Use fallback - don't block the page if profile fetch fails
      setStudentProfile({
        fullName: "Student",
        studentId: "N/A",
        centerName: "N/A",
      });
    }
  }, []);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchPaymentsData();
    }
  }, [isAuthLoading]);

  // Handle Paystack callback
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const reference = urlParams.get("reference");
      const trxref = urlParams.get("trxref");
      const status = urlParams.get("status");

      // If we have payment callback params, handle them
      const paymentReference = reference || trxref;
      if (paymentReference) {
        const handlePaymentCallback = async () => {
          try {
            const pendingInstallmentRef = sessionStorage.getItem(
              "pendingInstallmentPayment"
            );
            const isInstallmentPayment =
              paymentReference.startsWith("INST_") ||
              pendingInstallmentRef !== null;

            if (isInstallmentPayment) {
              await verifyInstallmentPaymentClient(paymentReference);

              // Clear the stored reference after successful verification
              sessionStorage.removeItem("pendingInstallmentPayment");
            } else {
              // Verify wallet funding
              await verifyWalletFundingClient(paymentReference);
            }

            // Wait a moment for backend to process
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Refresh data to show updated balance/payments
            await fetchPaymentsData();

            // Clean up URL
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );
          } catch (err: any) {
            console.error("Error verifying payment:", err);
            setError(
              err.response?.data?.message ||
                err.message ||
                "Payment verification failed. Please contact support if the payment was successful."
            );

            // Clear stored reference on error
            sessionStorage.removeItem("pendingInstallmentPayment");

            // Still refresh data in case payment was successful but verification failed
            setTimeout(() => {
              fetchPaymentsData();
            }, 2000);

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
          setError("Payment was not successful. Please try again.");

          // Clear stored reference on failure
          sessionStorage.removeItem("pendingInstallmentPayment");

          // Clean up URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname
          );
        }
      }
    }
  }, [fetchPaymentsData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Local formatDate for display (MM/DD/YYYY format)
  const formatDateForDisplay = (dateInput: string | Date) => {
    // Handle both string and Date object inputs
    let dateString: string;
    if (dateInput instanceof Date) {
      dateString = dateInput.toISOString();
    } else if (typeof dateInput === "string") {
      dateString = dateInput;
    } else {
      return String(dateInput);
    }

    if (dateString.includes("/")) {
      return dateString;
    }
    // If it's an ISO date, format it
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return as-is if invalid date
      }
      return date.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      });
    } catch (error) {
      return dateString;
    }
  };

  const handlePayClick = (scheduleItem: PaymentScheduleItem) => {
    setSelectedInstallment(scheduleItem);
    setShowPayModal(true);
  };

  const handleReceiptClick = async (payment: PaymentBreakdownItem) => {
    try {
      setIsGeneratingPDF(true);
      setSelectedPaymentForReceipt(payment);

      // Wait a bit to ensure the receipt is rendered
      await new Promise((resolve) => setTimeout(resolve, 500));

      const receiptElement = document.getElementById("receipt-content");
      if (!receiptElement) {
        throw new Error("Receipt element not found");
      }

      // Hide action buttons for PDF
      const actionButtons = receiptElement.querySelectorAll(".print-hidden");
      actionButtons.forEach((btn) => {
        (btn as HTMLElement).style.display = "none";
      });

      // Generate canvas from the receipt
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(receiptElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: receiptElement.scrollWidth,
        height: receiptElement.scrollHeight,
        windowWidth: receiptElement.scrollWidth,
        windowHeight: receiptElement.scrollHeight,
      });

      // Restore action buttons
      actionButtons.forEach((btn) => {
        (btn as HTMLElement).style.display = "";
      });

      const imgData = canvas.toDataURL("image/png");

      // Calculate PDF dimensions
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth;
      const pageHeight = 297; // A4 height in mm

      // Create PDF
      const jsPDF = (await import("jspdf")).default;
      const pdf = new jsPDF("p", "mm", "a4");

      // Scale down if content is taller than one page to fit on single page
      let finalPdfHeight = pdfHeight;
      let finalPdfWidth = pdfWidth;

      if (pdfHeight > pageHeight) {
        // Scale down proportionally to fit on one page
        const scale = pageHeight / pdfHeight;
        finalPdfHeight = pageHeight;
        finalPdfWidth = pdfWidth * scale;
      }

      // Add image to PDF (single page)
      pdf.addImage(
        imgData,
        "PNG",
        (210 - finalPdfWidth) / 2,
        0,
        finalPdfWidth,
        finalPdfHeight
      );

      // Generate filename
      const sanitizedName = (studentProfile?.fullName || "receipt")
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      const filename = `payment_receipt_${sanitizedName}_${
        payment.reference || Date.now()
      }.pdf`;

      // Download PDF
      pdf.save(filename);
    } catch (error: any) {
      console.error("Error downloading receipt:", error);
      alert(
        `Failed to download receipt: ${error.message || "Please try again."}`
      );
    } finally {
      setIsGeneratingPDF(false);
      // Keep the receipt data for a moment in case user wants to try again
      setTimeout(() => {
        setSelectedPaymentForReceipt(null);
      }, 1000);
    }
  };

  if (isAuthLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !paymentsData) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-indigo-600 hover:text-indigo-800 px-4 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const profile = studentProfile || { fullName: "Student", studentId: "N/A" };
  const walletBalance = paymentsData?.walletBalance || 0;
  const paymentSchedule = paymentsData?.paymentSchedule || [];
  const paymentBreakdown = paymentsData?.paymentBreakdown || [];

  // Separate payments and installments
  const paidPayments = paymentSchedule.filter(
    (item) => item.isPayment && item.status === "PAID"
  );
  const pendingInstallments = paymentSchedule.filter(
    (item) => !item.isPayment || item.status === "PENDING"
  );

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans antialiased">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link href="/">
              <Image
                src="/images/Logo.png"
                alt="TT Showcase"
                width={140}
                height={35}
                className="object-contain"
              />
            </Link>
            <div className="hidden md:flex gap-6">
              <Link
                href="/dashboard"
                className="text-gray-400 hover:text-gray-600 flex items-center gap-2"
              >
                <span className="text-lg">
                  <MdDashboard />
                </span>{" "}
                Dashboard
              </Link>
              <Link
                href="/payments"
                className="text-indigo-600 font-bold border-b-2 border-indigo-600 pb-1 flex items-center gap-2"
              >
                <span className="text-lg">
                  <HiMiniCreditCard />
                </span>{" "}
                My Payments
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-800 leading-none">
                {profile.fullName}
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                ID: {profile.studentId}
              </p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-12">
        <header className="mb-10">
          <h1 className="text-[26px] font-bold text-[#111827] tracking-tight">
            My Payments
          </h1>
          <p className="text-gray-400 text-sm mt-1 font-normal">
            View your past payment records and make installmental payments.
          </p>
        </header>

        <div className="space-y-8">
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[#6366F1]">
                  <BiWallet className="w-5 h-5" />
                  <span className="text-sm font-bold text-gray-800">
                    Wallet Balance
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(walletBalance)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fetchPaymentsData()}
                  disabled={loading}
                  className="text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh wallet balance"
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
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh
                </button>
                <button
                  onClick={() => setShowFundModal(true)}
                  className="bg-[#6366F1] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                >
                  <HiPlus className="w-4 h-4" />
                  Fund
                </button>
              </div>
            </div>
          </section>

          {/* Payment Schedule Card */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-gray-50">
              <h2 className="text-md font-bold text-gray-800">
                Payment Schedule
              </h2>
            </div>
            <div className="px-8 pb-8">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-gray-500 uppercase tracking-widest border-b border-gray-100">
                    <th className="py-4 font-normal text-xs">Description</th>
                    <th className="py-4 font-normal text-xs">Due Date</th>
                    <th className="py-4 font-normal text-xs">Amount</th>
                    <th className="py-4 font-normal text-xs">Status</th>
                    <th className="py-4 font-normal text-xs text-right pr-6">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paymentSchedule.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-gray-500"
                      >
                        No payment schedule available
                      </td>
                    </tr>
                  ) : (
                    <>
                      {/* Show paid payments first */}
                      {paidPayments.map((item) => (
                        <tr key={item.id} className="text-[14px]">
                          <td className="py-6 font-semibold text-gray-800">
                            {item.description}
                          </td>
                          <td className="py-6 text-gray-500 font-medium">
                            {formatDateForDisplay(item.dueDate)}
                          </td>
                          <td className="py-6 font-bold text-gray-800">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="py-6">
                            <span className="px-3 py-1 rounded-full text-xs font-normal bg-green-100 text-green-600">
                              Paid
                            </span>
                          </td>
                          <td className="py-6 text-right">
                            <span className="text-gray-400 text-xs font-medium">
                              No Pending Action
                            </span>
                          </td>
                        </tr>
                      ))}
                      {/* Then show pending installments */}
                      {pendingInstallments.map((item) => (
                        <tr key={item.id} className="text-[14px]">
                          <td className="py-6 font-semibold text-gray-800">
                            {item.description}
                          </td>
                          <td className="py-6 text-gray-500 font-medium">
                            {formatDateForDisplay(item.dueDate)}
                          </td>
                          <td className="py-6 font-bold text-gray-800">
                            <div>
                              {formatCurrency(item.amount)}
                              {item.minimumAmount &&
                                item.amount > item.minimumAmount && (
                                  <span className="text-xs text-gray-500 block font-normal mt-1">
                                    (Min: {formatCurrency(item.minimumAmount)})
                                  </span>
                                )}
                            </div>
                          </td>
                          <td className="py-6">
                            <span className="px-3 py-1 rounded-full text-xs font-normal bg-yellow-100 text-yellow-600">
                              Pending
                            </span>
                          </td>
                          <td className="py-6 text-right">
                            {item.canPay && item.status === "PENDING" ? (
                              <div className="space-y-2">
                                {showAmountInput === item.id ? (
                                  <div className="flex gap-2 items-center">
                                    <input
                                      type="number"
                                      min={item.minimumAmount || item.amount}
                                      step="0.01"
                                      placeholder={`Min: ${formatCurrency(
                                        item.minimumAmount || item.amount
                                      )}`}
                                      value={customAmount || ""}
                                      onChange={(e) =>
                                        setCustomAmount(
                                          parseFloat(e.target.value) || null
                                        )
                                      }
                                      className="border border-gray-200 text-gray-600 rounded-lg px-3 py-2 w-32 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <button
                                      onClick={() => {
                                        setShowAmountInput(null);
                                        setCustomAmount(null);
                                      }}
                                      className="px-3 py-2 text-gray-600 text-xs hover:text-gray-800"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => {
                                        const amountToPay =
                                          customAmount || item.amount;
                                        const minAmount =
                                          item.minimumAmount || item.amount;

                                        if (amountToPay < minAmount) {
                                          alert(
                                            `Amount must be at least ${formatCurrency(
                                              minAmount
                                            )}`
                                          );
                                          return;
                                        }

                                        // Create a modified installment object with custom amount
                                        const modifiedItem = {
                                          ...item,
                                          amount: amountToPay,
                                        };
                                        handlePayClick(modifiedItem);
                                        setShowAmountInput(null);
                                        setCustomAmount(null);
                                      }}
                                      className="bg-[#6366F1] text-white px-4 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
                                    >
                                      Pay
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setShowAmountInput(item.id);
                                      setCustomAmount(item.amount);
                                    }}
                                    className="bg-[#6366F1] text-white px-5 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
                                  >
                                    Pay Now
                                  </button>
                                )}
                                {item.minimumAmount && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    You can pay more than the minimum
                                  </p>
                                )}
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Payment Breakdown / Receipt */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-8 pb-0">
              <h2 className="text-md font-bold text-gray-800">
                Payment Breakdown
              </h2>
            </div>
            <div className="p-8 pt-4">
              {paymentBreakdown.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No payment records available
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentBreakdown.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-6 bg-[#F9FAFB] border border-gray-100 rounded-xl"
                    >
                      <div className="flex items-center gap-4">
                        <IoIosCheckmarkCircleOutline className="w-6 h-6 text-[#6366F1]" />
                        <div className="flex flex-col gap-1">
                          <h3 className="text-sm font-bold text-gray-800">
                            Payment Successful
                          </h3>
                          <p className="text-xs text-gray-400 font-medium">
                            {payment.reference}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right flex flex-col gap-1">
                          <p className="text-md font-bold text-gray-800">
                            {formatCurrency(payment.amount)}
                          </p>
                          <p className="text-xs text-gray-400 font-medium">
                            {formatDateForDisplay(payment.date)}
                          </p>
                        </div>
                        {payment.hasReceipt && (
                          <button
                            onClick={() => handleReceiptClick(payment)}
                            disabled={isGeneratingPDF}
                            className="flex items-center gap-3 px-4 py-2 border border-gray-200 rounded-lg text-sm font-normal text-gray-600 hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <AiFillPrinter className="w-5 h-5 text-gray-800" />
                            {isGeneratingPDF ? "Generating..." : "Receipt"}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-8 py-10 flex justify-between items-center text-[11px] text-gray-400 font-medium border-t border-gray-100">
        <p>2026 TT Showcase Student Portal. All rights reserved.</p>
        <Link href="#" className="hover:underline hover:text-gray-600">
          Contact Support
        </Link>
      </footer>

      <FundWallet
        showFundModal={showFundModal}
        setShowFundModal={setShowFundModal}
        fundAmount={fundAmount}
        setFundAmount={setFundAmount}
        onclose={() => setShowFundModal(false)}
      />

      <PayInstallment
        show={showPayModal}
        amount={
          selectedInstallment
            ? formatCurrency(selectedInstallment.amount)
            : "₦0"
        }
        installment={selectedInstallment}
        walletBalance={paymentsData?.walletBalance || 0}
        onClose={() => {
          setShowPayModal(false);
          setSelectedInstallment(null);
        }}
        onSuccess={() => {
          // Refresh payments data after successful payment
          fetchPaymentsData();
        }}
      />

      {/* Receipt for PDF Generation - Rendered off-screen but visible to html2canvas */}
      {selectedPaymentForReceipt && studentProfile && (
        <div
          style={{
            position: "fixed",
            left: "-9999px",
            top: 0,
            width: "210mm", // A4 width
            minHeight: "auto", // Allow content to determine height
            backgroundColor: "#ffffff",
            zIndex: -1,
            overflow: "visible", // Ensure all content is visible
          }}
        >
          <PaymentReceipt
            studentName={studentProfile.fullName}
            studentId={studentProfile.studentId}
            course={selectedPaymentForReceipt.course?.name || "N/A"}
            batch={undefined}
            amountPaid={selectedPaymentForReceipt.amount}
            paymentMethod={
              selectedPaymentForReceipt.paymentMethod || "Online Payment"
            }
            datePaid={formatDate(selectedPaymentForReceipt.date)}
            recordedBy="System"
            center={studentProfile.centerName || "N/A"}
            paymentType={
              selectedPaymentForReceipt.status === "APPROVED"
                ? "Payment"
                : "Pending Payment"
            }
            transactionId={selectedPaymentForReceipt.reference}
          />
        </div>
      )}
    </div>
  );
}
