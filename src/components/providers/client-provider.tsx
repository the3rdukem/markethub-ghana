"use client";

import React, { useEffect, useState, createContext, useContext } from "react";
import { ErrorBoundary } from "@/components/error-boundary";

/**
 * Hydration Context
 *
 * Provides a centralized way to check if the app has hydrated.
 * All components that depend on client-side data (localStorage, auth, etc.)
 * should use this to prevent hydration mismatches.
 */
interface HydrationContextType {
  isHydrated: boolean;
}

const HydrationContext = createContext<HydrationContextType>({ isHydrated: false });

export function useHydration() {
  return useContext(HydrationContext);
}

/**
 * ClientProvider
 *
 * This component:
 * 1. Wraps the app with an Error Boundary for graceful error handling
 * 2. Provides hydration state to all child components
 * 3. Ensures safe SSR -> client transition
 */
export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Mark as hydrated after the first render on client
    setIsHydrated(true);
    console.log("[ClientProvider] App hydrated successfully");
  }, []);

  return (
    <ErrorBoundary>
      <HydrationContext.Provider value={{ isHydrated }}>
        {children}
      </HydrationContext.Provider>
    </ErrorBoundary>
  );
}

/**
 * HydrationBoundary
 *
 * A component that shows a loading state until hydration is complete.
 * Use this for components that absolutely cannot render until client-side.
 */
interface HydrationBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function HydrationBoundary({ children, fallback }: HydrationBoundaryProps) {
  const { isHydrated } = useHydration();

  if (!isHydrated) {
    return fallback || null;
  }

  return <>{children}</>;
}

/**
 * Safe Store Hook
 *
 * A higher-order function that creates a safe version of Zustand hooks
 * that returns default values until hydration is complete.
 */
export function useSafeStore<T>(
  storeHook: () => T,
  defaultValue: T
): T {
  const { isHydrated } = useHydration();
  const storeValue = storeHook();

  if (!isHydrated) {
    return defaultValue;
  }

  return storeValue;
}
