"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  Smartphone,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Lock,
  Clock,
  ArrowRight,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import { usePaystack } from "@/lib/integrations-store";
import {
  initializeMobileMoneyPayment,
  submitMobileMoneyOTP,
  verifyPayment,
  isPaystackEnabled,
  getPaystackStatus,
  formatAmount,
  generatePaymentReference,
  MobileMoneyProvider,
} from "@/lib/services/paystack";

interface MobileMoneyCheckoutProps {
  amount: number;
  currency?: string;
  vendorName: string;
  orderId: string;
  email?: string;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
}

export function MobileMoneyCheckout({
  amount,
  currency = "GHS",
  vendorName,
  orderId,
  email = "customer@markethub.gh",
  onSuccess,
  onError,
}: MobileMoneyCheckoutProps) {
  const [selectedProvider, setSelectedProvider] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<"select" | "details" | "confirm" | "otp" | "processing" | "success" | "error">("select");
  const [transactionId, setTransactionId] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [displayText, setDisplayText] = useState("");

  const { isEnabled: paystackEnabled, isLive } = usePaystack();

  const providers = [
    {
      id: "mtn",
      name: "MTN Mobile Money",
      logo: "🟡",
      prefixes: ["024", "054", "055", "059"],
      color: "bg-yellow-500",
      description: "Pay with MTN MoMo"
    },
    {
      id: "vodafone",
      name: "Vodafone Cash",
      logo: "🔴",
      prefixes: ["020", "050"],
      color: "bg-red-500",
      description: "Pay with Vodafone Cash"
    },
    {
      id: "airteltigo",
      name: "AirtelTigo Money",
      logo: "🔵",
      prefixes: ["026", "056", "027", "057"],
      color: "bg-blue-500",
      description: "Pay with AirtelTigo Money"
    },
  ];

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    setPaymentStep("details");
  };

  const handlePaymentSubmit = async () => {
    if (!selectedProvider || !phoneNumber) return;

    // Check if Paystack is enabled
    if (!isPaystackEnabled()) {
      const status = getPaystackStatus();
      setErrorMessage(status.message || "Payment gateway not configured. Please contact support.");
      setPaymentStep("error");
      onError?.(status.message || "Payment gateway not configured");
      return;
    }

    setIsProcessing(true);
    setPaymentStep("processing");

    try {
      const reference = generatePaymentReference();
      setPaymentReference(reference);

      // Initialize Mobile Money payment via Paystack API
      const result = await initializeMobileMoneyPayment({
        email,
        amount,
        phone: phoneNumber,
        provider: selectedProvider as MobileMoneyProvider,
        reference,
        metadata: {
          orderId,
          vendorName,
          custom_fields: [
            {
              display_name: "Order ID",
              variable_name: "order_id",
              value: orderId,
            },
          ],
        },
      });

      if (!result.success) {
        setIsProcessing(false);
        if (result.integrationDisabled) {
          setErrorMessage("Payment gateway is not available. Please try again later or use a different payment method.");
        } else {
          setErrorMessage(result.error || "Payment initialization failed. Please try again.");
        }
        setPaymentStep("error");
        onError?.(result.error || "Payment failed");
        return;
      }

      // Handle different response statuses
      if (result.data?.status === "send_otp") {
        // User needs to enter OTP
        setDisplayText(result.data.display_text || "Enter the OTP sent to your phone");
        setPaymentStep("otp");
        setIsProcessing(false);
      } else if (result.data?.status === "pending") {
        // Payment is pending - user needs to authorize on their phone
        setDisplayText(result.data.display_text || "Check your phone to authorize the payment");
        setTransactionId(result.data.reference);
        // Start polling for payment status
        pollPaymentStatus(result.data.reference);
      } else if (result.data?.status === "success") {
        // Payment completed immediately
        setTransactionId(result.data.reference);
        setPaymentStep("success");
        setIsProcessing(false);
        onSuccess?.(result.data.reference);
      } else {
        setErrorMessage("Unexpected payment status. Please try again.");
        setPaymentStep("error");
        setIsProcessing(false);
      }
    } catch (error) {
      setIsProcessing(false);
      setErrorMessage("An error occurred during payment. Please try again.");
      setPaymentStep("error");
      onError?.("Payment failed");
    }
  };

  const handleOTPSubmit = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setIsProcessing(true);

    try {
      const result = await submitMobileMoneyOTP(paymentReference, otpCode);

      if (!result.success) {
        toast.error(result.error || "OTP verification failed");
        setIsProcessing(false);
        return;
      }

      // Start polling for payment status after OTP
      setPaymentStep("processing");
      pollPaymentStatus(paymentReference);
    } catch (error) {
      setIsProcessing(false);
      toast.error("Failed to verify OTP. Please try again.");
    }
  };

  const pollPaymentStatus = async (reference: string, maxAttempts = 20) => {
    let attempts = 0;

    const checkStatus = async () => {
      attempts++;

      try {
        const result = await verifyPayment(reference);

        if (result.success && result.data) {
          if (result.data.status === "success") {
            setTransactionId(reference);
            setPaymentStep("success");
            setIsProcessing(false);
            onSuccess?.(reference);
            return;
          } else if (result.data.status === "failed" || result.data.status === "abandoned") {
            setErrorMessage("Payment was not completed. Please try again.");
            setPaymentStep("error");
            setIsProcessing(false);
            onError?.("Payment failed or was cancelled");
            return;
          }
        }

        // Still pending, continue polling
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 3000); // Poll every 3 seconds
        } else {
          setErrorMessage("Payment timeout. Please check your Mobile Money account for the transaction status.");
          setPaymentStep("error");
          setIsProcessing(false);
          onError?.("Payment timeout");
        }
      } catch (error) {
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 3000);
        } else {
          setErrorMessage("Unable to verify payment. Please check your transaction history.");
          setPaymentStep("error");
          setIsProcessing(false);
        }
      }
    };

    checkStatus();
  };

  const resetPayment = () => {
    setPaymentStep("select");
    setSelectedProvider("");
    setPhoneNumber("");
    setOtpCode("");
    setErrorMessage("");
    setPaymentReference("");
    setTransactionId("");
    setDisplayText("");
  };

  const selectedProviderData = providers.find(p => p.id === selectedProvider);

  // If Paystack is not enabled, show unavailable message
  if (!paystackEnabled) {
    return (
      <Card className="max-w-md mx-auto border-amber-200 bg-amber-50">
        <CardContent className="p-6 text-center">
          <Smartphone className="w-12 h-12 mx-auto mb-4 text-amber-600" />
          <h4 className="font-semibold text-amber-800">Mobile Money Unavailable</h4>
          <p className="text-sm text-amber-700 mt-2">
            Mobile Money payments are currently being configured. Please try again later or contact support.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Mobile Money Payment
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            Secure payment via Paystack
            {!isLive && <Badge variant="secondary" className="text-xs">Test Mode</Badge>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-semibold">{formatAmount(amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vendor:</span>
              <span>{vendorName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order:</span>
              <span className="text-sm">{orderId}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4 text-green-600" />
              <span>Protected by escrow system</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Provider Selection */}
      {paymentStep === "select" && (
        <Card>
          <CardHeader>
            <CardTitle>Choose Your Mobile Money Provider</CardTitle>
            <CardDescription>Select your mobile money service provider</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  className="border rounded-lg p-4 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleProviderSelect(provider.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${provider.color} flex items-center justify-center text-white font-bold`}>
                        {provider.logo}
                      </div>
                      <div>
                        <p className="font-medium">{provider.name}</p>
                        <p className="text-sm text-muted-foreground">{provider.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Phone Number Input */}
      {paymentStep === "details" && selectedProviderData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full ${selectedProviderData.color} flex items-center justify-center text-white text-sm`}>
                {selectedProviderData.logo}
              </div>
              {selectedProviderData.name}
            </CardTitle>
            <CardDescription>Enter your mobile money number</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="phone">Mobile Money Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="e.g., 024 123 4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Supported prefixes: {selectedProviderData.prefixes.join(", ")}
              </p>
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <Lock className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Secure Payment:</strong> You'll receive a prompt on your phone to authorize this payment.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setPaymentStep("select")} className="flex-1">
                Back
              </Button>
              <Button
                onClick={() => setPaymentStep("confirm")}
                disabled={!phoneNumber}
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirmation */}
      {paymentStep === "confirm" && selectedProviderData && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm Payment</CardTitle>
            <CardDescription>Review your payment details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Provider:</span>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded-full ${selectedProviderData.color}`} />
                  <span>{selectedProviderData.name}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Number:</span>
                <span>{phoneNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-semibold">{formatAmount(amount)}</span>
              </div>
            </div>

            <Alert className="border-orange-200 bg-orange-50">
              <Clock className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Next Steps:</strong> After clicking "Pay Now", check your phone for a payment prompt from {selectedProviderData.name}.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setPaymentStep("details")} className="flex-1">
                Back
              </Button>
              <Button onClick={handlePaymentSubmit} className="flex-1 bg-green-600 hover:bg-green-700">
                <Smartphone className="w-4 h-4 mr-2" />
                Pay Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3.5: OTP Entry */}
      {paymentStep === "otp" && selectedProviderData && (
        <Card>
          <CardHeader>
            <CardTitle>Enter OTP</CardTitle>
            <CardDescription>{displayText || "Enter the OTP sent to your phone"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="otp">One-Time Password</Label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                className="mt-1 text-center text-2xl tracking-widest"
                maxLength={6}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={resetPayment} className="flex-1" disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                onClick={handleOTPSubmit}
                disabled={otpCode.length !== 6 || isProcessing}
                className="flex-1"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify OTP"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Processing */}
      {paymentStep === "processing" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing Payment
            </CardTitle>
            <CardDescription>{displayText || "Please authorize the payment on your phone"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <Smartphone className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Check your phone</p>
                <p className="text-sm text-muted-foreground">
                  You should receive a prompt from {selectedProviderData?.name} to authorize this payment
                </p>
              </div>
            </div>

            <Progress value={66} className="w-full" />

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Instructions:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Check your phone for a payment prompt</li>
                <li>• Enter your Mobile Money PIN</li>
                <li>• Confirm the payment amount</li>
                <li>• Complete the transaction</li>
              </ul>
            </div>

            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Having trouble?</strong> Make sure you have sufficient balance and network connectivity.
              </AlertDescription>
            </Alert>

            <Button variant="outline" onClick={resetPayment} className="w-full">
              Cancel Payment
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Success */}
      {paymentStep === "success" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              Payment Successful!
            </CardTitle>
            <CardDescription>Your payment has been processed successfully</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Payment Confirmed</p>
                <p className="text-sm text-muted-foreground">
                  Transaction ID: {transactionId}
                </p>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid:</span>
                <span className="font-semibold">{formatAmount(amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method:</span>
                <span>{selectedProviderData?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Completed
                </Badge>
              </div>
            </div>

            <Alert className="border-blue-200 bg-blue-50">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Escrow Protection:</strong> Your funds are held securely until you confirm receipt of your order.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {paymentStep === "error" && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              Payment Failed
            </CardTitle>
            <CardDescription>There was an issue with your payment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-red-800">Payment Not Completed</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {errorMessage}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={resetPayment} className="flex-1">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alternative Payment Methods */}
      {paymentStep === "select" && (
        <Card>
          <CardHeader>
            <CardTitle>Other Payment Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <CreditCard className="w-4 h-4 mr-2" />
                Credit/Debit Card
              </Button>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Mobile Money is the preferred payment method in Ghana
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
