import Link from "next/link";
import { SiteLayout } from "@/components/layout/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  CreditCard,
  Package,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Lock,
  Eye,
  RefreshCw,
  Clock,
  Star,
  Phone,
  Mail,
  DollarSign,
  ArrowRight
} from "lucide-react";

const protectionFeatures = [
  {
    title: "Escrow Payment System",
    description: "Your money is held securely until you confirm receipt of your order",
    icon: CreditCard,
    benefits: [
      "Funds held in secure escrow account",
      "Payment released only after delivery confirmation",
      "Automatic refund if vendor doesn't deliver",
      "Protection against fraud and scams"
    ]
  },
  {
    title: "Verified Vendor Network",
    description: "All vendors undergo rigorous identity and business verification",
    icon: Shield,
    benefits: [
      "Government ID verification required",
      "Facial recognition technology",
      "Business document validation",
      "Continuous monitoring and reviews"
    ]
  },
  {
    title: "Quality Guarantee",
    description: "Get what you ordered or get your money back",
    icon: Package,
    benefits: [
      "Product quality protection",
      "Description accuracy guarantee",
      "Damage and defect coverage",
      "Free returns for qualified issues"
    ]
  },
  {
    title: "Dispute Resolution",
    description: "Fair and fast resolution when things go wrong",
    icon: MessageSquare,
    benefits: [
      "24/7 dispute reporting",
      "Dedicated resolution team",
      "Evidence-based decisions",
      "Appeal process available"
    ]
  }
];

const protectionSteps = [
  {
    step: 1,
    title: "Shop with Confidence",
    description: "Browse products from verified vendors with protection badges",
    icon: Shield
  },
  {
    step: 2,
    title: "Secure Payment",
    description: "Your payment is held safely in escrow until delivery",
    icon: Lock
  },
  {
    step: 3,
    title: "Track Your Order",
    description: "Monitor your package with real-time tracking updates",
    icon: Eye
  },
  {
    step: 4,
    title: "Confirm Delivery",
    description: "Inspect your order and confirm receipt to release payment",
    icon: CheckCircle
  }
];

const commonIssues = [
  {
    issue: "Item Not Received",
    coverage: "Full refund guaranteed",
    timeline: "Report within 30 days of expected delivery",
    action: "Automatic investigation and refund processing"
  },
  {
    issue: "Item Not as Described",
    coverage: "Return or partial refund",
    timeline: "Report within 7 days of delivery",
    action: "Evidence review and resolution within 48 hours"
  },
  {
    issue: "Damaged Item",
    coverage: "Replacement or full refund",
    timeline: "Report within 3 days of delivery",
    action: "Photo evidence required for fast processing"
  },
  {
    issue: "Wrong Item Sent",
    coverage: "Free return and correct item",
    timeline: "Report within 7 days of delivery",
    action: "Vendor responsible for all return costs"
  }
];

export default function BuyerProtectionPage() {
  return (
    <SiteLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Buyer Protection Program</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Shop with complete confidence knowing you're protected at every step
          </p>
          <div className="flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/search">
                Start Shopping Safely
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/help">
                Learn More
              </Link>
            </Button>
          </div>
        </div>

        {/* Key Protection Features */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">
            How We Protect You
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {protectionFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-2 border-green-200">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <Icon className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                        <CardDescription>{feature.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {feature.benefits.map((benefit, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* How It Works */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">
            Protection Process
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {protectionSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={index} className="text-center">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                      <Icon className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                      {step.step}
                    </div>
                    {index < protectionSteps.length - 1 && (
                      <ArrowRight className="hidden md:block absolute top-6 -right-8 w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coverage Details */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">
            What's Covered
          </h2>
          <div className="space-y-4">
            {commonIssues.map((item, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <div>
                      <h4 className="font-semibold">{item.issue}</h4>
                    </div>
                    <div>
                      <Badge variant="default" className="bg-green-600">
                        {item.coverage}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 inline mr-1" />
                      {item.timeline}
                    </div>
                    <div className="text-sm">
                      {item.action}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Important Notes */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">
            Important Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Free Protection:</strong> Buyer protection is included with every purchase at no additional cost. It's automatically applied to all orders.
              </AlertDescription>
            </Alert>

            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>Report Quickly:</strong> To ensure the fastest resolution, report any issues as soon as possible after receiving your order.
              </AlertDescription>
            </Alert>

            <Alert>
              <Eye className="h-4 w-4" />
              <AlertDescription>
                <strong>Evidence Helps:</strong> Photos, videos, and detailed descriptions of issues help our team resolve disputes faster.
              </AlertDescription>
            </Alert>

            <Alert>
              <RefreshCw className="h-4 w-4" />
              <AlertDescription>
                <strong>Fair Process:</strong> Our resolution team reviews all evidence objectively to ensure fair outcomes for both buyers and vendors.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        {/* Vendor Standards */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0 mb-16">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-4">Vendor Standards</h3>
              <p className="text-muted-foreground">
                All vendors must meet our strict standards to maintain their verified status
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <Star className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
                <h4 className="font-semibold mb-2">Quality Standards</h4>
                <p className="text-sm text-muted-foreground">
                  Minimum 4.0 star rating and quality product descriptions required
                </p>
              </div>

              <div className="text-center">
                <Clock className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                <h4 className="font-semibold mb-2">Response Time</h4>
                <p className="text-sm text-muted-foreground">
                  Vendors must respond to customer inquiries within 24 hours
                </p>
              </div>

              <div className="text-center">
                <Package className="w-8 h-8 text-green-500 mx-auto mb-3" />
                <h4 className="font-semibold mb-2">Shipping Standards</h4>
                <p className="text-sm text-muted-foreground">
                  Orders must be shipped within stated timeframes with tracking
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How to Report Issues */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center mb-8">
            How to Report Issues
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  In-App Reporting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Report issues directly from your order page for the fastest response
                </p>
                <Button className="w-full" asChild>
                  <Link href="/buyer/dashboard">
                    Access My Orders
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5 text-green-600" />
                  Phone Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Call our support team for urgent issues requiring immediate attention
                </p>
                <Button variant="outline" className="w-full">
                  +233 30 123 4567
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-orange-600" />
                  Email Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Send detailed information about complex issues via email
                </p>
                <Button variant="outline" className="w-full">
                  support@markethub.gh
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Call to Action */}
        <Card className="text-center border-2 border-dashed border-green-300 bg-green-50">
          <CardContent className="p-8">
            <Shield className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-4">Ready to Shop Safely?</h3>
            <p className="text-muted-foreground mb-6">
              With our comprehensive buyer protection, you can shop with complete confidence
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/search">
                  <Package className="w-5 h-5 mr-2" />
                  Start Shopping
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/help">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Contact Support
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
}
