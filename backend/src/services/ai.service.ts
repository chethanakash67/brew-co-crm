import type { CampaignRecommendation } from "../types/index.js";

export type DraftCustomerContext = {
  name: string;
  city: string;
  tier: string;
  totalSpend: number;
  totalOrders: number;
  favoriteItem: string;
  lastItem: string;
  lastOrderDaysAgo: number | null;
};

// ---------------------------------------------------------------------------
// Gemini API — used for all AI features
// Primary model : gemini-2.5-flash (latest, fastest, best free tier)
// Fallback model: gemini-2.0-flash (stable alternative)
// API key       : GEMINI_API_KEY in backend/.env
// Get free key at: https://aistudio.google.com/apikey
// Available models: run "node test-gemini-key.mjs --list-models" to see all
// ---------------------------------------------------------------------------
const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

type GeminiConfig = {
  maxOutputTokens?: number;
  timeoutMs?: number;
  responseMimeType?: string;
};

async function callGemini(prompt: string, config?: GeminiConfig): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const maxOutputTokens = config?.maxOutputTokens ?? 1024;
  const timeoutMs = config?.timeoutMs ?? 8000;
  const responseMimeType = config?.responseMimeType;

  if (!apiKey) {
    return null;
  }

  for (const model of GEMINI_MODELS) {
    const url = `${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`;

    let response: Response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      response = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens,
            temperature: 0.7,
            topP: 0.9,
            ...(responseMimeType && { responseMimeType })
          }
        })
      });
    } catch (networkErr) {
      console.error(`Gemini network error (${model}):`, networkErr);
      continue;
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 429) {
      console.warn(`Gemini quota exhausted for ${model}, trying next model...`);
      continue;
    }

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gemini API error ${response.status} (${model}): ${body}`);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
    };

    const candidate = payload.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text?.trim();
    if (text) return text;
    if (candidate?.finishReason && candidate.finishReason !== "STOP") {
      console.warn(`Gemini ${model} finished with reason: ${candidate.finishReason}`);
    }
  }

  console.warn("All Gemini models exhausted, returning null.");
  return null;
}

function hasGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function stripMarkdownJson(text: string): string {
  const stripped = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const arrayStart = stripped.indexOf("[");
  const arrayEnd = stripped.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    return stripped.slice(arrayStart, arrayEnd + 1);
  }
  return stripped;
}

function tryExtractJsonArray(text: string): string[] | null {
  const cleaned = stripMarkdownJson(text);
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed.map(String).slice(0, 3);
    if (typeof parsed === "string") {
      const inner = JSON.parse(parsed);
      if (Array.isArray(inner)) return inner.map(String).slice(0, 3);
    }
    const extracted = parsed.variants ?? parsed.messages ?? parsed.data;
    if (Array.isArray(extracted)) return extracted.map(String).slice(0, 3);
    return null;
  } catch {
    return null;
  }
}

function parseJsonArray(text: string | null): string[] | null {
  if (!text) return null;
  const result = tryExtractJsonArray(text);
  if (result) return result;
  const lines = text
    .replace(/```[\s\S]*?```/g, "")
    .split(/[\n\r]+/)
    .map((l) => l.replace(/^["\s*\d+[\).]\s*]+/, "").trim())
    .filter((l) => l.length > 20 && (l.includes("{{") || l.toLowerCase().includes("coffee") || l.toLowerCase().includes("brew")))
    .map((l) => l.replace(/^["\s*]+|["\s*,]+$/g, "").trim());
  return lines.length >= 3 ? lines.slice(0, 3) : null;
}

// ---------------------------------------------------------------------------
// Fallback: rule-based NL → SQL (used when Gemini key is absent)
// ---------------------------------------------------------------------------

function fallbackNlToSql(naturalLanguage: string): string {
  const text = naturalLanguage.toLowerCase();
  const conditions: string[] = [];

  for (const city of ["Chennai", "Mumbai", "Bangalore", "Delhi", "Hyderabad"]) {
    if (text.includes(city.toLowerCase())) {
      conditions.push(`c.city = '${city}'`);
      break;
    }
  }

  for (const tier of ["gold", "silver", "bronze"]) {
    if (text.includes(tier)) {
      conditions.push(`c.tier = '${tier}'`);
      break;
    }
  }

  const spendMatch = text.match(
    /(?:spend|spent|lifetime value|total spend).*?(?:above|over|more than|greater than)\s*(?:rs\.?|₹)?\s*(\d+)/
  );
  if (spendMatch) {
    conditions.push(`c.totalSpend > ${Number(spendMatch[1])}`);
  }

  const inactiveMatch = text.match(/(?:haven't|havent|not|no|inactive|dormant).*?(\d+)\s*days/);
  if (inactiveMatch) {
    conditions.push(
      `c.id NOT IN (SELECT customerId FROM orders WHERE orderedAt >= NOW() - INTERVAL '${Number(inactiveMatch[1])} days')`
    );
  }

  const recentMatch = text.match(/(?:ordered|bought|purchased|recent).*?(\d+)\s*days/);
  if (!inactiveMatch && recentMatch) {
    conditions.push(`o.orderedAt >= NOW() - INTERVAL '${Number(recentMatch[1])} days'`);
  }

  for (const item of ["Espresso", "Latte", "Cappuccino", "Cold Brew", "Mocha", "Filter Coffee", "Americano", "Flat White"]) {
    if (text.includes(item.toLowerCase())) {
      conditions.push(`o.items::text ILIKE '%${item}%'`);
      break;
    }
  }

  if (conditions.length === 0) {
    conditions.push("c.totalSpend >= 0");
  }

  return `SELECT DISTINCT c.id, c.name, c.email, c.phone, c.city, c.tier, c.totalSpend FROM customers c LEFT JOIN orders o ON c.id = o.customerId WHERE ${conditions.join(
    " AND "
  )}`;
}

// ---------------------------------------------------------------------------
// Exported AI functions
// ---------------------------------------------------------------------------

export async function nlToSQL(naturalLanguage: string): Promise<string> {
  const prompt = `You are a SQL expert. Convert the natural language query below into a valid PostgreSQL SELECT.

Available tables:
- customers(id, name, email, phone, city, tier, totalSpend, createdAt)
- orders(id, customerId, amount, items, channel, orderedAt)

Rules:
- Always use this exact prefix: SELECT DISTINCT c.id, c.name, c.email, c.phone, c.city, c.tier, c.totalSpend FROM customers c LEFT JOIN orders o ON c.id = o.customerId WHERE
- Return ONLY the SQL query — no markdown, no explanation, no code fences.

Query: ${naturalLanguage}`;

  const response = await callGemini(prompt, { maxOutputTokens: 400 });
  return response ?? fallbackNlToSql(naturalLanguage);
}

function cleanGoal(goal: string): string {
  return goal
    .replace(/\bcomr\b/gi, "come")
    .replace(/\bcmr\b/gi, "come")
    .replace(/\bofers\b/gi, "offers")
    .replace(/\bofferes\b/gi, "offers")
    .replace(/\bcofee\b/gi, "coffee")
    .replace(/\bcoffe\b/gi, "coffee")
    .replace(/\bcutomers\b/gi, "customers")
    .replace(/\bcustmers\b/gi, "customers")
    .replace(/\bmesage\b/gi, "message")
    .replace(/\bmsg\b/gi, "message")
    .replace(/\blot\b/gi, "lots")
    .replace(/\s+/g, " ")
    .trim();
}

function fallbackGoalMatter(goal: string): string {
  const corrected = cleanGoal(goal);
  if (!corrected) return "a special Brew & Co. offer";

  const discount = corrected.match(/(\d{1,2})\s*(?:to|-)\s*(\d{1,2})\s*%?\s*off/i);
  if (discount) return `${discount[1]}-${discount[2]}% off on your next coffee order`;

  const singleDiscount = corrected.match(/(\d{1,2})\s*%?\s*off/i);
  if (singleDiscount) return `${singleDiscount[1]}% off on your next Brew & Co. visit`;

  return corrected.replace(/\.$/, "");
}

function normalizeForCopyCheck(text: string): string {
  return cleanGoal(text)
    .toLowerCase()
    .replace(/[^a-z0-9% ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeCopiedGoal(variant: string, goal: string): boolean {
  const normalizedVariant = normalizeForCopyCheck(variant);
  const normalizedGoal = normalizeForCopyCheck(goal);
  if (!normalizedGoal) return false;
  if (normalizedVariant === normalizedGoal) return true;
  if (normalizedGoal.length > 18 && normalizedVariant.includes(normalizedGoal)) return true;
  const goalWords = new Set(normalizedGoal.split(" ").filter((word) => word.length > 3));
  if (goalWords.size < 3) return false;
  const variantWords = normalizedVariant.split(" ");
  const overlap = variantWords.filter((word) => goalWords.has(word)).length;
  return overlap / Math.max(goalWords.size, 1) > 0.98 && variantWords.length <= goalWords.size + 5;
}

function sampleCustomerLines(customers: DraftCustomerContext[]): string {
  if (customers.length === 0) return "No sample customers available.";
  return customers
    .map((customer) => {
      const lastOrder = customer.lastOrderDaysAgo === null ? "no orders yet" : `${customer.lastOrderDaysAgo} days ago`;
      return `- ${customer.name}, ${customer.city}, ${customer.tier} tier, Rs ${Math.round(customer.totalSpend)} lifetime spend, ${customer.totalOrders} orders, favourite: ${customer.favoriteItem}, last bought: ${customer.lastItem}, last order: ${lastOrder}`;
    })
    .join("\n");
}

export async function draftMessages(
  goal: string,
  channel: string,
  segmentDescription: string,
  customerContext: DraftCustomerContext[] = []
): Promise<{ variants: string[]; usedAi: boolean }> {
  const channelRules: Record<string, string> = {
    sms: `SMS STRICT RULES:
- Maximum 160 characters TOTAL — count every character
- Plain text only, no emojis
- Must use {{name}} for personalisation
- Use at least one purchase-history variable where natural: {{tier}}, {{favoriteItem}}, {{lastItem}}, {{lastOrderDaysAgo}}, {{totalSpend}}, or {{totalOrders}}
- Single clear call to action, no line breaks`,
    whatsapp: `WHATSAPP RULES:
- Maximum 300 characters
- Use 1–2 relevant emojis (☕ 🎁 ⭐ 🔥)
- Conversational, warm tone — like a message from a trusted friend
- Must use {{name}} for personalisation
- Use at least one purchase-history variable where natural: {{tier}}, {{favoriteItem}}, {{lastItem}}, {{lastOrderDaysAgo}}, {{totalSpend}}, or {{totalOrders}}
- One clear call to action`,
    email: `EMAIL RULES:
- Format must be exactly: "Subject: <subject line> | Body: <body>"
- Subject: max 60 chars, curiosity-driven, no spam words (free, click, buy)
- Body: max 200 chars, friendly and personal
- Must use {{name}} in body; use {{city}} where relevant
- Use at least one purchase-history variable where natural: {{tier}}, {{favoriteItem}}, {{lastItem}}, {{lastOrderDaysAgo}}, {{totalSpend}}, or {{totalOrders}}`
  };

  const rules = channelRules[channel] ?? channelRules.whatsapp;
  const correctedGoal = cleanGoal(goal);

  const prompt = `You are a senior CRM copywriter for Brew & Co., a premium Indian coffee brand with stores across Chennai, Mumbai, Bangalore, Delhi, and Hyderabad.

Write EXACTLY 3 distinct message variants for a ${channel.toUpperCase()} campaign. Each variant must take a different persuasive angle:
1. Emotional warmth — make the customer feel valued
2. Urgency / scarcity — create a reason to act now
3. Exclusivity / reward — make them feel special

${rules}

Available personalisation variables — use them naturally:
- {{name}} — customer first name (REQUIRED in every variant)
- {{city}} — customer's city
- {{tier}} — loyalty tier
- {{totalSpend}} — rounded lifetime spend in rupees
- {{totalOrders}} — customer order count
- {{favoriteItem}} — customer's most purchased item
- {{lastItem}} — most recent purchased item
- {{lastOrderDaysAgo}} — days since the last order

Campaign context:
- Audience segment: ${segmentDescription}
- Raw user goal with possible spelling/grammar mistakes: ${goal}
- Corrected campaign goal to write from: ${correctedGoal}
- Channel: ${channel}

Sample audience details from this segment:
${sampleCustomerLines(customerContext)}

Tone: Premium, warm, confident. Never salesy or desperate. Rooted in Indian coffee culture.
Important:
- Do not copy the raw user words directly if they contain mistakes.
- Fix spelling and sentence formation.
- Add useful marketing matter beyond the user input: a benefit, reason to return, and clear call to action.
- Make the message feel generated for each customer by using their level/tier and purchase history variables.
- Every variant must include {{name}} and at least one purchase-history variable.
- Never return the user's sentence with only placeholders added.
- Never use the exact raw phrase "${goal}" as copy.
- Keep the offer meaning, but rewrite it into polished CRM language.

Return ONLY a JSON array of exactly 3 strings. No markdown, no explanation, no extra text.
Example format: ["Hi {{name}} ...", "{{name}}, ...", "Hey {{name}} ..."]`;

  if (!hasGeminiKey()) {
    throw new Error("Gemini API key is not loaded by the backend. Restart the backend after setting GEMINI_API_KEY in backend/.env.");
  }

  const response = await callGemini(prompt, {
    maxOutputTokens: 2048,
    timeoutMs: 30000,
    responseMimeType: "application/json"
  });

  if (response) {
    const parsed = parseJsonArray(response);
    if (
      parsed?.length === 3 &&
      parsed.every((v) => v.trim().length > 0) &&
      !parsed.some((variant) => looksLikeCopiedGoal(variant, goal))
    ) {
      return { variants: parsed, usedAi: true };
    }
  }

  console.warn("Gemini response invalid, using fallback templates.", response ? `raw: ${response.slice(0, 200)}` : "null response");

  const offer = fallbackGoalMatter(goal);
  if (channel === "sms") {
    return { variants: [
      `Hi {{name}}, your {{tier}} Brew & Co. perk is here: ${offer}. Come back for {{favoriteItem}} today!`.slice(0, 160),
      `{{name}}, it has been {{lastOrderDaysAgo}} days since your {{lastItem}}. Enjoy ${offer} at Brew & Co.`.slice(0, 160),
      `Hey {{name}}, after {{totalOrders}} coffee moments with us, ${offer} is waiting on your next {{favoriteItem}}.`.slice(0, 160)
    ], usedAi: false };
  }

  if (channel === "email") {
    return { variants: [
      `Subject: {{name}}, your {{tier}} coffee treat is ready | Body: Hi {{name}}, we noticed you love {{favoriteItem}}. Come back to Brew & Co. in {{city}} this week for ${offer}.`,
      `Subject: Time for your next {{lastItem}}? | Body: Dear {{name}}, it has been {{lastOrderDaysAgo}} days since your last visit. Your {{tier}} status now unlocks ${offer}.`,
      `Subject: A reward for {{totalOrders}} coffee moments | Body: Hello {{name}}, thanks for choosing Brew & Co. {{totalOrders}} times. Your next {{favoriteItem}} in {{city}} gets ${offer}.`
    ], usedAi: false };
  }

  return { variants: [
    `Hey {{name}}! ☕ Your {{tier}} Brew & Co. profile says {{favoriteItem}} is your kind of coffee. Come back to {{city}} this week for ${offer}.`.slice(0, 300),
    `Hi {{name}} 🔥 It has been {{lastOrderDaysAgo}} days since your {{lastItem}}. We saved ${offer} to make your next Brew & Co. visit sweeter.`.slice(0, 300),
    `{{name}}, thanks for {{totalOrders}} Brew & Co. orders so far ⭐ Your next {{favoriteItem}} in {{city}} now comes with ${offer}.`.slice(0, 300)
  ], usedAi: false };
}

export async function generateInsight(stats: object, segmentName: string, channel: string): Promise<string> {
  const prompt = `Analyze the following campaign performance stats and write 2–3 sentences of plain English insight. Be specific and actionable. Mention the channel. Suggest one concrete next step.

Campaign: ${segmentName}
Channel: ${channel}
Stats: ${JSON.stringify(stats)}`;

  const response = await callGemini(prompt, { maxOutputTokens: 400 });
  if (response) return response;

  const typedStats = stats as { openRate?: number; clickRate?: number; delivered?: number; sent?: number };
  return `${segmentName} is seeing a ${Math.round(typedStats.openRate ?? 0)}% open rate on ${channel}. Delivery is ${
    typedStats.sent ? Math.round(((typedStats.delivered ?? 0) / typedStats.sent) * 100) : 0
  }%. The next useful move is to test a sharper offer and different send time for customers who opened but did not click.`;
}

export async function getDashboardSuggestions(customerStats: object): Promise<string[]> {
  const prompt = `Given these customer base stats, return exactly 3 actionable marketing campaign suggestions as a JSON array of strings. Each suggestion must be under 100 characters. Be specific — mention tiers, cities, or behaviours.

Stats: ${JSON.stringify(customerStats)}

Return ONLY a JSON array of 3 strings. No markdown, no explanation.`;

  const response = await callGemini(prompt, { maxOutputTokens: 400 });
  const parsed = parseJsonArray(response);
  if (parsed?.length === 3) return parsed.map((item) => item.slice(0, 99));

  return [
    "Win back dormant gold customers with a weekend coffee credit.",
    "Send Cold Brew bundles to recent online buyers in hot cities.",
    "Invite high-spend silver customers to unlock gold tier perks."
  ];
}

export function getFallbackCampaignRecommendations(customerStats: object): CampaignRecommendation[] {
  const stats = customerStats as { inactiveCustomers?: number };
  const inactiveCount = stats.inactiveCustomers ?? 0;
  return [
    {
      title: "Win Back Dormant Customers",
      description: `${inactiveCount > 0 ? inactiveCount + " customers" : "Customers"} haven't ordered in 60+ days. Re-engage with a targeted offer.`,
      suggestedSegmentQuery:
        "SELECT DISTINCT c.id, c.name, c.email, c.phone, c.city, c.tier, c.totalSpend FROM customers c LEFT JOIN orders o ON c.id = o.customerId WHERE c.id NOT IN (SELECT customerid FROM orders WHERE orderedat >= NOW() - INTERVAL '60 days')",
      suggestedChannel: "whatsapp",
      suggestedGoal: "Bring back dormant customers with a 15% off weekend offer."
    },
    {
      title: "Reward High-Value Regulars",
      description: "Gold-tier customers with high lifetime spend are your best advocates. Deepen loyalty.",
      suggestedSegmentQuery:
        "SELECT DISTINCT c.id, c.name, c.email, c.phone, c.city, c.tier, c.totalSpend FROM customers c LEFT JOIN orders o ON c.id = o.customerId WHERE c.tier = 'gold' AND c.totalSpend > 5000",
      suggestedChannel: "whatsapp",
      suggestedGoal: "Thank top customers with an exclusive early access offer."
    },
    {
      title: "Convert Recent Buyers",
      description: "Customers who ordered in the last 30 days are warm. Give them a reason to return.",
      suggestedSegmentQuery:
        "SELECT DISTINCT c.id, c.name, c.email, c.phone, c.city, c.tier, c.totalSpend FROM customers c LEFT JOIN orders o ON c.id = o.customerId WHERE o.orderedat >= NOW() - INTERVAL '30 days'",
      suggestedChannel: "sms",
      suggestedGoal: "Drive a second purchase with a bundle deal this week."
    }
  ];
}

export async function generateCampaignRecommendations(customerStats: object): Promise<CampaignRecommendation[]> {
  const prompt = `You are a marketing AI for Brew & Co., a premium Indian coffee brand CRM. Analyze the customer data below and return EXACTLY 3 campaign recommendations as a JSON array.

Each element must have these exact keys:
- title: short action-oriented name (max 60 chars)
- description: 1-2 sentences explaining who to target and why (max 150 chars)
- suggestedSegmentQuery: a valid PostgreSQL SELECT starting with "SELECT DISTINCT c.id, c.name, c.email, c.phone, c.city, c.tier, c.totalSpend FROM customers c LEFT JOIN orders o ON c.id = o.customerId WHERE ..."
- suggestedChannel: one of "whatsapp", "sms", "email"
- suggestedGoal: a campaign goal sentence (max 100 chars)

Customer data: ${JSON.stringify(customerStats)}

Return ONLY the JSON array. No markdown, no explanation.`;

  const response = await callGemini(prompt, { maxOutputTokens: 1500 });

  if (response) {
    try {
      const parsed = JSON.parse(stripMarkdownJson(response));
      if (Array.isArray(parsed) && parsed.length >= 3) {
        return parsed.slice(0, 3).map((r: Partial<CampaignRecommendation>) => ({
          title: String(r.title ?? "").slice(0, 60),
          description: String(r.description ?? "").slice(0, 150),
          suggestedSegmentQuery: String(r.suggestedSegmentQuery ?? ""),
          suggestedChannel: ["whatsapp", "sms", "email"].includes(String(r.suggestedChannel))
            ? String(r.suggestedChannel)
            : "whatsapp",
          suggestedGoal: String(r.suggestedGoal ?? "").slice(0, 100)
        }));
      }
    } catch {
      // fall through to hardcoded fallback
    }
  }

  return getFallbackCampaignRecommendations(customerStats);
}
