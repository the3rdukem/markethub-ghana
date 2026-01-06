/**
 * Users Data Access Layer
 *
 * Server-side only - provides CRUD operations for users.
 * All data persistence happens here, not in client stores.
 */

import { getDatabase, runTransaction } from '../index';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

export type UserRole = 'buyer' | 'vendor' | 'admin' | 'master_admin';
export type UserStatus = 'active' | 'suspended' | 'pending' | 'banned' | 'deleted';
export type VerificationStatus = 'pending' | 'under_review' | 'verified' | 'rejected' | 'suspended';

export interface DbUser {
  id: string;
  email: string;
  password_hash: string | null;
  name: string;
  role: UserRole;
  status: UserStatus;
  avatar: string | null;
  phone: string | null;
  location: string | null;
  business_name: string | null;
  business_type: string | null;
  verification_status: VerificationStatus | null;
  verification_documents: string | null;
  verification_notes: string | null;
  verified_at: string | null;
  verified_by: string | null;
  store_description: string | null;
  store_banner: string | null;
  store_logo: string | null;
  is_deleted: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  status?: UserStatus;
  phone?: string;
  location?: string;
  businessName?: string;
  businessType?: string;
  verificationStatus?: VerificationStatus;
}

export interface UpdateUserInput {
  name?: string;
  status?: UserStatus;
  avatar?: string;
  phone?: string;
  location?: string;
  businessName?: string;
  businessType?: string;
  verificationStatus?: VerificationStatus;
  verificationNotes?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  storeDescription?: string;
  storeBanner?: string;
  storeLogo?: string;
  isDeleted?: boolean;
  lastLoginAt?: string;
}

/**
 * Hash password using SHA-256 with salt
 * In production, use bcrypt or argon2
 */
export function hashPassword(password: string): string {
  const salt = uuidv4().substring(0, 16);
  const hash = createHash('sha256')
    .update(password + salt)
    .digest('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password against stored hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const computedHash = createHash('sha256')
    .update(password + salt)
    .digest('hex');
  return computedHash === hash;
}

/**
 * Create a new user
 */
export function createUser(input: CreateUserInput): DbUser {
  const db = getDatabase();
  const id = `user_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  const now = new Date().toISOString();
  const passwordHash = input.password ? hashPassword(input.password) : null;

  const stmt = db.prepare(`
    INSERT INTO users (
      id, email, password_hash, name, role, status, phone, location,
      business_name, business_type, verification_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.email.toLowerCase(),
    passwordHash,
    input.name,
    input.role,
    input.status || (input.role === 'vendor' ? 'pending' : 'active'),
    input.phone || null,
    input.location || null,
    input.businessName || null,
    input.businessType || null,
    input.role === 'vendor' ? (input.verificationStatus || 'pending') : null,
    now,
    now
  );

  return getUserById(id)!;
}

/**
 * Get user by ID
 */
export function getUserById(id: string): DbUser | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) as DbUser | null;
}

/**
 * Get user by email
 */
export function getUserByEmail(email: string): DbUser | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE');
  return stmt.get(email.toLowerCase()) as DbUser | null;
}

/**
 * Get all users (excluding soft-deleted)
 */
export function getUsers(options?: {
  role?: UserRole;
  status?: UserStatus;
  includeDeleted?: boolean;
  limit?: number;
  offset?: number;
}): DbUser[] {
  const db = getDatabase();
  let query = 'SELECT * FROM users WHERE 1=1';
  const params: unknown[] = [];

  if (!options?.includeDeleted) {
    query += ' AND is_deleted = 0';
  }

  if (options?.role) {
    query += ' AND role = ?';
    params.push(options.role);
  }

  if (options?.status) {
    query += ' AND status = ?';
    params.push(options.status);
  }

  query += ' ORDER BY created_at DESC';

  if (options?.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  if (options?.offset) {
    query += ' OFFSET ?';
    params.push(options.offset);
  }

  const stmt = db.prepare(query);
  return stmt.all(...params) as DbUser[];
}

/**
 * Update user
 */
export function updateUser(id: string, updates: UpdateUserInput): DbUser | null {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.avatar !== undefined) {
    fields.push('avatar = ?');
    values.push(updates.avatar);
  }
  if (updates.phone !== undefined) {
    fields.push('phone = ?');
    values.push(updates.phone);
  }
  if (updates.location !== undefined) {
    fields.push('location = ?');
    values.push(updates.location);
  }
  if (updates.businessName !== undefined) {
    fields.push('business_name = ?');
    values.push(updates.businessName);
  }
  if (updates.businessType !== undefined) {
    fields.push('business_type = ?');
    values.push(updates.businessType);
  }
  if (updates.verificationStatus !== undefined) {
    fields.push('verification_status = ?');
    values.push(updates.verificationStatus);
  }
  if (updates.verificationNotes !== undefined) {
    fields.push('verification_notes = ?');
    values.push(updates.verificationNotes);
  }
  if (updates.verifiedAt !== undefined) {
    fields.push('verified_at = ?');
    values.push(updates.verifiedAt);
  }
  if (updates.verifiedBy !== undefined) {
    fields.push('verified_by = ?');
    values.push(updates.verifiedBy);
  }
  if (updates.storeDescription !== undefined) {
    fields.push('store_description = ?');
    values.push(updates.storeDescription);
  }
  if (updates.storeBanner !== undefined) {
    fields.push('store_banner = ?');
    values.push(updates.storeBanner);
  }
  if (updates.storeLogo !== undefined) {
    fields.push('store_logo = ?');
    values.push(updates.storeLogo);
  }
  if (updates.isDeleted !== undefined) {
    fields.push('is_deleted = ?');
    values.push(updates.isDeleted ? 1 : 0);
  }
  if (updates.lastLoginAt !== undefined) {
    fields.push('last_login_at = ?');
    values.push(updates.lastLoginAt);
  }

  values.push(id);

  const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);

  if (result.changes === 0) return null;
  return getUserById(id);
}

/**
 * Soft delete user
 */
export function softDeleteUser(id: string, deletedBy: string, reason: string): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE users SET
      status = 'deleted',
      is_deleted = 1,
      deleted_at = ?,
      deleted_by = ?,
      deletion_reason = ?,
      updated_at = ?
    WHERE id = ?
  `);

  const result = stmt.run(now, deletedBy, reason, now, id);
  return result.changes > 0;
}

/**
 * Permanently delete user
 */
export function deleteUser(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Verify user credentials
 */
export function verifyUserCredentials(email: string, password: string): DbUser | null {
  const user = getUserByEmail(email);
  if (!user || !user.password_hash) return null;
  if (!verifyPassword(password, user.password_hash)) return null;
  // Allow login for active and pending users
  // Block suspended, banned, and deleted users
  const allowedStatuses: UserStatus[] = ['active', 'pending'];
  if (!allowedStatuses.includes(user.status)) return null;
  return user;
}

/**
 * Search users
 */
export function searchUsers(query: string, options?: {
  role?: UserRole;
  limit?: number;
}): DbUser[] {
  const db = getDatabase();
  const searchTerm = `%${query.toLowerCase()}%`;
  let sql = `
    SELECT * FROM users
    WHERE is_deleted = 0
    AND (
      LOWER(name) LIKE ?
      OR LOWER(email) LIKE ?
      OR LOWER(phone) LIKE ?
      OR LOWER(business_name) LIKE ?
    )
  `;

  const params: unknown[] = [searchTerm, searchTerm, searchTerm, searchTerm];

  if (options?.role) {
    sql += ' AND role = ?';
    params.push(options.role);
  }

  sql += ' ORDER BY name ASC';

  if (options?.limit) {
    sql += ' LIMIT ?';
    params.push(options.limit);
  }

  const stmt = db.prepare(sql);
  return stmt.all(...params) as DbUser[];
}

/**
 * Get pending vendors for verification
 */
export function getPendingVendors(): DbUser[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM users
    WHERE role = 'vendor'
    AND verification_status IN ('pending', 'under_review')
    AND is_deleted = 0
    ORDER BY created_at ASC
  `);
  return stmt.all() as DbUser[];
}

/**
 * Get user statistics
 */
export function getUserStats(): {
  totalBuyers: number;
  totalVendors: number;
  verifiedVendors: number;
  pendingVendors: number;
  activeUsers: number;
  suspendedUsers: number;
} {
  const db = getDatabase();

  const statsQuery = db.prepare(`
    SELECT
      SUM(CASE WHEN role = 'buyer' AND is_deleted = 0 THEN 1 ELSE 0 END) as totalBuyers,
      SUM(CASE WHEN role = 'vendor' AND is_deleted = 0 THEN 1 ELSE 0 END) as totalVendors,
      SUM(CASE WHEN role = 'vendor' AND verification_status = 'verified' AND is_deleted = 0 THEN 1 ELSE 0 END) as verifiedVendors,
      SUM(CASE WHEN role = 'vendor' AND verification_status IN ('pending', 'under_review') AND is_deleted = 0 THEN 1 ELSE 0 END) as pendingVendors,
      SUM(CASE WHEN status = 'active' AND is_deleted = 0 THEN 1 ELSE 0 END) as activeUsers,
      SUM(CASE WHEN status = 'suspended' AND is_deleted = 0 THEN 1 ELSE 0 END) as suspendedUsers
    FROM users
  `);

  const result = statsQuery.get() as {
    totalBuyers: number;
    totalVendors: number;
    verifiedVendors: number;
    pendingVendors: number;
    activeUsers: number;
    suspendedUsers: number;
  };

  return {
    totalBuyers: result.totalBuyers || 0,
    totalVendors: result.totalVendors || 0,
    verifiedVendors: result.verifiedVendors || 0,
    pendingVendors: result.pendingVendors || 0,
    activeUsers: result.activeUsers || 0,
    suspendedUsers: result.suspendedUsers || 0,
  };
}

/**
 * Update user password
 */
export function updateUserPassword(id: string, newPassword: string): boolean {
  const db = getDatabase();
  const passwordHash = hashPassword(newPassword);
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?
  `);

  const result = stmt.run(passwordHash, now, id);
  return result.changes > 0;
}
