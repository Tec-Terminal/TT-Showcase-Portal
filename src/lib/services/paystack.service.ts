/**
 * Paystack Payment Service
 * Handles Paystack payment initialization and verification
 */

export interface PaystackInitializeRequest {
  email: string;
  amount: number; // Amount in kobo (smallest currency unit)
  reference: string; // Unique transaction reference
  callback_url?: string;
  metadata?: {
    [key: string]: any;
  };
  channels?: string[]; // Payment channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer']
}

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    amount: number;
    currency: string;
    transaction_date: string;
    status: string;
    reference: string;
    domain: string;
    metadata: {
      [key: string]: any;
    };
    gateway_response: string;
    customer: {
      email: string;
      first_name: string;
      last_name: string;
      phone: string;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string | null;
    };
  };
}

/**
 * Initialize Paystack payment
 * This should be called from the backend API route
 */
export async function initializePaystackPayment(
  request: PaystackInitializeRequest
): Promise<PaystackInitializeResponse> {
  try {
    const response = await fetch('/api/paystack/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle different error formats
      const errorMessage = data.error || data.message || 'Failed to initialize payment';
      console.error('Paystack initialization error:', {
        status: response.status,
        error: data,
        request: { email: request.email, amount: request.amount, reference: request.reference }
      });
      throw new Error(errorMessage);
    }

    return data;
  } catch (error: any) {
    // Re-throw if it's already an Error with message
    if (error instanceof Error) {
      throw error;
    }
    // Otherwise wrap in Error
    throw new Error(error.message || 'Failed to initialize payment');
  }
}

/**
 * Verify Paystack payment
 * This should be called from the backend API route
 */
export async function verifyPaystackPayment(
  reference: string
): Promise<PaystackVerifyResponse> {
  const response = await fetch(`/api/paystack/verify/${reference}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to verify payment');
  }

  return response.json();
}

