/**
 * Audit Logs Data Access Layer
 *
 * Server-side only - provides audit logging for all system actions.
 */

import { getDatabase } from '../index';
import { v4 as uuidv4 } from 'uuid';

export type AuditCategory = 'vendor' | 'user' | 'product' | 'order' | 'api' | 'system' | 'auth' | 'admin' | 'security' | 'category';
export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface DbAuditLog {
  id: string;
  action: string;
  category: AuditCategory;
  admin_id: string | null;
  admin_name: string | null;
  admin_email: string | null;
  admin_role: string | null;
  target_id: string | null;
  target_type: string | null;
  target_name: string | null;
  details: string | null;
  previous_value: string | null;
  new_value: string | null;
  ip_address: string | null;
  user_agent: string | null;
  severity: AuditSeverity;
  created_at: string;
}

export interface CreateAuditLogInput {
  action: string;
  category: AuditCategory;
  adminId?: string;
  adminName?: string;
  adminEmail?: string;
  adminRole?: string;
  targetId?: string;
  targetType?: string;
  targetName?: string;
  details?: string;
  previousValue?: string;
  newValue?: string;
  ipAddress?: string;
  userAgent?: string;
  severity?: AuditSeverity;
}

export interface AuditLogFilters {
  category?: AuditCategory;
  adminId?: string;
  targetId?: string;
  severity?: AuditSeverity;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * Create an audit log entry
 */
export function createAuditLog(input: CreateAuditLogInput): DbAuditLog {
  const db = getDatabase();
  const id = `log_${uuidv4().replace(/-/g, '').substring(0, 20)}`;
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO audit_logs (
      id, action, category, admin_id, admin_name, admin_email, admin_role,
      target_id, target_type, target_name, details, previous_value, new_value,
      ip_address, user_agent, severity, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.action,
    input.category,
    input.adminId || null,
    input.adminName || null,
    input.adminEmail || null,
    input.adminRole || null,
    input.targetId || null,
    input.targetType || null,
    input.targetName || null,
    input.details || null,
    input.previousValue || null,
    input.newValue || null,
    input.ipAddress || null,
    input.userAgent || null,
    input.severity || 'info',
    now
  );

  return getAuditLogById(id)!;
}

/**
 * Get audit log by ID
 */
export function getAuditLogById(id: string): DbAuditLog | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM audit_logs WHERE id = ?');
  return stmt.get(id) as DbAuditLog | null;
}

/**
 * Get audit logs with filters
 */
export function getAuditLogs(filters?: AuditLogFilters): DbAuditLog[] {
  const db = getDatabase();
  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: unknown[] = [];

  if (filters?.category) {
    query += ' AND category = ?';
    params.push(filters.category);
  }

  if (filters?.adminId) {
    query += ' AND admin_id = ?';
    params.push(filters.adminId);
  }

  if (filters?.targetId) {
    query += ' AND target_id = ?';
    params.push(filters.targetId);
  }

  if (filters?.severity) {
    query += ' AND severity = ?';
    params.push(filters.severity);
  }

  if (filters?.startDate) {
    query += ' AND created_at >= ?';
    params.push(filters.startDate);
  }

  if (filters?.endDate) {
    query += ' AND created_at <= ?';
    params.push(filters.endDate);
  }

  query += ' ORDER BY created_at DESC';

  if (filters?.limit) {
    query += ' LIMIT ?';
    params.push(filters.limit);
  }

  if (filters?.offset) {
    query += ' OFFSET ?';
    params.push(filters.offset);
  }

  const stmt = db.prepare(query);
  return stmt.all(...params) as DbAuditLog[];
}

/**
 * Get recent audit logs (last 24 hours)
 */
export function getRecentAuditLogs(limit: number = 100): DbAuditLog[] {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  return getAuditLogs({ startDate: yesterday, limit });
}

/**
 * Get audit logs for a specific target
 */
export function getTargetAuditLogs(targetId: string, limit?: number): DbAuditLog[] {
  return getAuditLogs({ targetId, limit });
}

/**
 * Get audit logs by admin
 */
export function getAdminAuditLogs(adminId: string, limit?: number): DbAuditLog[] {
  return getAuditLogs({ adminId, limit });
}

/**
 * Get critical security logs
 */
export function getSecurityLogs(limit?: number): DbAuditLog[] {
  return getAuditLogs({ severity: 'critical', limit });
}

/**
 * Cleanup old audit logs (keep last N days)
 */
export function cleanupAuditLogs(daysToKeep: number = 90): number {
  const db = getDatabase();
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();

  const stmt = db.prepare('DELETE FROM audit_logs WHERE created_at < ?');
  const result = stmt.run(cutoffDate);
  return result.changes;
}

/**
 * Get audit log stats
 */
export function getAuditLogStats(): {
  totalLogs: number;
  todayLogs: number;
  criticalLogs: number;
  byCategory: Record<string, number>;
} {
  const db = getDatabase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString();

  const totalStmt = db.prepare('SELECT COUNT(*) as count FROM audit_logs');
  const todayStmt = db.prepare('SELECT COUNT(*) as count FROM audit_logs WHERE created_at >= ?');
  const criticalStmt = db.prepare("SELECT COUNT(*) as count FROM audit_logs WHERE severity = 'critical'");
  const categoryStmt = db.prepare('SELECT category, COUNT(*) as count FROM audit_logs GROUP BY category');

  const total = (totalStmt.get() as { count: number }).count;
  const todayCount = (todayStmt.get(todayStr) as { count: number }).count;
  const critical = (criticalStmt.get() as { count: number }).count;
  const categories = categoryStmt.all() as { category: string; count: number }[];

  const byCategory: Record<string, number> = {};
  for (const cat of categories) {
    byCategory[cat.category] = cat.count;
  }

  return {
    totalLogs: total,
    todayLogs: todayCount,
    criticalLogs: critical,
    byCategory,
  };
}

/**
 * Log admin action (convenience function)
 */
export function logAdminAction(
  action: string,
  admin: { id: string; name: string; email: string; role: string },
  options?: {
    category?: AuditCategory;
    targetId?: string;
    targetType?: string;
    targetName?: string;
    details?: string;
    previousValue?: string;
    newValue?: string;
    severity?: AuditSeverity;
  }
): DbAuditLog {
  return createAuditLog({
    action,
    category: options?.category || 'admin',
    adminId: admin.id,
    adminName: admin.name,
    adminEmail: admin.email,
    adminRole: admin.role,
    ...options,
  });
}

/**
 * Log security event (convenience function)
 */
export function logSecurityEvent(
  action: string,
  details: string,
  options?: {
    adminId?: string;
    adminEmail?: string;
    ipAddress?: string;
    severity?: AuditSeverity;
  }
): DbAuditLog {
  return createAuditLog({
    action,
    category: 'security',
    details,
    severity: options?.severity || 'warning',
    ...options,
  });
}

/**
 * Log auth event (convenience function)
 */
export function logAuthEvent(
  action: string,
  userId: string,
  userEmail: string,
  success: boolean,
  options?: {
    ipAddress?: string;
    userAgent?: string;
    details?: string;
  }
): DbAuditLog {
  return createAuditLog({
    action,
    category: 'auth',
    targetId: userId,
    targetType: 'user',
    targetName: userEmail,
    details: options?.details || (success ? 'Success' : 'Failed'),
    severity: success ? 'info' : 'warning',
    ipAddress: options?.ipAddress,
    userAgent: options?.userAgent,
  });
}
