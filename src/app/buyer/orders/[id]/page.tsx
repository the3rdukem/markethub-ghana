"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SiteLayout } from "@/components/layout/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle,
  Clock,
  MapPin,
  CreditCard,
  MessageSquare,
  Download,
  AlertTriangle,
  Star,
  Store,
  Loader2,
  XCircle,
  Phone,
  Mail,
  Copy,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useOrdersStore, Order } from "@/lib/orders-store";
import { useReviewsStore } from "@/lib/reviews-store";
import { useProductsStore } from "@/lib/products-store";
import { format } from "date-fns";
import { toast } from "sonner";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

const orderSteps = [
  { status: "pending", label: "Order Placed", icon: Package },
  { status: "confirmed", label: "Confirmed", icon: CheckCircle },
  { status: "processing", label: "Processing", icon: Clock },
  { status: "shipped", label: "Shipped", icon: Truck },
  { status: "delivered", label: "Delivered", icon: CheckCircle },
];

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: "text-yellow-700", bg: "bg-yellow-100", label: "Pending" },
  confirmed: { color: "text-blue-700", bg: "bg-blue-100", label: "Confirmed" },
  processing: { color: "text-blue-700", bg: "bg-blue-100", label: "Processing" },
  shipped: { color: "text-purple-700", bg: "bg-purple-100", label: "Shipped" },
  delivered: { color: "text-green-700", bg: "bg-green-100", label: "Delivered" },
  cancelled: { color: "text-red-700", bg: "bg-red-100", label: "Cancelled" },
  refunded: { color: "text-gray-700", bg: "bg-gray-100", label: "Refunded" },
};

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const router = useRouter();
  const { id: orderId } = use(params);
  const { user, isAuthenticated } = useAuthStore();
  const { getOrderById, updateOrder } = useOrdersStore();
  const { getBuyerReviewForProduct } = useReviewsStore();
  const { getProductById } = useProductsStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isHydrated, isAuthenticated, router]);

  if (!isHydrated) {
    return (
      <SiteLayout>
        <div className="container py-8 flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-12 h-12 animate-spin text-gray-400" />
        </div>
      </SiteLayout>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const order = getOrderById(orderId);

  if (!order) {
    return (
      <SiteLayout>
        <div className="container py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Order Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The order you're looking for doesn't exist or you don't have access to it.
              </p>
              <Button asChild>
                <Link href="/buyer/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </SiteLayout>
    );
  }

  // Verify this order belongs to the current user
  if (order.buyerId !== user.id) {
    return (
      <SiteLayout>
        <div className="container py-8">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertTriangle className="w-16 h-16 text-red-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-6">
                You don't have permission to view this order.
              </p>
              <Button asChild>
                <Link href="/buyer/dashboard">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </SiteLayout>
    );
  }

  const getCurrentStep = () => {
    if (order.status === "cancelled" || order.status === "refunded") return -1;
    return orderSteps.findIndex(step => step.status === order.status);
  };

  const currentStep = getCurrentStep();
  const progress = currentStep >= 0 ? ((currentStep + 1) / orderSteps.length) * 100 : 0;

  const canCancel = ["pending", "confirmed"].includes(order.status);
  const canRequestRefund = order.status === "delivered" && order.paymentStatus === "paid";

  const handleCancelOrder = () => {
    updateOrder(order.id, { status: "cancelled" });
    toast.success("Order cancelled successfully");
    setShowCancelDialog(false);
  };

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(order.id);
    toast.success("Order ID copied to clipboard");
  };

  const config = statusConfig[order.status] || statusConfig.pending;

  return (
    <SiteLayout>
      <div className="container py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/buyer/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">Order Details</h1>
                <Badge className={`${config.bg} ${config.color}`}>{config.label}</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono">{order.id}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopyOrderId}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {canCancel && (
              <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Order
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cancel Order</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to cancel this order? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                      Keep Order
                    </Button>
                    <Button variant="destructive" onClick={handleCancelOrder}>
                      Yes, Cancel Order
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Order Progress */}
        {order.status !== "cancelled" && order.status !== "refunded" && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="mb-4">
                <Progress value={progress} className="h-2" />
              </div>
              <div className="flex justify-between">
                {orderSteps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isCompleted = index <= currentStep;
                  const isCurrent = index === currentStep;
                  return (
                    <div key={step.status} className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                        isCompleted ? "bg-green-100 text-green-600" :
                        isCurrent ? "bg-blue-100 text-blue-600" :
                        "bg-gray-100 text-gray-400"
                      }`}>
                        <StepIcon className="w-5 h-5" />
                      </div>
                      <span className={`text-xs text-center ${isCompleted || isCurrent ? "font-medium" : "text-muted-foreground"}`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cancelled/Refunded Status */}
        {(order.status === "cancelled" || order.status === "refunded") && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-800">
                    Order {order.status === "cancelled" ? "Cancelled" : "Refunded"}
                  </h3>
                  <p className="text-sm text-red-600">
                    {order.status === "cancelled"
                      ? "This order has been cancelled."
                      : "This order has been refunded."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Items */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Order Items
                </CardTitle>
                <CardDescription>{order.items.length} item(s)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {order.items.map((item, index) => {
                  const product = getProductById(item.productId);
                  const hasReviewed = getBuyerReviewForProduct(user.id, item.productId);
                  const canReview = order.status === "delivered" && !hasReviewed;

                  return (
                    <div key={index}>
                      <div className="flex gap-4">
                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {item.image ? (
                            <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <Link href={`/product/${item.productId}`} className="font-medium hover:underline">
                            {item.productName}
                          </Link>
                          <Link href={`/vendor/${item.vendorId}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:underline">
                            <Store className="w-3 h-3" />
                            {item.vendorName}
                          </Link>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-sm">Qty: {item.quantity}</span>
                            <span className="font-medium">GHS {(item.price * item.quantity).toLocaleString()}</span>
                          </div>
                          {canReview && (
                            <Button variant="outline" size="sm" className="mt-2" asChild>
                              <Link href={`/product/${item.productId}?review=true`}>
                                <Star className="w-4 h-4 mr-2" />
                                Write Review
                              </Link>
                            </Button>
                          )}
                          {hasReviewed && (
                            <Badge variant="outline" className="mt-2">
                              <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                              Reviewed
                            </Badge>
                          )}
                        </div>
                      </div>
                      {index < order.items.length - 1 && <Separator className="my-4" />}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Shipping Address
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">{order.shippingAddress.fullName}</p>
                  <p className="text-muted-foreground">{order.shippingAddress.address}</p>
                  <p className="text-muted-foreground">
                    {order.shippingAddress.city}, {order.shippingAddress.region}
                  </p>
                  {order.shippingAddress.digitalAddress && (
                    <p className="text-sm text-muted-foreground">
                      Digital Address: {order.shippingAddress.digitalAddress}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    {order.shippingAddress.phone}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tracking Info */}
            {order.trackingNumber && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Tracking Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tracking Number</p>
                      <p className="font-mono font-medium">{order.trackingNumber}</p>
                    </div>
                    <Button variant="outline" asChild>
                      <Link href={`/tracking?orderNumber=${order.id}`}>
                        Track Package
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>GHS {order.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{order.shippingFee === 0 ? "FREE" : `GHS ${order.shippingFee.toLocaleString()}`}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>GHS {order.tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>GHS {order.total.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Method</span>
                  <span className="capitalize">{order.paymentMethod.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={order.paymentStatus === "paid" ? "default" : "secondary"} className={order.paymentStatus === "paid" ? "bg-green-600" : ""}>
                    {order.paymentStatus}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Placed</span>
                  <span>{format(new Date(order.createdAt), "MMM d, yyyy h:mm a")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{format(new Date(order.updatedAt), "MMM d, yyyy h:mm a")}</span>
                </div>
              </CardContent>
            </Card>

            {/* Help */}
            <Card>
              <CardContent className="p-4">
                <div className="text-center space-y-3">
                  <MessageSquare className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-sm text-muted-foreground">Need help with this order?</p>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/help">Contact Support</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
