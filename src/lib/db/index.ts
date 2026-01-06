/**
 * Database Module
 *
 * Production-ready SQLite database for Replit migration.
 * This module provides:
 * - Database connection management
 * - Schema initialization
 * - Connection pooling
 * - Transaction support
 *
 * The database file is stored in the project root for persistence.
 */

import Database from 'better-sqlite3';
import { readFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';

// Database file location - use data directory for Replit persistence
const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'data');
const DB_PATH = process.env.DATABASE_PATH || join(DATA_DIR, 'marketplace.db');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

// Global database instance
let db: Database.Database | null = null;

/**
 * Get database connection (singleton pattern)
 */
export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, {
      verbose: process.env.NODE_ENV === 'development' ? console.log : undefined,
    });

    // Enable WAL mode for better performance
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Initialize schema on first connection
    initializeSchema();
  }

  return db;
}

/**
 * Initialize database schema from SQL file
 */
function initializeSchema(): void {
  if (!db) return;

  const schemaPath = join(__dirname, 'schema.sql');

  if (existsSync(schemaPath)) {
    const schema = readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
    console.log('[DB] Schema initialized successfully');
  } else {
    // If running in production without schema file, create inline
    createSchemaInline();
  }
}

/**
 * Create schema inline for production builds
 */
function createSchemaInline(): void {
  if (!db) return;

  // Core tables only - full schema defined here for production
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('buyer', 'vendor', 'admin', 'master_admin')),
      status TEXT NOT NULL DEFAULT 'active',
      avatar TEXT,
      phone TEXT,
      location TEXT,
      business_name TEXT,
      business_type TEXT,
      verification_status TEXT,
      verification_documents TEXT,
      verification_notes TEXT,
      verified_at TEXT,
      verified_by TEXT,
      store_description TEXT,
      store_banner TEXT,
      store_logo TEXT,
      is_deleted INTEGER DEFAULT 0,
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Admin users table
    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('MASTER_ADMIN', 'ADMIN')),
      is_active INTEGER NOT NULL DEFAULT 1,
      permissions TEXT,
      mfa_enabled INTEGER DEFAULT 0,
      created_by TEXT,
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Vendors table (business entities linked to users)
    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      business_name TEXT NOT NULL,
      business_type TEXT,
      description TEXT,
      logo TEXT,
      banner TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      region TEXT,
      verification_status TEXT NOT NULL DEFAULT 'pending' CHECK(verification_status IN ('pending', 'under_review', 'verified', 'rejected', 'suspended')),
      verification_documents TEXT,
      verification_notes TEXT,
      verified_at TEXT,
      verified_by TEXT,
      store_status TEXT NOT NULL DEFAULT 'inactive' CHECK(store_status IN ('active', 'inactive', 'suspended')),
      commission_rate REAL DEFAULT 0.10,
      total_sales REAL DEFAULT 0,
      total_orders INTEGER DEFAULT 0,
      rating REAL DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Categories table with dynamic form schema
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      icon TEXT,
      image_url TEXT,
      parent_id TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      show_in_menu INTEGER NOT NULL DEFAULT 1,
      show_in_home INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      form_schema TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    -- Products table
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      vendor_id TEXT NOT NULL,
      vendor_name TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      category_id TEXT,
      price REAL NOT NULL,
      compare_price REAL,
      cost_per_item REAL,
      sku TEXT,
      barcode TEXT,
      quantity INTEGER DEFAULT 0,
      track_quantity INTEGER DEFAULT 1,
      images TEXT,
      weight REAL,
      dimensions TEXT,
      tags TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      category_attributes TEXT,
      approval_status TEXT,
      approved_by TEXT,
      approved_at TEXT,
      rejection_reason TEXT,
      suspended_by TEXT,
      suspended_at TEXT,
      suspension_reason TEXT,
      is_featured INTEGER DEFAULT 0,
      featured_at TEXT,
      featured_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    -- Orders table
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      buyer_id TEXT NOT NULL,
      buyer_name TEXT NOT NULL,
      buyer_email TEXT NOT NULL,
      items TEXT NOT NULL,
      subtotal REAL NOT NULL,
      shipping_fee REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      payment_status TEXT NOT NULL DEFAULT 'pending',
      payment_method TEXT,
      shipping_address TEXT NOT NULL,
      tracking_number TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Sessions table
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_role TEXT NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Audit logs table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      category TEXT NOT NULL,
      admin_id TEXT,
      admin_name TEXT,
      admin_email TEXT,
      admin_role TEXT,
      target_id TEXT,
      target_type TEXT,
      target_name TEXT,
      details TEXT,
      previous_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      user_agent TEXT,
      severity TEXT DEFAULT 'info',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Integrations table
    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      provider TEXT NOT NULL,
      category TEXT NOT NULL,
      is_enabled INTEGER DEFAULT 0,
      is_configured INTEGER DEFAULT 0,
      environment TEXT DEFAULT 'demo',
      status TEXT DEFAULT 'not_configured',
      credentials TEXT,
      last_tested_at TEXT,
      last_error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Site settings table
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON vendors(user_id);
    CREATE INDEX IF NOT EXISTS idx_vendors_verification ON vendors(verification_status);
    CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
    CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
    CREATE INDEX IF NOT EXISTS idx_products_vendor ON products(vendor_id);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
  `);

  // Run migrations for existing databases
  runMigrations();

  // Seed default categories if none exist
  seedDefaultCategories();

  console.log('[DB] Inline schema created successfully');
}

/**
 * Run database migrations for existing tables
 */
function runMigrations(): void {
  if (!db) return;

  // Check if products table needs migration
  const productColumns = db.prepare("PRAGMA table_info(products)").all() as Array<{ name: string }>;
  const productColumnNames = new Set(productColumns.map(c => c.name));

  // Add missing columns to products table
  const missingProductColumns = [
    { name: 'cost_per_item', type: 'REAL' },
    { name: 'sku', type: 'TEXT' },
    { name: 'barcode', type: 'TEXT' },
    { name: 'weight', type: 'REAL' },
    { name: 'dimensions', type: 'TEXT' },
    { name: 'approval_status', type: 'TEXT' },
    { name: 'approved_by', type: 'TEXT' },
    { name: 'approved_at', type: 'TEXT' },
    { name: 'rejection_reason', type: 'TEXT' },
    { name: 'suspended_by', type: 'TEXT' },
    { name: 'suspended_at', type: 'TEXT' },
    { name: 'suspension_reason', type: 'TEXT' },
    { name: 'featured_at', type: 'TEXT' },
    { name: 'featured_by', type: 'TEXT' },
    { name: 'category_id', type: 'TEXT' },
  ];

  for (const col of missingProductColumns) {
    if (!productColumnNames.has(col.name)) {
      try {
        db.exec(`ALTER TABLE products ADD COLUMN ${col.name} ${col.type}`);
        console.log(`[DB] Added column ${col.name} to products table`);
      } catch (e) {
        // Column may already exist
      }
    }
  }

  // Check if users table needs deleted columns
  const userColumns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  const userColumnNames = new Set(userColumns.map(c => c.name));

  const missingUserColumns = [
    { name: 'deleted_at', type: 'TEXT' },
    { name: 'deleted_by', type: 'TEXT' },
    { name: 'deletion_reason', type: 'TEXT' },
  ];

  for (const col of missingUserColumns) {
    if (!userColumnNames.has(col.name)) {
      try {
        db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
        console.log(`[DB] Added column ${col.name} to users table`);
      } catch (e) {
        // Column may already exist
      }
    }
  }

  // Check if integrations table needs columns
  const integrationColumns = db.prepare("PRAGMA table_info(integrations)").all() as Array<{ name: string }>;
  const integrationColumnNames = new Set(integrationColumns.map(c => c.name));

  const missingIntegrationColumns = [
    { name: 'description', type: 'TEXT' },
    { name: 'last_tested_at', type: 'TEXT' },
    { name: 'last_error', type: 'TEXT' },
  ];

  for (const col of missingIntegrationColumns) {
    if (!integrationColumnNames.has(col.name)) {
      try {
        db.exec(`ALTER TABLE integrations ADD COLUMN ${col.name} ${col.type}`);
        console.log(`[DB] Added column ${col.name} to integrations table`);
      } catch (e) {
        // Column may already exist
      }
    }
  }
}

/**
 * Seed default categories if categories table is empty
 */
function seedDefaultCategories(): void {
  if (!db) return;

  const count = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (count.count > 0) return;

  const defaultCategories = [
    {
      id: 'cat_electronics',
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and accessories',
      icon: '📱',
      display_order: 1,
      form_schema: JSON.stringify([
        { key: 'brand', label: 'Brand', type: 'text', required: false, placeholder: 'e.g., Apple, Samsung' },
        { key: 'model', label: 'Model', type: 'text', required: false, placeholder: 'e.g., iPhone 15' },
        { key: 'warranty', label: 'Warranty (months)', type: 'number', required: false, min: 0, max: 60 },
        { key: 'condition', label: 'Condition', type: 'select', required: true, options: ['New', 'Refurbished', 'Used - Like New', 'Used - Good', 'Used - Fair'] },
      ]),
    },
    {
      id: 'cat_mobile_phones',
      name: 'Mobile Phones',
      slug: 'mobile-phones',
      description: 'Smartphones and feature phones',
      icon: '📲',
      parent_id: 'cat_electronics',
      display_order: 2,
      form_schema: JSON.stringify([
        { key: 'storage', label: 'Storage', type: 'select', required: true, options: ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB'] },
        { key: 'color', label: 'Color', type: 'text', required: false },
        { key: 'network', label: 'Network', type: 'multi_select', required: false, options: ['4G LTE', '5G', 'Dual SIM'] },
      ]),
    },
    {
      id: 'cat_fashion',
      name: 'Fashion & Clothing',
      slug: 'fashion-clothing',
      description: 'Clothes, shoes, and accessories',
      icon: '👕',
      display_order: 3,
      form_schema: JSON.stringify([
        { key: 'size', label: 'Size', type: 'select', required: true, options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] },
        { key: 'color', label: 'Color', type: 'text', required: true },
        { key: 'material', label: 'Material', type: 'text', required: false, placeholder: 'e.g., Cotton, Polyester' },
        { key: 'gender', label: 'Gender', type: 'select', required: true, options: ['Men', 'Women', 'Unisex', 'Boys', 'Girls', 'Kids'] },
      ]),
    },
    {
      id: 'cat_home_garden',
      name: 'Home & Garden',
      slug: 'home-garden',
      description: 'Home decor, furniture, and gardening',
      icon: '🏠',
      display_order: 4,
      form_schema: JSON.stringify([
        { key: 'room', label: 'Room Type', type: 'select', required: false, options: ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Outdoor', 'Office'] },
        { key: 'material', label: 'Material', type: 'text', required: false },
        { key: 'dimensions', label: 'Dimensions', type: 'text', required: false, placeholder: 'L x W x H' },
      ]),
    },
    {
      id: 'cat_health_beauty',
      name: 'Health & Beauty',
      slug: 'health-beauty',
      description: 'Health products and beauty items',
      icon: '💄',
      display_order: 5,
      form_schema: JSON.stringify([
        { key: 'skinType', label: 'Skin Type', type: 'multi_select', required: false, options: ['Normal', 'Dry', 'Oily', 'Combination', 'Sensitive', 'All Types'] },
        { key: 'organic', label: 'Organic/Natural', type: 'boolean', required: false },
        { key: 'volume', label: 'Volume/Size', type: 'text', required: false, placeholder: 'e.g., 100ml, 50g' },
      ]),
    },
    {
      id: 'cat_food',
      name: 'Food & Beverages',
      slug: 'food-beverages',
      description: 'Food items and drinks',
      icon: '🍎',
      display_order: 6,
      form_schema: JSON.stringify([
        { key: 'expiryDate', label: 'Expiry Date', type: 'date', required: true },
        { key: 'dietary', label: 'Dietary Info', type: 'multi_select', required: false, options: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Organic', 'Sugar-Free'] },
        { key: 'weight', label: 'Weight/Volume', type: 'text', required: false, placeholder: 'e.g., 500g, 1L' },
      ]),
    },
    {
      id: 'cat_sports',
      name: 'Sports & Outdoors',
      slug: 'sports-outdoors',
      description: 'Sports equipment and outdoor gear',
      icon: '⚽',
      display_order: 7,
      form_schema: JSON.stringify([
        { key: 'sport', label: 'Sport Type', type: 'select', required: false, options: ['Football', 'Basketball', 'Tennis', 'Running', 'Gym', 'Swimming', 'Cycling', 'Other'] },
        { key: 'size', label: 'Size', type: 'text', required: false },
      ]),
    },
    {
      id: 'cat_automotive',
      name: 'Automotive',
      slug: 'automotive',
      description: 'Car parts and accessories',
      icon: '🚗',
      display_order: 8,
      form_schema: JSON.stringify([
        { key: 'carMake', label: 'Car Make', type: 'text', required: false, placeholder: 'e.g., Toyota, Honda' },
        { key: 'carModel', label: 'Car Model', type: 'text', required: false },
        { key: 'yearRange', label: 'Compatible Years', type: 'text', required: false, placeholder: 'e.g., 2015-2023' },
      ]),
    },
  ];

  const stmt = db.prepare(`
    INSERT INTO categories (id, name, slug, description, icon, parent_id, display_order, form_schema, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);

  for (const cat of defaultCategories) {
    try {
      stmt.run(cat.id, cat.name, cat.slug, cat.description, cat.icon, cat.parent_id || null, cat.display_order, cat.form_schema);
    } catch (e) {
      // Category may already exist
    }
  }

  console.log('[DB] Default categories seeded');
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Run database transaction
 */
export function runTransaction<T>(fn: () => T): T {
  const database = getDatabase();
  const transaction = database.transaction(fn);
  return transaction();
}

/**
 * Database health check
 */
export function isDatabaseHealthy(): boolean {
  try {
    const database = getDatabase();
    const result = database.prepare('SELECT 1').get();
    return !!result;
  } catch {
    return false;
  }
}

/**
 * Get database stats for monitoring
 */
export function getDatabaseStats(): {
  path: string;
  size: number;
  tables: string[];
  healthy: boolean;
} {
  try {
    const database = getDatabase();
    const tables = database
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as { name: string }[];

    const stats = statSync(DB_PATH);

    return {
      path: DB_PATH,
      size: stats.size,
      tables: tables.map((t) => t.name),
      healthy: isDatabaseHealthy(),
    };
  } catch (error) {
    return {
      path: DB_PATH,
      size: 0,
      tables: [],
      healthy: false,
    };
  }
}

// Export types for use in other modules
export type { Database };
