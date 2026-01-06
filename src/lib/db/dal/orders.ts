/**
 * Orders Data Access Layer
 *
 * Server-side only - provides CRUD operations for orders.
 */

import { getDatabase } from '../index';
import { v4 as uuidv4 } from 'uuid';

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderItem {
  productId: string;
  productName: string;
  vendorId: string;
  vendorName: string;
  quantity: number;
  price: number;
  image?: string;
  variations?: Record<string, string>;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  digitalAddress?: string;
}

export interface DbOrder {
  id: string;
  buyer_id: string;
  buyer_name: string;
  buyer_email: string;
  items: string; // JSON
  subtotal: number;
  shipping_fee: number;
  tax: number;
  total: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string | null;
  shipping_address: string; // JSON
  tracking_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderInput {
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee?: number;
  tax?: number;
  total: number;
  paymentMethod?: string;
  shippingAddress: ShippingAddress;
  notes?: string;
}

export interface UpdateOrderInput {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  trackingNumber?: string;
  notes?: string;
}

/**
 * Create a new order
 */
export function createOrder(input: CreateOrderInput): DbOrder {
  const db = getDatabase();
  const id = `order_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  const now = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO orders (
      id, buyer_id, buyer_name, buyer_email, items, subtotal,
      shipping_fee, tax, total, status, payment_status, payment_method,
      shipping_address, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.buyerId,
    input.buyerName,
    input.buyerEmail,
    JSON.stringify(input.items),
    input.subtotal,
    input.shippingFee || 0,
    input.tax || 0,
    input.total,
    'pending',
    'pending',
    input.paymentMethod || null,
    JSON.stringify(input.shippingAddress),
    input.notes || null,
    now,
    now
  );

  return getOrderById(id)!;
}

/**
 * Get order by ID
 */
export function getOrderById(id: string): DbOrder | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM orders WHERE id = ?');
  return stmt.get(id) as DbOrder | null;
}

/**
 * Get all orders
 */
export function getOrders(options?: {
  buyerId?: string;
  vendorId?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  limit?: number;
  offset?: number;
}): DbOrder[] {
  const db = getDatabase();
  let query = 'SELECT * FROM orders WHERE 1=1';
  const params: unknown[] = [];

  if (options?.buyerId) {
    query += ' AND buyer_id = ?';
    params.push(options.buyerId);
  }

  if (options?.status) {
    query += ' AND status = ?';
    params.push(options.status);
  }

  if (options?.paymentStatus) {
    query += ' AND payment_status = ?';
    params.push(options.paymentStatus);
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

  let orders = db.prepare(query).all(...params) as DbOrder[];

  // Filter by vendorId if provided (requires parsing items JSON)
  if (options?.vendorId) {
    orders = orders.filter(order => {
      const items = JSON.parse(order.items) as OrderItem[];
      return items.some(item => item.vendorId === options.vendorId);
    });
  }

  return orders;
}

/**
 * Get orders by buyer
 */
export function getOrdersByBuyer(buyerId: string): DbOrder[] {
  return getOrders({ buyerId });
}

/**
 * Get orders by vendor
 */
export function getOrdersByVendor(vendorId: string): DbOrder[] {
  return getOrders({ vendorId });
}

/**
 * Update order
 */
export function updateOrder(id: string, updates: UpdateOrderInput): DbOrder | null {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];

  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }
  if (updates.paymentStatus !== undefined) {
    fields.push('payment_status = ?');
    values.push(updates.paymentStatus);
  }
  if (updates.trackingNumber !== undefined) {
    fields.push('tracking_number = ?');
    values.push(updates.trackingNumber);
  }
  if (updates.notes !== undefined) {
    fields.push('notes = ?');
    values.push(updates.notes);
  }

  values.push(id);

  const stmt = db.prepare(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);

  if (result.changes === 0) return null;
  return getOrderById(id);
}

/**
 * Cancel order
 */
export function cancelOrder(id: string): boolean {
  const result = updateOrder(id, { status: 'cancelled' });
  return result !== null;
}

/**
 * Delete order (use with caution)
 */
export function deleteOrder(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM orders WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Get order stats
 */
export function getOrderStats(vendorId?: string): {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
} {
  const db = getDatabase();

  if (vendorId) {
    // For vendor, we need to sum up only their items
    const orders = getOrdersByVendor(vendorId);
    let totalRevenue = 0;
    let pendingOrders = 0;
    let completedOrders = 0;
    let cancelledOrders = 0;

    for (const order of orders) {
      const items = JSON.parse(order.items) as OrderItem[];
      const vendorItems = items.filter(item => item.vendorId === vendorId);
      const vendorTotal = vendorItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      totalRevenue += vendorTotal;

      if (['pending', 'confirmed', 'processing'].includes(order.status)) {
        pendingOrders++;
      } else if (order.status === 'delivered') {
        completedOrders++;
      } else if (order.status === 'cancelled') {
        cancelledOrders++;
      }
    }

    return {
      totalOrders: orders.length,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue,
    };
  }

  const statsQuery = db.prepare(`
    SELECT
      COUNT(*) as totalOrders,
      SUM(CASE WHEN status IN ('pending', 'confirmed', 'processing') THEN 1 ELSE 0 END) as pendingOrders,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as completedOrders,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelledOrders,
      SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END) as totalRevenue
    FROM orders
  `);

  const result = statsQuery.get() as {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
  };

  return {
    totalOrders: result.totalOrders || 0,
    pendingOrders: result.pendingOrders || 0,
    completedOrders: result.completedOrders || 0,
    cancelledOrders: result.cancelledOrders || 0,
    totalRevenue: result.totalRevenue || 0,
  };
}

/**
 * Parse order items from JSON string
 */
export function parseOrderItems(order: DbOrder): OrderItem[] {
  return JSON.parse(order.items) as OrderItem[];
}

/**
 * Parse shipping address from JSON string
 */
export function parseShippingAddress(order: DbOrder): ShippingAddress {
  return JSON.parse(order.shipping_address) as ShippingAddress;
}
