import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WishlistItem {
  id: string;
  buyerId: string;
  productId: string;
  addedAt: string;
}

interface WishlistState {
  wishlistItems: WishlistItem[];

  // Actions
  addToWishlist: (buyerId: string, productId: string) => WishlistItem;
  removeFromWishlist: (buyerId: string, productId: string) => void;
  isInWishlist: (buyerId: string, productId: string) => boolean;
  getWishlistByBuyer: (buyerId: string) => WishlistItem[];
  getWishlistProductIds: (buyerId: string) => string[];
  toggleWishlist: (buyerId: string, productId: string) => boolean; // returns new state (true = added, false = removed)
  clearWishlist: (buyerId: string) => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      wishlistItems: [],

      addToWishlist: (buyerId, productId) => {
        // Check if already in wishlist
        if (get().isInWishlist(buyerId, productId)) {
          return get().wishlistItems.find(
            (item) => item.buyerId === buyerId && item.productId === productId
          )!;
        }

        const newItem: WishlistItem = {
          id: `wishlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          buyerId,
          productId,
          addedAt: new Date().toISOString(),
        };

        set((state) => ({
          wishlistItems: [...state.wishlistItems, newItem],
        }));

        return newItem;
      },

      removeFromWishlist: (buyerId, productId) => {
        set((state) => ({
          wishlistItems: state.wishlistItems.filter(
            (item) => !(item.buyerId === buyerId && item.productId === productId)
          ),
        }));
      },

      isInWishlist: (buyerId, productId) => {
        return get().wishlistItems.some(
          (item) => item.buyerId === buyerId && item.productId === productId
        );
      },

      getWishlistByBuyer: (buyerId) => {
        return get().wishlistItems
          .filter((item) => item.buyerId === buyerId)
          .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
      },

      getWishlistProductIds: (buyerId) => {
        return get().getWishlistByBuyer(buyerId).map((item) => item.productId);
      },

      toggleWishlist: (buyerId, productId) => {
        const isCurrentlyInWishlist = get().isInWishlist(buyerId, productId);

        if (isCurrentlyInWishlist) {
          get().removeFromWishlist(buyerId, productId);
          return false;
        } else {
          get().addToWishlist(buyerId, productId);
          return true;
        }
      },

      clearWishlist: (buyerId) => {
        set((state) => ({
          wishlistItems: state.wishlistItems.filter((item) => item.buyerId !== buyerId),
        }));
      },
    }),
    {
      name: 'marketplace-wishlist',
    }
  )
);
