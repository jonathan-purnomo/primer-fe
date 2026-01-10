"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type { PaymentResult } from "@/components/PrimerCheckout";

interface WebhookEvent {
  timestamp: string;
  eventType: string;
  payload: Record<string, unknown>;
}

// Dynamic import to avoid SSR issues with Primer SDK
const PrimerCheckout = dynamic(() => import("@/components/PrimerCheckout"), {
  ssr: false,
  loading: () => (
    <div className="text-center text-gray-500 py-8">Loading...</div>
  ),
});

type PaymentMode = "MANUAL" | "AUTO";

export default function Home() {
  const [clientToken, setClientToken] = useState("");
  const [activeToken, setActiveToken] = useState("");
  const [paymentMethodToken, setPaymentMethodToken] = useState("");
  const [paymentMethodType, setPaymentMethodType] = useState("");
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("MANUAL");
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [isPolling, setIsPolling] = useState(false);

  // Fetch webhook events from the API
  const fetchWebhookEvents = useCallback(async () => {
    try {
      const response = await fetch("/api/primer/test/webhook");
      const data = await response.json();
      if (data.events) {
        setWebhookEvents(data.events);
      }
    } catch (err) {
      console.error("Failed to fetch webhook events:", err);
    }
  }, []);

  // Clear all webhook events
  const clearWebhookEvents = async () => {
    try {
      await fetch("/api/primer/test/webhook", { method: "DELETE" });
      setWebhookEvents([]);
    } catch (err) {
      console.error("Failed to clear webhook events:", err);
    }
  };

  // Poll for webhook events when polling is enabled
  useEffect(() => {
    if (!isPolling) return;

    fetchWebhookEvents();
    const interval = setInterval(fetchWebhookEvents, 3000);

    return () => clearInterval(interval);
  }, [isPolling, fetchWebhookEvents]);

  const handleLoadCheckout = () => {
    if (!clientToken.trim()) {
      setError("Please enter a client token");
      return;
    }
    setError("");
    setPaymentMethodToken("");
    setPaymentMethodType("");
    setPaymentResult(null);
    setActiveToken(clientToken.trim());
  };

  const handlePaymentComplete = (result: PaymentResult) => {
    console.log("Payment complete:", result);
    setPaymentResult(result);
    setError("");
  };

  const handlePaymentMethodToken = (token: string, type: string) => {
    setPaymentMethodToken(token);
    setPaymentMethodType(type);
    setError("");
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(paymentMethodToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = paymentMethodToken;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Primer Payment Demo
          </h1>
          <p className="text-gray-600">
            Enter your client token to test payment tokenization
          </p>
        </div>

        {/* Client Token Input Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <label
            htmlFor="clientToken"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Client Token
          </label>
          <textarea
            id="clientToken"
            value={clientToken}
            onChange={(e) => setClientToken(e.target.value)}
            placeholder="Paste your Primer client token here..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none font-mono text-sm text-gray-800"
            rows={4}
          />
          {/* Payment Mode Selector */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Handling Mode
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMode"
                  value="MANUAL"
                  checked={paymentMode === "MANUAL"}
                  onChange={() => setPaymentMode("MANUAL")}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-700">MANUAL</span>
                <span className="text-xs text-gray-400">(Token only)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="paymentMode"
                  value="AUTO"
                  checked={paymentMode === "AUTO"}
                  onChange={() => setPaymentMode("AUTO")}
                  className="text-blue-600"
                />
                <span className="text-sm text-gray-700">AUTO</span>
                <span className="text-xs text-gray-400">(Full checkout)</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {paymentMode === "MANUAL"
                ? "Stops after tokenization. Use token in your own API."
                : "Full checkout flow. Primer processes payment and handles redirects."}
            </p>
          </div>

          <button
            onClick={handleLoadCheckout}
            className="w-full mt-4 bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            Load Payment Methods
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Form Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Payment Methods
            <span className="ml-2 text-xs font-normal text-gray-400 uppercase">
              {paymentMode} mode
            </span>
          </h2>
          <PrimerCheckout
            clientToken={activeToken}
            onPaymentMethodToken={handlePaymentMethodToken}
            onPaymentComplete={handlePaymentComplete}
            onError={handleError}
            paymentHandling={paymentMode}
          />
        </div>

        {/* Output Section - Payment Method Token */}
        {paymentMethodToken && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-green-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <h3 className="text-sm font-medium text-green-800">
                  Payment Method Token Generated!
                </h3>
              </div>
              <button
                onClick={copyToClipboard}
                className="flex-shrink-0 text-green-700 hover:text-green-900 text-sm font-medium flex items-center gap-1 transition-colors"
              >
                {copied ? (
                  <>
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                      <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>

            {/* Payment Method Type Badge */}
            {paymentMethodType && (
              <div className="mb-3">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {paymentMethodType}
                </span>
              </div>
            )}

            <div className="bg-white rounded-lg p-4 border border-green-200">
              <p className="text-xs text-gray-500 mb-2">
                Use this token in your Postman API request:
              </p>
              <code className="block text-sm text-gray-800 break-all font-mono bg-gray-50 p-3 rounded">
                {paymentMethodToken}
              </code>
            </div>
            <p className="text-xs text-green-700 mt-3">
              Copy this token and use it as the{" "}
              <code className="bg-green-100 px-1 rounded">
                paymentMethodToken
              </code>{" "}
              in your API request body.
            </p>
          </div>
        )}

        {/* Payment Complete Section (AUTO mode) */}
        {paymentResult && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-3 mb-3">
              <svg
                className="h-5 w-5 text-blue-500 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-blue-800">
                  Payment Completed!
                </h3>
                <p className="text-xs text-blue-600 mt-1">
                  Checkout flow completed via Primer (AUTO mode).
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-blue-200 space-y-3">
              {paymentResult.id && (
                <div>
                  <p className="text-xs text-gray-500">Payment ID</p>
                  <code className="text-sm text-gray-800 font-mono">
                    {paymentResult.id}
                  </code>
                </div>
              )}
              {paymentResult.status && (
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      paymentResult.status === "SUCCESS"
                        ? "bg-green-100 text-green-800"
                        : paymentResult.status === "PENDING"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {paymentResult.status}
                  </span>
                </div>
              )}
              {paymentResult.orderId && (
                <div>
                  <p className="text-xs text-gray-500">Order ID</p>
                  <code className="text-sm text-gray-800 font-mono">
                    {paymentResult.orderId}
                  </code>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Webhook Events Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Webhook Events
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={clearWebhookEvents}
                className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                Clear
              </button>
              <button
                onClick={fetchWebhookEvents}
                className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
                Refresh
              </button>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPolling}
                  onChange={(e) => setIsPolling(e.target.checked)}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-600">Auto-refresh</span>
              </label>
            </div>
          </div>

          <p className="text-xs text-gray-500 mb-4">
            Webhook URL: <code className="bg-gray-100 px-1 rounded">https://primer-fe-poc.netlify.app/api/primer/test/webhook</code>
          </p>

          {webhookEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <svg
                className="h-12 w-12 mx-auto mb-3 opacity-50"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
              </svg>
              <p className="text-sm">No webhook events received yet</p>
              <p className="text-xs mt-1">Enable auto-refresh and trigger a payment to see events</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {webhookEvents.map((event, index) => (
                <div
                  key={`${event.timestamp}-${index}`}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {event.eventType}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto text-gray-700">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p className="mb-2 font-medium">Test credentials:</p>
          <div className="bg-white rounded-lg p-4 text-left space-y-2">
            <div>
              <p className="text-xs text-gray-400">Card Number</p>
              <p className="font-mono text-gray-700">4111 1111 1111 1111</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">Expiry</p>
                <p className="font-mono text-gray-700">03/30</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">CVV</p>
                <p className="font-mono text-gray-700">123</p>
              </div>
            </div>
          </div>
          <p className="text-xs mt-3 text-gray-400">
            Payment methods shown depend on your Primer dashboard configuration
          </p>
        </div>
      </div>
    </div>
  );
}
