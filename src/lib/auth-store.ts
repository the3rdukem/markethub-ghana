/**
 * Auth Store
 *
 * Client-side auth state management.
 * The actual authentication is handled by the server via atomic API routes.
 * This store syncs with the server session.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// User roles
export type UserRole = 'buyer' | 'vendor' | 'admin' | 'master_admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  // Admin-specific fields
  adminRole?: 'MASTER_ADMIN' | 'ADMIN';
  permissions?: string[];
  // Vendor-specific fields
  businessName?: string;
  isVerified?: boolean;
  verificationStatus?: 'pending' | 'under_review' | 'verified' | 'rejected' | 'suspended';
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
  // Common fields
  status?: string;
  phone?: string;
  location?: string;
  createdAt: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  // Actions
  setUser: (user: User | null) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
  // Legacy actions
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  // Role checks
  isMasterAdmin: () => boolean;
  isAdmin: () => boolean;
  hasAdminAccess: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isHydrated: false,

      setUser: (user: User | null) => {
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        });
      },

      clearAuth: () => {
        // Clear cookies (for client-side)
        if (typeof document !== 'undefined') {
          document.cookie = 'user_role=; path=/; max-age=0';
          document.cookie = 'is_authenticated=; path=/; max-age=0';
        }
        set({ user: null, isAuthenticated: false, isLoading: false });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setHydrated: (hydrated: boolean) => {
        set({ isHydrated: hydrated });
      },

      login: (user: User) => {
        set({ user, isAuthenticated: true, isLoading: false });
        // Set cookies for middleware-based route protection
        if (typeof document !== 'undefined') {
          document.cookie = `user_role=${user.role}; path=/; samesite=lax`;
          document.cookie = `is_authenticated=true; path=/; samesite=lax`;
        }
      },

      logout: () => {
        // Call logout API
        fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(console.error);
        // Clear cookies
        if (typeof document !== 'undefined') {
          document.cookie = 'user_role=; path=/; max-age=0';
          document.cookie = 'is_authenticated=; path=/; max-age=0';
          document.cookie = 'session_token=; path=/; max-age=0';
        }
        set({ user: null, isAuthenticated: false, isLoading: false });
        // Hard redirect to prevent chunk load errors
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      },

      updateUser: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...updates } });
        }
      },

      isMasterAdmin: () => {
        const user = get().user;
        return user?.role === 'master_admin' || user?.adminRole === 'MASTER_ADMIN';
      },

      isAdmin: () => {
        const user = get().user;
        return user?.role === 'admin' || user?.role === 'master_admin';
      },

      hasAdminAccess: () => {
        const user = get().user;
        return (
          user?.role === 'admin' ||
          user?.role === 'master_admin' ||
          user?.adminRole === 'ADMIN' ||
          user?.adminRole === 'MASTER_ADMIN'
        );
      },
    }),
    {
      name: 'marketplace-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

/**
 * Sync auth state with server session.
 * Call this on app initialization and after navigation.
 */
export async function syncAuthWithServer(): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'include',
    });

    if (!response.ok) {
      useAuthStore.getState().clearAuth();
      return null;
    }

    const data = await response.json();

    if (data.authenticated && data.user) {
      useAuthStore.getState().setUser(data.user);

      // Ensure cookies are set for middleware
      if (typeof document !== 'undefined') {
        document.cookie = `user_role=${data.user.role}; path=/; samesite=lax`;
        document.cookie = `is_authenticated=true; path=/; samesite=lax`;
      }

      return data.user;
    } else {
      useAuthStore.getState().clearAuth();
      return null;
    }
  } catch (error) {
    console.error('[AUTH_STORE] Sync error:', error);
    useAuthStore.getState().clearAuth();
    return null;
  }
}

/**
 * Login via API - returns specific error codes on failure
 */
export async function loginViaAPI(
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string; code?: string; redirect?: string }> {
  try {
    useAuthStore.getState().setLoading(true);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      useAuthStore.getState().setLoading(false);
      return {
        success: false,
        error: data.error || 'Login failed',
        code: data.code || 'UNKNOWN_ERROR'
      };
    }

    // Set user in store
    useAuthStore.getState().login(data.user);

    return {
      success: true,
      user: data.user,
      redirect: data.redirect
    };
  } catch (error) {
    console.error('[AUTH_STORE] Login error:', error);
    useAuthStore.getState().setLoading(false);
    return { success: false, error: 'Network error', code: 'NETWORK_ERROR' };
  }
}

/**
 * Admin login via API - returns specific error codes on failure
 */
export async function adminLoginViaAPI(
  email: string,
  password: string
): Promise<{ success: boolean; admin?: User; error?: string; code?: string; redirect?: string }> {
  try {
    useAuthStore.getState().setLoading(true);

    const response = await fetch('/api/auth/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      useAuthStore.getState().setLoading(false);
      return {
        success: false,
        error: data.error || 'Admin login failed',
        code: data.code || 'UNKNOWN_ERROR'
      };
    }

    // Transform admin data to User format and set in store
    const adminUser: User = {
      id: data.admin.id,
      email: data.admin.email,
      name: data.admin.name,
      role: data.admin.role as UserRole,
      adminRole: data.admin.adminRole,
      permissions: data.admin.permissions,
      createdAt: data.admin.createdAt,
    };

    useAuthStore.getState().login(adminUser);

    return {
      success: true,
      admin: adminUser,
      redirect: data.redirect
    };
  } catch (error) {
    console.error('[AUTH_STORE] Admin login error:', error);
    useAuthStore.getState().setLoading(false);
    return { success: false, error: 'Network error', code: 'NETWORK_ERROR' };
  }
}

/**
 * Register via API - returns specific error codes on failure
 */
export async function registerViaAPI(data: {
  email: string;
  password: string;
  name: string;
  role: 'buyer' | 'vendor';
  phone?: string;
  location?: string;
  businessName?: string;
  businessType?: string;
}): Promise<{ success: boolean; user?: User; error?: string; code?: string; redirect?: string }> {
  try {
    useAuthStore.getState().setLoading(true);

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

    if (!response.ok) {
      useAuthStore.getState().setLoading(false);
      return {
        success: false,
        error: responseData.error || 'Registration failed',
        code: responseData.code || 'UNKNOWN_ERROR'
      };
    }

    // Set user in store
    useAuthStore.getState().login(responseData.user);

    return {
      success: true,
      user: responseData.user,
      redirect: responseData.redirect
    };
  } catch (error) {
    console.error('[AUTH_STORE] Register error:', error);
    useAuthStore.getState().setLoading(false);
    return { success: false, error: 'Network error', code: 'NETWORK_ERROR' };
  }
}

/**
 * Get route after login based on role
 */
export const getRouteForRole = (role: UserRole): string => {
  switch (role) {
    case 'master_admin':
      return '/admin';
    case 'admin':
      return '/admin';
    case 'vendor':
      return '/vendor';
    case 'buyer':
    default:
      return '/buyer/dashboard';
  }
};

/**
 * Check if user has specific admin permission
 */
export const hasAdminPermission = (user: User | null, permission: string): boolean => {
  if (!user) return false;
  if (user.adminRole === 'MASTER_ADMIN') return true;
  return user.permissions?.includes(permission) ?? false;
};
