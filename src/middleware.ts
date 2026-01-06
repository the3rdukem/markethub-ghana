import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for Role-Based Route Protection
 *
 * This runs on the server BEFORE any page or component loads,
 * preventing chunk load errors by redirecting unauthorized users
 * before their browser tries to load role-specific chunks.
 *
 * IMPORTANT: Since auth state is in localStorage (client-side),
 * we cannot read it directly here. Instead, we use cookies for
 * role-based routing. The auth flow sets cookies on login.
 *
 * For pure client-side auth, this middleware handles route
 * structure validation only. Deep auth checks happen client-side.
 */

// Routes that require authentication
const protectedRoutes = {
  vendor: [
    '/vendor',
    '/vendor/products',
    '/vendor/orders',
    '/vendor/analytics',
    '/vendor/settings',
    '/vendor/promotions',
    '/vendor/withdraw',
    '/vendor/verify',
  ],
  admin: [
    '/admin',
    '/admin/verifications',
    '/admin/audit-logs',
    '/admin/branding',
    '/admin/banners',
    '/admin/verification',
  ],
  buyer: [
    '/buyer/dashboard',
    '/buyer/profile',
    '/buyer/wishlist',
    '/buyer/notifications',
    '/buyer/orders',
  ],
};

// Public routes that don't require auth
const publicRoutes = [
  '/',
  '/search',
  '/product',
  '/help',
  '/how-it-works',
  '/buyer-protection',
  '/auth/login',
  '/auth/register',
  '/vendor/login',
  '/admin/login',
  '/login',
];

// Routes that are accessible by a specific role ONLY
const roleExclusiveRoutes: { pattern: RegExp; allowedRoles: string[]; loginPath: string }[] = [
  // Vendor dashboard routes (not vendor store pages /vendor/[id])
  {
    pattern: /^\/vendor(?!\/login|\/[a-zA-Z0-9_-]+$)/,
    allowedRoles: ['vendor'],
    loginPath: '/vendor/login'
  },
  // Admin routes
  {
    pattern: /^\/admin(?!\/login)/,
    allowedRoles: ['admin', 'master_admin'],
    loginPath: '/admin/login'
  },
  // Buyer-specific routes (not general buying which is public)
  {
    pattern: /^\/buyer/,
    allowedRoles: ['buyer', 'vendor', 'admin', 'master_admin'],
    loginPath: '/auth/login'
  },
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Get role cookie if available
  const roleCookie = request.cookies.get('user_role');
  const authCookie = request.cookies.get('is_authenticated');
  const userRole = roleCookie?.value;
  const isAuthenticated = authCookie?.value === 'true';

  // Check if this is a role-exclusive route
  for (const route of roleExclusiveRoutes) {
    if (route.pattern.test(pathname)) {
      // If user is not authenticated, let client handle redirect
      // (We can't reliably check localStorage auth from middleware)
      if (!isAuthenticated || !userRole) {
        // Set header to tell client this needs auth check
        const response = NextResponse.next();
        response.headers.set('x-requires-auth', 'true');
        response.headers.set('x-required-roles', route.allowedRoles.join(','));
        response.headers.set('x-login-path', route.loginPath);
        return response;
      }

      // If user has wrong role, redirect to appropriate dashboard
      if (!route.allowedRoles.includes(userRole)) {
        const redirectPath = getRedirectForRole(userRole);
        return NextResponse.redirect(new URL(redirectPath, request.url));
      }
    }
  }

  return NextResponse.next();
}

function getRedirectForRole(role: string): string {
  switch (role) {
    case 'vendor':
      return '/vendor';
    case 'admin':
    case 'master_admin':
      return '/admin';
    case 'buyer':
    default:
      return '/buyer/dashboard';
  }
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)',
  ],
};
