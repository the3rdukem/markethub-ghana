"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSiteSettingsStore, PromotionalBanner } from "@/lib/site-settings-store";

interface PromotionalBannerDisplayProps {
  position?: PromotionalBanner['position'];
  className?: string;
}

export function PromotionalBannerDisplay({
  position = 'top',
  className = "",
}: PromotionalBannerDisplayProps) {
  const { getActivePromotionalBanners } = useSiteSettingsStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const allBanners = isHydrated ? getActivePromotionalBanners(position) : [];
  const banners = allBanners.filter(b => !dismissed.has(b.id));

  // Auto-rotate banners
  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [banners.length]);

  if (!isHydrated || banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];
  if (!currentBanner) return null;

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set([...prev, id]));
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  // Different layouts based on position
  if (position === 'top') {
    return (
      <div
        className={`relative bg-gradient-to-r from-green-600 to-green-700 text-white ${className}`}
      >
        <div className="container py-3">
          <div className="flex items-center justify-center gap-4">
            {banners.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
                onClick={handlePrev}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}

            <div className="flex items-center gap-3 text-center">
              {currentBanner.imageUrl && (
                <img
                  src={currentBanner.imageUrl}
                  alt={currentBanner.title}
                  className="h-8 w-8 object-cover rounded"
                />
              )}
              <div>
                <span className="font-semibold">{currentBanner.title}</span>
                {currentBanner.description && (
                  <span className="ml-2 opacity-90">{currentBanner.description}</span>
                )}
              </div>
              {currentBanner.linkUrl && (
                <Link
                  href={currentBanner.linkUrl}
                  className="inline-flex items-center gap-1 underline hover:no-underline ml-2"
                >
                  Shop Now
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            {banners.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
                onClick={handleNext}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-8 w-8 p-0"
            onClick={() => handleDismiss(currentBanner.id)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Dots indicator */}
        {banners.length > 1 && (
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  idx === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Sidebar banner
  if (position === 'sidebar') {
    return (
      <div className={`space-y-4 ${className}`}>
        {banners.map((banner) => (
          <div
            key={banner.id}
            className="relative rounded-lg overflow-hidden bg-gradient-to-br from-green-50 to-green-100 border"
          >
            {banner.imageUrl && (
              <img
                src={banner.imageUrl}
                alt={banner.title}
                className="w-full h-32 object-cover"
              />
            )}
            <div className="p-4">
              <h4 className="font-semibold text-gray-900">{banner.title}</h4>
              {banner.description && (
                <p className="text-sm text-gray-600 mt-1">{banner.description}</p>
              )}
              {banner.linkUrl && (
                <Link href={banner.linkUrl}>
                  <Button size="sm" className="mt-3 w-full">
                    Shop Now
                  </Button>
                </Link>
              )}
            </div>
            <button
              onClick={() => handleDismiss(banner.id)}
              className="absolute top-2 right-2 p-1 rounded-full bg-white/80 hover:bg-white"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    );
  }

  // Footer banner
  if (position === 'footer') {
    return (
      <div
        className={`bg-gradient-to-r from-gray-800 to-gray-900 text-white py-8 ${className}`}
      >
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {currentBanner.imageUrl && (
              <img
                src={currentBanner.imageUrl}
                alt={currentBanner.title}
                className="h-24 object-contain"
              />
            )}
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold">{currentBanner.title}</h3>
              {currentBanner.description && (
                <p className="text-gray-300 mt-2">{currentBanner.description}</p>
              )}
            </div>
            {currentBanner.linkUrl && (
              <Link href={currentBanner.linkUrl}>
                <Button size="lg" className="bg-green-600 hover:bg-green-700">
                  Shop Now
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Popup banner
  if (position === 'popup') {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
          {currentBanner.imageUrl && (
            <img
              src={currentBanner.imageUrl}
              alt={currentBanner.title}
              className="w-full h-48 object-cover"
            />
          )}
          <div className="p-6 text-center">
            <h3 className="text-2xl font-bold text-gray-900">{currentBanner.title}</h3>
            {currentBanner.description && (
              <p className="text-gray-600 mt-2">{currentBanner.description}</p>
            )}
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleDismiss(currentBanner.id)}
              >
                Maybe Later
              </Button>
              {currentBanner.linkUrl && (
                <Link href={currentBanner.linkUrl} className="flex-1">
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    Shop Now
                  </Button>
                </Link>
              )}
            </div>
          </div>
          <button
            onClick={() => handleDismiss(currentBanner.id)}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/30 text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// Hero banner carousel for homepage
export function HeroBannerCarousel({ className = "" }: { className?: string }) {
  const { getActiveHeroBanners } = useSiteSettingsStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const banners = isHydrated ? getActiveHeroBanners() : [];

  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [banners.length]);

  if (!isHydrated || banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      <div
        className="min-h-[300px] flex items-center justify-center p-8"
        style={{
          backgroundColor: currentBanner.backgroundColor || '#16a34a',
          color: currentBanner.textColor || '#ffffff',
          backgroundImage: currentBanner.imageUrl ? `url(${currentBanner.imageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="text-center max-w-2xl">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">{currentBanner.title}</h2>
          {currentBanner.subtitle && (
            <p className="text-lg md:text-xl opacity-90 mb-6">{currentBanner.subtitle}</p>
          )}
          {currentBanner.ctaText && currentBanner.ctaLink && (
            <Link href={currentBanner.ctaLink}>
              <Button size="lg" variant="secondary">
                {currentBanner.ctaText}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {banners.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white h-10 w-10 p-0 rounded-full"
            onClick={() => setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length)}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/40 text-white h-10 w-10 p-0 rounded-full"
            onClick={() => setCurrentIndex((prev) => (prev + 1) % banners.length)}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  idx === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
