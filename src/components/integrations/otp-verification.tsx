"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Phone, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useArkeselOTP } from "@/lib/integrations-store";
import {
  sendOTP,
  verifyOTP,
  resendOTP,
  getOTPRemainingTime,
  isOTPEnabled,
  OTPPurpose,
} from "@/lib/services/arkesel-otp";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OTPVerificationProps {
  phone: string;
  purpose: OTPPurpose;
  userId?: string;
  onVerified?: () => void;
  onCancel?: () => void;
  title?: string;
  description?: string;
  className?: string;
}

type Step = "send" | "verify" | "success";

export function OTPVerification({
  phone,
  purpose,
  userId,
  onVerified,
  onCancel,
  title = "Phone Verification",
  description = "We'll send a verification code to your phone",
  className,
}: OTPVerificationProps) {
  const [step, setStep] = useState<Step>("send");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { isEnabled, isDemoMode } = useArkeselOTP();

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOTP = async () => {
    if (!isOTPEnabled()) {
      setError("OTP service is not available. Please contact support.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await sendOTP({ phone, purpose, userId });

      if (result.success) {
        setStep("verify");
        setCountdown(result.expiresIn || 300);

        // In demo mode, OTP is logged to console
        if (result.isDemoMode) {
          setDemoOtp("Check browser console for OTP");
          toast.info("Demo Mode: Check browser console for OTP");
        } else {
          toast.success("Verification code sent!");
        }
      } else {
        setError(result.message);
        if (result.integrationDisabled) {
          setStep("send"); // Keep on send step
        }
      }
    } catch (err) {
      setError("Failed to send verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpValue = otp.join("");

    if (otpValue.length !== 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await verifyOTP({ phone, otp: otpValue, purpose });

      if (result.success && result.verified) {
        setStep("success");
        toast.success("Phone number verified!");
        setTimeout(() => {
          onVerified?.();
        }, 1500);
      } else {
        setError(result.message);
        // Clear OTP input on error
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError("Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;

    setIsLoading(true);
    setError(null);
    setOtp(["", "", "", "", "", ""]);

    try {
      const result = await resendOTP({ phone, purpose, userId });

      if (result.success) {
        setCountdown(result.expiresIn || 300);

        if (result.isDemoMode) {
          setDemoOtp("Check browser console for OTP");
          toast.info("Demo Mode: Check browser console for OTP");
        } else {
          toast.success("New code sent!");
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("Failed to resend code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError(null);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (value && index === 5 && newOtp.every((d) => d !== "")) {
      setTimeout(() => handleVerifyOTP(), 100);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);

    if (pastedData.length === 6) {
      const newOtp = pastedData.split("");
      setOtp(newOtp);
      inputRefs.current[5]?.focus();
      setTimeout(() => handleVerifyOTP(), 100);
    }
  };

  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isEnabled) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Phone verification is currently unavailable.</p>
            <p className="text-sm mt-2">Please contact support for assistance.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          {step === "success" ? (
            <CheckCircle className="w-6 h-6 text-green-500" />
          ) : (
            <Phone className="w-6 h-6" />
          )}
          {step === "success" ? "Verified!" : title}
        </CardTitle>
        <CardDescription>
          {step === "success"
            ? "Your phone number has been verified successfully"
            : step === "verify"
            ? `Enter the 6-digit code sent to ${phone}`
            : description}
        </CardDescription>
        {isDemoMode && step !== "success" && (
          <Badge variant="secondary" className="mx-auto mt-2">
            Demo Mode
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {step === "send" && (
          <>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{phone}</span>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              className="w-full"
              onClick={handleSendOTP}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Send Verification Code
            </Button>

            {onCancel && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}
          </>
        )}

        {step === "verify" && (
          <>
            {/* Demo OTP display */}
            {isDemoMode && demoOtp && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-700">
                  <strong>Demo Mode:</strong> Use code <code className="px-2 py-0.5 bg-blue-100 rounded font-mono">{demoOtp}</code>
                </AlertDescription>
              </Alert>
            )}

            {/* OTP Input */}
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={cn(
                    "w-12 h-14 text-center text-2xl font-mono",
                    error && "border-red-500"
                  )}
                  disabled={isLoading}
                  autoFocus={index === 0}
                />
              ))}
            </div>

            {/* Countdown */}
            {countdown > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                Code expires in <span className="font-mono">{formatCountdown(countdown)}</span>
              </p>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              className="w-full"
              onClick={handleVerifyOTP}
              disabled={isLoading || otp.some((d) => !d)}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Verify
            </Button>

            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResendOTP}
                disabled={countdown > 0 || isLoading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {countdown > 0 ? `Resend in ${formatCountdown(countdown)}` : "Resend Code"}
              </Button>

              {onCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                >
                  Cancel
                </Button>
              )}
            </div>
          </>
        )}

        {step === "success" && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-green-600 font-medium">Phone number verified!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Trigger button for OTP verification
 */
export function OTPTriggerButton({
  phone,
  purpose,
  onVerified,
  children,
  className,
  disabled,
}: {
  phone: string;
  purpose: OTPPurpose;
  onVerified?: () => void;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const [showVerification, setShowVerification] = useState(false);
  const { isEnabled } = useArkeselOTP();

  if (!isEnabled) {
    return null;
  }

  if (showVerification) {
    return (
      <OTPVerification
        phone={phone}
        purpose={purpose}
        onVerified={() => {
          setShowVerification(false);
          onVerified?.();
        }}
        onCancel={() => setShowVerification(false)}
        className={className}
      />
    );
  }

  return (
    <Button
      variant="outline"
      onClick={() => setShowVerification(true)}
      disabled={disabled}
      className={className}
    >
      <Phone className="w-4 h-4 mr-2" />
      {children || "Verify Phone"}
    </Button>
  );
}
