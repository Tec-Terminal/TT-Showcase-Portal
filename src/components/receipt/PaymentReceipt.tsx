"use client";

interface PaymentReceiptProps {
  studentName: string;
  studentId?: string;
  course: string;
  batch?: string;
  amountPaid: number;
  paymentMethod: string;
  datePaid: string;
  recordedBy?: string;
  center: string;
  paymentType: string;
  transactionId: string;
  showActions?: boolean;
  onPrint?: () => void;
  onDownloadPDF?: () => void;
  onShareWhatsApp?: () => void;
}

export default function PaymentReceipt({
  studentName,
  studentId,
  course,
  batch,
  amountPaid,
  paymentMethod,
  datePaid,
  recordedBy,
  center,
  paymentType,
  transactionId,
  showActions = false,
  onPrint,
  onDownloadPDF,
  onShareWhatsApp,
}: PaymentReceiptProps) {
  const amountPaidFormatted = `NGN ${amountPaid.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  // Terms & Conditions content
  const termsAndConditions = {
    intro:
      "This receipt confirms your payment for the specified course. Please retain for your records.",
    refundPolicy:
      "All course fees are non-refundable after 7 days from the payment date. A 50% refund is available if cancellation occurs within 7 days, provided no more than 10% of the course content has been accessed. Administrative fees may apply.",
    paymentRestrictions:
      "Payments are accepted via credit card, bank transfer, or approved digital wallets. Partial payments are only accepted under a pre-approved installment plan. Late payments may incur additional charges.",
    lateFees:
      "A late fee of 5% of the outstanding balance will be applied for payments not received within 3 days past the due date. Continued non-payment may result in suspension from class and course access.",
    courseEnrollment:
      "Enrollment is only confirmed upon full payment or establishment of an approved payment plan. Access to course materials will be granted immediately after payment confirmation.",
  };

  return (
    <div
      id="receipt-content"
      style={{
        width: '100%',
        maxWidth: '896px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-content, #receipt-content * {
            visibility: visible;
          }
          #receipt-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          .print-hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src="/images/Logo.png"
              alt="Tecterminal Logo"
              style={{ height: '48px', width: 'auto' }}
            />
          </div>
          {showActions && (
            <div
              className="print-hidden"
              style={{ display: 'flex', gap: '8px' }}
            >
              <button
                style={{
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  color: '#374151',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                onClick={onPrint}
              >
                <svg
                  style={{ width: '14px', height: '14px' }}
                  fill="none"
                  stroke="#374151"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Print Receipt
              </button>
              <button
                style={{
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  color: '#374151',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                onClick={onShareWhatsApp}
              >
                <svg
                  style={{ width: '14px', height: '14px' }}
                  fill="none"
                  stroke="#374151"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                Send via WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: '24px' }}>
        {/* Receipt Title */}
        <h2
          style={{
            fontSize: '22px',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '20px',
          }}
        >
          Payment Receipt
        </h2>

        {/* Student & Payment Details Section */}
        <div
          style={{
            padding: '20px',
            border: '1px solid #e5e7eb',
            borderRadius: '10px',
            backgroundColor: '#f9fafb',
            marginBottom: '24px',
          }}
        >
          <h3
            style={{
              fontSize: '17px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '14px',
            }}
          >
            Student & Payment Details
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '14px 18px',
            }}
          >
            {/* Column 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <DetailItem label="Student Name" value={studentName} />
              <DetailItem label="Course" value={course} />
              <DetailItem label="Amount Paid" value={amountPaidFormatted} />
              <DetailItem label="Date Paid" value={datePaid} />
            </div>
            {/* Column 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <DetailItem label="Student ID" value={studentId || "N/A"} />
              <DetailItem label="Batch" value={batch || "N/A"} />
              <DetailItem label="Payment Method" value={paymentMethod} />
              <DetailItem label="Recorded By" value={recordedBy || "System"} />
            </div>
            {/* Column 3 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <DetailItem label="Center" value={center} />
              <DetailItem label="Payment Type" value={paymentType} />
              <DetailItem label="Transaction ID" value={transactionId} />
            </div>
          </div>
        </div>

        {/* Terms & Conditions Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '12px' }}>
          <h3
            style={{
              fontSize: '17px',
              fontWeight: '600',
              color: '#1f2937',
              borderBottom: '1px solid #d1d5db',
              paddingBottom: '8px',
              marginBottom: '6px',
            }}
          >
            Terms & Conditions
          </h3>

          <p
            style={{
              fontSize: '13px',
              color: '#374151',
              fontStyle: 'italic',
              marginBottom: '6px',
            }}
          >
            {termsAndConditions.intro}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <PolicyBlock
              title="Refund Policy"
              content={termsAndConditions.refundPolicy}
            />
            <PolicyBlock
              title="Payment Restrictions"
              content={termsAndConditions.paymentRestrictions}
            />
            <PolicyBlock
              title="Late Fees"
              content={termsAndConditions.lateFees}
            />
            <PolicyBlock
              title="Course Enrollment"
              content={termsAndConditions.courseEnrollment}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        className="print-hidden"
        style={{
          padding: '16px',
          borderTop: '1px solid #e5e7eb',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#6b7280',
          }}
        >
          <span>Powered by TecTerminal</span>
        </div>
      </div>
    </div>
  );
}

const DetailItem = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div style={{ display: 'flex', flexDirection: 'column' }}>
    <span style={{ fontSize: '13px', color: '#6b7280', marginBottom: '3px' }}>
      {label}
    </span>
    <span
      style={{
        fontSize: '13px',
        fontWeight: '500',
        color: '#111827',
      }}
    >
      {value}
    </span>
  </div>
);

const PolicyBlock = ({
  title,
  content,
}: {
  title: string;
  content: string;
}) => (
  <div
    style={{
      padding: '12px 14px',
      backgroundColor: '#f3f4f6',
      borderRadius: '8px',
    }}
  >
    <h4
      style={{
        fontSize: '14px',
        fontWeight: '600',
        color: '#1f2937',
        marginBottom: '4px',
      }}
    >
      {title}
    </h4>
    <p style={{ fontSize: '12px', color: '#4b5563', margin: 0, lineHeight: '1.5' }}>
      {content}
    </p>
  </div>
);
