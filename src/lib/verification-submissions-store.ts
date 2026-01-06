/**
 * Verification Submissions Store
 *
 * Manages vendor verification submissions with:
 * - Document uploads and storage
 * - Status tracking through workflow
 * - Admin review capabilities
 * - Audit trail
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  VerificationSubmission,
  VerificationDocument,
  SubmissionStatus,
  DocumentType,
  getVerificationProvider,
} from './verification-provider';

interface VerificationSubmissionsState {
  submissions: VerificationSubmission[];

  // Create/Update submissions
  createSubmission: (vendorId: string, vendorName: string, vendorEmail: string) => VerificationSubmission;
  getSubmission: (vendorId: string) => VerificationSubmission | undefined;
  getLatestSubmission: (vendorId: string) => VerificationSubmission | undefined;

  // Document uploads
  uploadDocument: (
    vendorId: string,
    docType: 'governmentId' | 'governmentIdBack' | 'selfiePhoto',
    document: Omit<VerificationDocument, 'id' | 'uploadedAt'>
  ) => void;
  addBusinessDocument: (
    vendorId: string,
    document: Omit<VerificationDocument, 'id' | 'uploadedAt'>
  ) => void;
  removeBusinessDocument: (vendorId: string, documentId: string) => void;

  // Update submission info
  updateSubmissionInfo: (
    vendorId: string,
    info: Partial<Pick<VerificationSubmission, 'idNumber' | 'idType' | 'idIssueDate' | 'currentAddress'>>
  ) => void;

  // Submission workflow
  submitForReview: (vendorId: string) => Promise<{ success: boolean; error?: string }>;
  saveDraft: (vendorId: string) => void;

  // Admin actions
  approveSubmission: (vendorId: string, adminId: string, adminEmail: string, notes?: string) => void;
  rejectSubmission: (vendorId: string, adminId: string, adminEmail: string, reason: string) => void;
  requestResubmit: (vendorId: string, adminId: string, adminEmail: string, reason: string) => void;
  startReview: (vendorId: string, adminId: string) => void;

  // Queries
  getPendingSubmissions: () => VerificationSubmission[];
  getUnderReviewSubmissions: () => VerificationSubmission[];
  getAllSubmissions: () => VerificationSubmission[];
  getSubmissionsByStatus: (status: SubmissionStatus) => VerificationSubmission[];

  // Stats
  getStats: () => {
    total: number;
    pending: number;
    underReview: number;
    approved: number;
    rejected: number;
    pendingResubmit: number;
  };
}

export const useVerificationSubmissionsStore = create<VerificationSubmissionsState>()(
  persist(
    (set, get) => ({
      submissions: [],

      createSubmission: (vendorId, vendorName, vendorEmail) => {
        const existing = get().getSubmission(vendorId);
        if (existing && existing.status !== 'rejected') {
          return existing;
        }

        const newSubmission: VerificationSubmission = {
          id: `vsub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          vendorId,
          vendorName,
          vendorEmail,
          submittedAt: '',
          status: 'draft',
          provider: getVerificationProvider().name,
        };

        set((state) => ({
          submissions: [...state.submissions, newSubmission],
        }));

        return newSubmission;
      },

      getSubmission: (vendorId) => {
        return get().submissions.find((s) => s.vendorId === vendorId);
      },

      getLatestSubmission: (vendorId) => {
        const vendorSubmissions = get().submissions
          .filter((s) => s.vendorId === vendorId)
          .sort((a, b) => {
            const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
            const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
            return dateB - dateA;
          });
        return vendorSubmissions[0];
      },

      uploadDocument: (vendorId, docType, document) => {
        const doc: VerificationDocument = {
          ...document,
          id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          uploadedAt: new Date().toISOString(),
        };

        set((state) => ({
          submissions: state.submissions.map((s) =>
            s.vendorId === vendorId
              ? { ...s, [docType]: doc }
              : s
          ),
        }));
      },

      addBusinessDocument: (vendorId, document) => {
        const doc: VerificationDocument = {
          ...document,
          id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          uploadedAt: new Date().toISOString(),
        };

        set((state) => ({
          submissions: state.submissions.map((s) =>
            s.vendorId === vendorId
              ? { ...s, businessDocuments: [...(s.businessDocuments || []), doc] }
              : s
          ),
        }));
      },

      removeBusinessDocument: (vendorId, documentId) => {
        set((state) => ({
          submissions: state.submissions.map((s) =>
            s.vendorId === vendorId
              ? {
                  ...s,
                  businessDocuments: (s.businessDocuments || []).filter((d) => d.id !== documentId),
                }
              : s
          ),
        }));
      },

      updateSubmissionInfo: (vendorId, info) => {
        set((state) => ({
          submissions: state.submissions.map((s) =>
            s.vendorId === vendorId ? { ...s, ...info } : s
          ),
        }));
      },

      submitForReview: async (vendorId) => {
        const submission = get().getSubmission(vendorId);
        if (!submission) {
          return { success: false, error: 'Submission not found' };
        }

        // Validate required fields
        if (!submission.governmentId) {
          return { success: false, error: 'Government ID is required' };
        }
        if (!submission.selfiePhoto) {
          return { success: false, error: 'Selfie photo is required' };
        }
        if (!submission.idNumber) {
          return { success: false, error: 'ID number is required' };
        }
        if (!submission.idType) {
          return { success: false, error: 'ID type is required' };
        }

        // Submit to provider
        const provider = getVerificationProvider();
        const result = await provider.verifyIdentity({
          ...submission,
          submittedAt: new Date().toISOString(),
          status: 'submitted',
        });

        set((state) => ({
          submissions: state.submissions.map((s) =>
            s.vendorId === vendorId
              ? {
                  ...s,
                  status: result.status,
                  submittedAt: new Date().toISOString(),
                  providerRef: result.providerRef,
                }
              : s
          ),
        }));

        return { success: result.success, error: result.error };
      },

      saveDraft: (vendorId) => {
        set((state) => ({
          submissions: state.submissions.map((s) =>
            s.vendorId === vendorId ? { ...s, status: 'draft' as SubmissionStatus } : s
          ),
        }));
      },

      approveSubmission: (vendorId, adminId, adminEmail, notes) => {
        set((state) => ({
          submissions: state.submissions.map((s) =>
            s.vendorId === vendorId
              ? {
                  ...s,
                  status: 'approved' as SubmissionStatus,
                  reviewedAt: new Date().toISOString(),
                  reviewedBy: adminId,
                  reviewNotes: notes,
                }
              : s
          ),
        }));
      },

      rejectSubmission: (vendorId, adminId, adminEmail, reason) => {
        set((state) => ({
          submissions: state.submissions.map((s) =>
            s.vendorId === vendorId
              ? {
                  ...s,
                  status: 'rejected' as SubmissionStatus,
                  reviewedAt: new Date().toISOString(),
                  reviewedBy: adminId,
                  rejectionReason: reason,
                }
              : s
          ),
        }));
      },

      requestResubmit: (vendorId, adminId, adminEmail, reason) => {
        set((state) => ({
          submissions: state.submissions.map((s) =>
            s.vendorId === vendorId
              ? {
                  ...s,
                  status: 'pending_resubmit' as SubmissionStatus,
                  reviewedAt: new Date().toISOString(),
                  reviewedBy: adminId,
                  resubmitRequested: true,
                  resubmitReason: reason,
                }
              : s
          ),
        }));
      },

      startReview: (vendorId, adminId) => {
        set((state) => ({
          submissions: state.submissions.map((s) =>
            s.vendorId === vendorId && s.status === 'submitted'
              ? { ...s, status: 'under_review' as SubmissionStatus }
              : s
          ),
        }));
      },

      getPendingSubmissions: () => {
        return get().submissions.filter((s) => s.status === 'submitted');
      },

      getUnderReviewSubmissions: () => {
        return get().submissions.filter((s) => s.status === 'under_review');
      },

      getAllSubmissions: () => get().submissions,

      getSubmissionsByStatus: (status) => {
        return get().submissions.filter((s) => s.status === status);
      },

      getStats: () => {
        const submissions = get().submissions;
        return {
          total: submissions.length,
          pending: submissions.filter((s) => s.status === 'submitted').length,
          underReview: submissions.filter((s) => s.status === 'under_review').length,
          approved: submissions.filter((s) => s.status === 'approved').length,
          rejected: submissions.filter((s) => s.status === 'rejected').length,
          pendingResubmit: submissions.filter((s) => s.status === 'pending_resubmit').length,
        };
      },
    }),
    {
      name: 'marketplace-verification-submissions',
    }
  )
);
