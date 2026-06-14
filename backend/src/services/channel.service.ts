import type { Communication, Customer } from "@prisma/client";

type SendPayload = {
  communicationId: string;
  customerId: string;
  customerName: string;
  email: string;
  phone: string;
  message: string;
  channel: string;
  subject: string;
};

/**
 * AI drafts email messages in the format:
 *   "Subject: <subject line> | Body: <body text>"
 * This parser extracts both parts so the real email is sent correctly.
 * Falls back gracefully if the format isn't present.
 */
function parseEmailMessage(raw: string, fallbackSubject: string): { subject: string; body: string } {
  const match = raw.match(/^Subject:\s*(.+?)\s*\|\s*Body:\s*([\s\S]+)$/i);
  if (match) {
    return {
      subject: match[1].trim(),
      body: match[2].trim()
    };
  }
  // Plain message — use as body, campaign name as subject
  return { subject: fallbackSubject, body: raw };
}

export async function sendCommunication(communication: Communication, customer: Customer, campaignName: string): Promise<void> {
  const baseUrl = process.env.CHANNEL_STUB_URL ?? "http://localhost:3001";

  let subject = campaignName;
  let message = communication.message;

  // For email, extract AI-generated subject + body from the structured format
  if (communication.channel === "email") {
    const parsed = parseEmailMessage(communication.message, campaignName);
    subject = parsed.subject;
    message = parsed.body;
  }

  const payload: SendPayload = {
    communicationId: communication.id,
    customerId: customer.id,
    customerName: customer.name,
    email: customer.email,
    phone: customer.phone,
    message,
    channel: communication.channel,
    subject
  };

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Channel gateway rejected ${customer.email}: ${response.status} ${body}`);
  }
}

