"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteLayout } from "@/components/layout/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Search,
  Package,
  Eye,
  MoreHorizontal,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  Mail,
  Phone
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useOrdersStore, Order } from "@/lib/orders-store";
import { useOrderOperations, getOrderStatusInfo, getAvailableStatusTransitions } from "@/lib/order-helpers";
import { formatDistance } from "date-fns";
import { toast } from "sonner";

export default function VendorOrdersPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { getOrdersByVendor } = useOrdersStore();
  const { updateOrderStatus } = useOrderOperations();

  const [isHydrated, setIsHydrated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isUpdateStatusOpen, setIsUpdateStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<Order['status'] | "">("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.push("/auth/login");
    }
    if (isHydrated && user && user.role !== "vendor") {
      router.push("/");
    }
  }, [isHydrated, isAuthenticated, user, router]);

  if (!isHydrated) {
    return (
      <SiteLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </SiteLayout>
    );
  }

  if (!isAuthenticated || !user || user.role !== "vendor") {
    return null;
  }

  const orders = getOrdersByVendor(user.id);

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.buyerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  const handleOpenStatusUpdate = (order: Order) => {
    setSelectedOrder(order);
    setNewStatus("");
    setTrackingNumber(order.trackingNumber || "");
    setIsUpdateStatusOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus || !user) return;

    setIsUpdating(true);

    try {
      const success = updateOrderStatus(selectedOrder.id, newStatus, {
        id: user.id,
        role: 'vendor'
      });

      if (success) {
        // If shipped, also update tracking number
        if (newStatus === 'shipped' && trackingNumber) {
          const { updateOrder } = useOrdersStore.getState();
          updateOrder(selectedOrder.id, { trackingNumber });
        }

        toast.success(`Order status updated to ${getOrderStatusInfo(newStatus).label}`);
        setIsUpdateStatusOpen(false);
        setSelectedOrder(null);
      } else {
        toast.error("Failed to update order status");
      }
    } catch (error) {
      toast.error("Failed to update order");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: Order['status']) => {
    const info = getOrderStatusInfo(status);
    return <Badge className={info.color}>{info.label}</Badge>;
  };

  const availableTransitions = selectedOrder
    ? getAvailableStatusTransitions(selectedOrder.status, 'vendor')
    : [];

  return (
    <SiteLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/vendor">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Orders</h1>
              <p className="text-muted-foreground">Manage your customer orders</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by order ID, customer name, or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Orders ({filteredOrders.length})</CardTitle>
            <CardDescription>View and manage your orders</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredOrders.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
                <p className="text-muted-foreground">
                  {orders.length === 0
                    ? "You haven't received any orders yet."
                    : "No orders match your current filters."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => {
                      const orderTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                      const orderNumber = order.id.slice(-8).toUpperCase();

                      return (
                        <TableRow key={order.id}>
                          <TableCell>
                            <span className="font-mono text-sm">#{orderNumber}</span>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{order.buyerName}</p>
                              <p className="text-sm text-muted-foreground">{order.buyerEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span>{order.items.length} item(s)</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">GHS {orderTotal.toLocaleString()}</span>
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatDistance(new Date(order.createdAt), new Date(), { addSuffix: true })}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleViewOrder(order)}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {getAvailableStatusTransitions(order.status, 'vendor').length > 0 && (
                                  <DropdownMenuItem onClick={() => handleOpenStatusUpdate(order)}>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Update Status
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                  <Mail className="w-4 h-4 mr-2" />
                                  Contact Customer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Order #{selectedOrder?.id.slice(-8).toUpperCase()}
              </DialogTitle>
              <DialogDescription>
                Order details and customer information
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  {getStatusBadge(selectedOrder.status)}
                  <span className="text-sm text-muted-foreground">
                    {new Date(selectedOrder.createdAt).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Customer</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p className="font-medium">{selectedOrder.buyerName}</p>
                      <p className="text-muted-foreground">{selectedOrder.buyerEmail}</p>
                      <p className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {selectedOrder.shippingAddress.phone}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Shipping Address</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <p>{selectedOrder.shippingAddress.fullName}</p>
                      <p>{selectedOrder.shippingAddress.address}</p>
                      <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.region}</p>
                      {selectedOrder.shippingAddress.digitalAddress && (
                        <p className="text-muted-foreground">{selectedOrder.shippingAddress.digitalAddress}</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Order Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                              {item.image ? (
                                <img src={item.image} alt={item.productName} className="w-full h-full object-cover rounded" />
                              ) : (
                                <Package className="w-6 h-6 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          <p className="font-medium">GHS {(item.price * item.quantity).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between font-bold">
                        <span>Total</span>
                        <span>GHS {selectedOrder.items.reduce((sum, item) => sum + item.price * item.quantity, 0).toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {selectedOrder.trackingNumber && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <Truck className="w-5 h-5 text-blue-600" />
                    <span className="text-sm">Tracking: {selectedOrder.trackingNumber}</span>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              {selectedOrder && getAvailableStatusTransitions(selectedOrder.status, 'vendor').length > 0 && (
                <Button onClick={() => {
                  setIsDetailsOpen(false);
                  handleOpenStatusUpdate(selectedOrder);
                }}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Update Status
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Status Dialog */}
        <Dialog open={isUpdateStatusOpen} onOpenChange={setIsUpdateStatusOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Order Status</DialogTitle>
              <DialogDescription>
                Change the status of order #{selectedOrder?.id.slice(-8).toUpperCase()}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Current Status</Label>
                <div className="mt-1">
                  {selectedOrder && getStatusBadge(selectedOrder.status)}
                </div>
              </div>

              <div>
                <Label htmlFor="newStatus">New Status</Label>
                <Select value={newStatus} onValueChange={(value) => setNewStatus(value as Order['status'])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTransitions.map((status) => {
                      const info = getOrderStatusInfo(status);
                      return (
                        <SelectItem key={status} value={status}>
                          {info.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {newStatus === 'shipped' && (
                <div>
                  <Label htmlFor="trackingNumber">Tracking Number (Optional)</Label>
                  <Input
                    id="trackingNumber"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number"
                  />
                </div>
              )}

              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium mb-1">Notification Preview</p>
                <p className="text-muted-foreground">
                  {newStatus ? (
                    <>The customer will receive an in-app notification, email, and SMS about this status update.</>
                  ) : (
                    <>Select a status to preview the notification</>
                  )}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUpdateStatusOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateStatus} disabled={!newStatus || isUpdating}>
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Status"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SiteLayout>
  );
}
