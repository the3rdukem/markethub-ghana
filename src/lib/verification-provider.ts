/**
 * Verification Provider Interface
 *
 * Abstract interface for vendor verification that supports:
 * - Manual verification (current implementation)
 * - Future AI/third-party providers (Onfido, Sumsub, etc.)
 */

export type VerificationProviderType = 'manual' | 'onfido' | 'sumsub' | 'jumio' | 'veriff';

export type DocumentType =
  | 'government_id'
  | 'passport'
  | 'drivers_license'
  | 'voters_id'
  | 'business_registration'
  | 'tax_certificate'
  | 'utility_bill'
  | 'selfie';

export interface VerificationDocument {
  id: string;
  type: DocumentType;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface VerificationSubmission {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  governmentId?: VerificationDocument;
  governmentIdBack?: VerificationDocument;
  selfiePhoto?: VerificationDocument;
  businessDocuments?: VerificationDocument[];
  idNumber?: string;
  idType?: string;
  idIssueDate?: string;
  currentAddress?: string;
  submittedAt: string;
  status: SubmissionStatus;
  provider: VerificationProviderType;
  providerRef?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  resubmitRequested?: boolean;
  resubmitReason?: string;
}

export type SubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'pending_resubmit'
  | 'approved'
  | 'rejected';

export interface VerificationResult {
  success: boolean;
  status: SubmissionStatus;
  confidence?: number;
  providerRef?: string;
  error?: string;
}

export interface IVerificationProvider {
  name: VerificationProviderType;
  displayName: string;
  supportsLiveness: boolean;
  supportedDocuments: DocumentType[];
  initialize(config: Record<string, string>): Promise<void>;
  verifyIdentity(submission: VerificationSubmission): Promise<VerificationResult>;
  checkStatus(providerRef: string): Promise<VerificationResult>;
}

export class ManualVerificationProvider implements IVerificationProvider {
  name: VerificationProviderType = 'manual';
  displayName = 'Manual Review';
  supportsLiveness = false;
  supportedDocuments: DocumentType[] = [
    'government_id',
    'passport',
    'drivers_license',
    'voters_id',
    'business_registration',
    'selfie',
  ];

  async initialize(): Promise<void> {
    console.log('[VerificationProvider] Manual provider initialized');
  }

  async verifyIdentity(submission: VerificationSubmission): Promise<VerificationResult> {
    return {
      success: true,
      status: 'under_review',
      providerRef: `manual_${submission.id}`,
    };
  }

  async checkStatus(providerRef: string): Promise<VerificationResult> {
    return {
      success: true,
      status: 'under_review',
      providerRef,
    };
  }
}

let currentProvider: IVerificationProvider = new ManualVerificationProvider();

export function getVerificationProvider(): IVerificationProvider {
  return currentProvider;
}

export function setVerificationProvider(provider: IVerificationProvider): void {
  currentProvider = provider;
}

export function getStatusDisplayName(status: SubmissionStatus): string {
  const names: Record<SubmissionStatus, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    under_review: 'Under Review',
    pending_resubmit: 'Resubmit Required',
    approved: 'Approved',
    rejected: 'Rejected',
  };
  return names[status] || status;
}

export function getStatusColor(status: SubmissionStatus): { bg: string; text: string } {
  const colors: Record<SubmissionStatus, { bg: string; text: string }> = {
    draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
    submitted: { bg: 'bg-blue-100', text: 'text-blue-700' },
    under_review: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    pending_resubmit: { bg: 'bg-orange-100', text: 'text-orange-700' },
    approved: { bg: 'bg-green-100', text: 'text-green-700' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700' },
  };
  return colors[status] || colors.draft;
}

export function getDocumentTypeName(type: DocumentType): string {
  const names: Record<DocumentType, string> = {
    government_id: 'Government ID',
    passport: 'Passport',
    drivers_license: "Driver's License",
    voters_id: "Voter's ID",
    business_registration: 'Business Registration',
    tax_certificate: 'Tax Certificate',
    utility_bill: 'Utility Bill',
    selfie: 'Selfie Photo',
  };
  return names[type] || type;
}

export function validateSubmission(submission: Partial<VerificationSubmission>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!submission.governmentId) errors.push('Government ID front is required');
  if (!submission.selfiePhoto) errors.push('Selfie photo is required');
  if (!submission.idNumber) errors.push('ID number is required');
  if (!submission.idType) errors.push('ID type must be selected');
  return { valid: errors.length === 0, errors };
}
