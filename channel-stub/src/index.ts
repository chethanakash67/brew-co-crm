import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

type Channel = "email" | "sms" | "whatsapp";
type ReceiptEvent = "delivered" | "failed" | "opened" | "clicked" | "read";

type SendPayload = {
  communicationId: string;
  customerId: string;
  customerName: string;
  email: string;
  phone: string;
  message: string;
  channel: Channel;
  subject: string;
};

type ProviderResult = {
  provider: "emailjs" | "twilio";
  providerMessageId?: string;
  status: string;
};

const app = express();
const port = Number(process.env.PORT ?? 3003);
const crmUrl = (process.env.CRM_URL ?? "http://localhost:8000").replace(/\/$/, "");

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: "1mb" }));

/**
 * Per-channel delivery mode:
 * - whatsapp → always simulate (no real provider configured)
 * - sms      → always simulate (no real provider configured)
 * - email    → real via EmailJS if credentials present, otherwise simulate
 */
function channelMode(channel: Channel): "real" | "simulate" {
  if (channel === "whatsapp" || channel === "sms") return "simulate";
  // email: real only when EmailJS credentials are all present
  const emailReady = Boolean(
    process.env.EMAILJS_SERVICE_ID &&
    process.env.EMAILJS_TEMPLATE_ID &&
    process.env.EMAILJS_PUBLIC_KEY
  );
  return emailReady ? "real" : "simulate";
}

/** @deprecated — kept for health endpoint backward compat */
function deliveryMode() {
  return (process.env.DELIVERY_MODE ?? "real").toLowerCase();
}

function providerConfig() {
  return {
    email: Boolean(process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_TEMPLATE_ID && process.env.EMAILJS_PUBLIC_KEY),
    sms: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && (process.env.TWILIO_SMS_FROM || process.env.TWILIO_MESSAGING_SERVICE_SID)),
    whatsapp: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM)
  };
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for real delivery.`);
  }
  return value;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(minSeconds: number, maxSeconds: number) {
  const min = minSeconds * 1000;
  const max = maxSeconds * 1000;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chance(probability: number) {
  return Math.random() < probability;
}

function normalizeChannel(value: string): Channel | null {
  const channel = value.toLowerCase();
  if (channel === "email" || channel === "sms" || channel === "whatsapp") return channel;
  return null;
}

function cleanPhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textToHtml(message: string) {
  return message
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

function asProviderError(provider: string, status: number, payload: unknown) {
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  return new Error(`${provider} rejected request: ${status} ${body}`);
}

async function readJsonOrText(response: globalThis.Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function sendReceipt(communicationId: string, eventType: ReceiptEvent) {
  const response = await fetch(`${crmUrl}/api/receipts/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ communicationId, eventType })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`CRM callback failed for ${communicationId}: ${response.status} ${body}`);
  }
}

async function notifyReceipt(communicationId: string, eventType: ReceiptEvent) {
  try {
    await sendReceipt(communicationId, eventType);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
  }
}

async function simulateLifecycle(payload: SendPayload) {
  try {
    await wait(randomDelay(1, 3));
    const delivered = chance(0.85);
    await sendReceipt(payload.communicationId, delivered ? "delivered" : "failed");

    if (!delivered) return;

    await wait(randomDelay(3, 8));
    const opened = chance(0.6);
    if (!opened) return;
    await sendReceipt(payload.communicationId, "opened");

    await wait(randomDelay(5, 12));
    if (chance(0.3)) {
      await sendReceipt(payload.communicationId, "clicked");
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
  }
}

function publicWebhookUrl(path: string, communicationId: string) {
  const baseUrl = process.env.CHANNEL_PUBLIC_URL?.replace(/\/$/, "");
  if (!baseUrl) return undefined;
  const url = new URL(`${baseUrl}${path}`);
  url.searchParams.set("communicationId", communicationId);
  return url.toString();
}

function parsePayload(body: Partial<SendPayload>): SendPayload {
  const communicationId = String(body.communicationId ?? "").trim();
  const customerId = String(body.customerId ?? "").trim();
  const customerName = String(body.customerName ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const message = String(body.message ?? "").trim();
  const channel = normalizeChannel(String(body.channel ?? ""));
  const subject = String(body.subject ?? "").trim() || "A message from Brew & Co.";

  if (!communicationId || !customerId || !customerName || !message || !channel) {
    throw new Error("communicationId, customerId, customerName, message, and a valid channel are required.");
  }

  if (channel === "email" && !(process.env.TEST_RECIPIENT_EMAIL || email)) {
    throw new Error("email is required for email delivery.");
  }

  if ((channel === "sms" || channel === "whatsapp") && !(process.env.TEST_RECIPIENT_PHONE || phone)) {
    throw new Error("phone is required for SMS/WhatsApp delivery.");
  }

  return {
    communicationId,
    customerId,
    customerName,
    email,
    phone,
    message,
    channel,
    subject
  };
}

function resolveEmailRecipient(payload: SendPayload) {
  return process.env.TEST_RECIPIENT_EMAIL?.trim() || payload.email;
}

function resolvePhoneRecipient(payload: SendPayload) {
  const rawPhone = process.env.TEST_RECIPIENT_PHONE?.trim() || payload.phone;
  const phone = cleanPhone(rawPhone);
  if (!phone.startsWith("+")) {
    throw new Error(`Phone number must be E.164 format, for example +15558675310. Got: ${rawPhone}`);
  }
  return payload.channel === "whatsapp" ? `whatsapp:${phone}` : phone;
}

async function sendEmail(payload: SendPayload): Promise<ProviderResult> {
  const serviceId = requireEnv("EMAILJS_SERVICE_ID");
  const templateId = requireEnv("EMAILJS_TEMPLATE_ID");
  const publicKey = requireEnv("EMAILJS_PUBLIC_KEY");
  const privateKey = process.env.EMAILJS_PRIVATE_KEY?.trim() || "";
  const to = resolveEmailRecipient(payload);

  const body: Record<string, any> = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: {
      to_name: payload.customerName,
      to_email: to,
      subject: payload.subject,
      message: payload.message
    }
  };

  if (privateKey) {
    body.accessToken = privateKey;
  }

  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const data = await readJsonOrText(response);
  if (!response.ok) throw asProviderError("EmailJS", response.status, data);

  return { provider: "emailjs", providerMessageId: payload.communicationId, status: "accepted" };
}

function twilioAuthHeader(accountSid: string, authToken: string) {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

function buildTwilioBody(payload: SendPayload) {
  const params = new URLSearchParams();
  params.set("To", resolvePhoneRecipient(payload));
  params.set("Body", payload.message);

  const callbackUrl = publicWebhookUrl("/webhooks/twilio", payload.communicationId);
  if (callbackUrl) {
    params.set("StatusCallback", callbackUrl);
  }

  if (payload.channel === "whatsapp") {
    params.set("From", requireEnv("TWILIO_WHATSAPP_FROM"));
    return params;
  }

  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID?.trim();
  if (messagingServiceSid) {
    params.set("MessagingServiceSid", messagingServiceSid);
  } else {
    params.set("From", requireEnv("TWILIO_SMS_FROM"));
  }

  return params;
}

async function sendTwilioMessage(payload: SendPayload): Promise<ProviderResult> {
  const accountSid = requireEnv("TWILIO_ACCOUNT_SID");
  const authToken = requireEnv("TWILIO_AUTH_TOKEN");
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: twilioAuthHeader(accountSid, authToken),
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: buildTwilioBody(payload)
  });

  const data = await readJsonOrText(response);
  if (!response.ok) throw asProviderError("Twilio", response.status, data);

  const body = data as { sid?: unknown; status?: unknown };
  return {
    provider: "twilio",
    providerMessageId: body.sid ? String(body.sid) : undefined,
    status: body.status ? String(body.status) : "accepted"
  };
}

async function sendReal(payload: SendPayload) {
  if (payload.channel === "email") return sendEmail(payload);
  return sendTwilioMessage(payload);
}

function mapTwilioStatus(status: string): ReceiptEvent | null {
  switch (status.toLowerCase()) {
    case "sent":
    case "delivered":
      return "delivered";
    case "undelivered":
    case "failed":
      return "failed";
    case "read":
      return "read";
    default:
      return null;
  }
}

function mapResendEvent(type: string): ReceiptEvent | null {
  switch (type.toLowerCase()) {
    case "email.delivered":
      return "delivered";
    case "email.bounced":
    case "email.complained":
      return "failed";
    case "email.opened":
      return "opened";
    case "email.clicked":
      return "clicked";
    default:
      return null;
  }
}

function extractCommunicationIdFromTags(tags: unknown): string {
  if (!tags) return "";
  if (Array.isArray(tags)) {
    const tag = tags.find((item) => typeof item === "object" && item !== null && "name" in item && (item as { name?: unknown }).name === "communication_id");
    return tag && typeof tag === "object" && "value" in tag ? String((tag as { value?: unknown }).value ?? "") : "";
  }

  if (typeof tags === "object") {
    const record = tags as Record<string, unknown>;
    return String(record.communication_id ?? record.communicationId ?? "");
  }

  return "";
}

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      deliveryMode: deliveryMode(),
      channelModes: {
        email: channelMode("email"),
        sms: channelMode("sms"),
        whatsapp: channelMode("whatsapp")
      },
      providers: providerConfig()
    }
  });
});

app.post("/send", async (req, res) => {
  let payload: SendPayload;
  try {
    payload = parsePayload(req.body as Partial<SendPayload>);
  } catch (error) {
    return res.status(400).json({ success: false, data: null, error: error instanceof Error ? error.message : "Invalid send payload." });
  }

  const mode = channelMode(payload.channel);
  console.log(`[${payload.channel.toUpperCase()}] mode=${mode} communicationId=${payload.communicationId}`);

  if (mode === "simulate") {
    void simulateLifecycle(payload);
    return res.status(202).json({ success: true, data: { status: "queued", mode: "simulate", channel: payload.channel } });
  }

  // Real send — currently only email reaches here
  try {
    const result = await sendReal(payload);
    if (process.env.MARK_ACCEPTED_AS_DELIVERED !== "false") {
      void notifyReceipt(payload.communicationId, "delivered");
    }
    return res.status(202).json({
      success: true,
      data: {
        status: "accepted",
        mode: "real",
        channel: payload.channel,
        provider: result.provider,
        providerMessageId: result.providerMessageId,
        providerStatus: result.status
      }
    });
  } catch (error) {
    console.error(`[EMAIL] real send failed: ${error instanceof Error ? error.message : error}`);
    return res.status(502).json({ success: false, data: null, error: error instanceof Error ? error.message : "Provider delivery failed." });
  }
});

app.post("/webhooks/twilio", async (req, res) => {
  const communicationId = String(req.query.communicationId ?? req.body.communicationId ?? "").trim();
  const status = String(req.body.MessageStatus ?? req.body.SmsStatus ?? "").trim();
  const eventType = mapTwilioStatus(status);

  if (communicationId && eventType) {
    await notifyReceipt(communicationId, eventType);
  }

  res.status(200).json({ success: true, data: { received: true } });
});

app.post("/webhooks/resend", async (req, res) => {
  const type = String(req.body?.type ?? "").trim();
  const data = req.body?.data as { tags?: unknown } | undefined;
  const communicationId = extractCommunicationIdFromTags(data?.tags).trim();
  const eventType = mapResendEvent(type);

  if (communicationId && eventType) {
    await notifyReceipt(communicationId, eventType);
  }

  res.status(200).json({ success: true, data: { received: true } });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, data: null, error: "Route not found." });
});

app.listen(port, () => {
  console.log(`Brew & Co. channel gateway running on http://localhost:${port}`);
});
