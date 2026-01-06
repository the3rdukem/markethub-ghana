import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DiscountType = 'percentage' | 'fixed';
export type CouponScope = 'store_wide' | 'product_specific' | 'category_specific';
export type PromotionStatus = 'active' | 'scheduled' | 'expired' | 'disabled';

export interface Coupon {
  id: string;
  vendorId: string;
  code: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number; // percentage (0-100) or fixed amount in GHS
  scope: CouponScope;
  productIds?: string[]; // For product_specific scope
  categoryIds?: string[]; // For category_specific scope
  minOrderAmount?: number;
  maxDiscountAmount?: number; // Cap for percentage discounts
  usageLimit?: number; // Total uses allowed
  usageCount: number; // Current usage count
  usageLimitPerCustomer?: number;
  customerUsage: Record<string, number>; // customerId -> usage count
  startDate: string;
  endDate: string;
  status: PromotionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Sale {
  id: string;
  vendorId: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  productIds: string[]; // Products in this sale
  startDate: string;
  endDate: string;
  status: PromotionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CouponValidationResult {
  valid: boolean;
  error?: string;
  discount?: number;
  coupon?: Coupon;
}

interface PromotionsState {
  coupons: Coupon[];
  sales: Sale[];

  // Coupon Actions
  addCoupon: (coupon: Omit<Coupon, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'customerUsage'>) => Coupon;
  updateCoupon: (id: string, updates: Partial<Coupon>) => void;
  deleteCoupon: (id: string) => void;
  getCouponById: (id: string) => Coupon | undefined;
  getCouponByCode: (code: string) => Coupon | undefined;
  getCouponsByVendor: (vendorId: string) => Coupon[];
  getActiveCoupons: (vendorId: string) => Coupon[];

  // Coupon Validation
  validateCoupon: (
    code: string,
    vendorId: string,
    customerId: string,
    orderTotal: number,
    productIds: string[],
    categoryIds: string[]
  ) => CouponValidationResult;
  applyCoupon: (couponId: string, customerId: string, orderTotal: number, productIds: string[]) => number;
  recordCouponUsage: (couponId: string, customerId: string) => void;

  // Sale Actions
  addSale: (sale: Omit<Sale, 'id' | 'createdAt' | 'updatedAt'>) => Sale;
  updateSale: (id: string, updates: Partial<Sale>) => void;
  deleteSale: (id: string) => void;
  getSaleById: (id: string) => Sale | undefined;
  getSalesByVendor: (vendorId: string) => Sale[];
  getActiveSales: (vendorId: string) => Sale[];

  // Sale Price Calculation
  getSalePrice: (productId: string, originalPrice: number) => { salePrice: number; discount: number; sale?: Sale };
  getProductsOnSale: (vendorId: string) => string[];

  // Utility
  updatePromotionStatuses: () => void;
}

const calculatePromotionStatus = (startDate: string, endDate: string, currentStatus: PromotionStatus): PromotionStatus => {
  if (currentStatus === 'disabled') return 'disabled';

  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now < start) return 'scheduled';
  if (now > end) return 'expired';
  return 'active';
};

export const usePromotionsStore = create<PromotionsState>()(
  persist(
    (set, get) => ({
      coupons: [],
      sales: [],

      // Coupon Actions
      addCoupon: (couponData) => {
        const now = new Date().toISOString();
        const status = calculatePromotionStatus(couponData.startDate, couponData.endDate, 'active');

        const newCoupon: Coupon = {
          ...couponData,
          id: `coupon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          usageCount: 0,
          customerUsage: {},
          status,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          coupons: [...state.coupons, newCoupon],
        }));

        return newCoupon;
      },

      updateCoupon: (id, updates) => {
        set((state) => ({
          coupons: state.coupons.map((coupon) =>
            coupon.id === id
              ? { ...coupon, ...updates, updatedAt: new Date().toISOString() }
              : coupon
          ),
        }));
      },

      deleteCoupon: (id) => {
        set((state) => ({
          coupons: state.coupons.filter((coupon) => coupon.id !== id),
        }));
      },

      getCouponById: (id) => {
        return get().coupons.find((coupon) => coupon.id === id);
      },

      getCouponByCode: (code) => {
        return get().coupons.find((coupon) => coupon.code.toLowerCase() === code.toLowerCase());
      },

      getCouponsByVendor: (vendorId) => {
        return get().coupons.filter((coupon) => coupon.vendorId === vendorId);
      },

      getActiveCoupons: (vendorId) => {
        const now = new Date();
        return get().coupons.filter((coupon) => {
          if (coupon.vendorId !== vendorId) return false;
          if (coupon.status === 'disabled') return false;
          const start = new Date(coupon.startDate);
          const end = new Date(coupon.endDate);
          return now >= start && now <= end;
        });
      },

      validateCoupon: (code, vendorId, customerId, orderTotal, productIds, categoryIds) => {
        const coupon = get().getCouponByCode(code);

        if (!coupon) {
          return { valid: false, error: 'Invalid coupon code' };
        }

        if (coupon.vendorId !== vendorId) {
          return { valid: false, error: 'This coupon is not valid for this store' };
        }

        const now = new Date();
        const start = new Date(coupon.startDate);
        const end = new Date(coupon.endDate);

        if (now < start) {
          return { valid: false, error: 'This coupon is not yet active' };
        }

        if (now > end) {
          return { valid: false, error: 'This coupon has expired' };
        }

        if (coupon.status === 'disabled') {
          return { valid: false, error: 'This coupon is no longer available' };
        }

        if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
          return { valid: false, error: 'This coupon has reached its usage limit' };
        }

        if (coupon.usageLimitPerCustomer) {
          const customerUsageCount = coupon.customerUsage[customerId] || 0;
          if (customerUsageCount >= coupon.usageLimitPerCustomer) {
            return { valid: false, error: 'You have already used this coupon the maximum number of times' };
          }
        }

        if (coupon.minOrderAmount && orderTotal < coupon.minOrderAmount) {
          return { valid: false, error: `Minimum order amount is GHS ${coupon.minOrderAmount}` };
        }

        // Check scope
        if (coupon.scope === 'product_specific' && coupon.productIds) {
          const hasEligibleProduct = productIds.some(id => coupon.productIds!.includes(id));
          if (!hasEligibleProduct) {
            return { valid: false, error: 'This coupon is not valid for the products in your cart' };
          }
        }

        if (coupon.scope === 'category_specific' && coupon.categoryIds) {
          const hasEligibleCategory = categoryIds.some(id => coupon.categoryIds!.includes(id));
          if (!hasEligibleCategory) {
            return { valid: false, error: 'This coupon is not valid for the categories in your cart' };
          }
        }

        // Calculate discount
        let discount = 0;
        if (coupon.discountType === 'percentage') {
          discount = (orderTotal * coupon.discountValue) / 100;
          if (coupon.maxDiscountAmount) {
            discount = Math.min(discount, coupon.maxDiscountAmount);
          }
        } else {
          discount = Math.min(coupon.discountValue, orderTotal);
        }

        return { valid: true, discount, coupon };
      },

      applyCoupon: (couponId, customerId, orderTotal, productIds) => {
        const coupon = get().getCouponById(couponId);
        if (!coupon) return 0;

        let discount = 0;
        if (coupon.discountType === 'percentage') {
          discount = (orderTotal * coupon.discountValue) / 100;
          if (coupon.maxDiscountAmount) {
            discount = Math.min(discount, coupon.maxDiscountAmount);
          }
        } else {
          discount = Math.min(coupon.discountValue, orderTotal);
        }

        // Record usage
        get().recordCouponUsage(couponId, customerId);

        return discount;
      },

      recordCouponUsage: (couponId, customerId) => {
        const coupon = get().getCouponById(couponId);
        if (!coupon) return;

        const newCustomerUsage = {
          ...coupon.customerUsage,
          [customerId]: (coupon.customerUsage[customerId] || 0) + 1,
        };

        get().updateCoupon(couponId, {
          usageCount: coupon.usageCount + 1,
          customerUsage: newCustomerUsage,
        });
      },

      // Sale Actions
      addSale: (saleData) => {
        const now = new Date().toISOString();
        const status = calculatePromotionStatus(saleData.startDate, saleData.endDate, 'active');

        const newSale: Sale = {
          ...saleData,
          id: `sale_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          status,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          sales: [...state.sales, newSale],
        }));

        return newSale;
      },

      updateSale: (id, updates) => {
        set((state) => ({
          sales: state.sales.map((sale) =>
            sale.id === id
              ? { ...sale, ...updates, updatedAt: new Date().toISOString() }
              : sale
          ),
        }));
      },

      deleteSale: (id) => {
        set((state) => ({
          sales: state.sales.filter((sale) => sale.id !== id),
        }));
      },

      getSaleById: (id) => {
        return get().sales.find((sale) => sale.id === id);
      },

      getSalesByVendor: (vendorId) => {
        return get().sales.filter((sale) => sale.vendorId === vendorId);
      },

      getActiveSales: (vendorId) => {
        const now = new Date();
        return get().sales.filter((sale) => {
          if (sale.vendorId !== vendorId) return false;
          if (sale.status === 'disabled') return false;
          const start = new Date(sale.startDate);
          const end = new Date(sale.endDate);
          return now >= start && now <= end;
        });
      },

      getSalePrice: (productId, originalPrice) => {
        const now = new Date();
        const activeSale = get().sales.find((sale) => {
          if (sale.status === 'disabled') return false;
          const start = new Date(sale.startDate);
          const end = new Date(sale.endDate);
          const isActive = now >= start && now <= end;
          return isActive && sale.productIds.includes(productId);
        });

        if (!activeSale) {
          return { salePrice: originalPrice, discount: 0 };
        }

        let salePrice = originalPrice;
        let discount = 0;

        if (activeSale.discountType === 'percentage') {
          discount = (originalPrice * activeSale.discountValue) / 100;
          salePrice = originalPrice - discount;
        } else {
          discount = Math.min(activeSale.discountValue, originalPrice);
          salePrice = originalPrice - discount;
        }

        return { salePrice: Math.max(0, salePrice), discount, sale: activeSale };
      },

      getProductsOnSale: (vendorId) => {
        const activeSales = get().getActiveSales(vendorId);
        const productIds = new Set<string>();
        activeSales.forEach((sale) => {
          sale.productIds.forEach((id) => productIds.add(id));
        });
        return Array.from(productIds);
      },

      updatePromotionStatuses: () => {
        const now = new Date();

        set((state) => ({
          coupons: state.coupons.map((coupon) => {
            if (coupon.status === 'disabled') return coupon;
            const newStatus = calculatePromotionStatus(coupon.startDate, coupon.endDate, coupon.status);
            if (newStatus !== coupon.status) {
              return { ...coupon, status: newStatus, updatedAt: now.toISOString() };
            }
            return coupon;
          }),
          sales: state.sales.map((sale) => {
            if (sale.status === 'disabled') return sale;
            const newStatus = calculatePromotionStatus(sale.startDate, sale.endDate, sale.status);
            if (newStatus !== sale.status) {
              return { ...sale, status: newStatus, updatedAt: now.toISOString() };
            }
            return sale;
          }),
        }));
      },
    }),
    {
      name: 'marketplace-promotions',
    }
  )
);
