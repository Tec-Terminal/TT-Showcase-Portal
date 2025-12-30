"use client";
import { CheckCircle2, Download, ArrowRight, Info } from "lucide-react";
import { FaCircleCheck } from "react-icons/fa6";
import { MdOutlineCreditCard } from "react-icons/md";
import { AiFillInfoCircle } from "react-icons/ai";
import { IoPrint } from "react-icons/io5";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PaymentReceipt from "@/components/receipt/PaymentReceipt";
import { formatDate } from "@/lib/utils/errorHandler";

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

interface PaymentSuccessProps {
  courseName?: string;
  paymentPlan?: PaymentPlan | null;
  paymentReference?: string;
  userName?: string;
  userEmail?: string;
  paymentMethod?: string;
  centerName?: string;
  studentId?: string;
  onComplete?: () => void;
}

export default function PaymentSuccess({
  courseName = "Basic Digital Marketing Course",
  paymentPlan,
  paymentReference,
  userName,
  userEmail,
  paymentMethod,
  centerName,
  studentId,
  onComplete,
}: PaymentSuccessProps) {
  const router = useRouter();
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleGoToDashboard = () => {
    if (onComplete) {
      onComplete();
    }
    router.push("/dashboard");
  };

  const handleDownloadReceipt = async () => {
    try {
      setIsGeneratingPDF(true);
      
      // Wait a bit to ensure the receipt is rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      
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

      // Create PDF
      const jsPDF = (await import("jspdf")).default;
      const pdf = new jsPDF("p", "mm", "a4");
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

      // Generate filename
      const sanitizedName = (userName || "receipt")
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      const filename = `payment_receipt_${sanitizedName}_${paymentReference || Date.now()}.pdf`;

      // Download PDF
      pdf.save(filename);
    } catch (error: any) {
      console.error("Error downloading receipt:", error);
      alert(`Failed to download receipt: ${error.message || "Please try again."}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Use actual payment reference or generate fallback
  const transactionId = paymentReference
    ? paymentReference
    : `TRX-${Math.floor(Math.random() * 1000000)}`;

  const today = new Date();
  const paymentDate = today.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const amountPaid = paymentPlan?.initialDeposit || 0;

  // Receipt data - format date like the ERP
  const receiptDate = formatDate(today);
  
  // Use the actual userName prop, not a fallback displayName
  const receiptStudentName = userName || "Student";

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-3xl mx-auto py-12 px-4 text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <FaCircleCheck size={44} className="text-green-600" />
          </div>
        </div>

        <h1 className="text-3xl font-semibold text-gray-900 mb-4">
          Payment Successful!
        </h1>
        <p className="text-gray-500 max-w-md mx-auto mb-10">
          Thank you, {receiptStudentName}. Your registration for{" "}
          <span className="font-semibold text-gray-900 capitalize">
            {courseName}
          </span>{" "}
          is confirmed.
        </p>

        {/* Receipt Card */}
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm mb-12">
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
            <span className="text-sm font-normal text-gray-500 tracking-widest">
              Transaction Summary
            </span>
            <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-0.5 rounded-full">
              Paid
            </span>
          </div>
          <div className="p-8 grid grid-cols-2 gap-y-8 text-left">
            <div>
              <p className="text-sm text-gray-400 font-normal mb-1">
                Amount Paid
              </p>
              <p className="text-xl font-medium text-gray-900">
                ₦
                {amountPaid.toLocaleString("en-NG", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 font-normal mb-1">Date</p>
              <p className="text-lg font-medium text-gray-900">{paymentDate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 font-normal mb-1">
                Transaction ID
              </p>
              <p className="text-lg font-normal text-gray-900">
                {transactionId}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 font-normal mb-1">
                Payment Method
              </p>
              <p className="text-md font-medium text-gray-900 flex items-center gap-2">
                <MdOutlineCreditCard className="text-gray-400" size={20} />
                {paymentMethod || "Paystack"}
              </p>
            </div>
          </div>
          <div className="p-6 bg-gray-50 flex justify-end gap-4">
            <button
              onClick={handleDownloadReceipt}
              disabled={isGeneratingPDF}
              className="flex items-center justify-center gap-2 px-5 py-3 border border-gray-200 bg-white rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IoPrint size={18} />
              {isGeneratingPDF ? "Generating..." : "Download Receipt"}
            </button>
            <button
              onClick={handleGoToDashboard}
              className="px-7 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        </div>

        {/* What To Do Next Section */}
        <div className="text-left space-y-6">
          <div className="flex items-center gap-2 text-indigo-600">
            <AiFillInfoCircle size={22} />
            <h3 className="text-black font-bold text-lg tracking-widest">
              What To do Next?
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-indigo-600 shrink-0 flex items-center justify-center font-bold text-indigo-600">
                1
              </div>
              <div>
                <p className="font-medium text-gray-900">Save your receipt</p>
                <p className="text-sm text-gray-500 leading-relaxed mt-1">
                  A copy of your payment confirmation has been sent to your
                  email. Please keep it for your records.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-gray-300 shrink-0 flex items-center justify-center font-bold text-gray-500">
                2
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  Visit the TT Showcase Centre
                </p>
                <p className="text-sm text-gray-500 leading-relaxed mt-1">
                  Visit us within 48 hours to complete your physical enrollment
                  and pick up your student ID card.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Receipt for PDF Generation - Rendered off-screen but visible to html2canvas */}
        <div 
          style={{ 
            position: 'fixed', 
            left: '-9999px', 
            top: 0,
            width: '210mm', // A4 width
            backgroundColor: '#ffffff',
            zIndex: -1
          }}
        >
          <PaymentReceipt
            studentName={receiptStudentName}
            studentId={studentId || "N/A"}
            course={courseName || "N/A"}
            amountPaid={amountPaid}
            paymentMethod={paymentMethod || "Paystack"}
            datePaid={receiptDate}
            center={centerName || "N/A"}
            paymentType="Course Fee"
            transactionId={transactionId}
          />
        </div>
      </main>
    </div>
  );
}
