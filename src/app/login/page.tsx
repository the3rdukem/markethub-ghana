"use client";

import { useEffect, useState } from "react";

export default function LoginRedirectPage() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      // CRITICAL: Use window.location.href for HARD redirect to prevent chunk load errors
      window.location.href = "/auth/login";
    }
  }, [isHydrated]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600 mx-auto mb-4"></div>
        <p className="text-lg text-gray-600">Redirecting to login...</p>
      </div>
    </div>
  );
}
