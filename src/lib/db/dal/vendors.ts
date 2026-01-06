/**
 * Vendors Data Access Layer
 *
 * Vendors are business entities linked to users.
 * A user with role "vendor" gets a corresponding vendor record.
 */

import { getDatabase, runTransaction } from '../index';
import { v4 as uuidv4 } from 'uuid';

export type VerificationStatus = 'pending' | 'under_review' | 'verified' | 'rejected' | 'suspended';
export type StoreStatus = 'active' | 'inactive' | 'suspended';

export interface DbVendor {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string | null;
  description: string | null;
  logo: string | null;
  banner: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  verification_status: VerificationStatus;
  verification_documents: string | null;
  verification_notes: string | null;
  verified_at: string | null;
  verified_by: string | null;
  store_status: StoreStatus;
  commission_rate: number;
  total_sales: number;
  total_orders: number;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateVendorInput {
  userId: string;
  businessName: string;
  businessType?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  region?: string;
}

export interface UpdateVendorInput {
  businessName?: string;
  businessType?: string;
  description?: string;
  logo?: string;
  banner?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  region?: string;
  verificationStatus?: VerificationStatus;
  verificationDocuments?: string;
  verificationNotes?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  storeStatus?: StoreStatus;
  commissionRate?: number;
}

/**
 * Create a new vendor record
 */
export function createVendor(input: CreateVendorInput): DbVendor {
  const db = getDatabase();
  const id = `vendor_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO vendors (
      id, user_id, business_name, business_type, description,
      phone, email, address, city, region,
      verification_status, store_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'inactive', ?, ?)
  `);

  stmt.run(
    id,
    input.userId,
    input.businessName,
    input.businessType || null,
    input.description || null,
    input.phone || null,
    input.email || null,
    input.address || null,
    input.city || null,
    input.region || null,
    now,
    now
  );

  return getVendorById(id)!;
}

/**
 * Get vendor by ID
 */
export function getVendorById(id: string): DbVendor | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM vendors WHERE id = ?');
  return stmt.get(id) as DbVendor | null;
}

/**
 * Get vendor by user ID
 */
export function getVendorByUserId(userId: string): DbVendor | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM vendors WHERE user_id = ?');
  return stmt.get(userId) as DbVendor | null;
}

/**
 * Get all vendors with optional filters
 */
export function getVendors(options?: {
  verificationStatus?: VerificationStatus;
  storeStatus?: StoreStatus;
  limit?: number;
  offset?: number;
}): DbVendor[] {
  const db = getDatabase();
  let query = 'SELECT * FROM vendors WHERE 1=1';
  const params: unknown[] = [];

  if (options?.verificationStatus) {
    query += ' AND verification_status = ?';
    params.push(options.verificationStatus);
  }

  if (options?.storeStatus) {
    query += ' AND store_status = ?';
    params.push(options.storeStatus);
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
  return stmt.all(...params) as DbVendor[];
}

/**
 * Get vendors with user data joined
 */
export function getVendorsWithUsers(options?: {
  verificationStatus?: VerificationStatus;
  storeStatus?: StoreStatus;
  limit?: number;
}): (DbVendor & { user_name: string; user_email: string; user_status: string })[] {
  const db = getDatabase();
  let query = `
    SELECT v.*, u.name as user_name, u.email as user_email, u.status as user_status
    FROM vendors v
    JOIN users u ON v.user_id = u.id
    WHERE u.is_deleted = 0
  `;
  const params: unknown[] = [];

  if (options?.verificationStatus) {
    query += ' AND v.verification_status = ?';
    params.push(options.verificationStatus);
  }

  if (options?.storeStatus) {
    query += ' AND v.store_status = ?';
    params.push(options.storeStatus);
  }

  query += ' ORDER BY v.created_at DESC';

  if (options?.limit) {
    query += ' LIMIT ?';
    params.push(options.limit);
  }

  const stmt = db.prepare(query);
  return stmt.all(...params) as (DbVendor & { user_name: string; user_email: string; user_status: string })[];
}

/**
 * Get pending vendors (for admin approval)
 */
export function getPendingVendors(): (DbVendor & { user_name: string; user_email: string })[] {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT v.*, u.name as user_name, u.email as user_email
    FROM vendors v
    JOIN users u ON v.user_id = u.id
    WHERE v.verification_status IN ('pending', 'under_review')
    AND u.is_deleted = 0
    ORDER BY v.created_at ASC
  `);
  return stmt.all() as (DbVendor & { user_name: string; user_email: string })[];
}

/**
 * Update vendor
 */
export function updateVendor(id: string, updates: UpdateVendorInput): DbVendor | null {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];

  if (updates.businessName !== undefined) {
    fields.push('business_name = ?');
    values.push(updates.businessName);
  }
  if (updates.businessType !== undefined) {
    fields.push('business_type = ?');
    values.push(updates.businessType);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.logo !== undefined) {
    fields.push('logo = ?');
    values.push(updates.logo);
  }
  if (updates.banner !== undefined) {
    fields.push('banner = ?');
    values.push(updates.banner);
  }
  if (updates.phone !== undefined) {
    fields.push('phone = ?');
    values.push(updates.phone);
  }
  if (updates.email !== undefined) {
    fields.push('email = ?');
    values.push(updates.email);
  }
  if (updates.address !== undefined) {
    fields.push('address = ?');
    values.push(updates.address);
  }
  if (updates.city !== undefined) {
    fields.push('city = ?');
    values.push(updates.city);
  }
  if (updates.region !== undefined) {
    fields.push('region = ?');
    values.push(updates.region);
  }
  if (updates.verificationStatus !== undefined) {
    fields.push('verification_status = ?');
    values.push(updates.verificationStatus);
  }
  if (updates.verificationDocuments !== undefined) {
    fields.push('verification_documents = ?');
    values.push(updates.verificationDocuments);
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
  if (updates.storeStatus !== undefined) {
    fields.push('store_status = ?');
    values.push(updates.storeStatus);
  }
  if (updates.commissionRate !== undefined) {
    fields.push('commission_rate = ?');
    values.push(updates.commissionRate);
  }

  values.push(id);

  const stmt = db.prepare(`UPDATE vendors SET ${fields.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);

  if (result.changes === 0) return null;
  return getVendorById(id);
}

/**
 * Approve vendor
 */
export function approveVendor(vendorId: string, approvedBy: string): DbVendor | null {
  const now = new Date().toISOString();
  return updateVendor(vendorId, {
    verificationStatus: 'verified',
    verifiedAt: now,
    verifiedBy: approvedBy,
    storeStatus: 'active',
  });
}

/**
 * Reject vendor
 */
export function rejectVendor(vendorId: string, rejectedBy: string, reason: string): DbVendor | null {
  return updateVendor(vendorId, {
    verificationStatus: 'rejected',
    verificationNotes: reason,
    verifiedBy: rejectedBy,
    verifiedAt: new Date().toISOString(),
  });
}

/**
 * Suspend vendor
 */
export function suspendVendor(vendorId: string, suspendedBy: string, reason: string): DbVendor | null {
  return updateVendor(vendorId, {
    verificationStatus: 'suspended',
    storeStatus: 'suspended',
    verificationNotes: reason,
    verifiedBy: suspendedBy,
  });
}

/**
 * Get vendor statistics
 */
export function getVendorStats(): {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  suspended: number;
  activeStores: number;
} {
  const db = getDatabase();
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN verification_status = 'pending' OR verification_status = 'under_review' THEN 1 ELSE 0 END) as pending,
      SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) as verified,
      SUM(CASE WHEN verification_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN verification_status = 'suspended' THEN 1 ELSE 0 END) as suspended,
      SUM(CASE WHEN store_status = 'active' THEN 1 ELSE 0 END) as activeStores
    FROM vendors
  `).get() as {
    total: number;
    pending: number;
    verified: number;
    rejected: number;
    suspended: number;
    activeStores: number;
  };

  return {
    total: stats.total || 0,
    pending: stats.pending || 0,
    verified: stats.verified || 0,
    rejected: stats.rejected || 0,
    suspended: stats.suspended || 0,
    activeStores: stats.activeStores || 0,
  };
}

/**
 * Delete vendor
 */
export function deleteVendor(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM vendors WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Check if vendor can sell (is verified)
 */
export function canVendorSell(vendorId: string): boolean {
  const vendor = getVendorById(vendorId);
  return vendor?.verification_status === 'verified';
}

/**
 * Check if vendor can sell by user ID
 */
export function canUserSell(userId: string): boolean {
  const vendor = getVendorByUserId(userId);
  return vendor?.verification_status === 'verified';
}

/**
 * Update vendor verification status from KYC service (Smile Identity)
 * This is called by webhook handlers when verification results are received
 */
export function updateVendorVerificationStatus(
  userId: string,
  data: {
    verificationStatus: VerificationStatus;
    verificationNotes: string;
    smileJobId?: string;
    verifiedAt?: string;
  }
): DbVendor | null {
  const vendor = getVendorByUserId(userId);
  if (!vendor) {
    console.error(`[VENDORS] Vendor not found for user ${userId}`);
    return null;
  }

  const updates: UpdateVendorInput = {
    verificationStatus: data.verificationStatus,
    verificationNotes: data.verificationNotes,
  };

  // Include Smile Job ID in verification documents
  if (data.smileJobId) {
    const existingDocs = vendor.verification_documents
      ? JSON.parse(vendor.verification_documents)
      : {};
    existingDocs.smileJobId = data.smileJobId;
    updates.verificationDocuments = JSON.stringify(existingDocs);
  }

  if (data.verifiedAt) {
    updates.verifiedAt = data.verifiedAt;
    updates.verifiedBy = 'smile_identity';
  }

  // If verified, activate the store
  if (data.verificationStatus === 'verified') {
    updates.storeStatus = 'active';
  }

  return updateVendor(vendor.id, updates);
}

/**
 * Set vendor KYC job ID (tracks pending Smile Identity verification)
 */
export function setVendorKycJobId(userId: string, jobId: string): boolean {
  const vendor = getVendorByUserId(userId);
  if (!vendor) return false;

  const existingDocs = vendor.verification_documents
    ? JSON.parse(vendor.verification_documents)
    : {};
  existingDocs.kycJobId = jobId;
  existingDocs.kycInitiatedAt = new Date().toISOString();

  const result = updateVendor(vendor.id, {
    verificationStatus: 'under_review',
    verificationDocuments: JSON.stringify(existingDocs),
  });

  return !!result;
}

/**
 * Get vendor's pending KYC job ID
 */
export function getVendorKycJobId(userId: string): string | null {
  const vendor = getVendorByUserId(userId);
  if (!vendor || !vendor.verification_documents) return null;

  try {
    const docs = JSON.parse(vendor.verification_documents);
    return docs.kycJobId || null;
  } catch {
    return null;
  }
}
