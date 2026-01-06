import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Review {
  id: string;
  productId: string;
  buyerId: string;
  buyerName: string;
  buyerAvatar?: string;
  rating: number; // 1-5
  comment: string;
  images: string[];
  verified: boolean; // verified purchase
  helpful: number;
  createdAt: string;
  updatedAt: string;
}

interface ReviewsState {
  reviews: Review[];

  // Actions
  addReview: (review: Omit<Review, 'id' | 'createdAt' | 'updatedAt' | 'helpful'>) => Review | null;
  updateReview: (id: string, updates: Partial<Review>) => void;
  deleteReview: (id: string) => void;
  getReviewById: (id: string) => Review | undefined;
  getReviewsByProduct: (productId: string) => Review[];
  getReviewsByBuyer: (buyerId: string) => Review[];
  getBuyerReviewForProduct: (buyerId: string, productId: string) => Review | undefined;
  getAverageRating: (productId: string) => number;
  getRatingBreakdown: (productId: string) => Record<number, number>;
  markHelpful: (reviewId: string) => void;
  canBuyerReview: (buyerId: string, productId: string) => boolean;
}

export const useReviewsStore = create<ReviewsState>()(
  persist(
    (set, get) => ({
      reviews: [],

      addReview: (reviewData) => {
        // Check if buyer already reviewed this product
        const existingReview = get().getBuyerReviewForProduct(reviewData.buyerId, reviewData.productId);
        if (existingReview) {
          return null; // Buyer already reviewed this product
        }

        const now = new Date().toISOString();
        const newReview: Review = {
          ...reviewData,
          id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          helpful: 0,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          reviews: [...state.reviews, newReview],
        }));
        return newReview;
      },

      updateReview: (id, updates) => {
        set((state) => ({
          reviews: state.reviews.map((review) =>
            review.id === id
              ? { ...review, ...updates, updatedAt: new Date().toISOString() }
              : review
          ),
        }));
      },

      deleteReview: (id) => {
        set((state) => ({
          reviews: state.reviews.filter((review) => review.id !== id),
        }));
      },

      getReviewById: (id) => {
        return get().reviews.find((review) => review.id === id);
      },

      getReviewsByProduct: (productId) => {
        return get().reviews
          .filter((review) => review.productId === productId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      getReviewsByBuyer: (buyerId) => {
        return get().reviews.filter((review) => review.buyerId === buyerId);
      },

      getBuyerReviewForProduct: (buyerId, productId) => {
        return get().reviews.find(
          (review) => review.buyerId === buyerId && review.productId === productId
        );
      },

      getAverageRating: (productId) => {
        const productReviews = get().getReviewsByProduct(productId);
        if (productReviews.length === 0) return 0;

        const totalRating = productReviews.reduce((sum, review) => sum + review.rating, 0);
        return Math.round((totalRating / productReviews.length) * 10) / 10;
      },

      getRatingBreakdown: (productId) => {
        const productReviews = get().getReviewsByProduct(productId);
        const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

        for (const review of productReviews) {
          breakdown[review.rating] = (breakdown[review.rating] || 0) + 1;
        }

        return breakdown;
      },

      markHelpful: (reviewId) => {
        const review = get().getReviewById(reviewId);
        if (review) {
          get().updateReview(reviewId, { helpful: review.helpful + 1 });
        }
      },

      canBuyerReview: (buyerId, productId) => {
        // Check if buyer hasn't already reviewed this product
        const existingReview = get().getBuyerReviewForProduct(buyerId, productId);
        return !existingReview;
      },
    }),
    {
      name: 'marketplace-reviews',
    }
  )
);

// Helper function to check if buyer has purchased a product
export const hasBuyerPurchasedProduct = (
  buyerId: string,
  productId: string,
  orders: { buyerId: string; items: { productId: string }[]; status: string }[]
): boolean => {
  return orders.some(
    order =>
      order.buyerId === buyerId &&
      (order.status === 'delivered' || order.status === 'completed' || order.status === 'shipped') &&
      order.items.some(item => item.productId === productId)
  );
};
