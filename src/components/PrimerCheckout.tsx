"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type {
  ICardPaymentMethodManager,
  INativePaymentMethodManager,
  IRedirectPaymentMethodManager,
  PaymentMethodInfo,
  PrimerHeadlessCheckout,
} from "@primer-io/checkout-web";

// Payment result interface for completed payments (AUTO mode)
export interface PaymentResult {
  id?: string;
  status?: string;
  orderId?: string;
}

interface PrimerCheckoutProps {
  clientToken: string;
  onPaymentMethodToken: (token: string, paymentMethodType: string) => void;
  onPaymentComplete?: (payment: PaymentResult) => void;
  onError: (error: string) => void;
  // Mode: "MANUAL" = stop at tokenization, "AUTO" = full checkout flow with redirect
  paymentHandling?: "MANUAL" | "AUTO";
}

type PaymentMethodType =
  | "PAYMENT_CARD"
  | "PAYPAL"
  | "GOOGLE_PAY"
  | "APPLE_PAY"
  | "KLARNA"
  | "REDIRECT";

interface AvailablePaymentMethod {
  type: string;
  name: string;
  managerType: string;
}

export default function PrimerCheckout({
  clientToken,
  onPaymentMethodToken,
  onPaymentComplete,
  onError,
  paymentHandling = "MANUAL",
}: PrimerCheckoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const primerRef = useRef<PrimerHeadlessCheckout | null>(null);
  const cardManagerRef = useRef<ICardPaymentMethodManager | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<AvailablePaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const initializePrimer = useCallback(async () => {
    if (!clientToken || !containerRef.current) return;

    setIsLoading(true);
    setIsReady(false);
    setAvailablePaymentMethods([]);
    setSelectedMethod(null);

    try {
      // Clean up previous instance
      if (cardManagerRef.current) {
        try {
          cardManagerRef.current.removeHostedInputs();
        } catch {
          // Ignore cleanup errors
        }
        cardManagerRef.current = null;
      }

      // Clear container
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }

      // Dynamic import for client-side only
      const { Primer } = await import("@primer-io/checkout-web");

      const primer = await Primer.createHeadless(clientToken, {
        paymentHandling: paymentHandling,
        onAvailablePaymentMethodsLoad: (paymentMethods: PaymentMethodInfo[]) => {
          console.log("Available payment methods:", paymentMethods);
          const methods = paymentMethods.map((pm) => ({
            type: pm.type,
            name: getPaymentMethodName(pm.type),
            managerType: pm.managerType,
          }));
          setAvailablePaymentMethods(methods);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onTokenizeSuccess: async (paymentMethod: any, handler?: any) => {
          console.log("Tokenize success:", paymentMethod);

          // Always provide the token
          onPaymentMethodToken(paymentMethod.token, paymentMethod.paymentInstrumentType || "UNKNOWN");

          if (paymentHandling === "AUTO" && handler) {
            // AUTO mode: continue to payment (may redirect for PayPal/Klarna)
            console.log("AUTO mode: continuing to payment...");
            setIsRedirecting(true);
            try {
              await handler.handleSuccess();
            } catch (err) {
              console.error("Handler error:", err);
              setIsRedirecting(false);
              setIsProcessing(false);
              onError(err instanceof Error ? err.message : "Payment failed");
            }
          } else {
            // MANUAL mode: stop here with token
            setIsProcessing(false);
          }
        },
        onTokenizeError: (error) => {
          console.error("Tokenize error:", error);
          setIsProcessing(false);
          setIsRedirecting(false);
          onError(error?.message || "Tokenization failed");
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onCheckoutComplete: (data: any) => {
          console.log("Checkout complete:", data);
          setIsProcessing(false);
          setIsRedirecting(false);

          // Extract payment result for AUTO mode
          const paymentResult: PaymentResult = {
            id: data?.payment?.id,
            status: data?.payment?.status,
            orderId: data?.payment?.orderId,
          };

          if (onPaymentComplete) {
            onPaymentComplete(paymentResult);
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onCheckoutFail: (error: any) => {
          console.error("Checkout failed:", error);
          setIsProcessing(false);
          setIsRedirecting(false);
          onError(error?.message || "Checkout failed");
        },
      });

      primerRef.current = primer;

      // Start the checkout
      await primer.start();

      setIsReady(true);
    } catch (err) {
      console.error("Primer initialization error:", err);
      onError(err instanceof Error ? err.message : "Failed to initialize Primer");
    } finally {
      setIsLoading(false);
    }
  }, [clientToken, onPaymentMethodToken, onPaymentComplete, onError, paymentHandling]);

  const getPaymentMethodName = (type: string): string => {
    const names: Record<string, string> = {
      PAYMENT_CARD: "Credit/Debit Card",
      PAYPAL: "PayPal",
      GOOGLE_PAY: "Google Pay",
      APPLE_PAY: "Apple Pay",
      KLARNA: "Klarna",
      PAY_NL_IDEAL: "iDEAL",
      ADYEN_IDEAL: "iDEAL",
      MOLLIE_IDEAL: "iDEAL",
      ADYEN_SOFORT: "Sofort",
      MOLLIE_SOFORT: "Sofort",
      ADYEN_BANCONTACT_CARD: "Bancontact",
      ADYEN_GIROPAY: "Giropay",
      STRIPE_GIROPAY: "Giropay",
      ADYEN_EPS: "EPS",
      MOLLIE_EPS: "EPS",
      ADYEN_P24: "Przelewy24",
      MOLLIE_P24: "Przelewy24",
      GOCARDLESS: "Direct Debit",
      STRIPE_ACH: "ACH Bank Transfer",
    };
    return names[type] || type.replace(/_/g, " ");
  };

  const getPaymentMethodIcon = (type: string): string => {
    if (type === "PAYMENT_CARD") return "💳";
    if (type === "PAYPAL" || type.includes("PAYPAL")) return "🅿️";
    if (type === "GOOGLE_PAY") return "🔵";
    if (type === "APPLE_PAY") return "🍎";
    if (type === "KLARNA" || type.includes("KLARNA")) return "🟢";
    if (type.includes("IDEAL")) return "🏦";
    if (type.includes("SOFORT")) return "🏧";
    if (type.includes("BANCONTACT")) return "💶";
    if (type.includes("GIROPAY")) return "🇩🇪";
    if (type.includes("EPS")) return "🇦🇹";
    if (type.includes("P24")) return "🇵🇱";
    if (type.includes("ACH") || type.includes("GOCARDLESS")) return "🏦";
    return "💰";
  };

  const renderCardForm = async () => {
    if (!primerRef.current || !containerRef.current) return;

    // Clear container
    containerRef.current.innerHTML = "";

    try {
      const cardManager = await primerRef.current.createPaymentMethodManager("PAYMENT_CARD", {
        onCardMetadataChange: (metadata) => {
          console.log("Card metadata:", metadata);
        },
      });

      if (!cardManager) {
        throw new Error("Card payment method is not available");
      }

      cardManagerRef.current = cardManager;

      const { cardNumberInput, expiryInput, cvvInput } = cardManager.createHostedInputs();

      const formContainer = document.createElement("div");
      formContainer.className = "space-y-4";

      // Cardholder name
      const cardholderContainer = document.createElement("div");
      cardholderContainer.innerHTML =
        '<label class="block text-sm font-medium text-gray-700 mb-1">Cardholder Name</label>';
      const cardholderInput = document.createElement("input");
      cardholderInput.type = "text";
      cardholderInput.placeholder = "John Doe";
      cardholderInput.className =
        "w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-800";
      cardholderInput.addEventListener("input", (e) => {
        const target = e.target as HTMLInputElement;
        cardManager.setCardholderName(target.value);
      });
      cardholderContainer.appendChild(cardholderInput);
      formContainer.appendChild(cardholderContainer);

      // Card number
      const cardNumberContainer = document.createElement("div");
      cardNumberContainer.innerHTML =
        '<label class="block text-sm font-medium text-gray-700 mb-1">Card Number</label>';
      const cardNumberWrapper = document.createElement("div");
      cardNumberWrapper.className = "primer-input-wrapper";
      cardNumberContainer.appendChild(cardNumberWrapper);
      formContainer.appendChild(cardNumberContainer);

      // Expiry and CVV row
      const rowContainer = document.createElement("div");
      rowContainer.className = "grid grid-cols-2 gap-4";

      const expiryContainer = document.createElement("div");
      expiryContainer.innerHTML =
        '<label class="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>';
      const expiryWrapper = document.createElement("div");
      expiryWrapper.className = "primer-input-wrapper";
      expiryContainer.appendChild(expiryWrapper);

      const cvvContainer = document.createElement("div");
      cvvContainer.innerHTML =
        '<label class="block text-sm font-medium text-gray-700 mb-1">CVV</label>';
      const cvvWrapper = document.createElement("div");
      cvvWrapper.className = "primer-input-wrapper";
      cvvContainer.appendChild(cvvWrapper);

      rowContainer.appendChild(expiryContainer);
      rowContainer.appendChild(cvvContainer);
      formContainer.appendChild(rowContainer);

      // Submit button
      const submitButton = document.createElement("button");
      submitButton.type = "button";
      submitButton.className =
        "w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed";
      submitButton.textContent = "Get Payment Method Token";
      submitButton.onclick = async () => {
        try {
          submitButton.disabled = true;
          submitButton.textContent = "Processing...";
          setIsProcessing(true);
          await cardManager.submit();
        } catch (err) {
          console.error("Submit error:", err);
          onError(err instanceof Error ? err.message : "Submit failed");
          setIsProcessing(false);
        } finally {
          submitButton.disabled = false;
          submitButton.textContent = "Get Payment Method Token";
        }
      };
      formContainer.appendChild(submitButton);

      containerRef.current.appendChild(formContainer);

      await cardNumberInput.render(cardNumberWrapper, {
        placeholder: "4111 1111 1111 1111",
      });

      await expiryInput.render(expiryWrapper, {
        placeholder: "MM/YY",
      });

      await cvvInput.render(cvvWrapper, {
        placeholder: "123",
      });
    } catch (err) {
      console.error("Error rendering card form:", err);
      onError(err instanceof Error ? err.message : "Failed to render card form");
    }
  };

  const renderNativePaymentButton = async (type: "PAYPAL" | "GOOGLE_PAY" | "APPLE_PAY") => {
    if (!primerRef.current || !containerRef.current) return;

    // Clear container
    containerRef.current.innerHTML = "";

    try {
      const manager = (await primerRef.current.createPaymentMethodManager(
        type
      )) as INativePaymentMethodManager | null;

      if (!manager) {
        throw new Error(`${type} is not available`);
      }

      const button = manager.createButton();

      const buttonContainer = document.createElement("div");
      buttonContainer.className = "space-y-4";

      const buttonWrapper = document.createElement("div");
      buttonWrapper.id = `${type.toLowerCase()}-button-container`;
      buttonWrapper.className = "min-h-[48px]";
      buttonContainer.appendChild(buttonWrapper);

      // Info text
      const infoText = document.createElement("p");
      infoText.className = "text-sm text-gray-500 text-center";
      infoText.textContent = `Click the button above to authenticate with ${getPaymentMethodName(type)}`;
      buttonContainer.appendChild(infoText);

      containerRef.current.appendChild(buttonContainer);

      await button.render(buttonWrapper, {});
    } catch (err) {
      console.error(`Error rendering ${type} button:`, err);
      onError(err instanceof Error ? err.message : `Failed to render ${type}`);
    }
  };

  const renderRedirectPayment = async (type: string) => {
    if (!primerRef.current || !containerRef.current) return;

    // Clear container
    containerRef.current.innerHTML = "";

    try {
      const manager = (await primerRef.current.createPaymentMethodManager(
        type as Parameters<typeof primerRef.current.createPaymentMethodManager>[0]
      )) as IRedirectPaymentMethodManager | null;

      if (!manager) {
        throw new Error(`${type} is not available`);
      }

      const buttonContainer = document.createElement("div");
      buttonContainer.className = "space-y-4";

      // Info text
      const infoText = document.createElement("p");
      infoText.className = "text-sm text-gray-600 text-center mb-4";
      infoText.textContent = `You will be redirected to ${getPaymentMethodName(type)} to complete the payment.`;
      buttonContainer.appendChild(infoText);

      // Submit button
      const submitButton = document.createElement("button");
      submitButton.type = "button";
      submitButton.className =
        "w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed";
      submitButton.textContent = `Continue with ${getPaymentMethodName(type)}`;
      submitButton.onclick = async () => {
        try {
          submitButton.disabled = true;
          submitButton.textContent = "Redirecting...";
          setIsProcessing(true);
          await manager.start();
        } catch (err) {
          console.error("Redirect error:", err);
          onError(err instanceof Error ? err.message : "Redirect failed");
          setIsProcessing(false);
          submitButton.disabled = false;
          submitButton.textContent = `Continue with ${getPaymentMethodName(type)}`;
        }
      };
      buttonContainer.appendChild(submitButton);

      containerRef.current.appendChild(buttonContainer);
    } catch (err) {
      console.error(`Error rendering ${type}:`, err);
      onError(err instanceof Error ? err.message : `Failed to render ${type}`);
    }
  };

  const handleSelectPaymentMethod = async (method: AvailablePaymentMethod) => {
    setSelectedMethod(method.type);

    if (method.type === "PAYMENT_CARD") {
      await renderCardForm();
    } else if (["PAYPAL", "GOOGLE_PAY", "APPLE_PAY"].includes(method.type)) {
      await renderNativePaymentButton(method.type as "PAYPAL" | "GOOGLE_PAY" | "APPLE_PAY");
    } else {
      // Redirect-based payment methods
      await renderRedirectPayment(method.type);
    }
  };

  useEffect(() => {
    if (clientToken) {
      initializePrimer();
    }

    return () => {
      if (cardManagerRef.current) {
        try {
          cardManagerRef.current.removeHostedInputs();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [clientToken, initializePrimer]);

  if (!clientToken) {
    return (
      <div className="text-center text-gray-500 py-8">
        Enter a client token above to load the payment form
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Loading payment methods...</span>
          </div>
        </div>
      )}

      {isProcessing && !isRedirecting && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Processing...</span>
          </div>
        </div>
      )}

      {isRedirecting && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-lg">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-gray-600 font-medium">Redirecting to payment provider...</span>
            <span className="text-gray-400 text-sm">Please complete payment in the new window</span>
          </div>
        </div>
      )}

      {isReady && availablePaymentMethods.length > 0 && (
        <div className="space-y-4">
          {/* Payment Method Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Payment Method
            </label>
            <div className="grid grid-cols-1 gap-2">
              {availablePaymentMethods.map((method) => (
                <button
                  key={method.type}
                  onClick={() => handleSelectPaymentMethod(method)}
                  className={`flex items-center gap-3 p-3 border rounded-lg transition-all text-left ${
                    selectedMethod === method.type
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span className="text-xl">{getPaymentMethodIcon(method.type)}</span>
                  <span className="font-medium text-gray-800">{method.name}</span>
                  <span className="ml-auto text-xs text-gray-400 uppercase">{method.managerType}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Separator */}
          {selectedMethod && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-500 mb-4">
                Complete your payment with {getPaymentMethodName(selectedMethod)}
              </p>
            </div>
          )}
        </div>
      )}

      {isReady && availablePaymentMethods.length === 0 && (
        <div className="text-center text-gray-500 py-4">
          No payment methods available for this client session.
        </div>
      )}

      {/* Payment Form Container */}
      <div ref={containerRef} className={isLoading || isProcessing ? "opacity-50" : ""} />

      {isReady && (
        <p className="text-xs text-gray-500 mt-4 text-center">Powered by Primer</p>
      )}
    </div>
  );
}
