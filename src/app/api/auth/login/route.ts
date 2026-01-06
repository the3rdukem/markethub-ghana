/**
 * User Login API Route
 *
 * Uses atomic auth service with SPECIFIC error codes.
 * NO generic "An error occurred" messages.
 * Includes AUDIT LOGGING for all auth events.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { loginUser, getRouteForRole, type AuthErrorCode } from '@/lib/db/dal/auth-service';
import { logAuthEvent } from '@/lib/db/dal/audit';

// Map auth error codes to HTTP status codes
function getHttpStatus(code: AuthErrorCode): number {
  switch (code) {
    case 'INVALID_INPUT': return 400;
    case 'USER_NOT_FOUND': return 401;
    case 'INVALID_CREDENTIALS': return 401;
    case 'USER_SUSPENDED': return 403;
    case 'USER_BANNED': return 403;
    case 'USER_DELETED': return 410;
    case 'ROLE_ASSIGNMENT_FAILED': return 500;
    case 'SESSION_CREATION_FAILED': return 500;
    case 'TRANSACTION_FAILED': return 500;
    default: return 500;
  }
}

export async function POST(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || undefined;
  const userAgent = request.headers.get('user-agent') || undefined;

  try {
    const body = await request.json();
    const { email, password } = body;

    console.log('[LOGIN_API] Starting atomic login', { email });

    // Call atomic login
    const result = loginUser(
      { email, password },
      { ipAddress, userAgent }
    );

    // Handle failure with specific error
    if (!result.success || !result.data) {
      const error = result.error!;
      console.log('[LOGIN_API] Login failed:', error.code, error.message);

      // AUDIT LOG: Login failure
      logAuthEvent(
        'LOGIN_FAILED',
        email || 'unknown',
        email || 'unknown',
        false,
        {
          ipAddress,
          userAgent,
          details: `${error.code}: ${error.message}`,
        }
      );

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: getHttpStatus(error.code) }
      );
    }

    // Login successful - set cookies
    const { user, session } = result.data;
    console.log('[LOGIN_API] Login successful, setting cookies', { userId: user.id, role: user.role });

    // AUDIT LOG: Login success
    logAuthEvent(
      'LOGIN_SUCCESS',
      user.id,
      user.email,
      true,
      {
        ipAddress,
        userAgent,
        details: `User logged in as ${user.role}`,
      }
    );

    const cookieStore = await cookies();

    // Session token (httpOnly for security)
    cookieStore.set('session_token', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    // User role (readable by client for routing)
    cookieStore.set('user_role', user.role, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    // Auth flag (readable by client)
    cookieStore.set('is_authenticated', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    console.log('[LOGIN_API] Cookies set, returning success');

    return NextResponse.json({
      success: true,
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
        isVerified: user.verificationStatus === 'verified',
        verificationStatus: user.verificationStatus,
        createdAt: user.createdAt,
      },
      redirect: getRouteForRole(user.role),
    });
  } catch (error) {
    console.error('[LOGIN_API] Unexpected error:', error);

    // AUDIT LOG: System error during login
    logAuthEvent(
      'LOGIN_ERROR',
      'system',
      'unknown',
      false,
      {
        ipAddress,
        userAgent,
        details: error instanceof Error ? error.message : String(error),
      }
    );

    return NextResponse.json(
      {
        error: 'Login failed due to an unexpected error',
        code: 'TRANSACTION_FAILED',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
