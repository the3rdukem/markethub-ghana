/**
 * Dynamic Categories Store
 *
 * MASTER_ADMIN controlled category management:
 * - Create, edit, delete categories
 * - Reorder categories
 * - Define category-specific attributes for product forms
 * - Configure validation rules
 *
 * All settings persist independently.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AttributeType = 'text' | 'number' | 'select' | 'multi_select' | 'boolean' | 'color' | 'size' | 'date';

export interface CategoryAttribute {
  id: string;
  key: string;
  label: string;
  type: AttributeType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  options?: string[]; // For select/multi_select types
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  order: number;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  imageUrl?: string;
  parentId?: string;
  isActive: boolean;
  showInMenu: boolean;
  showInHome: boolean;
  order: number;
  attributes: CategoryAttribute[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  productCount?: number;
}

export interface CategoryAuditLog {
  id: string;
  action: string;
  categoryId?: string;
  categoryName?: string;
  adminId: string;
  adminEmail: string;
  details: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
}

// Default categories with attributes
const DEFAULT_CATEGORIES: ProductCategory[] = [
  {
    id: 'cat_electronics',
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic devices and accessories',
    icon: '📱',
    isActive: true,
    showInMenu: true,
    showInHome: true,
    order: 1,
    attributes: [
      { id: 'attr_brand', key: 'brand', label: 'Brand', type: 'text', required: false, placeholder: 'e.g., Apple, Samsung', order: 1 },
      { id: 'attr_model', key: 'model', label: 'Model', type: 'text', required: false, placeholder: 'e.g., iPhone 15', order: 2 },
      { id: 'attr_warranty', key: 'warranty', label: 'Warranty (months)', type: 'number', required: false, validation: { min: 0, max: 60 }, order: 3 },
      { id: 'attr_condition', key: 'condition', label: 'Condition', type: 'select', required: true, options: ['New', 'Refurbished', 'Used - Like New', 'Used - Good', 'Used - Fair'], order: 4 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_mobile_phones',
    name: 'Mobile Phones',
    slug: 'mobile-phones',
    description: 'Smartphones and feature phones',
    icon: '📲',
    parentId: 'cat_electronics',
    isActive: true,
    showInMenu: true,
    showInHome: true,
    order: 2,
    attributes: [
      { id: 'attr_storage', key: 'storage', label: 'Storage', type: 'select', required: true, options: ['32GB', '64GB', '128GB', '256GB', '512GB', '1TB'], order: 1 },
      { id: 'attr_color', key: 'color', label: 'Color', type: 'color', required: false, order: 2 },
      { id: 'attr_network', key: 'network', label: 'Network', type: 'multi_select', required: false, options: ['4G LTE', '5G', 'Dual SIM'], order: 3 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_fashion',
    name: 'Fashion & Clothing',
    slug: 'fashion-clothing',
    description: 'Clothes, shoes, and accessories',
    icon: '👕',
    isActive: true,
    showInMenu: true,
    showInHome: true,
    order: 3,
    attributes: [
      { id: 'attr_size', key: 'size', label: 'Size', type: 'select', required: true, options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'], order: 1 },
      { id: 'attr_color', key: 'color', label: 'Color', type: 'color', required: true, order: 2 },
      { id: 'attr_material', key: 'material', label: 'Material', type: 'text', required: false, placeholder: 'e.g., Cotton, Polyester', order: 3 },
      { id: 'attr_gender', key: 'gender', label: 'Gender', type: 'select', required: true, options: ['Men', 'Women', 'Unisex', 'Boys', 'Girls', 'Kids'], order: 4 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_home_garden',
    name: 'Home & Garden',
    slug: 'home-garden',
    description: 'Home decor, furniture, and gardening',
    icon: '🏠',
    isActive: true,
    showInMenu: true,
    showInHome: true,
    order: 4,
    attributes: [
      { id: 'attr_room', key: 'room', label: 'Room Type', type: 'select', required: false, options: ['Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Outdoor', 'Office'], order: 1 },
      { id: 'attr_material', key: 'material', label: 'Material', type: 'text', required: false, order: 2 },
      { id: 'attr_dimensions', key: 'dimensions', label: 'Dimensions', type: 'text', required: false, placeholder: 'L x W x H', order: 3 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_sports',
    name: 'Sports & Outdoors',
    slug: 'sports-outdoors',
    description: 'Sports equipment and outdoor gear',
    icon: '⚽',
    isActive: true,
    showInMenu: true,
    showInHome: true,
    order: 5,
    attributes: [
      { id: 'attr_sport', key: 'sport', label: 'Sport Type', type: 'select', required: false, options: ['Football', 'Basketball', 'Tennis', 'Running', 'Gym', 'Swimming', 'Cycling', 'Other'], order: 1 },
      { id: 'attr_size', key: 'size', label: 'Size', type: 'text', required: false, order: 2 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_health_beauty',
    name: 'Health & Beauty',
    slug: 'health-beauty',
    description: 'Health products and beauty items',
    icon: '💄',
    isActive: true,
    showInMenu: true,
    showInHome: true,
    order: 6,
    attributes: [
      { id: 'attr_skin_type', key: 'skinType', label: 'Skin Type', type: 'multi_select', required: false, options: ['Normal', 'Dry', 'Oily', 'Combination', 'Sensitive', 'All Types'], order: 1 },
      { id: 'attr_organic', key: 'organic', label: 'Organic/Natural', type: 'boolean', required: false, order: 2 },
      { id: 'attr_volume', key: 'volume', label: 'Volume/Size', type: 'text', required: false, placeholder: 'e.g., 100ml, 50g', order: 3 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_books',
    name: 'Books & Media',
    slug: 'books-media',
    description: 'Books, music, and entertainment',
    icon: '📚',
    isActive: true,
    showInMenu: true,
    showInHome: true,
    order: 7,
    attributes: [
      { id: 'attr_author', key: 'author', label: 'Author/Artist', type: 'text', required: false, order: 1 },
      { id: 'attr_format', key: 'format', label: 'Format', type: 'select', required: false, options: ['Hardcover', 'Paperback', 'eBook', 'Audiobook', 'CD', 'DVD', 'Digital'], order: 2 },
      { id: 'attr_language', key: 'language', label: 'Language', type: 'select', required: false, options: ['English', 'French', 'Twi', 'Ga', 'Ewe', 'Hausa', 'Other'], order: 3 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_jewelry',
    name: 'Jewelry & Accessories',
    slug: 'jewelry-accessories',
    description: 'Jewelry, watches, and accessories',
    icon: '💍',
    isActive: true,
    showInMenu: true,
    showInHome: true,
    order: 8,
    attributes: [
      { id: 'attr_material', key: 'material', label: 'Material', type: 'select', required: false, options: ['Gold', 'Silver', 'Rose Gold', 'Platinum', 'Stainless Steel', 'Leather', 'Beads', 'Other'], order: 1 },
      { id: 'attr_type', key: 'jewelryType', label: 'Type', type: 'select', required: false, options: ['Necklace', 'Ring', 'Bracelet', 'Earrings', 'Watch', 'Anklet', 'Brooch', 'Other'], order: 2 },
      { id: 'attr_handmade', key: 'handmade', label: 'Handmade', type: 'boolean', required: false, order: 3 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_automotive',
    name: 'Automotive',
    slug: 'automotive',
    description: 'Car parts and accessories',
    icon: '🚗',
    isActive: true,
    showInMenu: true,
    showInHome: true,
    order: 9,
    attributes: [
      { id: 'attr_car_make', key: 'carMake', label: 'Car Make', type: 'text', required: false, placeholder: 'e.g., Toyota, Honda', order: 1 },
      { id: 'attr_car_model', key: 'carModel', label: 'Car Model', type: 'text', required: false, order: 2 },
      { id: 'attr_year_range', key: 'yearRange', label: 'Compatible Years', type: 'text', required: false, placeholder: 'e.g., 2015-2023', order: 3 },
      { id: 'attr_part_type', key: 'partType', label: 'Part Type', type: 'select', required: false, options: ['Engine', 'Brakes', 'Suspension', 'Electrical', 'Body', 'Interior', 'Accessories'], order: 4 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_food',
    name: 'Food & Beverages',
    slug: 'food-beverages',
    description: 'Food items and drinks',
    icon: '🍎',
    isActive: true,
    showInMenu: true,
    showInHome: true,
    order: 10,
    attributes: [
      { id: 'attr_expiry', key: 'expiryDate', label: 'Expiry Date', type: 'date', required: true, order: 1 },
      { id: 'attr_dietary', key: 'dietary', label: 'Dietary Info', type: 'multi_select', required: false, options: ['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Organic', 'Sugar-Free'], order: 2 },
      { id: 'attr_weight', key: 'weight', label: 'Weight/Volume', type: 'text', required: false, placeholder: 'e.g., 500g, 1L', order: 3 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_toys',
    name: 'Toys & Games',
    slug: 'toys-games',
    description: 'Toys and games for all ages',
    icon: '🎮',
    isActive: true,
    showInMenu: true,
    showInHome: true,
    order: 11,
    attributes: [
      { id: 'attr_age_range', key: 'ageRange', label: 'Age Range', type: 'select', required: true, options: ['0-2 years', '3-5 years', '6-8 years', '9-12 years', '13+ years', 'Adults'], order: 1 },
      { id: 'attr_battery', key: 'batteryRequired', label: 'Battery Required', type: 'boolean', required: false, order: 2 },
      { id: 'attr_players', key: 'players', label: 'Number of Players', type: 'text', required: false, placeholder: 'e.g., 1-4', order: 3 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat_arts',
    name: 'Arts & Crafts',
    slug: 'arts-crafts',
    description: 'Art supplies and handmade crafts',
    icon: '🎨',
    isActive: true,
    showInMenu: true,
    showInHome: true,
    order: 12,
    attributes: [
      { id: 'attr_handmade', key: 'handmade', label: 'Handmade', type: 'boolean', required: false, order: 1 },
      { id: 'attr_medium', key: 'medium', label: 'Medium/Material', type: 'text', required: false, order: 2 },
      { id: 'attr_style', key: 'artStyle', label: 'Art Style', type: 'select', required: false, options: ['Traditional', 'Modern', 'African Art', 'Abstract', 'Realistic', 'Mixed Media'], order: 3 },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

interface CategoriesState {
  categories: ProductCategory[];
  auditLogs: CategoryAuditLog[];
  isInitialized: boolean;

  initializeCategories: () => void;

  // Category CRUD
  addCategory: (category: Omit<ProductCategory, 'id' | 'createdAt' | 'updatedAt'>, adminId: string, adminEmail: string) => ProductCategory;
  updateCategory: (id: string, updates: Partial<ProductCategory>, adminId: string, adminEmail: string) => void;
  deleteCategory: (id: string, adminId: string, adminEmail: string) => void;
  reorderCategories: (categoryIds: string[], adminId: string, adminEmail: string) => void;

  // Category getters
  getCategoryById: (id: string) => ProductCategory | undefined;
  getCategoryBySlug: (slug: string) => ProductCategory | undefined;
  getActiveCategories: () => ProductCategory[];
  getMenuCategories: () => ProductCategory[];
  getHomeCategories: () => ProductCategory[];
  getChildCategories: (parentId: string) => ProductCategory[];
  getCategoryNames: () => string[];

  // Attribute management
  addCategoryAttribute: (categoryId: string, attribute: Omit<CategoryAttribute, 'id'>, adminId: string, adminEmail: string) => void;
  updateCategoryAttribute: (categoryId: string, attributeId: string, updates: Partial<CategoryAttribute>, adminId: string, adminEmail: string) => void;
  deleteCategoryAttribute: (categoryId: string, attributeId: string, adminId: string, adminEmail: string) => void;
  reorderCategoryAttributes: (categoryId: string, attributeIds: string[], adminId: string, adminEmail: string) => void;
  getCategoryAttributes: (categoryId: string) => CategoryAttribute[];
  getAttributesBySlug: (slug: string) => CategoryAttribute[];

  // Audit logging
  addAuditLog: (log: Omit<CategoryAuditLog, 'id' | 'timestamp'>) => void;
  getAuditLogs: () => CategoryAuditLog[];
}

export const useCategoriesStore = create<CategoriesState>()(
  persist(
    (set, get) => ({
      categories: [],
      auditLogs: [],
      isInitialized: false,

      initializeCategories: () => {
        const state = get();
        if (state.isInitialized) return;
        set({
          categories: state.categories.length > 0 ? state.categories : DEFAULT_CATEGORIES,
          isInitialized: true,
        });
      },

      addCategory: (categoryData, adminId, adminEmail) => {
        const now = new Date().toISOString();
        const slug = categoryData.slug || categoryData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const newCategory: ProductCategory = {
          ...categoryData,
          id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          slug,
          createdAt: now,
          updatedAt: now,
          createdBy: adminId,
        };
        set((state) => ({ categories: [...state.categories, newCategory] }));
        get().addAuditLog({ action: 'CATEGORY_ADDED', categoryId: newCategory.id, categoryName: newCategory.name, adminId, adminEmail, details: `Added category: ${newCategory.name}` });
        return newCategory;
      },

      updateCategory: (id, updates, adminId, adminEmail) => {
        const category = get().categories.find(c => c.id === id);
        set((state) => ({
          categories: state.categories.map(c => c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c),
        }));
        get().addAuditLog({ action: 'CATEGORY_UPDATED', categoryId: id, categoryName: category?.name, adminId, adminEmail, details: `Updated category: ${category?.name}` });
      },

      deleteCategory: (id, adminId, adminEmail) => {
        const category = get().categories.find(c => c.id === id);
        set((state) => ({ categories: state.categories.filter(c => c.id !== id) }));
        get().addAuditLog({ action: 'CATEGORY_DELETED', categoryId: id, categoryName: category?.name, adminId, adminEmail, details: `Deleted category: ${category?.name}` });
      },

      reorderCategories: (categoryIds, adminId, adminEmail) => {
        set((state) => ({
          categories: state.categories.map(c => ({ ...c, order: categoryIds.indexOf(c.id) + 1 })).sort((a, b) => a.order - b.order),
        }));
        get().addAuditLog({ action: 'CATEGORIES_REORDERED', adminId, adminEmail, details: 'Reordered categories' });
      },

      getCategoryById: (id) => get().categories.find(c => c.id === id),
      getCategoryBySlug: (slug) => get().categories.find(c => c.slug === slug),
      getActiveCategories: () => get().categories.filter(c => c.isActive).sort((a, b) => a.order - b.order),
      getMenuCategories: () => get().categories.filter(c => c.isActive && c.showInMenu).sort((a, b) => a.order - b.order),
      getHomeCategories: () => get().categories.filter(c => c.isActive && c.showInHome).sort((a, b) => a.order - b.order),
      getChildCategories: (parentId) => get().categories.filter(c => c.parentId === parentId && c.isActive).sort((a, b) => a.order - b.order),
      getCategoryNames: () => get().categories.filter(c => c.isActive).map(c => c.name).sort(),

      addCategoryAttribute: (categoryId, attribute, adminId, adminEmail) => {
        const newAttribute: CategoryAttribute = { ...attribute, id: `attr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}` };
        set((state) => ({
          categories: state.categories.map(c => c.id === categoryId ? { ...c, attributes: [...c.attributes, newAttribute], updatedAt: new Date().toISOString() } : c),
        }));
        const category = get().categories.find(c => c.id === categoryId);
        get().addAuditLog({ action: 'ATTRIBUTE_ADDED', categoryId, categoryName: category?.name, adminId, adminEmail, details: `Added attribute: ${attribute.label}` });
      },

      updateCategoryAttribute: (categoryId, attributeId, updates, adminId, adminEmail) => {
        set((state) => ({
          categories: state.categories.map(c => c.id === categoryId ? {
            ...c,
            attributes: c.attributes.map(a => a.id === attributeId ? { ...a, ...updates } : a),
            updatedAt: new Date().toISOString(),
          } : c),
        }));
        const category = get().categories.find(c => c.id === categoryId);
        get().addAuditLog({ action: 'ATTRIBUTE_UPDATED', categoryId, categoryName: category?.name, adminId, adminEmail, details: `Updated attribute: ${attributeId}` });
      },

      deleteCategoryAttribute: (categoryId, attributeId, adminId, adminEmail) => {
        set((state) => ({
          categories: state.categories.map(c => c.id === categoryId ? {
            ...c,
            attributes: c.attributes.filter(a => a.id !== attributeId),
            updatedAt: new Date().toISOString(),
          } : c),
        }));
        const category = get().categories.find(c => c.id === categoryId);
        get().addAuditLog({ action: 'ATTRIBUTE_DELETED', categoryId, categoryName: category?.name, adminId, adminEmail, details: `Deleted attribute: ${attributeId}` });
      },

      reorderCategoryAttributes: (categoryId, attributeIds, adminId, adminEmail) => {
        set((state) => ({
          categories: state.categories.map(c => c.id === categoryId ? {
            ...c,
            attributes: c.attributes.map(a => ({ ...a, order: attributeIds.indexOf(a.id) + 1 })).sort((a, b) => a.order - b.order),
            updatedAt: new Date().toISOString(),
          } : c),
        }));
        get().addAuditLog({ action: 'ATTRIBUTES_REORDERED', categoryId, adminId, adminEmail, details: 'Reordered attributes' });
      },

      getCategoryAttributes: (categoryId) => {
        const category = get().categories.find(c => c.id === categoryId);
        return category?.attributes.sort((a, b) => a.order - b.order) || [];
      },

      getAttributesBySlug: (slug) => {
        const category = get().categories.find(c => c.slug === slug || c.name === slug);
        return category?.attributes.sort((a, b) => a.order - b.order) || [];
      },

      addAuditLog: (logData) => {
        const newLog: CategoryAuditLog = { ...logData, id: `catlog_${Date.now()}`, timestamp: new Date().toISOString() };
        set((state) => ({ auditLogs: [newLog, ...state.auditLogs].slice(0, 500) }));
      },

      getAuditLogs: () => get().auditLogs,
    }),
    { name: 'marketplace-categories' }
  )
);

// Helper to get attributes for a category name (for product forms)
export const getCategoryAttributesForForm = (categoryName: string): CategoryAttribute[] => {
  const store = useCategoriesStore.getState();
  return store.getAttributesBySlug(categoryName);
};
