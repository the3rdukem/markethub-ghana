"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore, UserRole } from "@/lib/auth-store";
import { Loader2 } from "lucide-react";

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requireAuth?: boolean;
  redirectTo?: string;
}

/**
 * RouteGuard component for role-based access control
 *
 * Usage:
 * <RouteGuard allowedRoles={['vendor']} requireAuth>
 *   <VendorDashboard />
 * </RouteGuard>
 */
export function RouteGuard({
  children,
  allowedRoles,
  requireAuth = true,
  redirectTo,
}: RouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    // Check authentication
    if (requireAuth && !isAuthenticated) {
      const loginPath = getLoginPathForRoute(pathname);
      router.push(loginPath);
      return;
    }

    // Check role authorization
    if (allowedRoles && allowedRoles.length > 0 && user) {
      const userRole = getEffectiveRole(user);
      if (!allowedRoles.includes(userRole)) {
        const redirectPath = redirectTo || getDefaultRedirectForRole(userRole);
        router.push(redirectPath);
        return;
      }
    }

    setIsAuthorized(true);
  }, [isHydrated, isAuthenticated, user, allowedRoles, requireAuth, redirectTo, router, pathname]);

  // Loading state while hydrating
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Checking authorization
  if (!isAuthorized && requireAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Get the effective role including master_admin check
 */
function getEffectiveRole(user: { role: UserRole; adminRole?: string }): UserRole {
  if (user.adminRole === 'MASTER_ADMIN' || user.role === 'master_admin') {
    return 'master_admin';
  }
  return user.role;
}

/**
 * Get the appropriate login path based on the route being accessed
 */
function getLoginPathForRoute(pathname: string): string {
  if (pathname.startsWith('/admin')) {
    return '/admin/login';
  }
  if (pathname.startsWith('/vendor')) {
    return '/vendor/login';
  }
  return '/auth/login';
}

/**
 * Get the default redirect path based on user role
 */
function getDefaultRedirectForRole(role: UserRole): string {
  switch (role) {
    case 'master_admin':
    case 'admin':
      return '/admin';
    case 'vendor':
      return '/vendor';
    case 'buyer':
    default:
      return '/buyer/dashboard';
  }
}

/**
 * Hook for programmatic role checking
 */
export function useRoleCheck() {
  const { user, isAuthenticated } = useAuthStore();

  const hasRole = (roles: UserRole[]): boolean => {
    if (!isAuthenticated || !user) return false;
    const userRole = getEffectiveRole(user);
    return roles.includes(userRole);
  };

  const isAdmin = (): boolean => hasRole(['admin', 'master_admin']);
  const isMasterAdmin = (): boolean => hasRole(['master_admin']);
  const isVendor = (): boolean => hasRole(['vendor']);
  const isBuyer = (): boolean => hasRole(['buyer']);

  return {
    hasRole,
    isAdmin,
    isMasterAdmin,
    isVendor,
    isBuyer,
    userRole: user ? getEffectiveRole(user) : null,
  };
}

/**
 * Route configuration for the application
 */
export const routeConfig = {
  public: ['/', '/search', '/product', '/help', '/how-it-works', '/buyer-protection'],
  auth: ['/auth/login', '/auth/register', '/admin/login', '/vendor/login'],
  buyer: ['/buyer', '/checkout', '/order-success', '/messages', '/disputes', '/tracking'],
  vendor: ['/vendor', '/vendor/products', '/vendor/orders', '/vendor/analytics', '/vendor/settings', '/vendor/promotions', '/vendor/withdraw', '/vendor/verify'],
  admin: ['/admin'],
};

/**
 * Check if a path matches a route pattern
 */
export function matchesRoute(pathname: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    if (pattern.endsWith('*')) {
      return pathname.startsWith(pattern.slice(0, -1));
    }
    return pathname === pattern || pathname.startsWith(pattern + '/');
  });
}
