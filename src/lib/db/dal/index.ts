/**
 * Data Access Layer Index
 *
 * Exports all DAL modules for server-side data access.
 * These functions should ONLY be used in:
 * - API routes
 * - Server components
 * - Server actions
 *
 * NEVER import these in client components.
 */

// Database
export { getDatabase, closeDatabase, runTransaction, isDatabaseHealthy, getDatabaseStats } from '../index';

// Users
export * from './users';

// Admin
export * from './admin';

// Sessions
export * from './sessions';

// Products
export * from './products';

// Orders
export * from './orders';

// Integrations
export * from './integrations';

// Audit
export * from './audit';

/**
 * Initialize the entire database system
 * Call this on application startup
 */
export function initializeDatabase(): void {
  // Import dynamically to avoid circular dependencies
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dbModule = require('../index');
  dbModule.getDatabase();

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const adminModule = require('./admin');
  adminModule.initializeAdminSystem();

  // Initialize default integrations
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const integrationsModule = require('./integrations');
  integrationsModule.initializeIntegrations();

  console.log('[DB] Database system initialized');
}
