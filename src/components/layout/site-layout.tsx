"use client";

import { MainNav } from "@/components/layout/main-nav";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "sonner";

interface SiteLayoutProps {
  children: React.ReactNode;
}

export function SiteLayout({ children }: SiteLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <Toaster
        position="top-right"
        richColors
        expand
        visibleToasts={5}
        closeButton
      />
    </div>
  );
}
