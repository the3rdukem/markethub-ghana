/**
 * Sessions Data Access Layer
 *
 * Server-side session management for authentication.
 * Sessions are stored in database, not localStorage.
 */

import { getDatabase } from '../index';
import { v4 as uuidv4 } from 'uuid';
import { createHash, randomBytes } from 'crypto';

export interface DbSession {
  id: string;
  user_id: string;
  user_role: string;
  token_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: string;
  created_at: string;
}

// Session duration in milliseconds (7 days)
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

// Debug logging helper
const DEBUG = process.env.NODE_ENV === 'development';
function debugLog(action: string, details: Record<string, unknown>): void {
  if (DEBUG) {
    console.log(`[SESSION:${action}]`, JSON.stringify(details, null, 2));
  }
}

/**
 * Generate a secure session token
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Hash session token for storage
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Create a new session
 */
export function createSession(
  userId: string,
  userRole: string,
  options?: {
    ipAddress?: string;
    userAgent?: string;
    durationMs?: number;
  }
): { session: DbSession; token: string } {
  debugLog('CREATE_START', { userId, userRole, hasOptions: !!options });

  const db = getDatabase();
  const id = `sess_${uuidv4().replace(/-/g, '').substring(0, 24)}`;
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (options?.durationMs || SESSION_DURATION_MS));

  debugLog('CREATE_DETAILS', {
    sessionId: id,
    tokenHashPrefix: tokenHash.substring(0, 8),
    expiresAt: expiresAt.toISOString()
  });

  const stmt = db.prepare(`
    INSERT INTO sessions (
      id, user_id, user_role, token_hash, ip_address, user_agent, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    stmt.run(
      id,
      userId,
      userRole,
      tokenHash,
      options?.ipAddress || null,
      options?.userAgent || null,
      expiresAt.toISOString(),
      now.toISOString()
    );

    const session = getSessionById(id)!;

    debugLog('CREATE_SUCCESS', {
      sessionId: id,
      userId: session.user_id,
      role: session.user_role
    });

    return { session, token };
  } catch (error) {
    debugLog('CREATE_ERROR', {
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Get session by ID
 */
export function getSessionById(id: string): DbSession | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM sessions WHERE id = ?');
  return stmt.get(id) as DbSession | null;
}

/**
 * Validate session token
 * Returns the session if valid and not expired, null otherwise
 */
export function validateSession(token: string): DbSession | null {
  debugLog('VALIDATE_START', { tokenPrefix: token.substring(0, 8) });

  const db = getDatabase();
  const tokenHash = hashToken(token);
  const now = new Date().toISOString();

  debugLog('VALIDATE_QUERY', {
    hashPrefix: tokenHash.substring(0, 8),
    currentTime: now
  });

  const stmt = db.prepare(`
    SELECT * FROM sessions
    WHERE token_hash = ?
    AND expires_at > ?
  `);

  const session = stmt.get(tokenHash, now) as DbSession | null;

  if (session) {
    debugLog('VALIDATE_SUCCESS', {
      sessionId: session.id,
      userId: session.user_id,
      role: session.user_role,
      expiresAt: session.expires_at
    });
  } else {
    // Check if session exists but is expired
    const expiredStmt = db.prepare('SELECT * FROM sessions WHERE token_hash = ?');
    const expiredSession = expiredStmt.get(tokenHash) as DbSession | null;

    if (expiredSession) {
      debugLog('VALIDATE_EXPIRED', {
        sessionId: expiredSession.id,
        expiresAt: expiredSession.expires_at,
        currentTime: now
      });
    } else {
      debugLog('VALIDATE_NOT_FOUND', { hashPrefix: tokenHash.substring(0, 8) });
    }
  }

  return session;
}

/**
 * Extend session expiration
 */
export function extendSession(sessionId: string, durationMs?: number): boolean {
  const db = getDatabase();
  const expiresAt = new Date(Date.now() + (durationMs || SESSION_DURATION_MS));

  const stmt = db.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?');
  const result = stmt.run(expiresAt.toISOString(), sessionId);

  debugLog('EXTEND', { sessionId, newExpiresAt: expiresAt.toISOString(), success: result.changes > 0 });

  return result.changes > 0;
}

/**
 * Delete session (logout)
 */
export function deleteSession(sessionId: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM sessions WHERE id = ?');
  const result = stmt.run(sessionId);

  debugLog('DELETE', { sessionId, success: result.changes > 0 });

  return result.changes > 0;
}

/**
 * Delete session by token
 */
export function deleteSessionByToken(token: string): boolean {
  const db = getDatabase();
  const tokenHash = hashToken(token);
  const stmt = db.prepare('DELETE FROM sessions WHERE token_hash = ?');
  const result = stmt.run(tokenHash);

  debugLog('DELETE_BY_TOKEN', { hashPrefix: tokenHash.substring(0, 8), success: result.changes > 0 });

  return result.changes > 0;
}

/**
 * Delete all sessions for a user
 */
export function deleteUserSessions(userId: string): number {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM sessions WHERE user_id = ?');
  const result = stmt.run(userId);

  debugLog('DELETE_USER_SESSIONS', { userId, deletedCount: result.changes });

  return result.changes;
}

/**
 * Get all sessions for a user
 */
export function getUserSessions(userId: string): DbSession[] {
  const db = getDatabase();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    SELECT * FROM sessions
    WHERE user_id = ?
    AND expires_at > ?
    ORDER BY created_at DESC
  `);

  return stmt.all(userId, now) as DbSession[];
}

/**
 * Cleanup expired sessions
 */
export function cleanupExpiredSessions(): number {
  const db = getDatabase();
  const now = new Date().toISOString();

  const stmt = db.prepare('DELETE FROM sessions WHERE expires_at <= ?');
  const result = stmt.run(now);

  debugLog('CLEANUP', { deletedCount: result.changes });

  return result.changes;
}

/**
 * Get session stats
 */
export function getSessionStats(): {
  activeSessionCount: number;
  expiredSessionCount: number;
} {
  const db = getDatabase();
  const now = new Date().toISOString();

  const activeStmt = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE expires_at > ?');
  const expiredStmt = db.prepare('SELECT COUNT(*) as count FROM sessions WHERE expires_at <= ?');

  const active = activeStmt.get(now) as { count: number };
  const expired = expiredStmt.get(now) as { count: number };

  return {
    activeSessionCount: active.count,
    expiredSessionCount: expired.count,
  };
}
