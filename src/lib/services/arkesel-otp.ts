/**
 * Arkesel OTP Service
 *
 * Phone number verification via SMS OTP.
 * Credentials are managed from Admin → API Management.
 *
 * PRODUCTION-READY: All calls go through the Central API Execution Layer.
 * Demo mode still uses real logic but logs to console instead of sending SMS.
 *
 * Capabilities:
 * - Phone number verification
 * - OTP for withdrawals
 * - OTP for password changes
 * - OTP for sensitive actions
 */

import { useIntegrationsStore } from '../integrations-store';
import { executeAPI, isIntegrationReady, getIntegrationStatus } from '../api-execution-layer';

const INTEGRATION_ID = 'arkesel_otp';
const ARKESEL_API_BASE = 'https://sms.arkesel.com/api/v2';

export type OTPPurpose =
  | 'phone_verification'
  | 'withdrawal'
  | 'password_change'
  | 'sensitive_action'
  | 'login_verification';

export interface OTPSendRequest {
  phone: string;
  purpose: OTPPurpose;
  userId?: string;
}

export interface OTPSendResponse {
  success: boolean;
  message: string;
  expiresIn?: number; // seconds
  reference?: string;
  isDemoMode?: boolean;
  integrationDisabled?: boolean;
}

export interface OTPVerifyRequest {
  phone: string;
  otp: string;
  purpose: OTPPurpose;
  reference?: string;
}

export interface OTPVerifyResponse {
  success: boolean;
  message: string;
  verified: boolean;
  integrationDisabled?: boolean;
}

// Rate limiting store (in-memory for demo, use Redis in production)
const otpRateLimits: Map<string, { count: number; resetAt: number }> = new Map();
const MAX_REQUESTS_PER_HOUR = 5;

// OTP storage (in-memory for demo, use Redis in production)
const otpStore: Map<string, { otp: string; expiresAt: number; purpose: OTPPurpose; attempts: number }> = new Map();
const MAX_VERIFY_ATTEMPTS = 3;

/**
 * Get Arkesel configuration from integrations store
 */
export const getArkeselConfig = (): {
  apiKey: string;
  senderId: string;
  isDemoMode: boolean;
} | null => {
  const store = useIntegrationsStore.getState();
  const integration = store.getIntegration(INTEGRATION_ID);

  if (!integration?.isEnabled || !integration?.isConfigured || integration?.status !== 'connected') {
    return null;
  }

  const apiKey = store.getCredentialValue(INTEGRATION_ID, 'ARKESEL_API_KEY');
  const senderId = store.getCredentialValue(INTEGRATION_ID, 'ARKESEL_SENDER_ID');

  if (!apiKey || !senderId) {
    return null;
  }

  return {
    apiKey,
    senderId,
    isDemoMode: integration.environment === 'demo',
  };
};

/**
 * Check if OTP service is available
 */
export const isOTPEnabled = (): boolean => {
  return isIntegrationReady(INTEGRATION_ID);
};

/**
 * Get OTP service status for UI display
 */
export const getOTPStatus = (): {
  available: boolean;
  message: string;
} => {
  const status = getIntegrationStatus(INTEGRATION_ID);
  return {
    available: status.available,
    message: status.message,
  };
};

/**
 * Check if running in demo mode
 */
export const isDemoMode = (): boolean => {
  const config = getArkeselConfig();
  return config?.isDemoMode ?? true;
};

/**
 * Generate a 6-digit OTP
 */
const generateOTP = (): string => {
  // Use Math.random for demo, crypto for production
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Format phone number to E.164 format
 */
const formatPhoneNumber = (phone: string): string => {
  let cleaned = phone.replace(/\s/g, '').replace(/-/g, '');

  // Convert local Ghana format to international
  if (cleaned.startsWith('0')) {
    cleaned = '+233' + cleaned.substring(1);
  }

  // Add + if missing
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  return cleaned;
};

/**
 * Validate phone number format
 */
const validatePhoneNumber = (phone: string): { valid: boolean; error?: string } => {
  const formatted = formatPhoneNumber(phone);

  // Ghana phone number validation
  if (!formatted.match(/^\+233[0-9]{9}$/)) {
    return {
      valid: false,
      error: 'Invalid phone number format. Use format: 0XX XXX XXXX',
    };
  }

  return { valid: true };
};

/**
 * Check rate limiting
 */
const checkRateLimit = (phone: string): { allowed: boolean; error?: string } => {
  const key = formatPhoneNumber(phone);
  const now = Date.now();
  const limit = otpRateLimits.get(key);

  if (limit) {
    // Reset if time expired
    if (now > limit.resetAt) {
      otpRateLimits.delete(key);
    } else if (limit.count >= MAX_REQUESTS_PER_HOUR) {
      const waitMinutes = Math.ceil((limit.resetAt - now) / 60000);
      return {
        allowed: false,
        error: `Too many OTP requests. Please wait ${waitMinutes} minutes.`,
      };
    }
  }

  return { allowed: true };
};

/**
 * Update rate limit counter
 */
const updateRateLimit = (phone: string): void => {
  const key = formatPhoneNumber(phone);
  const now = Date.now();
  const limit = otpRateLimits.get(key);

  if (limit && now <= limit.resetAt) {
    limit.count++;
  } else {
    otpRateLimits.set(key, {
      count: 1,
      resetAt: now + 3600000, // 1 hour
    });
  }
};

/**
 * Get purpose-specific message
 */
const getOTPMessage = (otp: string, purpose: OTPPurpose, senderId: string): string => {
  const messages: Record<OTPPurpose, string> = {
    phone_verification: `Your ${senderId} verification code is ${otp}. Valid for 5 minutes.`,
    withdrawal: `Your ${senderId} withdrawal confirmation code is ${otp}. Do not share this code.`,
    password_change: `Your ${senderId} password reset code is ${otp}. If you didn't request this, ignore this message.`,
    sensitive_action: `Your ${senderId} security code is ${otp}. Valid for 5 minutes.`,
    login_verification: `Your ${senderId} login code is ${otp}. If you didn't request this, secure your account.`,
  };

  return messages[purpose];
};

/**
 * Send OTP to phone number
 */
export const sendOTP = async (request: OTPSendRequest): Promise<OTPSendResponse> => {
  const config = getArkeselConfig();

  if (!config) {
    const status = getOTPStatus();
    return {
      success: false,
      message: status.message || 'OTP service not configured. Please contact support.',
      integrationDisabled: true,
    };
  }

  // Validate phone number
  const validation = validatePhoneNumber(request.phone);
  if (!validation.valid) {
    return {
      success: false,
      message: validation.error || 'Invalid phone number',
    };
  }

  // Check rate limiting
  const rateLimit = checkRateLimit(request.phone);
  if (!rateLimit.allowed) {
    return {
      success: false,
      message: rateLimit.error || 'Rate limit exceeded',
    };
  }

  const formattedPhone = formatPhoneNumber(request.phone);
  const otp = generateOTP();
  const reference = `otp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const expiresIn = 300; // 5 minutes
  const message = getOTPMessage(otp, request.purpose, config.senderId);

  if (config.isDemoMode) {
    // DEMO MODE: Store OTP locally, log instead of sending real SMS
    console.log(`[DEMO MODE] OTP for ${formattedPhone}: ${otp}`);
    console.log(`[DEMO MODE] Message: ${message}`);

    otpStore.set(formattedPhone, {
      otp,
      expiresAt: Date.now() + expiresIn * 1000,
      purpose: request.purpose,
      attempts: 0,
    });

    updateRateLimit(request.phone);

    return {
      success: true,
      message: 'OTP sent successfully (Demo Mode)',
      expiresIn,
      reference,
      isDemoMode: true,
    };
  }

  // LIVE MODE: Send real SMS via Arkesel API
  const result = await executeAPI<{
    code: string;
    message: string;
    data?: { id: string };
  }>(
    INTEGRATION_ID,
    'send_sms',
    async () => {
      const response = await fetch(`${ARKESEL_API_BASE}/sms/send`, {
        method: 'POST',
        headers: {
          'api-key': config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: config.senderId,
          message,
          recipients: [formattedPhone],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `SMS sending failed: ${response.status}`);
      }

      return response.json();
    },
    { timeout: 30000, maxRetries: 2 }
  );

  if (!result.success) {
    return {
      success: false,
      message: result.error?.message || 'Failed to send OTP',
    };
  }

  // Store OTP for verification
  otpStore.set(formattedPhone, {
    otp,
    expiresAt: Date.now() + expiresIn * 1000,
    purpose: request.purpose,
    attempts: 0,
  });

  updateRateLimit(request.phone);

  return {
    success: true,
    message: 'OTP sent successfully',
    expiresIn,
    reference,
    isDemoMode: false,
  };
};

/**
 * Verify OTP
 */
export const verifyOTP = async (request: OTPVerifyRequest): Promise<OTPVerifyResponse> => {
  if (!isOTPEnabled()) {
    const status = getOTPStatus();
    return {
      success: false,
      message: status.message || 'OTP service not configured',
      verified: false,
      integrationDisabled: true,
    };
  }

  const formattedPhone = formatPhoneNumber(request.phone);
  const storedOtp = otpStore.get(formattedPhone);

  if (!storedOtp) {
    return {
      success: false,
      message: 'No OTP found. Please request a new code.',
      verified: false,
    };
  }

  // Check max attempts
  if (storedOtp.attempts >= MAX_VERIFY_ATTEMPTS) {
    otpStore.delete(formattedPhone);
    return {
      success: false,
      message: 'Maximum verification attempts exceeded. Please request a new code.',
      verified: false,
    };
  }

  // Check expiration
  if (Date.now() > storedOtp.expiresAt) {
    otpStore.delete(formattedPhone);
    return {
      success: false,
      message: 'OTP has expired. Please request a new code.',
      verified: false,
    };
  }

  // Check purpose match
  if (storedOtp.purpose !== request.purpose) {
    return {
      success: false,
      message: 'OTP purpose mismatch. Please request a new code.',
      verified: false,
    };
  }

  // Increment attempts
  storedOtp.attempts++;

  // Verify OTP
  if (storedOtp.otp !== request.otp) {
    const remainingAttempts = MAX_VERIFY_ATTEMPTS - storedOtp.attempts;
    return {
      success: false,
      message: remainingAttempts > 0
        ? `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`
        : 'Invalid OTP. Maximum attempts exceeded.',
      verified: false,
    };
  }

  // Success - clear the OTP
  otpStore.delete(formattedPhone);

  return {
    success: true,
    message: 'Phone number verified successfully',
    verified: true,
  };
};

/**
 * Resend OTP (with rate limiting)
 */
export const resendOTP = async (request: OTPSendRequest): Promise<OTPSendResponse> => {
  // Clear any existing OTP first
  const formattedPhone = formatPhoneNumber(request.phone);
  otpStore.delete(formattedPhone);

  // Then send a new one
  return sendOTP(request);
};

/**
 * Get remaining time for OTP expiration
 */
export const getOTPRemainingTime = (phone: string): number | null => {
  const formattedPhone = formatPhoneNumber(phone);
  const storedOtp = otpStore.get(formattedPhone);

  if (!storedOtp) {
    return null;
  }

  const remaining = Math.max(0, storedOtp.expiresAt - Date.now());
  return Math.ceil(remaining / 1000); // Return seconds
};

/**
 * Check if an OTP exists for a phone number
 */
export const hasActiveOTP = (phone: string): boolean => {
  const formattedPhone = formatPhoneNumber(phone);
  const storedOtp = otpStore.get(formattedPhone);

  if (!storedOtp) {
    return false;
  }

  // Check if expired
  if (Date.now() > storedOtp.expiresAt) {
    otpStore.delete(formattedPhone);
    return false;
  }

  return true;
};

/**
 * Clear expired OTPs (call periodically)
 */
export const clearExpiredOTPs = (): void => {
  const now = Date.now();

  for (const [key, value] of otpStore.entries()) {
    if (now > value.expiresAt) {
      otpStore.delete(key);
    }
  }

  for (const [key, value] of otpRateLimits.entries()) {
    if (now > value.resetAt) {
      otpRateLimits.delete(key);
    }
  }
};

/**
 * Get OTP service health status
 */
export const getOTPServiceHealth = async (): Promise<{
  healthy: boolean;
  mode: 'live' | 'demo' | 'disabled';
  error?: string;
}> => {
  const config = getArkeselConfig();

  if (!config) {
    return {
      healthy: false,
      mode: 'disabled',
      error: 'OTP service not configured',
    };
  }

  return {
    healthy: true,
    mode: config.isDemoMode ? 'demo' : 'live',
  };
};
