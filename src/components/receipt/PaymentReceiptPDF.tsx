"use client";

/**
 * Simplified receipt component for PDF generation
 * Uses inline styles with explicit hex colors to avoid lab() color issues
 */
interface PaymentReceiptPDFProps {
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
}

export default function PaymentReceiptPDF({
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
}: PaymentReceiptPDFProps) {
  return (
    <div
      id="payment-receipt"
      style={{
        backgroundColor: '#ffffff',
        color: '#111827',
        padding: '32px',
        maxWidth: '800px',
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#4f46e5',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M9 18L15 12L9 6"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15 18L21 12L15 6"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#111827',
                margin: 0,
              }}
            >
              Tecterminal
            </h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              Connect. Access. Succeed
            </p>
          </div>
        </div>
      </div>

      {/* Payment Receipt Title */}
      <h2
        style={{
          fontSize: '30px',
          fontWeight: 'bold',
          color: '#111827',
          marginBottom: '32px',
          textAlign: 'center',
        }}
      >
        Payment Receipt
      </h2>

      {/* Student & Payment Details */}
      <div style={{ marginBottom: '32px' }}>
        <h3
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '16px',
          }}
        >
          Student & Payment Details
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
          }}
        >
          <div>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              Student Name
            </p>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#111827', margin: 0 }}>
              {studentName}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              Student ID
            </p>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#111827', margin: 0 }}>
              {studentId || 'N/A'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              Course
            </p>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#111827', margin: 0 }}>
              {course}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              Batch
            </p>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#111827', margin: 0 }}>
              {batch || 'N/A'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              Amount Paid
            </p>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#111827', margin: 0 }}>
              NGN {amountPaid.toLocaleString('en-NG', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              Payment Method
            </p>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#111827', margin: 0 }}>
              {paymentMethod}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              Date Paid
            </p>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#111827', margin: 0 }}>
              {datePaid}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              Recorded By
            </p>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#111827', margin: 0 }}>
              {recordedBy || 'System'}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              Center
            </p>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#111827', margin: 0 }}>
              {center}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              Payment Type
            </p>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#111827', margin: 0 }}>
              {paymentType}
            </p>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              Transaction ID
            </p>
            <p style={{ fontSize: '16px', fontWeight: '500', color: '#111827', margin: 0 }}>
              {transactionId}
            </p>
          </div>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div>
        <h3
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#111827',
            marginBottom: '16px',
          }}
        >
          Terms & Conditions
        </h3>
        <p style={{ fontSize: '14px', color: '#374151', marginBottom: '16px' }}>
          This receipt confirms your payment for the specified course. Please retain
          for your records.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h4
              style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '8px',
              }}
            >
              Refund Policy
            </h4>
            <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>
              All course fees are non-refundable after 7 days from the payment date.
              A 50% refund is available if cancellation occurs within 7 days, provided
              no more than 10% of the course content has been accessed. Administrative
              fees may apply.
            </p>
          </div>

          <div>
            <h4
              style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '8px',
              }}
            >
              Payment Restrictions
            </h4>
            <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>
              Payments are accepted via credit card, bank transfer, or approved
              digital wallets. Partial payments are only accepted under a pre-approved
              installment plan. Late payments may incur additional charges.
            </p>
          </div>

          <div>
            <h4
              style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '8px',
              }}
            >
              Late Fees
            </h4>
            <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>
              A late fee of 5% of the outstanding balance will be applied for payments
              not received within 3 days past the due date. Continued non-payment may
              result in suspension from class and course access.
            </p>
          </div>

          <div>
            <h4
              style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '8px',
              }}
            >
              Course Enrollment
            </h4>
            <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>
              Enrollment is only confirmed upon full payment or establishment of an
              approved payment plan. Access to course materials will be granted
              immediately after payment confirmation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

