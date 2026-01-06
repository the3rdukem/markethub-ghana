/**
 * User Logout API Route
 *
 * Invalidates the current session and clears cookies.
 * Includes AUDIT LOGGING for logout events.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logoutByToken, validateSessionToken } from '@/lib/db/dal/auth-service';
import { logAuthEvent } from '@/lib/db/dal/audit';

export async function POST(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || undefined;
  const userAgent = request.headers.get('user-agent') || undefined;

  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;

    console.log('[LOGOUT_API] Logging out', { hasToken: !!sessionToken });

    // Get user info before logout for audit log
    let userId = 'unknown';
    let userEmail = 'unknown';
    if (sessionToken) {
      const sessionResult = validateSessionToken(sessionToken);
      if (sessionResult.success && sessionResult.data?.user) {
        userId = sessionResult.data.user.id;
        userEmail = sessionResult.data.user.email;
      }
    }

    if (sessionToken) {
      // Delete the session from database using auth service
      logoutByToken(sessionToken);
    }

    // AUDIT LOG: Logout
    logAuthEvent(
      'LOGOUT',
      userId,
      userEmail,
      true,
      {
        ipAddress,
        userAgent,
        details: 'User logged out',
      }
    );

    // Clear all auth cookies
    cookieStore.set('session_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    cookieStore.set('user_role', '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    cookieStore.set('is_authenticated', '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    console.log('[LOGOUT_API] Logout successful');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[LOGOUT_API] Error:', error);
    return NextResponse.json(
      { error: 'Logout failed', code: 'TRANSACTION_FAILED' },
      { status: 500 }
    );
  }
}
