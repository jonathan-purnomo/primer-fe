import { NextRequest, NextResponse } from "next/server";

// Store webhook events in memory for debugging (in production, use a database)
const webhookEvents: Array<{
  timestamp: string;
  eventType: string;
  host: string;
  headers: Record<string, string>;
  payload: unknown;
}> = [];

// POST /api/primer/test/webhook - Receive webhook from Primer
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const timestamp = new Date().toISOString();

    // Extract event type from payload
    const eventType = payload.eventType || payload.type || "UNKNOWN";

    // Extract host and headers
    const host = request.headers.get("host") || request.nextUrl.host || "unknown";
    const headers = Object.fromEntries(request.headers.entries());

    // Log the webhook event
    console.log("\n" + "=".repeat(60));
    console.log("PRIMER WEBHOOK RECEIVED");
    console.log("=".repeat(60));
    console.log("Timestamp:", timestamp);
    console.log("Event Type:", eventType);
    console.log("Host:", host);
    console.log("Headers:", headers);
    console.log("Payload:", JSON.stringify(payload, null, 2));
    console.log("=".repeat(60) + "\n");

    // Store the event
    webhookEvents.push({
      timestamp,
      eventType,
      host,
      headers,
      payload,
    });

    // Keep only last 100 events
    if (webhookEvents.length > 100) {
      webhookEvents.shift();
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: "Webhook received",
        timestamp,
        eventType,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 }
    );
  }
}

// GET /api/primer/test/webhook - View received webhook events
export async function GET(request: NextRequest) {
  const host = request.headers.get("host") || request.nextUrl.host || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;
  const webhookUrl = `${baseUrl}/api/primer/test/webhook`;

  return NextResponse.json({
    message: "Primer Webhook Endpoint",
    endpoint: {
      host,
      url: webhookUrl,
    },
    curl: {
      description: "Example curl commands to test this webhook endpoint",
      sendWebhook: `curl -X POST '${webhookUrl}' \\
  -H 'Content-Type: application/json' \\
  -H 'X-Signature-Primary: your-signature-here' \\
  -d '{
    "eventType": "PAYMENT.STATUS",
    "id": "evt_xxx",
    "paymentId": "pay_xxx",
    "status": "AUTHORIZED",
    "createdAt": "${new Date().toISOString()}"
  }'`,
      viewEvents: `curl '${webhookUrl}'`,
      clearEvents: `curl -X DELETE '${webhookUrl}'`,
    },
    totalEvents: webhookEvents.length,
    events: webhookEvents.slice(-20).reverse(), // Return last 20 events, newest first
  });
}

// DELETE /api/primer/test/webhook - Clear all webhook events
export async function DELETE() {
  webhookEvents.length = 0;
  return NextResponse.json({
    success: true,
    message: "All webhook events cleared",
  });
}
