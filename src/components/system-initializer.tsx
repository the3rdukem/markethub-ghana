"use client";

import { useEffect, useState } from "react";
import { useSystemConfigStore } from "@/lib/system-config-store";
import { useSiteSettingsStore } from "@/lib/site-settings-store";
import { useCategoriesStore } from "@/lib/categories-store";
import { useApprovalWorkflowsStore } from "@/lib/approval-workflows-store";

/**
 * System Initializer Component
 *
 * This component runs on app startup and ensures:
 * 1. System config store is initialized (Master Admin)
 * 2. Site settings are initialized (CMS)
 * 3. Categories are initialized
 * 4. Approval workflows are initialized
 *
 * All settings persist independently and are MASTER_ADMIN controlled.
 *
 * IMPORTANT: This component is hydration-safe and only runs on client-side.
 */
export function SystemInitializer() {
  const [isMounted, setIsMounted] = useState(false);

  // Get store values only after component mounts
  const systemInitialized = useSystemConfigStore((state) => state.isInitialized);
  const initializeSystem = useSystemConfigStore((state) => state.initializeSystem);

  const siteInitialized = useSiteSettingsStore((state) => state.isInitialized);
  const initializeSiteSettings = useSiteSettingsStore((state) => state.initializeSiteSettings);

  const categoriesInitialized = useCategoriesStore((state) => state.isInitialized);
  const initializeCategories = useCategoriesStore((state) => state.initializeCategories);

  const workflowsInitialized = useApprovalWorkflowsStore((state) => state.isInitialized);
  const initializeWorkflows = useApprovalWorkflowsStore((state) => state.initializeWorkflows);

  // Mark as mounted on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initialize stores only after mount
  useEffect(() => {
    // Only run on client side after mount
    if (!isMounted) return;

    // Use a small delay to ensure stores are rehydrated from localStorage
    const timer = setTimeout(() => {
      try {
        if (!systemInitialized) {
          initializeSystem();
          console.log("[System] Master Admin system initialized");
        }

        if (!siteInitialized) {
          initializeSiteSettings();
          console.log("[System] Site settings initialized");
        }

        if (!categoriesInitialized) {
          initializeCategories();
          console.log("[System] Categories initialized");
        }

        if (!workflowsInitialized) {
          initializeWorkflows();
          console.log("[System] Approval workflows initialized");
        }
      } catch (error) {
        console.error("[System] Initialization error:", error);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [
    isMounted,
    systemInitialized,
    siteInitialized,
    categoriesInitialized,
    workflowsInitialized,
    initializeSystem,
    initializeSiteSettings,
    initializeCategories,
    initializeWorkflows,
  ]);

  // This component renders nothing
  return null;
}
