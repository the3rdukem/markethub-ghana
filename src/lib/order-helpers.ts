import { useOrdersStore, Order } from './orders-store';
import { useNotificationsStore } from './notifications-store';

/**
 * Helper hook that provides order operations with integrated notifications
 */
export function useOrderOperations() {
  const { updateOrder, getOrderById } = useOrdersStore();
  const {
    notifyOrderStatusChange,
    notifyNewOrder,
    notifyPaymentReceived,
  } = useNotificationsStore();

  /**
   * Update order status and send notifications to both buyer and relevant vendors
   */
  const updateOrderStatus = (
    orderId: string,
    newStatus: Order['status'],
    updatedBy: { id: string; role: 'buyer' | 'vendor' | 'admin' }
  ) => {
    const order = getOrderById(orderId);
    if (!order) return false;

    const oldStatus = order.status;
    const orderNumber = orderId.slice(-8).toUpperCase();

    // Update the order
    updateOrder(orderId, { status: newStatus });

    // Notify the buyer
    notifyOrderStatusChange(
      order.buyerId,
      orderId,
      orderNumber,
      oldStatus,
      newStatus,
      'buyer'
    );

    // Notify all vendors involved in this order
    const vendorIds = [...new Set(order.items.map(item => item.vendorId))];
    for (const vendorId of vendorIds) {
      // Don't notify the vendor who made the update
      if (updatedBy.role === 'vendor' && updatedBy.id === vendorId) continue;

      notifyOrderStatusChange(
        vendorId,
        orderId,
        orderNumber,
        oldStatus,
        newStatus,
        'vendor'
      );
    }

    return true;
  };

  /**
   * Create an order and notify vendors
   */
  const processNewOrder = (order: Order) => {
    const orderNumber = order.id.slice(-8).toUpperCase();

    // Get unique vendors
    const vendorIds = [...new Set(order.items.map(item => item.vendorId))];

    for (const vendorId of vendorIds) {
      const vendorItems = order.items.filter(item => item.vendorId === vendorId);
      const vendorTotal = vendorItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      notifyNewOrder(
        vendorId,
        order.id,
        orderNumber,
        order.buyerName,
        vendorTotal
      );
    }
  };

  /**
   * Confirm payment and notify vendor
   */
  const confirmPayment = (orderId: string) => {
    const order = getOrderById(orderId);
    if (!order) return false;

    // Update payment status
    updateOrder(orderId, { paymentStatus: 'paid' });

    // Notify each vendor
    const vendorIds = [...new Set(order.items.map(item => item.vendorId))];
    for (const vendorId of vendorIds) {
      const vendorItems = order.items.filter(item => item.vendorId === vendorId);
      const vendorAmount = vendorItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      notifyPaymentReceived(vendorId, orderId, vendorAmount);
    }

    return true;
  };

  /**
   * Cancel order with notifications
   */
  const cancelOrderWithNotification = (
    orderId: string,
    cancelledBy: { id: string; role: 'buyer' | 'vendor' | 'admin' }
  ) => {
    return updateOrderStatus(orderId, 'cancelled', cancelledBy);
  };

  return {
    updateOrderStatus,
    processNewOrder,
    confirmPayment,
    cancelOrderWithNotification,
  };
}

/**
 * Get order status display info
 */
export function getOrderStatusInfo(status: Order['status']) {
  const statusMap: Record<Order['status'], { label: string; color: string; description: string }> = {
    pending: {
      label: 'Pending',
      color: 'bg-yellow-100 text-yellow-800',
      description: 'Order is awaiting confirmation',
    },
    confirmed: {
      label: 'Confirmed',
      color: 'bg-blue-100 text-blue-800',
      description: 'Order has been confirmed',
    },
    processing: {
      label: 'Processing',
      color: 'bg-purple-100 text-purple-800',
      description: 'Order is being prepared',
    },
    shipped: {
      label: 'Shipped',
      color: 'bg-indigo-100 text-indigo-800',
      description: 'Order has been shipped',
    },
    delivered: {
      label: 'Delivered',
      color: 'bg-green-100 text-green-800',
      description: 'Order has been delivered',
    },
    cancelled: {
      label: 'Cancelled',
      color: 'bg-red-100 text-red-800',
      description: 'Order was cancelled',
    },
    refunded: {
      label: 'Refunded',
      color: 'bg-gray-100 text-gray-800',
      description: 'Order was refunded',
    },
  };

  return statusMap[status] || statusMap.pending;
}

/**
 * Get available status transitions based on current status
 */
export function getAvailableStatusTransitions(currentStatus: Order['status'], userRole: 'buyer' | 'vendor' | 'admin'): Order['status'][] {
  const transitions: Record<Order['status'], Record<string, Order['status'][]>> = {
    pending: {
      vendor: ['confirmed', 'cancelled'],
      admin: ['confirmed', 'cancelled'],
      buyer: ['cancelled'],
    },
    confirmed: {
      vendor: ['processing', 'cancelled'],
      admin: ['processing', 'cancelled'],
      buyer: [],
    },
    processing: {
      vendor: ['shipped'],
      admin: ['shipped', 'cancelled'],
      buyer: [],
    },
    shipped: {
      vendor: ['delivered'],
      admin: ['delivered'],
      buyer: [],
    },
    delivered: {
      vendor: [],
      admin: ['refunded'],
      buyer: [],
    },
    cancelled: {
      vendor: [],
      admin: [],
      buyer: [],
    },
    refunded: {
      vendor: [],
      admin: [],
      buyer: [],
    },
  };

  return transitions[currentStatus]?.[userRole] || [];
}
