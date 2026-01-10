import { NextRequest, NextResponse } from "next/server";

// Store webhook events in memory for debugging (in production, use a database)
const webhookEvents: Array<{
  timestamp: string;
  eventType: string;
  payload: unknown;
}> = [];

// POST /api/primer/test/webhook - Receive webhook from Primer
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const timestamp = new Date().toISOString();

    // Extract event type from payload
    const eventType = payload.eventType || payload.type || "UNKNOWN";

    // Log the webhook event
    console.log("\n" + "=".repeat(60));
    console.log("PRIMER WEBHOOK RECEIVED");
    console.log("=".repeat(60));
    console.log("Timestamp:", timestamp);
    console.log("Event Type:", eventType);
    console.log("Headers:", Object.fromEntries(request.headers.entries()));
    console.log("Payload:", JSON.stringify(payload, null, 2));
    console.log("=".repeat(60) + "\n");

    // Store the event
    webhookEvents.push({
      timestamp,
      eventType,
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
export async function GET() {
  return NextResponse.json({
    message: "Primer Webhook Endpoint",
    totalEvents: webhookEvents.length,
    events: webhookEvents.slice(-20).reverse(), // Return last 20 events, newest first
  });
}
