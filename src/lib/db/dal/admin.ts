/**
 * Admin Users Data Access Layer
 *
 * Server-side only - provides CRUD operations for admin users.
 * Includes the initial master admin setup.
 */

import { getDatabase } from '../index';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword, verifyPassword } from './users';

export type AdminRole = 'MASTER_ADMIN' | 'ADMIN';

export type AdminPermission =
  | 'MANAGE_API_KEYS'
  | 'MANAGE_ADMINS'
  | 'MANAGE_VENDORS'
  | 'MANAGE_USERS'
  | 'MANAGE_PRODUCTS'
  | 'MANAGE_ORDERS'
  | 'MANAGE_DISPUTES'
  | 'VIEW_AUDIT_LOGS'
  | 'MANAGE_SYSTEM_SETTINGS'
  | 'VIEW_ANALYTICS'
  | 'MANAGE_SECURITY'
  | 'FULL_SYSTEM_ACCESS';

export interface DbAdminUser {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: AdminRole;
  is_active: number;
  permissions: string | null;
  mfa_enabled: number;
  created_by: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAdminInput {
  email: string;
  password: string;
  name: string;
  role: AdminRole;
  permissions?: AdminPermission[];
  createdBy?: string;
}

// All permissions for MASTER_ADMIN
export const MASTER_ADMIN_PERMISSIONS: AdminPermission[] = [
  'FULL_SYSTEM_ACCESS',
  'MANAGE_API_KEYS',
  'MANAGE_ADMINS',
  'MANAGE_VENDORS',
  'MANAGE_USERS',
  'MANAGE_PRODUCTS',
  'MANAGE_ORDERS',
  'MANAGE_DISPUTES',
  'VIEW_AUDIT_LOGS',
  'MANAGE_SYSTEM_SETTINGS',
  'VIEW_ANALYTICS',
  'MANAGE_SECURITY',
];

// Limited permissions for regular ADMIN
export const ADMIN_PERMISSIONS: AdminPermission[] = [
  'MANAGE_VENDORS',
  'MANAGE_USERS',
  'MANAGE_PRODUCTS',
  'MANAGE_ORDERS',
  'MANAGE_DISPUTES',
  'VIEW_AUDIT_LOGS',
  'VIEW_ANALYTICS',
];

// Initial Master Admin credentials (from environment or default)
const INITIAL_MASTER_ADMIN = {
  email: process.env.MASTER_ADMIN_EMAIL || 'the3rdukem@gmail.com',
  password: process.env.MASTER_ADMIN_PASSWORD || '123asdqweX$',
  name: 'System Administrator',
};

/**
 * Initialize the system with the initial master admin
 */
export function initializeAdminSystem(): void {
  const db = getDatabase();

  // Check if any admin exists
  const existingAdmin = db.prepare(
    "SELECT id FROM admin_users WHERE role = 'MASTER_ADMIN' LIMIT 1"
  ).get();

  if (!existingAdmin) {
    // Create initial master admin
    createAdminUser({
      email: INITIAL_MASTER_ADMIN.email,
      password: INITIAL_MASTER_ADMIN.password,
      name: INITIAL_MASTER_ADMIN.name,
      role: 'MASTER_ADMIN',
      permissions: MASTER_ADMIN_PERMISSIONS,
    });
    console.log('[DB] Initial Master Admin created:', INITIAL_MASTER_ADMIN.email);
  }
}

/**
 * Create a new admin user
 */
export function createAdminUser(input: CreateAdminInput): DbAdminUser {
  const db = getDatabase();
  const id = `admin_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  const now = new Date().toISOString();
  const passwordHash = hashPassword(input.password);
  const permissions = input.permissions ||
    (input.role === 'MASTER_ADMIN' ? MASTER_ADMIN_PERMISSIONS : ADMIN_PERMISSIONS);

  const stmt = db.prepare(`
    INSERT INTO admin_users (
      id, email, password_hash, name, role, is_active,
      permissions, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.email.toLowerCase(),
    passwordHash,
    input.name,
    input.role,
    1,
    JSON.stringify(permissions),
    input.createdBy || null,
    now,
    now
  );

  return getAdminById(id)!;
}

/**
 * Get admin by ID
 */
export function getAdminById(id: string): DbAdminUser | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM admin_users WHERE id = ?');
  return stmt.get(id) as DbAdminUser | null;
}

/**
 * Get admin by email
 */
export function getAdminByEmail(email: string): DbAdminUser | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM admin_users WHERE email = ? COLLATE NOCASE');
  return stmt.get(email.toLowerCase()) as DbAdminUser | null;
}

/**
 * Get all admins
 */
export function getAllAdmins(): DbAdminUser[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM admin_users ORDER BY created_at ASC');
  return stmt.all() as DbAdminUser[];
}

/**
 * Get master admins
 */
export function getMasterAdmins(): DbAdminUser[] {
  const db = getDatabase();
  const stmt = db.prepare("SELECT * FROM admin_users WHERE role = 'MASTER_ADMIN'");
  return stmt.all() as DbAdminUser[];
}

/**
 * Authenticate admin
 */
export function authenticateAdmin(email: string, password: string): {
  success: boolean;
  admin?: DbAdminUser;
  error?: string;
} {
  const admin = getAdminByEmail(email);

  if (!admin) {
    return { success: false, error: 'Invalid credentials' };
  }

  if (!admin.is_active) {
    return { success: false, error: 'Account is disabled' };
  }

  if (!verifyPassword(password, admin.password_hash)) {
    return { success: false, error: 'Invalid credentials' };
  }

  // Update last login
  updateAdminLastLogin(admin.id);

  return { success: true, admin };
}

/**
 * Update admin last login
 */
export function updateAdminLastLogin(id: string): void {
  const db = getDatabase();
  const now = new Date().toISOString();
  const stmt = db.prepare('UPDATE admin_users SET last_login_at = ? WHERE id = ?');
  stmt.run(now, id);
}

/**
 * Update admin
 */
export function updateAdmin(id: string, updates: {
  name?: string;
  isActive?: boolean;
  permissions?: AdminPermission[];
}): DbAdminUser | null {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.isActive !== undefined) {
    fields.push('is_active = ?');
    values.push(updates.isActive ? 1 : 0);
  }
  if (updates.permissions !== undefined) {
    fields.push('permissions = ?');
    values.push(JSON.stringify(updates.permissions));
  }

  values.push(id);

  const stmt = db.prepare(`UPDATE admin_users SET ${fields.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);

  if (result.changes === 0) return null;
  return getAdminById(id);
}

/**
 * Change admin password
 */
export function changeAdminPassword(id: string, newPassword: string): boolean {
  if (newPassword.length < 8) return false;

  const db = getDatabase();
  const passwordHash = hashPassword(newPassword);
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE admin_users SET password_hash = ?, updated_at = ? WHERE id = ?
  `);

  const result = stmt.run(passwordHash, now, id);
  return result.changes > 0;
}

/**
 * Revoke admin access (deactivate)
 */
export function revokeAdminAccess(id: string): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE admin_users SET is_active = 0, updated_at = ? WHERE id = ?
  `);

  const result = stmt.run(now, id);
  return result.changes > 0;
}

/**
 * Delete admin (permanent)
 */
export function deleteAdmin(id: string): boolean {
  const db = getDatabase();

  // Prevent deleting the last master admin
  const masterAdmins = getMasterAdmins();
  const targetAdmin = getAdminById(id);

  if (targetAdmin?.role === 'MASTER_ADMIN' && masterAdmins.length <= 1) {
    return false;
  }

  const stmt = db.prepare('DELETE FROM admin_users WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Check if admin has permission
 */
export function hasAdminPermission(admin: DbAdminUser, permission: AdminPermission): boolean {
  if (!admin.permissions) return false;
  const permissions = JSON.parse(admin.permissions) as AdminPermission[];
  return permissions.includes('FULL_SYSTEM_ACCESS') || permissions.includes(permission);
}

/**
 * Check if admin is master admin
 */
export function isMasterAdmin(admin: DbAdminUser): boolean {
  return admin.role === 'MASTER_ADMIN';
}
