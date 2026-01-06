import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

export interface Order {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  tax: number;
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentMethod: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    region: string;
    digitalAddress?: string;
  };
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface OrdersState {
  orders: Order[];
  lastSyncedAt: string | null;

  // Actions
  createOrder: (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Order;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  cancelOrder: (id: string) => void;
  getOrderById: (id: string) => Order | undefined;
  getOrdersByBuyer: (buyerId: string) => Order[];
  getOrdersByVendor: (vendorId: string) => Order[];
  getOrderStats: (vendorId?: string) => {
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalRevenue: number;
  };

  // API sync functions
  setOrders: (orders: Order[]) => void;
  syncFromApi: () => Promise<void>;
}

export const useOrdersStore = create<OrdersState>()(
  persist<OrdersState>(
    (set, get) => ({
      orders: [],
      lastSyncedAt: null,

      setOrders: (orders) => {
        set({ orders, lastSyncedAt: new Date().toISOString() });
      },

      syncFromApi: async () => {
        try {
          const response = await fetch('/api/orders', {
            credentials: 'include',
          });
          if (response.ok) {
            const data = await response.json();
            set({
              orders: data.orders || [],
              lastSyncedAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error('Failed to sync orders from API:', error);
        }
      },

      createOrder: (orderData) => {
        const now = new Date().toISOString();
        const newOrder: Order = {
          ...orderData,
          id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          orders: [...state.orders, newOrder],
        }));
        return newOrder;
      },

      updateOrder: (id, updates) => {
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === id
              ? { ...order, ...updates, updatedAt: new Date().toISOString() }
              : order
          ),
        }));
      },

      cancelOrder: (id) => {
        get().updateOrder(id, { status: 'cancelled' });
      },

      getOrderById: (id) => {
        return get().orders.find((order) => order.id === id);
      },

      getOrdersByBuyer: (buyerId) => {
        return get().orders
          .filter((order) => order.buyerId === buyerId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      getOrdersByVendor: (vendorId) => {
        return get().orders
          .filter((order) => order.items.some((item) => item.vendorId === vendorId))
          .map((order) => ({
            ...order,
            // Filter to only show items from this vendor
            items: order.items.filter((item) => item.vendorId === vendorId),
          }))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      },

      getOrderStats: (vendorId?) => {
        let relevantOrders = get().orders;

        if (vendorId) {
          relevantOrders = relevantOrders.filter((order) =>
            order.items.some((item) => item.vendorId === vendorId)
          );
        }

        const completedOrders = relevantOrders.filter(
          (order) => order.status === 'delivered'
        );

        const totalRevenue = vendorId
          ? relevantOrders.reduce((sum, order) => {
              const vendorItems = order.items.filter((item) => item.vendorId === vendorId);
              return sum + vendorItems.reduce((itemSum, item) => itemSum + item.price * item.quantity, 0);
            }, 0)
          : relevantOrders.reduce((sum, order) => sum + order.total, 0);

        return {
          totalOrders: relevantOrders.length,
          pendingOrders: relevantOrders.filter(
            (order) => ['pending', 'confirmed', 'processing'].includes(order.status)
          ).length,
          completedOrders: completedOrders.length,
          totalRevenue,
        };
      },
    }),
    {
      name: 'marketplace-orders',
    }
  )
);
