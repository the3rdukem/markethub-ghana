/**
 * Session Validation API Route
 *
 * Uses unified auth service for session validation.
 * Returns the same user format for all user types (buyers, vendors, admins).
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { validateSessionToken } from '@/lib/db/dal/auth-service';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    console.log('[SESSION_API] Validating session', { hasToken: !!sessionToken });

    if (!sessionToken) {
      console.log('[SESSION_API] No session token found');
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Validate session using unified auth service
    const result = validateSessionToken(sessionToken);

    if (!result.success || !result.data) {
      const error = result.error!;
      console.log('[SESSION_API] Session validation failed:', error.code, error.message);

      // Clear invalid cookies
      cookieStore.set('session_token', '', { maxAge: 0, path: '/' });
      cookieStore.set('user_role', '', { maxAge: 0, path: '/' });
      cookieStore.set('is_authenticated', '', { maxAge: 0, path: '/' });

      return NextResponse.json({
        authenticated: false,
        user: null,
        error: error.message,
        code: error.code,
      });
    }

    // Session valid - return user data (unified format for all user types)
    const { session, user } = result.data;
    console.log('[SESSION_API] Session valid', {
      sessionId: session.id,
      userId: session.userId,
      role: session.userRole,
    });

    if (!user) {
      console.error('[SESSION_API] Session valid but no user data');
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Return unified user data
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        phone: user.phone,
        location: user.location,
        businessName: user.businessName,
        businessType: user.businessType,
        isVerified: user.verificationStatus === 'verified',
        verificationStatus: user.verificationStatus,
        storeDescription: user.storeDescription,
        storeBanner: user.storeBanner,
        storeLogo: user.storeLogo,
        createdAt: user.createdAt,
        // Admin-specific fields (populated for admin/master_admin roles)
        adminRole: user.adminRole,
        permissions: user.permissions,
      },
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error('[SESSION_API] Unexpected error:', error);
    return NextResponse.json({
      authenticated: false,
      user: null,
      error: 'Session validation failed',
      code: 'TRANSACTION_FAILED',
    });
  }
}
