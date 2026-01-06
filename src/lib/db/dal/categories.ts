/**
 * Categories Data Access Layer
 *
 * Schema-driven categories with dynamic form fields.
 * Each category has a formSchema that defines product fields.
 */

import { getDatabase } from '../index';
import { v4 as uuidv4 } from 'uuid';

export interface CategoryFormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'multi_select' | 'boolean' | 'date' | 'textarea';
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[];
  min?: number;
  max?: number;
}

export interface DbCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  parent_id: string | null;
  is_active: number;
  show_in_menu: number;
  show_in_home: number;
  display_order: number;
  form_schema: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  imageUrl?: string;
  parentId?: string;
  isActive?: boolean;
  showInMenu?: boolean;
  showInHome?: boolean;
  displayOrder?: number;
  formSchema?: CategoryFormField[];
  createdBy?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  imageUrl?: string;
  parentId?: string | null;
  isActive?: boolean;
  showInMenu?: boolean;
  showInHome?: boolean;
  displayOrder?: number;
  formSchema?: CategoryFormField[];
}

/**
 * Generate slug from name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Create a new category
 */
export function createCategory(input: CreateCategoryInput): DbCategory {
  const db = getDatabase();
  const id = `cat_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  const slug = input.slug || generateSlug(input.name);
  const now = new Date().toISOString();

  // Get max display order if not provided
  let displayOrder = input.displayOrder;
  if (displayOrder === undefined) {
    const maxOrder = db.prepare('SELECT MAX(display_order) as max FROM categories').get() as { max: number | null };
    displayOrder = (maxOrder.max || 0) + 1;
  }

  const stmt = db.prepare(`
    INSERT INTO categories (
      id, name, slug, description, icon, image_url, parent_id,
      is_active, show_in_menu, show_in_home, display_order,
      form_schema, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    input.name,
    slug,
    input.description || null,
    input.icon || null,
    input.imageUrl || null,
    input.parentId || null,
    input.isActive !== false ? 1 : 0,
    input.showInMenu !== false ? 1 : 0,
    input.showInHome !== false ? 1 : 0,
    displayOrder,
    input.formSchema ? JSON.stringify(input.formSchema) : null,
    input.createdBy || null,
    now,
    now
  );

  return getCategoryById(id)!;
}

/**
 * Get category by ID
 */
export function getCategoryById(id: string): DbCategory | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM categories WHERE id = ?');
  return stmt.get(id) as DbCategory | null;
}

/**
 * Get category by slug
 */
export function getCategoryBySlug(slug: string): DbCategory | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM categories WHERE slug = ?');
  return stmt.get(slug) as DbCategory | null;
}

/**
 * Get all categories
 */
export function getCategories(options?: {
  isActive?: boolean;
  showInMenu?: boolean;
  showInHome?: boolean;
  parentId?: string | null;
}): DbCategory[] {
  const db = getDatabase();
  let query = 'SELECT * FROM categories WHERE 1=1';
  const params: unknown[] = [];

  if (options?.isActive !== undefined) {
    query += ' AND is_active = ?';
    params.push(options.isActive ? 1 : 0);
  }

  if (options?.showInMenu !== undefined) {
    query += ' AND show_in_menu = ?';
    params.push(options.showInMenu ? 1 : 0);
  }

  if (options?.showInHome !== undefined) {
    query += ' AND show_in_home = ?';
    params.push(options.showInHome ? 1 : 0);
  }

  if (options?.parentId !== undefined) {
    if (options.parentId === null) {
      query += ' AND parent_id IS NULL';
    } else {
      query += ' AND parent_id = ?';
      params.push(options.parentId);
    }
  }

  query += ' ORDER BY display_order ASC, name ASC';

  const stmt = db.prepare(query);
  return stmt.all(...params) as DbCategory[];
}

/**
 * Get active categories (for dropdowns)
 */
export function getActiveCategories(): DbCategory[] {
  return getCategories({ isActive: true });
}

/**
 * Get menu categories
 */
export function getMenuCategories(): DbCategory[] {
  return getCategories({ isActive: true, showInMenu: true });
}

/**
 * Get home page categories
 */
export function getHomeCategories(): DbCategory[] {
  return getCategories({ isActive: true, showInHome: true });
}

/**
 * Get child categories
 */
export function getChildCategories(parentId: string): DbCategory[] {
  return getCategories({ isActive: true, parentId });
}

/**
 * Update category
 */
export function updateCategory(id: string, updates: UpdateCategoryInput): DbCategory | null {
  const db = getDatabase();
  const now = new Date().toISOString();

  const fields: string[] = ['updated_at = ?'];
  const values: unknown[] = [now];

  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.slug !== undefined) {
    fields.push('slug = ?');
    values.push(updates.slug);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  if (updates.icon !== undefined) {
    fields.push('icon = ?');
    values.push(updates.icon);
  }
  if (updates.imageUrl !== undefined) {
    fields.push('image_url = ?');
    values.push(updates.imageUrl);
  }
  if (updates.parentId !== undefined) {
    fields.push('parent_id = ?');
    values.push(updates.parentId);
  }
  if (updates.isActive !== undefined) {
    fields.push('is_active = ?');
    values.push(updates.isActive ? 1 : 0);
  }
  if (updates.showInMenu !== undefined) {
    fields.push('show_in_menu = ?');
    values.push(updates.showInMenu ? 1 : 0);
  }
  if (updates.showInHome !== undefined) {
    fields.push('show_in_home = ?');
    values.push(updates.showInHome ? 1 : 0);
  }
  if (updates.displayOrder !== undefined) {
    fields.push('display_order = ?');
    values.push(updates.displayOrder);
  }
  if (updates.formSchema !== undefined) {
    fields.push('form_schema = ?');
    values.push(JSON.stringify(updates.formSchema));
  }

  values.push(id);

  const stmt = db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`);
  const result = stmt.run(...values);

  if (result.changes === 0) return null;
  return getCategoryById(id);
}

/**
 * Delete category
 * Returns false if category has products or children
 */
export function deleteCategory(id: string, force: boolean = false): { success: boolean; error?: string } {
  const db = getDatabase();

  // Check for child categories
  const children = db.prepare('SELECT COUNT(*) as count FROM categories WHERE parent_id = ?').get(id) as { count: number };
  if (children.count > 0 && !force) {
    return { success: false, error: 'Category has child categories' };
  }

  // Check for products
  const products = db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(id) as { count: number };
  if (products.count > 0 && !force) {
    return { success: false, error: 'Category has associated products' };
  }

  const stmt = db.prepare('DELETE FROM categories WHERE id = ?');
  const result = stmt.run(id);

  return { success: result.changes > 0 };
}

/**
 * Reorder categories
 */
export function reorderCategories(categoryIds: string[]): void {
  const db = getDatabase();
  const stmt = db.prepare('UPDATE categories SET display_order = ?, updated_at = ? WHERE id = ?');
  const now = new Date().toISOString();

  for (let i = 0; i < categoryIds.length; i++) {
    stmt.run(i + 1, now, categoryIds[i]);
  }
}

/**
 * Get category form schema
 */
export function getCategoryFormSchema(categoryId: string): CategoryFormField[] {
  const category = getCategoryById(categoryId);
  if (!category || !category.form_schema) return [];

  try {
    return JSON.parse(category.form_schema) as CategoryFormField[];
  } catch {
    return [];
  }
}

/**
 * Get category form schema by slug or name
 */
export function getCategoryFormSchemaByName(nameOrSlug: string): CategoryFormField[] {
  const db = getDatabase();
  const category = db.prepare(`
    SELECT form_schema FROM categories
    WHERE (slug = ? OR name = ?) AND is_active = 1
  `).get(nameOrSlug, nameOrSlug) as { form_schema: string | null } | undefined;

  if (!category || !category.form_schema) return [];

  try {
    return JSON.parse(category.form_schema) as CategoryFormField[];
  } catch {
    return [];
  }
}

/**
 * Get category names (for legacy compatibility)
 */
export function getCategoryNames(): string[] {
  const categories = getActiveCategories();
  return categories.map(c => c.name);
}

/**
 * Get category statistics
 */
export function getCategoryStats(): {
  total: number;
  active: number;
  inactive: number;
} {
  const db = getDatabase();
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as inactive
    FROM categories
  `).get() as { total: number; active: number; inactive: number };

  return {
    total: stats.total || 0,
    active: stats.active || 0,
    inactive: stats.inactive || 0,
  };
}
