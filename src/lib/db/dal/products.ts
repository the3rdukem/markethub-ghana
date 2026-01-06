/**
 * Products Data Access Layer
 *
 * Server-side only - provides CRUD operations for products.
 */

import { getDatabase } from '../index';
import { v4 as uuidv4 } from 'uuid';

export type ProductStatus = 'active' | 'draft' | 'archived' | 'pending_approval' | 'rejected' | 'suspended';

export interface DbProduct {
  id: string;
  vendor_id: string;
  vendor_name: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  compare_price: number | null;
  cost_per_item: number | null;
  sku: string | null;
  barcode: string | null;
  quantity: number;
  track_quantity: number;
  images: string | null; // JSON array
  weight: number | null;
  dimensions: string | null; // JSON
  tags: string | null; // JSON array
  status: ProductStatus;
  category_attributes: string | null; // JSON
  approval_status: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  suspended_by: string | null;
  suspended_at: string | null;
  suspension_reason: string | null;
  is_featured: number;
  featured_at: string | null;
  featured_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProductInput {
  vendorId: string;
  vendorName: string;
  name: string;
  description?: string;
  category?: string;
  price: number;
  comparePrice?: number;
  costPerItem?: number;
  sku?: string;
  barcode?: string;
  quantity?: number;
  trackQuantity?: boolean;
  images?: string[];
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  tags?: string[];
  status?: ProductStatus;
  categoryAttributes?: Record<string, unknown>;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  comparePrice?: number;
  costPerItem?: number;
  sku?: string;
  barcode?: string;
  quantity?: number;
  trackQuantity?: boolean;
  images?: string[];
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  tags?: string[];
  status?: ProductStatus;
  categoryAttributes?: Record<string, unknown>;
  isFeatured?: boolean;
  featuredBy?: string;
}

/**
 * Create a new product
 */
export function createProduct(input: CreateProductInput): DbProduct {
  const db = getDatabase();
  const id = `prod_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO products (
      id, vendor_id, vendor_name, name, description, category, price,
      compare_price, cost_per_item, sku, barcode, quantity, track_quantity,
      images, weight, dimensions, tags, status, category_attributes,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.vendorId,
    input.vendorName,
    input.name,
    input.description || null,
    input.category || null,
    input.price,
    input.comparePrice || null,
    input.costPerItem || null,
    input.sku || null,
    input.barcode || null,
    input.quantity || 0,
    input.trackQuantity !== false ? 1 : 0,
    input.images ? JSON.stringify(input.images) : null,
    input.weight || null,
    input.dimensions ? JSON.stringify(input.dimensions) : null,
    input.tags ? JSON.stringify(input.tags) : null,
    input.status || 'active',
    input.categoryAttributes ? JSON.stringify(input.categoryAttributes) : null,
    now,
    now
  );

  return getProductById(id)!;
}

/**
 * Get product by ID
 */
export function getProductById(id: string): DbProduct | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM products WHERE id = ?');
  return stmt.get(id) as DbProduct | null;
}

/**
 * Get all products
 */
export function getProducts(options?: {
  vendorId?: string;
  category?: string;
  status?: ProductStatus;
  isFeatured?: boolean;
  limit?: number;
  offset?: number;
  search?: string;
}): DbProduct[] {
  const db = getDatabase();
  let query = 'SELECT * FROM products WHERE 1=1';
  const params: unknown[] = [];

  if (options?.vendorId) {
    query += ' AND vendor_id = ?';
    params.push(options.vendorId);
  }

  if (options?.category) {
    query += ' AND category = ?';
    params.push(options.category);
  }

  if (options?.status) {
    query += ' AND status = ?';
    params.push(options.status);
  }

  if (options?.isFeatured !== undefined) {
    query += ' AND is_featured = ?';
    params.push(options.isFeatured ? 1 : 0);
  }

  if (options?.search) {
    query += ' AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ?)';
    const searchTerm = `%${options.search.toLowerCase()}%`;
    params.push(searchTerm, searchTerm);
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
  return stmt.all(...params) as DbProduct[];
}

/**
 * Get active products (for storefront)
 */
export function getActiveProducts(options?: {
  category?: string;
  vendorId?: string;
  limit?: number;
  offset?: number;
}): DbProduct[] {
  return getProducts({
    ...options,
    status: 'active',
  });
}

/**
 * Get products by vendor
 */
export function getProductsByVendor(vendorId: string): DbProduct[] {
  return getProducts({ vendorId });
}

/**
 * Get featured products
 */
export function getFeaturedProducts(limit?: number): DbProduct[] {
  return getProducts({ status: 'active', isFeatured: true, limit });
}

/**
 * Update product
 */
export function updateProduct(id: string, updates: UpdateProductInput): DbProduct | null {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.category !== undefined) {
    fields.push('category = ?');
    values.push(updates.category);
  }
  if (updates.price !== undefined) {
    fields.push('price = ?');
    values.push(updates.price);
  }
  if (updates.comparePrice !== undefined) {
    fields.push('compare_price = ?');
    values.push(updates.comparePrice);
  }
  if (updates.costPerItem !== undefined) {
    fields.push('cost_per_item = ?');
    values.push(updates.costPerItem);
  }
  if (updates.sku !== undefined) {
    fields.push('sku = ?');
    values.push(updates.sku);
  }
  if (updates.barcode !== undefined) {
    fields.push('barcode = ?');
    values.push(updates.barcode);
  }
  if (updates.quantity !== undefined) {
    fields.push('quantity = ?');
    values.push(updates.quantity);
  }
  if (updates.trackQuantity !== undefined) {
    fields.push('track_quantity = ?');
    values.push(updates.trackQuantity ? 1 : 0);
  }
  if (updates.images !== undefined) {
    fields.push('images = ?');
    values.push(JSON.stringify(updates.images));
  }
  if (updates.weight !== undefined) {
    fields.push('weight = ?');
    values.push(updates.weight);
  }
  if (updates.dimensions !== undefined) {
    fields.push('dimensions = ?');
    values.push(JSON.stringify(updates.dimensions));
  }
  if (updates.tags !== undefined) {
    fields.push('tags = ?');
    values.push(JSON.stringify(updates.tags));
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.categoryAttributes !== undefined) {
    fields.push('category_attributes = ?');
    values.push(JSON.stringify(updates.categoryAttributes));
  }
  if (updates.isFeatured !== undefined) {
    fields.push('is_featured = ?');
    values.push(updates.isFeatured ? 1 : 0);
    if (updates.isFeatured) {
      fields.push('featured_at = ?');
      values.push(now);
      if (updates.featuredBy) {
        fields.push('featured_by = ?');
        values.push(updates.featuredBy);
      }
    } else {
      fields.push('featured_at = NULL');
      fields.push('featured_by = NULL');
    }
  }

  values.push(id);

  const stmt = db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);

  if (result.changes === 0) return null;
  return getProductById(id);
}

/**
 * Delete product
 */
export function deleteProduct(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM products WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Reduce product inventory
 */
export function reduceInventory(id: string, quantity: number): boolean {
  const db = getDatabase();
  const product = getProductById(id);

  if (!product) return false;
  if (product.track_quantity && product.quantity < quantity) return false;

  if (product.track_quantity) {
    const stmt = db.prepare(`
      UPDATE products SET quantity = quantity - ?, updated_at = ? WHERE id = ?
    `);
    stmt.run(quantity, new Date().toISOString(), id);
  }

  return true;
}

/**
 * Search products
 */
export function searchProducts(query: string, options?: {
  category?: string;
  status?: ProductStatus;
  limit?: number;
}): DbProduct[] {
  const db = getDatabase();
  const searchTerm = `%${query.toLowerCase()}%`;

  let sql = `
    SELECT * FROM products
    WHERE status = ?
    AND (
      LOWER(name) LIKE ?
      OR LOWER(description) LIKE ?
      OR tags LIKE ?
    )
  `;

  const params: unknown[] = [
    options?.status || 'active',
    searchTerm,
    searchTerm,
    searchTerm,
  ];

  if (options?.category) {
    sql += ' AND category = ?';
    params.push(options.category);
  }

  sql += ' ORDER BY name ASC';

  if (options?.limit) {
    sql += ' LIMIT ?';
    params.push(options.limit);
  }

  const stmt = db.prepare(sql);
  return stmt.all(...params) as DbProduct[];
}

/**
 * Get product stats
 */
export function getProductStats(vendorId?: string): {
  totalProducts: number;
  activeProducts: number;
  draftProducts: number;
  pendingProducts: number;
  featuredProducts: number;
} {
  const db = getDatabase();
  let whereClause = '';
  const params: unknown[] = [];

  if (vendorId) {
    whereClause = ' WHERE vendor_id = ?';
    params.push(vendorId);
  }

  const statsQuery = db.prepare(`
    SELECT
      COUNT(*) as totalProducts,
      SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as activeProducts,
      SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draftProducts,
      SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) as pendingProducts,
      SUM(CASE WHEN is_featured = 1 AND status = 'active' THEN 1 ELSE 0 END) as featuredProducts
    FROM products${whereClause}
  `);

  const result = statsQuery.get(...params) as {
    totalProducts: number;
    activeProducts: number;
    draftProducts: number;
    pendingProducts: number;
    featuredProducts: number;
  };

  return {
    totalProducts: result.totalProducts || 0,
    activeProducts: result.activeProducts || 0,
    draftProducts: result.draftProducts || 0,
    pendingProducts: result.pendingProducts || 0,
    featuredProducts: result.featuredProducts || 0,
  };
}

/**
 * Suspend product
 */
export function suspendProduct(id: string, suspendedBy: string, reason: string): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE products SET
      status = 'suspended',
      suspended_by = ?,
      suspended_at = ?,
      suspension_reason = ?,
      updated_at = ?
    WHERE id = ?
  `);

  const result = stmt.run(suspendedBy, now, reason, now, id);
  return result.changes > 0;
}

/**
 * Unsuspend product
 */
export function unsuspendProduct(id: string): boolean {
  const db = getDatabase();
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    UPDATE products SET
      status = 'active',
      suspended_by = NULL,
      suspended_at = NULL,
      suspension_reason = NULL,
      updated_at = ?
    WHERE id = ?
  `);

  const result = stmt.run(now, id);
  return result.changes > 0;
}
