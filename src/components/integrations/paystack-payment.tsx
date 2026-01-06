"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  Smartphone,
  Loader2,
  CheckCircle,
  AlertCircle,
  Lock,
  Shield,
} from "lucide-react";
import { usePaystack } from "@/lib/integrations-store";
import {
  isPaystackEnabled,
  openPaystackPopup,
  initializeMobileMoneyPayment,
  submitMobileMoneyOTP,
  verifyPayment,
  formatAmount,
  generatePaymentReference,
  MobileMoneyProvider,
} from "@/lib/services/paystack";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PaystackPaymentProps {
  amount: number;
  email: string;
  metadata?: Record<string, unknown>;
  onSuccess: (reference: string) => void;
  onCancel?: () => void;
  onError?: (error: string) => void;
  orderId?: string;
  className?: string;
}

type PaymentMethod = "card" | "mobile_money";
type PaymentStep = "select" | "mobile_money_details" | "mobile_money_otp" | "processing" | "success" | "error";

const mobileMoneyProviders: { id: MobileMoneyProvider; name: string; prefixes: string[] }[] = [
  { id: "mtn", name: "MTN Mobile Money", prefixes: ["024", "054", "055", "059"] },
  { id: "vodafone", name: "Vodafone Cash", prefixes: ["020", "050"] },
  { id: "airteltigo", name: "AirtelTigo Money", prefixes: ["026", "027", "056", "057"] },
];

export function PaystackPayment({
  amount,
  email,
  metadata,
  onSuccess,
  onCancel,
  onError,
  orderId,
  className,
}: PaystackPaymentProps) {
  const [step, setStep] = useState<PaymentStep>("select");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string>("");

  // Mobile Money state
  const [momoPhone, setMomoPhone] = useState("");
  const [momoProvider, setMomoProvider] = useState<MobileMoneyProvider>("mtn");
  const [momoOtp, setMomoOtp] = useState("");
  const [momoPrompt, setMomoPrompt] = useState("");

  const { isEnabled, isLive } = usePaystack();

  if (!isEnabled) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Payment processing is currently unavailable.</p>
            <p className="text-sm mt-2">Please try again later or contact support.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleCardPayment = async () => {
    if (!isPaystackEnabled()) {
      setError("Payment gateway not available");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await openPaystackPopup({
        email,
        amount,
        reference: generatePaymentReference(),
        metadata: {
          ...metadata,
          orderId,
        },
        onSuccess: (response) => {
          setReference(response.reference);
          setStep("success");
          onSuccess(response.reference);
        },
        onClose: () => {
          setIsLoading(false);
          if (step !== "success") {
            toast.info("Payment cancelled");
            onCancel?.();
          }
        },
      });
    } catch (err) {
      setIsLoading(false);
      const errorMessage = err instanceof Error ? err.message : "Payment failed";
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const handleMobileMoneyPayment = async () => {
    if (!momoPhone) {
      setError("Please enter your phone number");
      return;
    }

    setIsLoading(true);
    setError(null);
    setStep("processing");

    try {
      const result = await initializeMobileMoneyPayment({
        email,
        amount,
        phone: momoPhone,
        provider: momoProvider,
        metadata: {
          ...metadata,
          orderId,
        },
      });

      if (result.success && result.data) {
        setReference(result.data.reference);

        if (result.data.status === "send_otp") {
          setMomoPrompt(result.data.display_text || "Please approve the payment on your phone");
          setStep("mobile_money_otp");
        } else if (result.data.status === "success") {
          setStep("success");
          onSuccess(result.data.reference);
        }
      } else {
        setError(result.error || "Mobile Money payment failed");
        setStep("mobile_money_details");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Payment failed";
      setError(errorMessage);
      setStep("mobile_money_details");
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitMomoOTP = async () => {
    if (!momoOtp || momoOtp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await submitMobileMoneyOTP(reference, momoOtp);

      if (result.success) {
        // Verify payment status
        const verification = await verifyPayment(reference);

        if (verification.success && verification.data?.status === "success") {
          setStep("success");
          onSuccess(reference);
        } else {
          setError("Payment verification failed. Please try again.");
        }
      } else {
        setError(result.error || "OTP verification failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const detectProvider = (phone: string): MobileMoneyProvider => {
    const cleaned = phone.replace(/\s/g, "").replace(/^\+233/, "0");
    for (const provider of mobileMoneyProviders) {
      if (provider.prefixes.some((p) => cleaned.startsWith(p))) {
        return provider.id;
      }
    }
    return "mtn";
  };

  const handlePhoneChange = (value: string) => {
    setMomoPhone(value);
    setMomoProvider(detectProvider(value));
    setError(null);
  };

  return (
    <Card className={cn("w-full max-w-md mx-auto", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Secure Payment
            </CardTitle>
            <CardDescription>
              Complete your purchase of {formatAmount(amount)}
            </CardDescription>
          </div>
          {!isLive && (
            <Badge variant="secondary">Test Mode</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {step === "select" && (
          <>
            {/* Payment Method Selection */}
            <div className="space-y-4">
              <Label>Select Payment Method</Label>
              <RadioGroup
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                className="space-y-3"
              >
                <label
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors",
                    paymentMethod === "card" && "border-primary bg-primary/5"
                  )}
                >
                  <RadioGroupItem value="card" id="card" />
                  <CreditCard className="w-5 h-5" />
                  <div className="flex-1">
                    <p className="font-medium">Card Payment</p>
                    <p className="text-sm text-muted-foreground">
                      Visa, Mastercard, or Verve
                    </p>
                  </div>
                </label>

                <label
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors",
                    paymentMethod === "mobile_money" && "border-primary bg-primary/5"
                  )}
                >
                  <RadioGroupItem value="mobile_money" id="mobile_money" />
                  <Smartphone className="w-5 h-5" />
                  <div className="flex-1">
                    <p className="font-medium">Mobile Money</p>
                    <p className="text-sm text-muted-foreground">
                      MTN, Vodafone, or AirtelTigo
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {paymentMethod === "card" ? (
              <Button
                className="w-full"
                onClick={handleCardPayment}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                Pay {formatAmount(amount)} with Card
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={() => setStep("mobile_money_details")}
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Continue with Mobile Money
              </Button>
            )}

            <Separator />

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>Secured by Paystack</span>
            </div>
          </>
        )}

        {step === "mobile_money_details" && (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="momo-phone">Phone Number</Label>
                <Input
                  id="momo-phone"
                  type="tel"
                  placeholder="024 XXX XXXX"
                  value={momoPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Provider</Label>
                <RadioGroup
                  value={momoProvider}
                  onValueChange={(v) => setMomoProvider(v as MobileMoneyProvider)}
                  className="flex flex-wrap gap-2"
                >
                  {mobileMoneyProviders.map((provider) => (
                    <label
                      key={provider.id}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm",
                        momoProvider === provider.id && "border-primary bg-primary/5"
                      )}
                    >
                      <RadioGroupItem value={provider.id} id={provider.id} />
                      {provider.name}
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("select")}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleMobileMoneyPayment}
                disabled={isLoading || !momoPhone}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Pay {formatAmount(amount)}
              </Button>
            </div>
          </>
        )}

        {step === "mobile_money_otp" && (
          <>
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                <Smartphone className="w-8 h-8 text-amber-600" />
              </div>
              <p className="text-sm text-muted-foreground">{momoPrompt}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="momo-otp">Enter OTP from your phone</Label>
              <Input
                id="momo-otp"
                type="text"
                placeholder="Enter 6-digit code"
                value={momoOtp}
                onChange={(e) => setMomoOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                maxLength={6}
                className="text-center text-lg font-mono tracking-widest"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              className="w-full"
              onClick={handleSubmitMomoOTP}
              disabled={isLoading || momoOtp.length !== 6}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Confirm Payment
            </Button>
          </>
        )}

        {step === "processing" && (
          <div className="text-center py-8">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
            <p className="mt-4 font-medium">Processing payment...</p>
            <p className="text-sm text-muted-foreground">Please wait</p>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-green-600">Payment Successful!</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Reference: {reference}
            </p>
          </div>
        )}

        {onCancel && step !== "success" && step !== "processing" && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Simple Pay Button that opens Paystack popup directly
 */
export function PaystackPayButton({
  amount,
  email,
  onSuccess,
  onCancel,
  children,
  className,
  disabled,
}: {
  amount: number;
  email: string;
  onSuccess: (reference: string) => void;
  onCancel?: () => void;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const { isEnabled } = usePaystack();

  if (!isEnabled) {
    return (
      <Button disabled className={className}>
        Payment Unavailable
      </Button>
    );
  }

  const handleClick = async () => {
    setIsLoading(true);

    try {
      await openPaystackPopup({
        email,
        amount,
        onSuccess: (response) => {
          setIsLoading(false);
          onSuccess(response.reference);
        },
        onClose: () => {
          setIsLoading(false);
          onCancel?.();
        },
      });
    } catch (err) {
      setIsLoading(false);
      toast.error("Payment failed. Please try again.");
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={className}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <CreditCard className="w-4 h-4 mr-2" />
      )}
      {children || `Pay ${formatAmount(amount)}`}
    </Button>
  );
}
