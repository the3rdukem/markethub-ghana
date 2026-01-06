"use client";

import { SiteLayout } from "@/components/layout/site-layout";
import { DisputeCenter } from "@/components/disputes/dispute-center";

export default function DisputesPage() {
  const userType = "buyer"; // This would come from authentication context

  return (
    <SiteLayout>
      <div className="container py-8">
        <DisputeCenter userType={userType} />
      </div>
    </SiteLayout>
  );
}
