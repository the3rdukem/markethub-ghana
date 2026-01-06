"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SiteLayout } from "@/components/layout/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Package,
  Truck,
  MessageSquare,
  Download,
  Star,
  ShoppingCart,
  Home,
  Eye,
  Bell,
  Share2,
  Mail,
  Smartphone
} from "lucide-react";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const transactionId = searchParams.get('transaction');

  const orderDetails = {
    orderId: `ORD-${Date.now()}`,
    transactionId: transactionId || `TXN-${Date.now()}`,
    amount: 4550.00,
    items: [
      {
        name: "iPhone 15 Pro Max 256GB",
        vendor: "TechStore Pro",
        quantity: 1,
        price: 4200
      },
      {
        name: "Premium Phone Case",
        vendor: "TechStore Pro",
        quantity: 1,
        price: 89.99
      }
    ],
    estimatedDelivery: "January 30, 2025",
    shippingAddress: {
      name: "John Kwame Asante",
      address: "123 Liberation Road, Accra, Greater Accra",
      phone: "+233 24 123 4567"
    },
    paymentMethod: "MTN Mobile Money",
    trackingNumber: `TRK-${Date.now()}`
  };

  return (
    <SiteLayout>
      <div className="container py-8">
        <div className="max-w-3xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-green-600 mb-2">Order Confirmed!</h1>
            <p className="text-muted-foreground">
              Thank you for your purchase. Your order has been successfully placed and payment confirmed.
            </p>
          </div>

          {/* Order Summary */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
              <CardDescription>
                Order #{orderDetails.orderId} • Transaction #{orderDetails.transactionId}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {orderDetails.items.map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">by {item.vendor}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">GHS {item.price.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                </div>
              ))}

              <Separator />

              <div className="flex justify-between text-lg font-semibold">
                <span>Total Paid:</span>
                <span>GHS {orderDetails.amount.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Order Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Shipping Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">{orderDetails.shippingAddress.name}</p>
                  <p className="text-sm text-muted-foreground">{orderDetails.shippingAddress.address}</p>
                  <p className="text-sm text-muted-foreground">{orderDetails.shippingAddress.phone}</p>
                  <div className="pt-2">
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      <Truck className="w-3 h-3 mr-1" />
                      Estimated delivery: {orderDetails.estimatedDelivery}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Payment Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-medium">{orderDetails.paymentMethod}</p>
                  <p className="text-sm text-muted-foreground">Transaction ID: {orderDetails.transactionId}</p>
                  <p className="text-sm text-muted-foreground">Amount: GHS {orderDetails.amount.toFixed(2)}</p>
                  <div className="pt-2">
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Payment Confirmed
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* What's Next */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>What's Next?</CardTitle>
              <CardDescription>Here's what you can expect</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Order Processing</h4>
                    <p className="text-sm text-muted-foreground">
                      Your vendor will prepare your items for shipment. You'll receive updates via SMS and email.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-orange-600 text-sm font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Shipment & Tracking</h4>
                    <p className="text-sm text-muted-foreground">
                      Once shipped, you'll get a tracking number to monitor your package's journey.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 text-sm font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">Delivery & Review</h4>
                    <p className="text-sm text-muted-foreground">
                      Receive your package and share your experience to help other buyers.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Button className="flex items-center justify-center gap-2" asChild>
              <Link href={`/tracking?order=${orderDetails.orderId}`}>
                <Eye className="w-4 h-4" />
                Track Order
              </Link>
            </Button>

            <Button variant="outline" className="flex items-center justify-center gap-2" asChild>
              <Link href="/buyer/dashboard">
                <Package className="w-4 h-4" />
                View Orders
              </Link>
            </Button>

            <Button variant="outline" className="flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Download Receipt
            </Button>

            <Button variant="outline" className="flex items-center justify-center gap-2">
              <Share2 className="w-4 h-4" />
              Share Order
            </Button>
          </div>

          {/* Notifications Signup */}
          <Card className="border-blue-200 bg-blue-50 mb-6">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-800">Stay Updated</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Get real-time notifications about your order status via SMS and email.
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-blue-700 border-blue-300">
                      <Smartphone className="w-3 h-3 mr-1" />
                      SMS Enabled
                    </Badge>
                    <Badge variant="outline" className="text-blue-700 border-blue-300">
                      <Mail className="w-3 h-3 mr-1" />
                      Email Enabled
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Continue Shopping */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/search">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Continue Shopping
              </Link>
            </Button>

            <Button variant="outline" size="lg" asChild>
              <Link href="/">
                <Home className="w-5 h-5 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>

          {/* Help Section */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-auto p-4" asChild>
                  <Link href="/messages">
                    <div className="text-center">
                      <MessageSquare className="w-6 h-6 mx-auto mb-2" />
                      <div className="font-medium">Contact Vendor</div>
                      <div className="text-xs text-muted-foreground">
                        Chat with your vendor
                      </div>
                    </div>
                  </Link>
                </Button>

                <Button variant="outline" className="h-auto p-4" asChild>
                  <Link href="/help">
                    <div className="text-center">
                      <MessageSquare className="w-6 h-6 mx-auto mb-2" />
                      <div className="font-medium">Customer Support</div>
                      <div className="text-xs text-muted-foreground">
                        Get help from our team
                      </div>
                    </div>
                  </Link>
                </Button>

                <Button variant="outline" className="h-auto p-4" asChild>
                  <Link href="/help/faq">
                    <div className="text-center">
                      <Star className="w-6 h-6 mx-auto mb-2" />
                      <div className="font-medium">Help Center</div>
                      <div className="text-xs text-muted-foreground">
                        Find answers to common questions
                      </div>
                    </div>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SiteLayout>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="container py-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
}
