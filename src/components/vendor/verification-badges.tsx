"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Phone,
  Mail,
  IdCard,
  User,
  Building,
  MapPin,
  ShieldCheck,
  Crown,
  Check,
  X,
  Clock,
  AlertCircle
} from "lucide-react";
import { useVerificationStore, VendorVerification, VerificationStatus, getVerificationBadgeInfo } from "@/lib/verification-store";

interface VerificationBadgesProps {
  vendorId: string;
  showAll?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const statusColors: Record<VerificationStatus, string> = {
  not_started: "bg-gray-100 text-gray-600",
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
};

const statusIcons: Record<VerificationStatus, React.ReactNode> = {
  not_started: <AlertCircle className="w-3 h-3" />,
  pending: <Clock className="w-3 h-3" />,
  approved: <Check className="w-3 h-3" />,
  rejected: <X className="w-3 h-3" />,
  expired: <AlertCircle className="w-3 h-3" />,
};

const verificationIcons: Record<string, React.ReactNode> = {
  phoneVerification: <Phone className="w-4 h-4" />,
  emailVerification: <Mail className="w-4 h-4" />,
  idVerification: <IdCard className="w-4 h-4" />,
  facialVerification: <User className="w-4 h-4" />,
  businessDocuments: <Building className="w-4 h-4" />,
  addressVerification: <MapPin className="w-4 h-4" />,
};

const verificationLabels: Record<string, string> = {
  phoneVerification: "Phone",
  emailVerification: "Email",
  idVerification: "ID",
  facialVerification: "Identity",
  businessDocuments: "Business",
  addressVerification: "Address",
};

export function VerificationBadges({
  vendorId,
  showAll = false,
  size = "md",
  className = "",
}: VerificationBadgesProps) {
  const { getVendorVerification } = useVerificationStore();
  const verification = getVendorVerification(vendorId);

  if (!verification) {
    return null;
  }

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-3 py-1.5",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  // Get approved verifications to show as badges
  const approvedVerifications = [
    { key: 'phoneVerification', item: verification.phoneVerification },
    { key: 'emailVerification', item: verification.emailVerification },
    { key: 'idVerification', item: verification.idVerification },
    { key: 'facialVerification', item: verification.facialVerification },
    { key: 'businessDocuments', item: verification.businessDocuments },
    { key: 'addressVerification', item: verification.addressVerification },
  ].filter(v => v.item.status === 'approved');

  if (!showAll && approvedVerifications.length === 0) {
    return null;
  }

  // If not showing all, just show approved badges
  if (!showAll) {
    return (
      <TooltipProvider>
        <div className={`flex flex-wrap gap-1.5 ${className}`}>
          {approvedVerifications.map(({ key }) => (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={`${sizeClasses[size]} bg-green-50 text-green-700 border-green-200`}
                >
                  <span className={iconSizes[size]}>
                    {verificationIcons[key]}
                  </span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{verificationLabels[key]} Verified</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {verification.overallStatus === 'verified' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  className={`${sizeClasses[size]} bg-emerald-500 text-white`}
                >
                  <ShieldCheck className={iconSizes[size]} />
                  <span className="ml-1">Verified</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Trusted Vendor - All verifications complete</p>
              </TooltipContent>
            </Tooltip>
          )}
          {verification.trustLevel === 'premium' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  className={`${sizeClasses[size]} bg-gradient-to-r from-amber-500 to-orange-500 text-white`}
                >
                  <Crown className={iconSizes[size]} />
                  <span className="ml-1">Premium</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Premium Vendor - Top tier trust level</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    );
  }

  // Show all verifications with status
  return (
    <div className={`space-y-2 ${className}`}>
      {[
        { key: 'phoneVerification', item: verification.phoneVerification, label: 'Phone Verified' },
        { key: 'emailVerification', item: verification.emailVerification, label: 'Email Verified' },
        { key: 'idVerification', item: verification.idVerification, label: 'ID Document Verified' },
        { key: 'facialVerification', item: verification.facialVerification, label: 'Facial Recognition' },
        { key: 'businessDocuments', item: verification.businessDocuments, label: 'Business Documents' },
        { key: 'addressVerification', item: verification.addressVerification, label: 'Address Verified' },
      ].map(({ key, item, label }) => (
        <div key={key} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">{verificationIcons[key]}</span>
            <span className="text-sm">{label}</span>
          </div>
          <Badge
            variant="outline"
            className={statusColors[item.status]}
          >
            {statusIcons[item.status]}
            <span className="ml-1 capitalize">{item.status.replace('_', ' ')}</span>
          </Badge>
        </div>
      ))}

      <div className="pt-2 border-t mt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Verification Score</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${verification.verificationScore}%` }}
              />
            </div>
            <span className="text-sm font-medium">{verification.verificationScore}%</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Trust Level</span>
        <Badge
          className={
            verification.trustLevel === 'premium' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
            verification.trustLevel === 'trusted' ? 'bg-emerald-500' :
            verification.trustLevel === 'basic' ? 'bg-blue-500' :
            'bg-gray-500'
          }
        >
          {verification.trustLevel}
        </Badge>
      </div>
    </div>
  );
}

// Compact badge for product cards
export function VerifiedVendorBadge({
  vendorId,
  className = "",
}: {
  vendorId: string;
  className?: string;
}) {
  const { getVendorVerification } = useVerificationStore();
  const verification = getVendorVerification(vendorId);

  if (!verification || verification.overallStatus !== 'verified') {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`bg-green-500 text-white ${className}`}>
            <ShieldCheck className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>This vendor has completed all verification steps</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
