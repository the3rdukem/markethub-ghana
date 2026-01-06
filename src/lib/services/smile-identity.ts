/**
 * Smile Identity Service
 *
 * KYC verification service for vendor identity verification.
 * Supports document verification, selfie matching, and enhanced KYC.
 */

import { getSmileIdentityCredentials } from '@/lib/db/dal/integrations';

export interface SmileIdentityConfig {
  partnerId: string;
  apiKey: string;
  callbackUrl: string;
  environment: 'sandbox' | 'production';
  enableDocumentVerification: boolean;
  enableSelfieVerification: boolean;
  enableEnhancedKYC: boolean;
}

export interface VerificationRequest {
  userId: string;
  firstName: string;
  lastName: string;
  idType: 'DRIVERS_LICENSE' | 'NATIONAL_ID' | 'PASSPORT' | 'VOTER_ID' | 'GHANA_CARD';
  idNumber: string;
  country: string;
  dob?: string;
  phone?: string;
  selfieImage?: string; // Base64 encoded
  idImageFront?: string; // Base64 encoded
  idImageBack?: string; // Base64 encoded
}

export interface VerificationResult {
  success: boolean;
  jobId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'review';
  confidence?: number;
  resultCode?: string;
  resultText?: string;
  error?: string;
  actions?: {
    documentVerification?: 'Verified' | 'Not Verified' | 'Pending';
    selfieMatch?: 'Verified' | 'Not Verified' | 'Pending';
    livenessCheck?: 'Passed' | 'Failed' | 'Pending';
  };
}

/**
 * Get Smile Identity configuration
 */
export function getSmileIdConfig(): SmileIdentityConfig | null {
  const credentials = getSmileIdentityCredentials();
  if (!credentials || !credentials.isConfigured) {
    return null;
  }

  return {
    partnerId: credentials.partnerId,
    apiKey: credentials.apiKey,
    callbackUrl: credentials.callbackUrl,
    environment: credentials.environment === 'production' ? 'production' : 'sandbox',
    enableDocumentVerification: credentials.enableDocumentVerification,
    enableSelfieVerification: credentials.enableSelfieVerification,
    enableEnhancedKYC: credentials.enableEnhancedKYC,
  };
}

/**
 * Check if Smile Identity is available and configured
 */
export function isSmileIdentityAvailable(): boolean {
  const credentials = getSmileIdentityCredentials();
  return !!(credentials?.isConfigured && credentials?.isEnabled);
}

/**
 * Get the base API URL based on environment
 */
function getApiBaseUrl(environment: 'sandbox' | 'production'): string {
  return environment === 'production'
    ? 'https://api.smileidentity.com'
    : 'https://testapi.smileidentity.com';
}

/**
 * Create a verification job for a vendor
 */
export async function createVerificationJob(
  request: VerificationRequest
): Promise<VerificationResult> {
  const config = getSmileIdConfig();

  if (!config) {
    return {
      success: false,
      status: 'rejected',
      error: 'Smile Identity is not configured. Please configure it in Admin > API Management.',
    };
  }

  // In sandbox mode, simulate verification
  if (config.environment === 'sandbox') {
    return simulateSandboxVerification(request);
  }

  try {
    const baseUrl = getApiBaseUrl(config.environment);

    // Build the verification payload
    const payload = {
      partner_id: config.partnerId,
      source_sdk: 'markethub_kiosk',
      source_sdk_version: '1.0.0',
      callback_url: config.callbackUrl || undefined,
      user_id: request.userId,
      job_type: 1, // Biometric KYC
      job_id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      partner_params: {
        user_id: request.userId,
        job_id: `job_${Date.now()}`,
        job_type: 1,
      },
      id_info: {
        country: request.country || 'GH',
        id_type: request.idType,
        id_number: request.idNumber,
        first_name: request.firstName,
        last_name: request.lastName,
        dob: request.dob,
      },
      image_links: {
        selfie_image: request.selfieImage,
        id_card_image: request.idImageFront,
        id_card_back: request.idImageBack,
      },
    };

    // Make API call to Smile Identity
    const response = await fetch(`${baseUrl}/v1/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        status: 'rejected',
        error: errorData.error || `API error: ${response.status}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      jobId: data.job_id || payload.job_id,
      status: 'pending',
      resultCode: data.result_code,
      resultText: data.result_text,
    };
  } catch (error) {
    console.error('[SMILE_ID] Verification error:', error);
    return {
      success: false,
      status: 'rejected',
      error: error instanceof Error ? error.message : 'Verification failed',
    };
  }
}

/**
 * Simulate verification in sandbox mode
 */
function simulateSandboxVerification(request: VerificationRequest): VerificationResult {
  // Simulate processing time
  const jobId = `sandbox_job_${Date.now()}`;

  // In sandbox, we approve if all required fields are present
  const hasRequiredFields = !!(
    request.firstName &&
    request.lastName &&
    request.idType &&
    request.idNumber
  );

  if (!hasRequiredFields) {
    return {
      success: false,
      jobId,
      status: 'rejected',
      error: 'Missing required fields for verification',
    };
  }

  // Sandbox always returns success with simulated data
  return {
    success: true,
    jobId,
    status: 'approved',
    confidence: 95.5,
    resultCode: '0810',
    resultText: 'Document Verified',
    actions: {
      documentVerification: 'Verified',
      selfieMatch: request.selfieImage ? 'Verified' : 'Pending',
      livenessCheck: 'Passed',
    },
  };
}

/**
 * Check verification job status
 */
export async function checkVerificationStatus(
  jobId: string
): Promise<VerificationResult> {
  const config = getSmileIdConfig();

  if (!config) {
    return {
      success: false,
      status: 'rejected',
      error: 'Smile Identity is not configured',
    };
  }

  // In sandbox mode, always return approved
  if (config.environment === 'sandbox' || jobId.startsWith('sandbox_')) {
    return {
      success: true,
      jobId,
      status: 'approved',
      confidence: 95.5,
      resultCode: '0810',
      resultText: 'Document Verified (Sandbox)',
      actions: {
        documentVerification: 'Verified',
        selfieMatch: 'Verified',
        livenessCheck: 'Passed',
      },
    };
  }

  try {
    const baseUrl = getApiBaseUrl(config.environment);

    const response = await fetch(`${baseUrl}/v1/job_status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        partner_id: config.partnerId,
        job_id: jobId,
        user_id: '', // Will be extracted from job
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        jobId,
        status: 'pending',
        error: 'Failed to fetch job status',
      };
    }

    const data = await response.json();

    // Map Smile ID result codes to our status
    let status: VerificationResult['status'] = 'pending';
    if (data.result_code === '0810' || data.result_code === '0820') {
      status = 'approved';
    } else if (data.result_code?.startsWith('1')) {
      status = 'rejected';
    } else if (data.result_code?.startsWith('2')) {
      status = 'review';
    }

    return {
      success: true,
      jobId,
      status,
      confidence: data.confidence,
      resultCode: data.result_code,
      resultText: data.result_text,
      actions: data.actions,
    };
  } catch (error) {
    console.error('[SMILE_ID] Status check error:', error);
    return {
      success: false,
      jobId,
      status: 'pending',
      error: error instanceof Error ? error.message : 'Failed to check status',
    };
  }
}

/**
 * Get supported ID types for a country
 */
export function getSupportedIdTypes(country: string = 'GH'): { value: string; label: string }[] {
  const idTypes: Record<string, { value: string; label: string }[]> = {
    GH: [
      { value: 'GHANA_CARD', label: 'Ghana Card' },
      { value: 'PASSPORT', label: 'Passport' },
      { value: 'DRIVERS_LICENSE', label: "Driver's License" },
      { value: 'VOTER_ID', label: "Voter's ID" },
    ],
    NG: [
      { value: 'NATIONAL_ID', label: 'National ID (NIN)' },
      { value: 'PASSPORT', label: 'Passport' },
      { value: 'DRIVERS_LICENSE', label: "Driver's License" },
      { value: 'VOTER_ID', label: "Voter's Card" },
    ],
    KE: [
      { value: 'NATIONAL_ID', label: 'National ID' },
      { value: 'PASSPORT', label: 'Passport' },
      { value: 'DRIVERS_LICENSE', label: "Driver's License" },
    ],
  };

  return idTypes[country] || idTypes.GH;
}
