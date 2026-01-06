import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from './products-store';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  vendor: string;
  vendorId: string;
  quantity: number;
  variations?: {
    color?: string;
    size?: string;
  };
  maxQuantity: number;
}

export interface CartValidationResult {
  isValid: boolean;
  issues: {
    itemId: string;
    itemName: string;
    type: 'out_of_stock' | 'insufficient_stock' | 'price_changed' | 'product_unavailable';
    message: string;
    oldValue?: number;
    newValue?: number;
  }[];
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;

  // Actions
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateItemPrice: (id: string, newPrice: number) => void;
  updateItemMaxQuantity: (id: string, maxQuantity: number) => void;
  removeUnavailableItems: (productIds: string[]) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;

  // Computed values
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getItemsByVendor: () => Record<string, CartItem[]>;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (newItem) => {
        const items = get().items;
        const existingItemIndex = items.findIndex(
          item => item.id === newItem.id &&
                 JSON.stringify(item.variations) === JSON.stringify(newItem.variations)
        );

        if (existingItemIndex > -1) {
          // Update quantity if item already exists
          const existingItem = items[existingItemIndex];
          const newQuantity = Math.min(
            existingItem.quantity + (newItem.quantity || 1),
            existingItem.maxQuantity
          );

          set({
            items: items.map((item, index) =>
              index === existingItemIndex
                ? { ...item, quantity: newQuantity }
                : item
            )
          });
        } else {
          // Add new item
          set({
            items: [...items, { ...newItem, quantity: newItem.quantity || 1 }]
          });
        }

        // Show cart briefly when item is added
        set({ isOpen: true });
        setTimeout(() => set({ isOpen: false }), 2000);
      },

      removeItem: (id) => {
        set({
          items: get().items.filter(item => item.id !== id)
        });
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }

        set({
          items: get().items.map(item =>
            item.id === id
              ? { ...item, quantity: Math.min(quantity, item.maxQuantity) }
              : item
          )
        });
      },

      updateItemPrice: (id, newPrice) => {
        set({
          items: get().items.map(item =>
            item.id === id
              ? { ...item, price: newPrice }
              : item
          )
        });
      },

      updateItemMaxQuantity: (id, maxQuantity) => {
        set({
          items: get().items.map(item =>
            item.id === id
              ? {
                  ...item,
                  maxQuantity,
                  // Adjust quantity if it exceeds new max
                  quantity: Math.min(item.quantity, maxQuantity)
                }
              : item
          )
        });
      },

      removeUnavailableItems: (productIds) => {
        set({
          items: get().items.filter(item => !productIds.includes(item.id))
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      openCart: () => {
        set({ isOpen: true });
      },

      closeCart: () => {
        set({ isOpen: false });
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },

      getItemsByVendor: () => {
        const items = get().items;
        return items.reduce((groups, item) => {
          const vendorId = item.vendorId;
          if (!groups[vendorId]) {
            groups[vendorId] = [];
          }
          groups[vendorId].push(item);
          return groups;
        }, {} as Record<string, CartItem[]>);
      }
    }),
    {
      name: 'marketplace-cart',
      partialize: (state) => ({ items: state.items })
    }
  )
);

// Utility function to validate cart items against current product data
export function validateCartItems(
  cartItems: CartItem[],
  products: Product[]
): CartValidationResult {
  const issues: CartValidationResult['issues'] = [];

  for (const cartItem of cartItems) {
    const product = products.find(p => p.id === cartItem.id);

    if (!product) {
      issues.push({
        itemId: cartItem.id,
        itemName: cartItem.name,
        type: 'product_unavailable',
        message: `"${cartItem.name}" is no longer available`,
      });
      continue;
    }

    if (product.status !== 'active') {
      issues.push({
        itemId: cartItem.id,
        itemName: cartItem.name,
        type: 'product_unavailable',
        message: `"${cartItem.name}" is currently unavailable`,
      });
      continue;
    }

    // Check stock
    if (product.trackQuantity) {
      if (product.quantity === 0) {
        issues.push({
          itemId: cartItem.id,
          itemName: cartItem.name,
          type: 'out_of_stock',
          message: `"${cartItem.name}" is out of stock`,
        });
      } else if (product.quantity < cartItem.quantity) {
        issues.push({
          itemId: cartItem.id,
          itemName: cartItem.name,
          type: 'insufficient_stock',
          message: `Only ${product.quantity} units of "${cartItem.name}" available`,
          oldValue: cartItem.quantity,
          newValue: product.quantity,
        });
      }
    }

    // Check price changes
    if (product.price !== cartItem.price) {
      issues.push({
        itemId: cartItem.id,
        itemName: cartItem.name,
        type: 'price_changed',
        message: `Price of "${cartItem.name}" has changed from GHS ${cartItem.price.toLocaleString()} to GHS ${product.price.toLocaleString()}`,
        oldValue: cartItem.price,
        newValue: product.price,
      });
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

// Utility to sync cart with current product data
export function syncCartWithProducts(
  cartItems: CartItem[],
  products: Product[],
  updateItemPrice: (id: string, price: number) => void,
  updateItemMaxQuantity: (id: string, maxQuantity: number) => void,
  removeUnavailableItems: (ids: string[]) => void
): void {
  const unavailableIds: string[] = [];

  for (const cartItem of cartItems) {
    const product = products.find(p => p.id === cartItem.id);

    if (!product || product.status !== 'active') {
      unavailableIds.push(cartItem.id);
      continue;
    }

    // Sync price
    if (product.price !== cartItem.price) {
      updateItemPrice(cartItem.id, product.price);
    }

    // Sync max quantity
    const newMaxQuantity = product.trackQuantity ? product.quantity : 999;
    if (newMaxQuantity !== cartItem.maxQuantity) {
      updateItemMaxQuantity(cartItem.id, newMaxQuantity);
    }
  }

  if (unavailableIds.length > 0) {
    removeUnavailableItems(unavailableIds);
  }
}
