import { Hono } from "hono";
import { config } from "../config/env";

const app = new Hono();

app.post("/stripe", async (c) => {
  try {
    const signature = c.req.header("stripe-signature");
    if (!signature) {
      return c.json({ error: "Missing stripe-signature header" }, 400);
    }

    const payload = await c.req.text();

    console.log("[Webhook] Stripe event received", { length: payload.length });

    // TODO: Verify signature using config.stripe?.webhookSecret
    // and construct the event. Keep as no-op skeleton for now.

    return c.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Stripe error", error);
    return c.json({ error: "Webhook processing failed" }, 500);
  }
});

app.post("/sendgrid", async (c) => {
  try {
    const event = await c.req.json();
    console.log("[Webhook] SendGrid event", event);
    return c.json({ received: true });
  } catch (error) {
    console.error("[Webhook] SendGrid error", error);
    return c.json({ error: "Webhook processing failed" }, 500);
  }
});

app.post("/twilio", async (c) => {
  try {
    const body = await c.req.parseBody();
    console.log("[Webhook] Twilio event", body);
    return c.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Twilio error", error);
    return c.json({ error: "Webhook processing failed" }, 500);
  }
});

app.post("/expo-push-receipts", async (c) => {
  try {
    const payload = await c.req.json();
    console.log("[Webhook] Expo push receipts", payload);
    return c.json({ received: true });
  } catch (error) {
    console.error("[Webhook] Expo push receipts error", error);
    return c.json({ error: "Webhook processing failed" }, 500);
  }
});

export default app;
