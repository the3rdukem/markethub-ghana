/**
 * User Registration API Route
 *
 * Uses atomic auth service - ALL steps in ONE transaction.
 * If ANY step fails, NOTHING is created.
 * Includes AUDIT LOGGING for all registration events.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { registerUser, getRouteForRole, type AuthErrorCode } from '@/lib/db/dal/auth-service';
import { logAuthEvent } from '@/lib/db/dal/audit';

// Map auth error codes to HTTP status codes
function getHttpStatus(code: AuthErrorCode): number {
  switch (code) {
    case 'INVALID_INPUT': return 400;
    case 'EMAIL_EXISTS': return 409;
    case 'ROLE_ASSIGNMENT_FAILED': return 500;
    case 'SESSION_CREATION_FAILED': return 500;
    case 'VERIFICATION_STATE_MISSING': return 500;
    case 'PASSWORD_HASH_FAILED': return 500;
    case 'TRANSACTION_FAILED': return 500;
    default: return 500;
  }
}

export async function POST(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || undefined;
  const userAgent = request.headers.get('user-agent') || undefined;

  try {
    const body = await request.json();
    const { email, password, name, role, phone, location, businessName, businessType } = body;

    console.log('[REGISTER_API] Starting atomic registration', { email, role });

    // Call atomic registration
    const result = registerUser(
      { email, password, name, role, phone, location, businessName, businessType },
      { ipAddress, userAgent }
    );

    // Handle failure with specific error
    if (!result.success || !result.data) {
      const error = result.error!;
      console.log('[REGISTER_API] Registration failed:', error.code, error.message);

      // AUDIT LOG: Registration failure
      logAuthEvent(
        'REGISTRATION_FAILED',
        email || 'unknown',
        email || 'unknown',
        false,
        {
          ipAddress,
          userAgent,
          details: `${error.code}: ${error.message}. Role: ${role}`,
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

    // Registration successful - set cookies
    const { user, session } = result.data;
    console.log('[REGISTER_API] Registration successful, setting cookies', { userId: user.id, role: user.role });

    // AUDIT LOG: Registration success
    logAuthEvent(
      'REGISTRATION_SUCCESS',
      user.id,
      user.email,
      true,
      {
        ipAddress,
        userAgent,
        details: `New ${user.role} account created${user.role === 'vendor' ? ` (verification: ${user.verificationStatus})` : ''}`,
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

    console.log('[REGISTER_API] Cookies set, returning success');

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
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
    console.error('[REGISTER_API] Unexpected error:', error);

    // AUDIT LOG: System error during registration
    logAuthEvent(
      'REGISTRATION_ERROR',
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
        error: 'Registration failed due to an unexpected error',
        code: 'TRANSACTION_FAILED',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
