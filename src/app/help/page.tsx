import Link from "next/link";
import { SiteLayout } from "@/components/layout/site-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  MessageSquare,
  Phone,
  Mail,
  Book,
  Shield,
  CreditCard,
  Truck,
  Package,
  Star,
  User,
  Store,
  HelpCircle,
  ChevronRight
} from "lucide-react";

const faqCategories = [
  {
    title: "Getting Started",
    icon: User,
    questions: [
      "How do I create an account?",
      "How do I verify my identity?",
      "What payment methods do you accept?",
      "How do I place my first order?"
    ]
  },
  {
    title: "Orders & Payments",
    icon: CreditCard,
    questions: [
      "How do I track my order?",
      "Can I cancel or modify my order?",
      "What is Mobile Money and how does it work?",
      "How do refunds work?"
    ]
  },
  {
    title: "Shipping & Delivery",
    icon: Truck,
    questions: [
      "What are the shipping options?",
      "How long does delivery take?",
      "Can I change my delivery address?",
      "What if my package is damaged?"
    ]
  },
  {
    title: "Vendor & Marketplace",
    icon: Store,
    questions: [
      "How do I become a vendor?",
      "What is the verification process?",
      "How do I report a vendor?",
      "What is buyer protection?"
    ]
  },
  {
    title: "Security & Safety",
    icon: Shield,
    questions: [
      "How is my data protected?",
      "What is escrow payment?",
      "How do I report suspicious activity?",
      "What are verification badges?"
    ]
  },
  {
    title: "Returns & Reviews",
    icon: Star,
    questions: [
      "How do I return an item?",
      "How do I leave a review?",
      "What is the return policy?",
      "How do I dispute a transaction?"
    ]
  }
];

const popularArticles = [
  {
    title: "How to Use Mobile Money for Payments",
    category: "Payments",
    readTime: "3 min read",
    href: "/help/mobile-money-guide"
  },
  {
    title: "Understanding Vendor Verification",
    category: "Safety",
    readTime: "5 min read",
    href: "/help/vendor-verification"
  },
  {
    title: "Tracking Your Orders",
    category: "Orders",
    readTime: "2 min read",
    href: "/help/order-tracking"
  },
  {
    title: "Buyer Protection Program",
    category: "Safety",
    readTime: "4 min read",
    href: "/help/buyer-protection"
  }
];

export default function HelpPage() {
  return (
    <SiteLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Help Center</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Get answers to your questions and find helpful resources
          </p>

          {/* Search */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search for help articles..."
              className="pl-12 py-6 text-lg"
            />
          </div>
        </div>

        {/* Quick Support Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <MessageSquare className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Live Chat</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Get instant help from our support team
              </p>
              <Button>Start Chat</Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <Mail className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Email Support</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Send us a detailed message
              </p>
              <Button variant="outline">Email Us</Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6 text-center">
              <Phone className="w-12 h-12 text-orange-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Phone Support</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Call us during business hours
              </p>
              <Button variant="outline">+233 30 123 4567</Button>
            </CardContent>
          </Card>
        </div>

        {/* Popular Articles */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Popular Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {popularArticles.map((article, index) => (
              <Link key={index} href={article.href}>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="text-xs">
                        {article.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {article.readTime}
                      </span>
                    </div>
                    <h3 className="font-semibold mb-2">{article.title}</h3>
                    <div className="flex items-center text-sm text-blue-600">
                      <span>Read article</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* FAQ Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Browse by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {faqCategories.map((category, index) => {
              const Icon = category.icon;
              return (
                <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Icon className="w-6 h-6 text-blue-600" />
                      {category.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {category.questions.map((question, qIndex) => (
                        <li key={qIndex} className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                          {question}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Contact Information */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle>Still Need Help?</CardTitle>
            <CardDescription>
              Our support team is here to help you 24/7
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <MessageSquare className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-semibold">Live Chat</h4>
                <p className="text-sm text-muted-foreground">Available 24/7</p>
              </div>
              <div className="text-center">
                <Mail className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-semibold">Email</h4>
                <p className="text-sm text-muted-foreground">support@markethub.gh</p>
              </div>
              <div className="text-center">
                <Phone className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-semibold">Phone</h4>
                <p className="text-sm text-muted-foreground">+233 30 123 4567</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
}
