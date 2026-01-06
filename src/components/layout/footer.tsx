import Link from "next/link";
import { Shield, CreditCard, Truck, HeadphonesIcon } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-gray-50 border-t">
      <div className="container py-12">
        {/* Trust Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="flex items-center space-x-3">
            <Shield className="w-8 h-8 text-green-600" />
            <div>
              <h4 className="font-semibold">Verified Vendors</h4>
              <p className="text-sm text-muted-foreground">ID + Facial verification required</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <CreditCard className="w-8 h-8 text-blue-600" />
            <div>
              <h4 className="font-semibold">Mobile Money</h4>
              <p className="text-sm text-muted-foreground">M-Pesa, MTN MoMo & more</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Truck className="w-8 h-8 text-orange-600" />
            <div>
              <h4 className="font-semibold">Secure Escrow</h4>
              <p className="text-sm text-muted-foreground">Funds protected until delivery</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <HeadphonesIcon className="w-8 h-8 text-purple-600" />
            <div>
              <h4 className="font-semibold">24/7 Support</h4>
              <p className="text-sm text-muted-foreground">Help when you need it</p>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h3 className="font-semibold mb-4">For Buyers</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/how-it-works" className="text-muted-foreground hover:text-foreground">How It Works</Link></li>
              <li><Link href="/buyer-protection" className="text-muted-foreground hover:text-foreground">Buyer Protection</Link></li>
              <li><Link href="/mobile-money" className="text-muted-foreground hover:text-foreground">Mobile Money Guide</Link></li>
              <li><Link href="/help" className="text-muted-foreground hover:text-foreground">Help Center</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">For Vendors</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/vendor/register" className="text-muted-foreground hover:text-foreground">Start Selling</Link></li>
              <li><Link href="/verification-guide" className="text-muted-foreground hover:text-foreground">Verification Guide</Link></li>
              <li><Link href="/vendor/fees" className="text-muted-foreground hover:text-foreground">Fees & Commissions</Link></li>
              <li><Link href="/vendor/resources" className="text-muted-foreground hover:text-foreground">Seller Resources</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Security</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/security" className="text-muted-foreground hover:text-foreground">Security Center</Link></li>
              <li><Link href="/verification" className="text-muted-foreground hover:text-foreground">Vendor Verification</Link></li>
              <li><Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms of Service</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-muted-foreground hover:text-foreground">About Us</Link></li>
              <li><Link href="/careers" className="text-muted-foreground hover:text-foreground">Careers</Link></li>
              <li><Link href="/press" className="text-muted-foreground hover:text-foreground">Press</Link></li>
              <li><Link href="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link></li>
              <li><Link href="/admin/login" className="text-purple-600 hover:text-purple-700 font-medium">Admin Portal</Link></li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 MarketHub. All rights reserved. Built with security and trust in mind.</p>
        </div>
      </div>
    </footer>
  );
}
