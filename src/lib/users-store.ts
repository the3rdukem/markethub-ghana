import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'buyer' | 'vendor' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'pending' | 'banned' | 'deleted';
export type VendorVerificationStatus = 'pending' | 'under_review' | 'verified' | 'rejected' | 'suspended';

export interface PlatformUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  phone?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  // Vendor-specific fields
  businessName?: string;
  businessType?: string;
  verificationStatus?: VendorVerificationStatus;
  verificationDocuments?: {
    idDocument?: string;
    businessLicense?: string;
    facialVerification?: string;
    facialMatchScore?: number;
  };
  verificationNotes?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  // Store fields (for vendors)
  storeDescription?: string;
  storeBanner?: string;
  storeLogo?: string;
  storeWebsite?: string;
  storeBusinessHours?: string;
  storeReturnPolicy?: string;
  storeShippingPolicy?: string;
  storeSpecialties?: string[];
  storeCertifications?: string[];
  storeRating?: number;
  storeResponseTime?: string;
  storeStatus?: 'open' | 'closed' | 'vacation';
  storeVacationMessage?: string;
  storeContactEmail?: string;
  storeContactPhone?: string;
  storeSocialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    whatsapp?: string;
  };
  // Stats
  totalOrders?: number;
  totalSpent?: number;
  totalSales?: number;
  totalProducts?: number;
  // Soft delete fields
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletionReason?: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  category: 'vendor' | 'user' | 'product' | 'order' | 'api' | 'system';
  adminId: string;
  adminName: string;
  targetId?: string;
  targetType?: string;
  targetName?: string;
  details: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
  ipAddress?: string;
}

export interface Dispute {
  id: string;
  orderId: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  vendorId: string;
  vendorName: string;
  productId: string;
  productName: string;
  amount: number;
  type: 'refund' | 'quality' | 'delivery' | 'fraud' | 'other';
  status: 'open' | 'investigating' | 'resolved' | 'escalated' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  resolution?: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  messages: {
    id: string;
    senderId: string;
    senderName: string;
    senderRole: UserRole;
    message: string;
    timestamp: string;
  }[];
}

export interface APIConfiguration {
  id: string;
  name: string;
  provider: string;
  category: 'payment' | 'maps' | 'auth' | 'ai' | 'storage' | 'sms' | 'verification' | 'social';
  isEnabled: boolean;
  isConfigured: boolean;
  environment: 'test' | 'production';
  apiKey?: string;
  secretKey?: string;
  webhookUrl?: string;
  additionalConfig?: Record<string, string>;
  status: 'active' | 'error' | 'inactive';
  lastError?: string;
  lastTestedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface UsersState {
  users: PlatformUser[];
  auditLogs: AuditLogEntry[];
  disputes: Dispute[];
  apiConfigurations: APIConfiguration[];

  // User Management
  addUser: (user: Omit<PlatformUser, 'id' | 'createdAt' | 'updatedAt'>) => PlatformUser;
  updateUser: (id: string, updates: Partial<PlatformUser>) => void;
  deleteUser: (id: string) => void;
  getUserById: (id: string) => PlatformUser | undefined;
  getUsersByRole: (role: UserRole) => PlatformUser[];
  suspendUser: (id: string, adminId: string, adminName: string, reason: string) => void;
  activateUser: (id: string, adminId: string, adminName: string) => void;
  banUser: (id: string, adminId: string, adminName: string, reason: string) => void;
  softDeleteUser: (id: string, adminId: string, adminName: string, reason: string) => void;
  restoreUser: (id: string, adminId: string, adminName: string) => void;
  permanentlyDeleteUser: (id: string, adminId: string, adminName: string) => void;

  // User queries
  getActiveUsers: () => PlatformUser[];
  getDeletedUsers: () => PlatformUser[];
  getSuspendedUsers: () => PlatformUser[];
  searchUsers: (query: string) => PlatformUser[];
  getAllUsersIncludingDeleted: () => PlatformUser[];

  // Vendor Verification
  getPendingVendors: () => PlatformUser[];
  approveVendor: (vendorId: string, adminId: string, adminName: string) => void;
  rejectVendor: (vendorId: string, adminId: string, adminName: string, reason: string) => void;
  requestAdditionalDocs: (vendorId: string, adminId: string, adminName: string, request: string) => void;

  // Disputes
  addDispute: (dispute: Omit<Dispute, 'id' | 'createdAt' | 'updatedAt' | 'messages'>) => Dispute;
  updateDispute: (id: string, updates: Partial<Dispute>) => void;
  resolveDispute: (id: string, resolution: string, adminId: string, adminName: string) => void;
  addDisputeMessage: (disputeId: string, senderId: string, senderName: string, senderRole: UserRole, message: string) => void;
  getOpenDisputes: () => Dispute[];

  // Audit Logs
  addAuditLog: (log: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
  getAuditLogs: (filters?: { category?: string; adminId?: string; startDate?: string; endDate?: string }) => AuditLogEntry[];

  // API Configurations
  updateAPIConfiguration: (id: string, updates: Partial<APIConfiguration>) => void;
  toggleAPI: (id: string, adminId: string, adminName: string) => void;
  testAPIConnection: (id: string) => Promise<boolean>;
  getAPIConfigurations: () => APIConfiguration[];

  // Platform Metrics
  getPlatformMetrics: () => {
    totalBuyers: number;
    totalVendors: number;
    verifiedVendors: number;
    pendingVendors: number;
    totalAdmins: number;
    activeUsers: number;
    suspendedUsers: number;
  };
}

// Default API configurations
const defaultAPIConfigurations: APIConfiguration[] = [
  {
    id: 'paystack',
    name: 'Paystack',
    provider: 'Paystack',
    category: 'payment',
    isEnabled: false,
    isConfigured: false,
    environment: 'test',
    status: 'inactive',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'google_maps',
    name: 'Google Maps',
    provider: 'Google',
    category: 'maps',
    isEnabled: false,
    isConfigured: false,
    environment: 'production',
    status: 'inactive',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'google_oauth',
    name: 'Google OAuth',
    provider: 'Google',
    category: 'auth',
    isEnabled: false,
    isConfigured: false,
    environment: 'production',
    status: 'inactive',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'openai',
    name: 'OpenAI',
    provider: 'OpenAI',
    category: 'ai',
    isEnabled: false,
    isConfigured: false,
    environment: 'production',
    status: 'inactive',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'google_cloud_storage',
    name: 'Google Cloud Storage',
    provider: 'Google',
    category: 'storage',
    isEnabled: false,
    isConfigured: false,
    environment: 'production',
    status: 'inactive',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'arkesel',
    name: 'Arkesel OTP',
    provider: 'Arkesel',
    category: 'sms',
    isEnabled: false,
    isConfigured: false,
    environment: 'test',
    status: 'inactive',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'facial_recognition',
    name: 'Facial Recognition',
    provider: 'Custom',
    category: 'verification',
    isEnabled: false,
    isConfigured: false,
    environment: 'production',
    status: 'inactive',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'facebook_login',
    name: 'Facebook Login',
    provider: 'Meta',
    category: 'social',
    isEnabled: false,
    isConfigured: false,
    environment: 'production',
    status: 'inactive',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const useUsersStore = create<UsersState>()(
  persist(
    (set, get) => ({
      users: [],
      auditLogs: [],
      disputes: [],
      apiConfigurations: defaultAPIConfigurations,

      // User Management
      addUser: (userData) => {
        const now = new Date().toISOString();
        const newUser: PlatformUser = {
          ...userData,
          id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          users: [...state.users, newUser],
        }));
        return newUser;
      },

      updateUser: (id, updates) => {
        set((state) => ({
          users: state.users.map((user) =>
            user.id === id
              ? { ...user, ...updates, updatedAt: new Date().toISOString() }
              : user
          ),
        }));
      },

      deleteUser: (id) => {
        set((state) => ({
          users: state.users.filter((user) => user.id !== id),
        }));
      },

      getUserById: (id) => {
        return get().users.find((user) => user.id === id);
      },

      getUsersByRole: (role) => {
        return get().users.filter((user) => user.role === role);
      },

      suspendUser: (id, adminId, adminName, reason) => {
        const user = get().getUserById(id);
        if (!user) return;

        get().updateUser(id, { status: 'suspended' });
        get().addAuditLog({
          action: 'USER_SUSPENDED',
          category: 'user',
          adminId,
          adminName,
          targetId: id,
          targetType: 'user',
          targetName: user.name,
          details: `User suspended: ${reason}`,
          previousValue: user.status,
          newValue: 'suspended',
        });
      },

      activateUser: (id, adminId, adminName) => {
        const user = get().getUserById(id);
        if (!user) return;

        get().updateUser(id, { status: 'active' });
        get().addAuditLog({
          action: 'USER_ACTIVATED',
          category: 'user',
          adminId,
          adminName,
          targetId: id,
          targetType: 'user',
          targetName: user.name,
          details: 'User account activated',
          previousValue: user.status,
          newValue: 'active',
        });
      },

      banUser: (id, adminId, adminName, reason) => {
        const user = get().getUserById(id);
        if (!user) return;
        get().updateUser(id, { status: 'banned' });
        get().addAuditLog({
          action: 'USER_BANNED',
          category: 'user',
          adminId,
          adminName,
          targetId: id,
          targetType: 'user',
          targetName: user.name,
          details: `User banned: ${reason}`,
          previousValue: user.status,
          newValue: 'banned',
        });
      },

      softDeleteUser: (id, adminId, adminName, reason) => {
        const user = get().getUserById(id);
        if (!user) return;
        get().updateUser(id, {
          status: 'deleted',
          isDeleted: true,
          deletedAt: new Date().toISOString(),
          deletedBy: adminId,
          deletionReason: reason,
        });
        get().addAuditLog({
          action: 'USER_SOFT_DELETED',
          category: 'user',
          adminId,
          adminName,
          targetId: id,
          targetType: 'user',
          targetName: user.name,
          details: `User soft deleted: ${reason}`,
          previousValue: user.status,
          newValue: 'deleted',
        });
      },

      restoreUser: (id, adminId, adminName) => {
        const user = get().getUserById(id);
        if (!user) return;
        get().updateUser(id, {
          status: 'active',
          isDeleted: false,
          deletedAt: undefined,
          deletedBy: undefined,
          deletionReason: undefined,
        });
        get().addAuditLog({
          action: 'USER_RESTORED',
          category: 'user',
          adminId,
          adminName,
          targetId: id,
          targetType: 'user',
          targetName: user.name,
          details: 'User account restored',
          previousValue: 'deleted',
          newValue: 'active',
        });
      },

      permanentlyDeleteUser: (id, adminId, adminName) => {
        const user = get().getUserById(id);
        if (!user) return;
        set((state) => ({ users: state.users.filter((u) => u.id !== id) }));
        get().addAuditLog({
          action: 'USER_PERMANENTLY_DELETED',
          category: 'user',
          adminId,
          adminName,
          targetId: id,
          targetType: 'user',
          targetName: user.name,
          details: 'User permanently deleted from system',
        });
      },

      getActiveUsers: () => get().users.filter(u => u.status === 'active' && !u.isDeleted),
      getDeletedUsers: () => get().users.filter(u => u.isDeleted),
      getSuspendedUsers: () => get().users.filter(u => u.status === 'suspended'),
      getAllUsersIncludingDeleted: () => get().users,

      searchUsers: (query) => {
        const lowerQuery = query.toLowerCase();
        return get().users.filter(u =>
          !u.isDeleted && (
            u.name.toLowerCase().includes(lowerQuery) ||
            u.email.toLowerCase().includes(lowerQuery) ||
            u.phone?.toLowerCase().includes(lowerQuery) ||
            u.businessName?.toLowerCase().includes(lowerQuery)
          )
        );
      },

      // Vendor Verification
      getPendingVendors: () => {
        return get().users.filter(
          (user) => user.role === 'vendor' &&
          (user.verificationStatus === 'pending' || user.verificationStatus === 'under_review')
        );
      },

      approveVendor: (vendorId, adminId, adminName) => {
        const vendor = get().getUserById(vendorId);
        if (!vendor) return;

        get().updateUser(vendorId, {
          verificationStatus: 'verified',
          status: 'active',
          verifiedAt: new Date().toISOString(),
          verifiedBy: adminId,
        });

        get().addAuditLog({
          action: 'VENDOR_APPROVED',
          category: 'vendor',
          adminId,
          adminName,
          targetId: vendorId,
          targetType: 'vendor',
          targetName: vendor.businessName || vendor.name,
          details: 'Vendor application approved',
          previousValue: vendor.verificationStatus,
          newValue: 'verified',
        });
      },

      rejectVendor: (vendorId, adminId, adminName, reason) => {
        const vendor = get().getUserById(vendorId);
        if (!vendor) return;

        get().updateUser(vendorId, {
          verificationStatus: 'rejected',
          verificationNotes: reason,
        });

        get().addAuditLog({
          action: 'VENDOR_REJECTED',
          category: 'vendor',
          adminId,
          adminName,
          targetId: vendorId,
          targetType: 'vendor',
          targetName: vendor.businessName || vendor.name,
          details: `Vendor application rejected: ${reason}`,
          previousValue: vendor.verificationStatus,
          newValue: 'rejected',
        });
      },

      requestAdditionalDocs: (vendorId, adminId, adminName, request) => {
        const vendor = get().getUserById(vendorId);
        if (!vendor) return;

        get().updateUser(vendorId, {
          verificationStatus: 'under_review',
          verificationNotes: request,
        });

        get().addAuditLog({
          action: 'VENDOR_DOCS_REQUESTED',
          category: 'vendor',
          adminId,
          adminName,
          targetId: vendorId,
          targetType: 'vendor',
          targetName: vendor.businessName || vendor.name,
          details: `Additional documents requested: ${request}`,
        });
      },

      // Disputes
      addDispute: (disputeData) => {
        const now = new Date().toISOString();
        const newDispute: Dispute = {
          ...disputeData,
          id: `dispute_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          messages: [],
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          disputes: [...state.disputes, newDispute],
        }));
        return newDispute;
      },

      updateDispute: (id, updates) => {
        set((state) => ({
          disputes: state.disputes.map((dispute) =>
            dispute.id === id
              ? { ...dispute, ...updates, updatedAt: new Date().toISOString() }
              : dispute
          ),
        }));
      },

      resolveDispute: (id, resolution, adminId, adminName) => {
        const dispute = get().disputes.find((d) => d.id === id);
        if (!dispute) return;

        get().updateDispute(id, {
          status: 'resolved',
          resolution,
          resolvedAt: new Date().toISOString(),
        });

        get().addAuditLog({
          action: 'DISPUTE_RESOLVED',
          category: 'order',
          adminId,
          adminName,
          targetId: id,
          targetType: 'dispute',
          targetName: `Order ${dispute.orderId}`,
          details: `Dispute resolved: ${resolution}`,
          previousValue: dispute.status,
          newValue: 'resolved',
        });
      },

      addDisputeMessage: (disputeId, senderId, senderName, senderRole, message) => {
        set((state) => ({
          disputes: state.disputes.map((dispute) =>
            dispute.id === disputeId
              ? {
                  ...dispute,
                  messages: [
                    ...dispute.messages,
                    {
                      id: `msg_${Date.now()}`,
                      senderId,
                      senderName,
                      senderRole,
                      message,
                      timestamp: new Date().toISOString(),
                    },
                  ],
                  updatedAt: new Date().toISOString(),
                }
              : dispute
          ),
        }));
      },

      getOpenDisputes: () => {
        return get().disputes.filter(
          (dispute) => dispute.status === 'open' || dispute.status === 'investigating' || dispute.status === 'escalated'
        );
      },

      // Audit Logs
      addAuditLog: (logData) => {
        const newLog: AuditLogEntry = {
          ...logData,
          id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          auditLogs: [newLog, ...state.auditLogs].slice(0, 1000), // Keep last 1000 logs
        }));
      },

      getAuditLogs: (filters) => {
        let logs = get().auditLogs;

        if (filters?.category) {
          logs = logs.filter((log) => log.category === filters.category);
        }
        if (filters?.adminId) {
          logs = logs.filter((log) => log.adminId === filters.adminId);
        }
        if (filters?.startDate) {
          logs = logs.filter((log) => log.timestamp >= filters.startDate!);
        }
        if (filters?.endDate) {
          logs = logs.filter((log) => log.timestamp <= filters.endDate!);
        }

        return logs;
      },

      // API Configurations
      updateAPIConfiguration: (id, updates) => {
        set((state) => ({
          apiConfigurations: state.apiConfigurations.map((config) =>
            config.id === id
              ? { ...config, ...updates, updatedAt: new Date().toISOString() }
              : config
          ),
        }));
      },

      toggleAPI: (id, adminId, adminName) => {
        const config = get().apiConfigurations.find((c) => c.id === id);
        if (!config) return;

        const newEnabled = !config.isEnabled;
        get().updateAPIConfiguration(id, {
          isEnabled: newEnabled,
          status: newEnabled ? 'active' : 'inactive',
        });

        get().addAuditLog({
          action: newEnabled ? 'API_ENABLED' : 'API_DISABLED',
          category: 'api',
          adminId,
          adminName,
          targetId: id,
          targetType: 'api',
          targetName: config.name,
          details: `${config.name} ${newEnabled ? 'enabled' : 'disabled'}`,
          previousValue: String(!newEnabled),
          newValue: String(newEnabled),
        });
      },

      testAPIConnection: async (id) => {
        // Simulate API test - in production this would make real API calls
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const success = Math.random() > 0.3; // 70% success rate for demo

        get().updateAPIConfiguration(id, {
          lastTestedAt: new Date().toISOString(),
          status: success ? 'active' : 'error',
          lastError: success ? undefined : 'Connection failed - check API credentials',
        });

        return success;
      },

      getAPIConfigurations: () => {
        return get().apiConfigurations;
      },

      // Platform Metrics
      getPlatformMetrics: () => {
        const users = get().users;
        const buyers = users.filter((u) => u.role === 'buyer');
        const vendors = users.filter((u) => u.role === 'vendor');
        const admins = users.filter((u) => u.role === 'admin');

        return {
          totalBuyers: buyers.length,
          totalVendors: vendors.length,
          verifiedVendors: vendors.filter((v) => v.verificationStatus === 'verified').length,
          pendingVendors: vendors.filter(
            (v) => v.verificationStatus === 'pending' || v.verificationStatus === 'under_review'
          ).length,
          totalAdmins: admins.length,
          activeUsers: users.filter((u) => u.status === 'active').length,
          suspendedUsers: users.filter((u) => u.status === 'suspended').length,
        };
      },
    }),
    {
      name: 'marketplace-users',
    }
  )
);
