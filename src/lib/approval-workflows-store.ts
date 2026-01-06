/**
 * Approval Workflows Store
 * MASTER_ADMIN controlled approval workflows
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ApprovalType = 'vendor_registration' | 'product_publish' | 'store_creation' | 'review_moderation' | 'withdrawal';

export interface ApprovalWorkflow {
  id: string;
  type: ApprovalType;
  name: string;
  description: string;
  isEnabled: boolean;
  autoApprove: boolean;
  autoApproveConditions?: {
    verifiedVendorsOnly?: boolean;
    minProductPrice?: number;
    maxProductPrice?: number;
    minVendorRating?: number;
  };
  notifyAdminOnSubmission: boolean;
  notifyUserOnApproval: boolean;
  notifyUserOnRejection: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalRequest {
  id: string;
  workflowType: ApprovalType;
  entityId: string;
  entityType: 'vendor' | 'product' | 'store' | 'review' | 'withdrawal';
  entityName: string;
  submittedBy: string;
  submittedByName: string;
  submittedByEmail: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_info';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  notes?: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalAuditLog {
  id: string;
  requestId: string;
  action: 'submitted' | 'approved' | 'rejected' | 'info_requested' | 'auto_approved';
  performedBy: string;
  performedByName: string;
  details: string;
  timestamp: string;
}

const DEFAULT_WORKFLOWS: ApprovalWorkflow[] = [
  { id: 'workflow_vendor', type: 'vendor_registration', name: 'Vendor Registration', description: 'Review vendor applications', isEnabled: true, autoApprove: false, notifyAdminOnSubmission: true, notifyUserOnApproval: true, notifyUserOnRejection: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'workflow_product', type: 'product_publish', name: 'Product Publishing', description: 'Review products before publish', isEnabled: false, autoApprove: true, autoApproveConditions: { verifiedVendorsOnly: true }, notifyAdminOnSubmission: false, notifyUserOnApproval: true, notifyUserOnRejection: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'workflow_store', type: 'store_creation', name: 'Store Creation', description: 'Review new stores', isEnabled: false, autoApprove: true, notifyAdminOnSubmission: false, notifyUserOnApproval: true, notifyUserOnRejection: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'workflow_review', type: 'review_moderation', name: 'Review Moderation', description: 'Moderate reviews', isEnabled: false, autoApprove: true, notifyAdminOnSubmission: false, notifyUserOnApproval: false, notifyUserOnRejection: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'workflow_withdrawal', type: 'withdrawal', name: 'Withdrawal Approval', description: 'Review withdrawals', isEnabled: true, autoApprove: false, notifyAdminOnSubmission: true, notifyUserOnApproval: true, notifyUserOnRejection: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

interface ApprovalWorkflowsState {
  workflows: ApprovalWorkflow[];
  requests: ApprovalRequest[];
  auditLogs: ApprovalAuditLog[];
  isInitialized: boolean;

  initializeWorkflows: () => void;
  updateWorkflow: (id: string, updates: Partial<ApprovalWorkflow>, adminId: string, adminName: string) => void;
  toggleWorkflow: (id: string, adminId: string, adminName: string) => void;
  getWorkflow: (type: ApprovalType) => ApprovalWorkflow | undefined;
  isWorkflowEnabled: (type: ApprovalType) => boolean;
  shouldAutoApprove: (type: ApprovalType) => boolean;

  submitRequest: (request: Omit<ApprovalRequest, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => ApprovalRequest;
  approveRequest: (requestId: string, adminId: string, adminName: string, notes?: string) => void;
  rejectRequest: (requestId: string, adminId: string, adminName: string, reason: string) => void;
  requestMoreInfo: (requestId: string, adminId: string, adminName: string, request: string) => void;

  getRequestById: (id: string) => ApprovalRequest | undefined;
  getPendingRequests: (type?: ApprovalType) => ApprovalRequest[];
  getRequestsByEntity: (entityId: string) => ApprovalRequest[];
  getPendingCount: () => number;

  addAuditLog: (log: Omit<ApprovalAuditLog, 'id' | 'timestamp'>) => void;
  getAuditLogs: (requestId?: string) => ApprovalAuditLog[];
}

export const useApprovalWorkflowsStore = create<ApprovalWorkflowsState>()(
  persist(
    (set, get) => ({
      workflows: [],
      requests: [],
      auditLogs: [],
      isInitialized: false,

      initializeWorkflows: () => {
        if (get().isInitialized) return;
        set({ workflows: get().workflows.length > 0 ? get().workflows : DEFAULT_WORKFLOWS, isInitialized: true });
      },

      updateWorkflow: (id, updates, adminId, adminName) => {
        set((state) => ({ workflows: state.workflows.map(w => w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w) }));
        get().addAuditLog({ requestId: id, action: 'approved', performedBy: adminId, performedByName: adminName, details: `Workflow updated: ${Object.keys(updates).join(', ')}` });
      },

      toggleWorkflow: (id, adminId, adminName) => {
        const workflow = get().workflows.find(w => w.id === id);
        set((state) => ({ workflows: state.workflows.map(w => w.id === id ? { ...w, isEnabled: !w.isEnabled, updatedAt: new Date().toISOString() } : w) }));
        get().addAuditLog({ requestId: id, action: workflow?.isEnabled ? 'rejected' : 'approved', performedBy: adminId, performedByName: adminName, details: `Workflow ${workflow?.isEnabled ? 'disabled' : 'enabled'}` });
      },

      getWorkflow: (type) => get().workflows.find(w => w.type === type),
      isWorkflowEnabled: (type) => get().workflows.find(w => w.type === type)?.isEnabled ?? false,
      shouldAutoApprove: (type) => {
        const workflow = get().workflows.find(w => w.type === type);
        return workflow?.autoApprove ?? false;
      },

      submitRequest: (requestData) => {
        const now = new Date().toISOString();
        const workflow = get().getWorkflow(requestData.workflowType);
        const shouldAuto = workflow?.autoApprove ?? false;

        const newRequest: ApprovalRequest = {
          ...requestData,
          id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status: shouldAuto ? 'approved' : 'pending',
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({ requests: [...state.requests, newRequest] }));
        get().addAuditLog({ requestId: newRequest.id, action: shouldAuto ? 'auto_approved' : 'submitted', performedBy: requestData.submittedBy, performedByName: requestData.submittedByName, details: shouldAuto ? 'Auto-approved' : 'Request submitted' });
        return newRequest;
      },

      approveRequest: (requestId, adminId, adminName, notes) => {
        set((state) => ({
          requests: state.requests.map(r => r.id === requestId ? { ...r, status: 'approved', reviewedBy: adminId, reviewedByName: adminName, reviewedAt: new Date().toISOString(), notes, updatedAt: new Date().toISOString() } : r),
        }));
        get().addAuditLog({ requestId, action: 'approved', performedBy: adminId, performedByName: adminName, details: notes || 'Request approved' });
      },

      rejectRequest: (requestId, adminId, adminName, reason) => {
        set((state) => ({
          requests: state.requests.map(r => r.id === requestId ? { ...r, status: 'rejected', reviewedBy: adminId, reviewedByName: adminName, reviewedAt: new Date().toISOString(), rejectionReason: reason, updatedAt: new Date().toISOString() } : r),
        }));
        get().addAuditLog({ requestId, action: 'rejected', performedBy: adminId, performedByName: adminName, details: `Rejected: ${reason}` });
      },

      requestMoreInfo: (requestId, adminId, adminName, infoRequest) => {
        set((state) => ({
          requests: state.requests.map(r => r.id === requestId ? { ...r, status: 'needs_info', reviewedBy: adminId, reviewedByName: adminName, notes: infoRequest, updatedAt: new Date().toISOString() } : r),
        }));
        get().addAuditLog({ requestId, action: 'info_requested', performedBy: adminId, performedByName: adminName, details: `Info requested: ${infoRequest}` });
      },

      getRequestById: (id) => get().requests.find(r => r.id === id),
      getPendingRequests: (type) => get().requests.filter(r => r.status === 'pending' && (!type || r.workflowType === type)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      getRequestsByEntity: (entityId) => get().requests.filter(r => r.entityId === entityId),
      getPendingCount: () => get().requests.filter(r => r.status === 'pending').length,

      addAuditLog: (logData) => {
        const newLog: ApprovalAuditLog = { ...logData, id: `applog_${Date.now()}`, timestamp: new Date().toISOString() };
        set((state) => ({ auditLogs: [newLog, ...state.auditLogs].slice(0, 1000) }));
      },

      getAuditLogs: (requestId) => {
        const logs = get().auditLogs;
        return requestId ? logs.filter(l => l.requestId === requestId) : logs;
      },
    }),
    { name: 'marketplace-approval-workflows' }
  )
);
