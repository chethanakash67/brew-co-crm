#!/usr/bin/env node
/**
 * Quick test: verifies your GEMINI_API_KEY is valid and working.
 * Run: node test-gemini-key.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));

// Parse .env manually (no external deps needed)
function loadEnv(path) {
  try {
    const lines = readFileSync(path, "utf8").split("\n");
    for (const line of lines) {
      const match = line.match(/^([A-Z_]+)\s*=\s*"?([^"]*)"?$/);
      if (match) process.env[match[1]] = match[2];
    }
  } catch {
    console.error("Could not read .env file at", path);
  }
}

loadEnv(resolve(__dir, ".env"));

const key = process.env.GEMINI_API_KEY?.trim();

if (!key) {
  console.error("\n❌  GEMINI_API_KEY is empty in backend/.env");
  console.error("    Open backend/.env and set:  GEMINI_API_KEY=AIza-your-actual-key");
  console.error("    Get a free key at: https://aistudio.google.com/apikey\n");
  process.exit(1);
}

if (!key.startsWith("AIza-")) {
  console.warn("\nNote: many Google API keys start with 'AIza-', but this key uses a different prefix.");
  console.warn("Continuing with the live Gemini request to verify it directly.\n");
}

console.log(`\n🔑  Key found: ${key.slice(0, 8)}... (${key.length} chars)`);
console.log("📡  Sending test request to Gemini...\n");

const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Say 'Gemini is working' in exactly 3 words." }] }],
      generationConfig: { maxOutputTokens: 50, temperature: 0.2 }
    })
  }
);

const data = await res.json();

if (!res.ok) {
  console.error("❌  Gemini API returned an error:\n");
  console.error(JSON.stringify(data, null, 2));
  if (data?.error?.status === "INVALID_ARGUMENT" || data?.error?.code === 400) {
    console.error("\n→  Your key format looks wrong. Double-check it at https://aistudio.google.com/apikey");
  } else if (data?.error?.code === 403) {
    console.error("\n→  Key is valid but access is denied. Make sure the Generative Language API is enabled.");
  }
  process.exit(1);
}

const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
if (!text?.trim()) {
  console.error("❌  Gemini returned a successful response, but no text was generated:\n");
  console.error(JSON.stringify(data, null, 2));
  process.exit(1);
}

console.log("✅  Gemini responded:", text.trim());
console.log("\n🚀  Key is valid! Now restart your backend server:\n");
console.log("    cd backend && npm run dev\n");
