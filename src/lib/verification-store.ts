/**
 * Vendor Verification Store
 *
 * Production-ready verification system with:
 * - Granular verification statuses (phone, email, ID, business docs)
 * - Admin-controlled approval workflow
 * - Evidence storage
 * - Verification audit trail
 *
 * All verification data persists and is admin-controlled.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type VerificationStatus = 'not_started' | 'pending' | 'approved' | 'rejected' | 'expired';

export interface VerificationItem {
  status: VerificationStatus;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  expiresAt?: string;
  evidence?: string; // URL to uploaded document/image
  evidenceName?: string;
  notes?: string;
  lastUpdated: string;
}

export interface VendorVerification {
  vendorId: string;
  vendorName: string;
  vendorEmail: string;
  businessName?: string;

  // Granular verification items
  phoneVerification: VerificationItem;
  emailVerification: VerificationItem;
  idVerification: VerificationItem;
  facialVerification: VerificationItem;
  businessDocuments: VerificationItem;
  addressVerification: VerificationItem;

  // Overall status
  overallStatus: 'unverified' | 'partially_verified' | 'verified' | 'suspended';
  verificationScore: number; // 0-100 based on completed verifications

  // Trust indicators
  trustLevel: 'new' | 'basic' | 'trusted' | 'premium';
  badgeDisplay: string[]; // Array of badges to display

  // Metadata
  createdAt: string;
  updatedAt: string;
  lastReviewedAt?: string;
  lastReviewedBy?: string;
}

export interface VerificationAuditLog {
  id: string;
  action: string;
  vendorId: string;
  vendorName: string;
  verificationType: keyof Omit<VendorVerification, 'vendorId' | 'vendorName' | 'vendorEmail' | 'businessName' | 'overallStatus' | 'verificationScore' | 'trustLevel' | 'badgeDisplay' | 'createdAt' | 'updatedAt' | 'lastReviewedAt' | 'lastReviewedBy'>;
  adminId: string;
  adminEmail: string;
  previousStatus?: VerificationStatus;
  newStatus: VerificationStatus;
  details: string;
  timestamp: string;
}

const DEFAULT_VERIFICATION_ITEM: VerificationItem = {
  status: 'not_started',
  lastUpdated: new Date().toISOString(),
};

interface VerificationState {
  verifications: VendorVerification[];
  auditLogs: VerificationAuditLog[];

  // Vendor Verification Management
  initializeVendorVerification: (vendorId: string, vendorName: string, vendorEmail: string, businessName?: string) => VendorVerification;
  getVendorVerification: (vendorId: string) => VendorVerification | undefined;
  getAllVerifications: () => VendorVerification[];

  // Submit verification evidence
  submitVerificationEvidence: (
    vendorId: string,
    type: 'phoneVerification' | 'emailVerification' | 'idVerification' | 'facialVerification' | 'businessDocuments' | 'addressVerification',
    evidenceUrl: string,
    evidenceName?: string
  ) => void;

  // Admin actions
  approveVerification: (
    vendorId: string,
    type: 'phoneVerification' | 'emailVerification' | 'idVerification' | 'facialVerification' | 'businessDocuments' | 'addressVerification',
    adminId: string,
    adminEmail: string,
    notes?: string
  ) => void;

  rejectVerification: (
    vendorId: string,
    type: 'phoneVerification' | 'emailVerification' | 'idVerification' | 'facialVerification' | 'businessDocuments' | 'addressVerification',
    adminId: string,
    adminEmail: string,
    reason: string
  ) => void;

  // Batch operations
  approveAllPendingVerifications: (vendorId: string, adminId: string, adminEmail: string) => void;
  suspendVendorVerification: (vendorId: string, adminId: string, adminEmail: string, reason: string) => void;
  reinstateVendorVerification: (vendorId: string, adminId: string, adminEmail: string) => void;

  // Queries
  getPendingVerifications: () => VendorVerification[];
  getVerifiedVendors: () => VendorVerification[];
  getVendorsNeedingReview: () => VendorVerification[];

  // Helpers
  calculateVerificationScore: (verification: VendorVerification) => number;
  determineOverallStatus: (verification: VendorVerification) => VendorVerification['overallStatus'];
  determineTrustLevel: (verification: VendorVerification) => VendorVerification['trustLevel'];
  getVerificationBadges: (verification: VendorVerification) => string[];

  // Audit
  getAuditLogs: (vendorId?: string) => VerificationAuditLog[];
}

export const useVerificationStore = create<VerificationState>()(
  persist(
    (set, get) => ({
      verifications: [],
      auditLogs: [],

      initializeVendorVerification: (vendorId, vendorName, vendorEmail, businessName) => {
        const existing = get().getVendorVerification(vendorId);
        if (existing) return existing;

        const now = new Date().toISOString();
        const newVerification: VendorVerification = {
          vendorId,
          vendorName,
          vendorEmail,
          businessName,
          phoneVerification: { ...DEFAULT_VERIFICATION_ITEM, lastUpdated: now },
          emailVerification: { ...DEFAULT_VERIFICATION_ITEM, lastUpdated: now },
          idVerification: { ...DEFAULT_VERIFICATION_ITEM, lastUpdated: now },
          facialVerification: { ...DEFAULT_VERIFICATION_ITEM, lastUpdated: now },
          businessDocuments: { ...DEFAULT_VERIFICATION_ITEM, lastUpdated: now },
          addressVerification: { ...DEFAULT_VERIFICATION_ITEM, lastUpdated: now },
          overallStatus: 'unverified',
          verificationScore: 0,
          trustLevel: 'new',
          badgeDisplay: [],
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          verifications: [...state.verifications, newVerification],
        }));

        return newVerification;
      },

      getVendorVerification: (vendorId) => {
        return get().verifications.find((v) => v.vendorId === vendorId);
      },

      getAllVerifications: () => get().verifications,

      submitVerificationEvidence: (vendorId, type, evidenceUrl, evidenceName) => {
        const verification = get().getVendorVerification(vendorId);
        if (!verification) return;

        const now = new Date().toISOString();
        set((state) => ({
          verifications: state.verifications.map((v) =>
            v.vendorId === vendorId
              ? {
                  ...v,
                  [type]: {
                    ...v[type],
                    status: 'pending' as VerificationStatus,
                    evidence: evidenceUrl,
                    evidenceName,
                    lastUpdated: now,
                  },
                  updatedAt: now,
                }
              : v
          ),
        }));
      },

      approveVerification: (vendorId, type, adminId, adminEmail, notes) => {
        const verification = get().getVendorVerification(vendorId);
        if (!verification) return;

        const now = new Date().toISOString();
        const previousStatus = verification[type].status;

        set((state) => ({
          verifications: state.verifications.map((v) => {
            if (v.vendorId !== vendorId) return v;

            const updated = {
              ...v,
              [type]: {
                ...v[type],
                status: 'approved' as VerificationStatus,
                verifiedAt: now,
                verifiedBy: adminId,
                notes,
                lastUpdated: now,
              },
              updatedAt: now,
              lastReviewedAt: now,
              lastReviewedBy: adminId,
            };

            // Recalculate scores and status
            updated.verificationScore = get().calculateVerificationScore(updated);
            updated.overallStatus = get().determineOverallStatus(updated);
            updated.trustLevel = get().determineTrustLevel(updated);
            updated.badgeDisplay = get().getVerificationBadges(updated);

            return updated;
          }),
        }));

        // Add audit log
        set((state) => ({
          auditLogs: [
            {
              id: `vlog_${Date.now()}`,
              action: 'VERIFICATION_APPROVED',
              vendorId,
              vendorName: verification.vendorName,
              verificationType: type,
              adminId,
              adminEmail,
              previousStatus,
              newStatus: 'approved' as VerificationStatus,
              details: notes || `${type} approved`,
              timestamp: now,
            },
            ...state.auditLogs,
          ].slice(0, 2000),
        }));
      },

      rejectVerification: (vendorId, type, adminId, adminEmail, reason) => {
        const verification = get().getVendorVerification(vendorId);
        if (!verification) return;

        const now = new Date().toISOString();
        const previousStatus = verification[type].status;

        set((state) => ({
          verifications: state.verifications.map((v) => {
            if (v.vendorId !== vendorId) return v;

            const updated = {
              ...v,
              [type]: {
                ...v[type],
                status: 'rejected' as VerificationStatus,
                rejectedAt: now,
                rejectedBy: adminId,
                rejectionReason: reason,
                lastUpdated: now,
              },
              updatedAt: now,
              lastReviewedAt: now,
              lastReviewedBy: adminId,
            };

            updated.verificationScore = get().calculateVerificationScore(updated);
            updated.overallStatus = get().determineOverallStatus(updated);
            updated.trustLevel = get().determineTrustLevel(updated);
            updated.badgeDisplay = get().getVerificationBadges(updated);

            return updated;
          }),
        }));

        set((state) => ({
          auditLogs: [
            {
              id: `vlog_${Date.now()}`,
              action: 'VERIFICATION_REJECTED',
              vendorId,
              vendorName: verification.vendorName,
              verificationType: type,
              adminId,
              adminEmail,
              previousStatus,
              newStatus: 'rejected' as VerificationStatus,
              details: reason,
              timestamp: now,
            },
            ...state.auditLogs,
          ].slice(0, 2000),
        }));
      },

      approveAllPendingVerifications: (vendorId, adminId, adminEmail) => {
        const verification = get().getVendorVerification(vendorId);
        if (!verification) return;

        const types: Array<'phoneVerification' | 'emailVerification' | 'idVerification' | 'facialVerification' | 'businessDocuments' | 'addressVerification'> = [
          'phoneVerification', 'emailVerification', 'idVerification',
          'facialVerification', 'businessDocuments', 'addressVerification'
        ];

        for (const type of types) {
          if (verification[type].status === 'pending') {
            get().approveVerification(vendorId, type, adminId, adminEmail, 'Batch approval');
          }
        }
      },

      suspendVendorVerification: (vendorId, adminId, adminEmail, reason) => {
        const verification = get().getVendorVerification(vendorId);
        if (!verification) return;

        const now = new Date().toISOString();

        set((state) => ({
          verifications: state.verifications.map((v) =>
            v.vendorId === vendorId
              ? {
                  ...v,
                  overallStatus: 'suspended' as const,
                  updatedAt: now,
                  lastReviewedAt: now,
                  lastReviewedBy: adminId,
                }
              : v
          ),
        }));

        set((state) => ({
          auditLogs: [
            {
              id: `vlog_${Date.now()}`,
              action: 'VENDOR_SUSPENDED',
              vendorId,
              vendorName: verification.vendorName,
              verificationType: 'phoneVerification',
              adminId,
              adminEmail,
              previousStatus: 'approved',
              newStatus: 'rejected',
              details: `Vendor suspended: ${reason}`,
              timestamp: now,
            },
            ...state.auditLogs,
          ],
        }));
      },

      reinstateVendorVerification: (vendorId, adminId, adminEmail) => {
        const verification = get().getVendorVerification(vendorId);
        if (!verification) return;

        const now = new Date().toISOString();

        set((state) => ({
          verifications: state.verifications.map((v) => {
            if (v.vendorId !== vendorId) return v;

            const updated = { ...v, updatedAt: now, lastReviewedAt: now, lastReviewedBy: adminId };
            updated.overallStatus = get().determineOverallStatus(updated);
            return updated;
          }),
        }));

        set((state) => ({
          auditLogs: [
            {
              id: `vlog_${Date.now()}`,
              action: 'VENDOR_REINSTATED',
              vendorId,
              vendorName: verification.vendorName,
              verificationType: 'phoneVerification',
              adminId,
              adminEmail,
              previousStatus: 'rejected',
              newStatus: 'approved',
              details: 'Vendor verification reinstated',
              timestamp: now,
            },
            ...state.auditLogs,
          ],
        }));
      },

      getPendingVerifications: () => {
        return get().verifications.filter((v) =>
          v.phoneVerification.status === 'pending' ||
          v.emailVerification.status === 'pending' ||
          v.idVerification.status === 'pending' ||
          v.facialVerification.status === 'pending' ||
          v.businessDocuments.status === 'pending' ||
          v.addressVerification.status === 'pending'
        );
      },

      getVerifiedVendors: () => {
        return get().verifications.filter((v) => v.overallStatus === 'verified');
      },

      getVendorsNeedingReview: () => {
        return get().verifications.filter((v) =>
          v.overallStatus !== 'verified' && v.overallStatus !== 'suspended'
        );
      },

      calculateVerificationScore: (verification) => {
        let score = 0;
        const weights = {
          phoneVerification: 15,
          emailVerification: 15,
          idVerification: 25,
          facialVerification: 20,
          businessDocuments: 15,
          addressVerification: 10,
        };

        for (const [key, weight] of Object.entries(weights)) {
          const item = verification[key as keyof typeof weights];
          if (item.status === 'approved') {
            score += weight;
          }
        }

        return score;
      },

      determineOverallStatus: (verification) => {
        if (verification.overallStatus === 'suspended') return 'suspended';

        const score = get().calculateVerificationScore(verification);

        if (score >= 90) return 'verified';
        if (score >= 30) return 'partially_verified';
        return 'unverified';
      },

      determineTrustLevel: (verification) => {
        const score = get().calculateVerificationScore(verification);

        if (score >= 100) return 'premium';
        if (score >= 75) return 'trusted';
        if (score >= 40) return 'basic';
        return 'new';
      },

      getVerificationBadges: (verification) => {
        const badges: string[] = [];

        if (verification.phoneVerification.status === 'approved') badges.push('phone_verified');
        if (verification.emailVerification.status === 'approved') badges.push('email_verified');
        if (verification.idVerification.status === 'approved') badges.push('id_verified');
        if (verification.facialVerification.status === 'approved') badges.push('facial_verified');
        if (verification.businessDocuments.status === 'approved') badges.push('business_verified');
        if (verification.addressVerification.status === 'approved') badges.push('address_verified');

        const score = get().calculateVerificationScore(verification);
        if (score >= 90) badges.push('trusted_vendor');
        if (score >= 100) badges.push('premium_vendor');

        return badges;
      },

      getAuditLogs: (vendorId) => {
        const logs = get().auditLogs;
        if (vendorId) {
          return logs.filter((l) => l.vendorId === vendorId);
        }
        return logs;
      },
    }),
    {
      name: 'marketplace-verification',
    }
  )
);

// Helper function to get verification badge icon info
export function getVerificationBadgeInfo(badge: string): { label: string; icon: string; color: string } {
  const badges: Record<string, { label: string; icon: string; color: string }> = {
    phone_verified: { label: 'Phone Verified', icon: 'phone', color: 'green' },
    email_verified: { label: 'Email Verified', icon: 'mail', color: 'blue' },
    id_verified: { label: 'ID Verified', icon: 'id-card', color: 'purple' },
    facial_verified: { label: 'Identity Confirmed', icon: 'user-check', color: 'teal' },
    business_verified: { label: 'Business Verified', icon: 'building', color: 'orange' },
    address_verified: { label: 'Address Verified', icon: 'map-pin', color: 'cyan' },
    trusted_vendor: { label: 'Trusted Vendor', icon: 'shield-check', color: 'emerald' },
    premium_vendor: { label: 'Premium Vendor', icon: 'crown', color: 'gold' },
  };

  return badges[badge] || { label: badge, icon: 'check', color: 'gray' };
}
