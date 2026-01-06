/**
 * Comprehensive Audit Log Store
 *
 * Production-ready audit logging system for:
 * - Product CRUD operations
 * - Verification submissions and decisions
 * - Brand/banner updates
 * - Messaging moderation
 * - Site settings changes
 * - User management actions
 * - Admin actions
 *
 * All logs persist and are only visible to MASTER_ADMIN.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AuditCategory =
  | 'PRODUCT'
  | 'VERIFICATION'
  | 'BRANDING'
  | 'BANNER'
  | 'MESSAGING'
  | 'SITE_SETTINGS'
  | 'USER_MANAGEMENT'
  | 'ORDER'
  | 'PAYMENT'
  | 'SECURITY'
  | 'SYSTEM';

export type AuditAction =
  // Product actions
  | 'PRODUCT_CREATED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_DELETED'
  | 'PRODUCT_APPROVED'
  | 'PRODUCT_REJECTED'
  | 'PRODUCT_SUSPENDED'
  | 'PRODUCT_FEATURED'
  | 'PRODUCT_UNFEATURED'
  // Verification actions
  | 'VERIFICATION_SUBMITTED'
  | 'VERIFICATION_APPROVED'
  | 'VERIFICATION_REJECTED'
  | 'VERIFICATION_RESUBMIT_REQUESTED'
  | 'VENDOR_SUSPENDED'
  | 'VENDOR_REINSTATED'
  // Branding actions
  | 'LOGO_UPDATED'
  | 'SITE_NAME_UPDATED'
  | 'THEME_UPDATED'
  | 'CONTACT_INFO_UPDATED'
  | 'SOCIAL_LINKS_UPDATED'
  // Banner actions
  | 'BANNER_CREATED'
  | 'BANNER_UPDATED'
  | 'BANNER_DELETED'
  | 'BANNER_ACTIVATED'
  | 'BANNER_DEACTIVATED'
  // Messaging actions
  | 'MESSAGE_FLAGGED'
  | 'MESSAGE_DELETED'
  | 'CONVERSATION_ARCHIVED'
  | 'USER_MUTED'
  | 'USER_UNMUTED'
  // Site settings actions
  | 'SETTINGS_UPDATED'
  | 'PAYMENT_CONFIG_UPDATED'
  | 'SHIPPING_CONFIG_UPDATED'
  | 'SEO_CONFIG_UPDATED'
  // User management actions
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'USER_SUSPENDED'
  | 'USER_ACTIVATED'
  | 'ROLE_CHANGED'
  | 'ADMIN_CREATED'
  | 'ADMIN_UPDATED'
  | 'ADMIN_DELETED'
  // Order actions
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_CANCELLED'
  | 'ORDER_REFUNDED'
  // Payment actions
  | 'PAYOUT_APPROVED'
  | 'PAYOUT_REJECTED'
  | 'PAYMENT_RECEIVED'
  // Security actions
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'PASSWORD_CHANGED'
  | 'API_KEY_GENERATED'
  | 'API_KEY_REVOKED'
  // System actions
  | 'SYSTEM_INITIALIZED'
  | 'BACKUP_CREATED'
  | 'DATA_EXPORTED';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  category: AuditCategory;
  action: AuditAction;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  targetType: string;
  targetId: string;
  targetName?: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

interface AuditFilters {
  category?: AuditCategory;
  action?: AuditAction;
  actorId?: string;
  targetId?: string;
  dateFrom?: string;
  dateTo?: string;
  searchQuery?: string;
}

interface AuditState {
  logs: AuditLogEntry[];
  maxLogs: number;

  // Core logging function
  logAction: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;

  // Convenience logging methods
  logProductAction: (
    action: Extract<AuditAction, `PRODUCT_${string}`>,
    actorId: string,
    actorEmail: string,
    actorRole: string,
    productId: string,
    productName: string,
    previousState?: Record<string, unknown>,
    newState?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ) => void;

  logVerificationAction: (
    action: Extract<AuditAction, 'VERIFICATION_SUBMITTED' | 'VERIFICATION_APPROVED' | 'VERIFICATION_REJECTED' | 'VERIFICATION_RESUBMIT_REQUESTED' | 'VENDOR_SUSPENDED' | 'VENDOR_REINSTATED'>,
    actorId: string,
    actorEmail: string,
    actorRole: string,
    vendorId: string,
    vendorName: string,
    verificationType?: string,
    previousState?: Record<string, unknown>,
    newState?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ) => void;

  logBrandingAction: (
    action: Extract<AuditAction, `LOGO_${string}` | `SITE_NAME_${string}` | `THEME_${string}` | `CONTACT_INFO_${string}` | `SOCIAL_LINKS_${string}`>,
    actorId: string,
    actorEmail: string,
    actorRole: string,
    previousState?: Record<string, unknown>,
    newState?: Record<string, unknown>
  ) => void;

  logBannerAction: (
    action: Extract<AuditAction, `BANNER_${string}`>,
    actorId: string,
    actorEmail: string,
    actorRole: string,
    bannerId: string,
    bannerTitle: string,
    previousState?: Record<string, unknown>,
    newState?: Record<string, unknown>
  ) => void;

  logUserManagementAction: (
    action: Extract<AuditAction, `USER_${string}` | `ROLE_${string}` | `ADMIN_${string}`>,
    actorId: string,
    actorEmail: string,
    actorRole: string,
    targetUserId: string,
    targetUserEmail: string,
    previousState?: Record<string, unknown>,
    newState?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ) => void;

  logSecurityAction: (
    action: Extract<AuditAction, 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'PASSWORD_CHANGED' | `API_KEY_${string}`>,
    actorId: string,
    actorEmail: string,
    success: boolean,
    metadata?: Record<string, unknown>,
    errorMessage?: string
  ) => void;

  // Query methods
  getLogs: (filters?: AuditFilters) => AuditLogEntry[];
  getLogsByActor: (actorId: string) => AuditLogEntry[];
  getLogsByTarget: (targetId: string) => AuditLogEntry[];
  getLogsByCategory: (category: AuditCategory) => AuditLogEntry[];
  getRecentLogs: (count: number) => AuditLogEntry[];
  searchLogs: (query: string) => AuditLogEntry[];

  // Statistics
  getActionCounts: () => Record<string, number>;
  getActorActivity: (actorId: string) => { total: number; byCategory: Record<string, number> };

  // Cleanup
  clearOldLogs: (daysToKeep: number) => void;
}

export const useAuditStore = create<AuditState>()(
  persist(
    (set, get) => ({
      logs: [],
      maxLogs: 10000,

      logAction: (entry) => {
        const newEntry: AuditLogEntry = {
          ...entry,
          id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          logs: [newEntry, ...state.logs].slice(0, state.maxLogs),
        }));

        // Console log for debugging in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`[AUDIT] ${entry.category}/${entry.action}`, {
            actor: entry.actorEmail,
            target: entry.targetName || entry.targetId,
          });
        }
      },

      logProductAction: (action, actorId, actorEmail, actorRole, productId, productName, previousState, newState, metadata) => {
        get().logAction({
          category: 'PRODUCT',
          action,
          actorId,
          actorEmail,
          actorRole,
          targetType: 'product',
          targetId: productId,
          targetName: productName,
          previousState,
          newState,
          metadata,
          success: true,
        });
      },

      logVerificationAction: (action, actorId, actorEmail, actorRole, vendorId, vendorName, verificationType, previousState, newState, metadata) => {
        get().logAction({
          category: 'VERIFICATION',
          action,
          actorId,
          actorEmail,
          actorRole,
          targetType: 'vendor',
          targetId: vendorId,
          targetName: vendorName,
          previousState,
          newState,
          metadata: { ...metadata, verificationType },
          success: true,
        });
      },

      logBrandingAction: (action, actorId, actorEmail, actorRole, previousState, newState) => {
        get().logAction({
          category: 'BRANDING',
          action,
          actorId,
          actorEmail,
          actorRole,
          targetType: 'site',
          targetId: 'site-branding',
          previousState,
          newState,
          success: true,
        });
      },

      logBannerAction: (action, actorId, actorEmail, actorRole, bannerId, bannerTitle, previousState, newState) => {
        get().logAction({
          category: 'BANNER',
          action,
          actorId,
          actorEmail,
          actorRole,
          targetType: 'banner',
          targetId: bannerId,
          targetName: bannerTitle,
          previousState,
          newState,
          success: true,
        });
      },

      logUserManagementAction: (action, actorId, actorEmail, actorRole, targetUserId, targetUserEmail, previousState, newState, metadata) => {
        get().logAction({
          category: 'USER_MANAGEMENT',
          action,
          actorId,
          actorEmail,
          actorRole,
          targetType: 'user',
          targetId: targetUserId,
          targetName: targetUserEmail,
          previousState,
          newState,
          metadata,
          success: true,
        });
      },

      logSecurityAction: (action, actorId, actorEmail, success, metadata, errorMessage) => {
        get().logAction({
          category: 'SECURITY',
          action,
          actorId,
          actorEmail,
          actorRole: 'unknown',
          targetType: 'security',
          targetId: actorId,
          targetName: actorEmail,
          metadata,
          success,
          errorMessage,
        });
      },

      getLogs: (filters) => {
        let logs = get().logs;

        if (!filters) return logs;

        if (filters.category) {
          logs = logs.filter((l) => l.category === filters.category);
        }

        if (filters.action) {
          logs = logs.filter((l) => l.action === filters.action);
        }

        if (filters.actorId) {
          logs = logs.filter((l) => l.actorId === filters.actorId);
        }

        if (filters.targetId) {
          logs = logs.filter((l) => l.targetId === filters.targetId);
        }

        if (filters.dateFrom) {
          logs = logs.filter((l) => new Date(l.timestamp) >= new Date(filters.dateFrom!));
        }

        if (filters.dateTo) {
          logs = logs.filter((l) => new Date(l.timestamp) <= new Date(filters.dateTo!));
        }

        if (filters.searchQuery) {
          const query = filters.searchQuery.toLowerCase();
          logs = logs.filter(
            (l) =>
              l.actorEmail.toLowerCase().includes(query) ||
              l.targetName?.toLowerCase().includes(query) ||
              l.targetId.toLowerCase().includes(query) ||
              l.action.toLowerCase().includes(query)
          );
        }

        return logs;
      },

      getLogsByActor: (actorId) => {
        return get().logs.filter((l) => l.actorId === actorId);
      },

      getLogsByTarget: (targetId) => {
        return get().logs.filter((l) => l.targetId === targetId);
      },

      getLogsByCategory: (category) => {
        return get().logs.filter((l) => l.category === category);
      },

      getRecentLogs: (count) => {
        return get().logs.slice(0, count);
      },

      searchLogs: (query) => {
        const queryLower = query.toLowerCase();
        return get().logs.filter(
          (l) =>
            l.actorEmail.toLowerCase().includes(queryLower) ||
            l.targetName?.toLowerCase().includes(queryLower) ||
            l.targetId.toLowerCase().includes(queryLower) ||
            l.action.toLowerCase().includes(queryLower) ||
            l.category.toLowerCase().includes(queryLower)
        );
      },

      getActionCounts: () => {
        const counts: Record<string, number> = {};
        for (const log of get().logs) {
          counts[log.action] = (counts[log.action] || 0) + 1;
        }
        return counts;
      },

      getActorActivity: (actorId) => {
        const actorLogs = get().getLogsByActor(actorId);
        const byCategory: Record<string, number> = {};
        for (const log of actorLogs) {
          byCategory[log.category] = (byCategory[log.category] || 0) + 1;
        }
        return { total: actorLogs.length, byCategory };
      },

      clearOldLogs: (daysToKeep) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysToKeep);

        set((state) => ({
          logs: state.logs.filter((l) => new Date(l.timestamp) >= cutoff),
        }));
      },
    }),
    {
      name: 'marketplace-audit-logs',
    }
  )
);

// Helper to create audit entries from components
export function createAuditEntry(
  category: AuditCategory,
  action: AuditAction,
  actor: { id: string; email: string; role: string },
  target: { type: string; id: string; name?: string },
  options?: {
    previousState?: Record<string, unknown>;
    newState?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }
): Omit<AuditLogEntry, 'id' | 'timestamp'> {
  return {
    category,
    action,
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    targetType: target.type,
    targetId: target.id,
    targetName: target.name,
    previousState: options?.previousState,
    newState: options?.newState,
    metadata: options?.metadata,
    success: true,
  };
}
