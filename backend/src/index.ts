import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import campaignsRouter from "./routes/campaigns.js";
import communicationsRouter from "./routes/communications.js";
import customersRouter from "./routes/customers.js";
import dashboardRouter from "./routes/dashboard.js";
import receiptsRouter from "./routes/receipts.js";
import segmentsRouter from "./routes/segments.js";
import storesRouter from "./routes/stores.js";
import { globalRateLimit } from "./lib/rateLimit.js";

dotenv.config({ path: ".env" });
dotenv.config({ path: "backend/.env" });

const app = express();
const port = Number(process.env.PORT ?? 8000);
const localFrontendOrigin = /^http:\/\/(localhost|127\.0\.0\.1):30\d\d$/;

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return value.replace(/\/$/, "");
  }
}

const allowedOrigins = new Set(
  [
    process.env.FRONTEND_URL,
    ...(process.env.FRONTEND_URLS?.split(",") ?? []),
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => normalizeOrigin(value.trim()))
);

function isVercelFrontendOrigin(origin: string) {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "https:") return false;
    return (
      hostname === "brewco-crm.vercel.app" ||
      hostname === "brew-co-crm-chi.vercel.app" ||
      (hostname.startsWith("brew-co-crm-") && hostname.endsWith(".vercel.app")) ||
      (hostname.startsWith("brew-co-") && hostname.endsWith("-chethanakash67s-projects.vercel.app"))
    );
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      const normalizedOrigin = origin ? normalizeOrigin(origin) : undefined;
      if (
        !normalizedOrigin ||
        allowedOrigins.has(normalizedOrigin) ||
        localFrontendOrigin.test(normalizedOrigin) ||
        isVercelFrontendOrigin(normalizedOrigin)
      ) {
        callback(null, true);
        return;
      }
      callback(new Error("Not allowed by CORS."));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(globalRateLimit);

app.get("/health", (_req, res) => res.json({ success: true, data: { status: "ok" } }));
app.use("/api/stores", storesRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/customers", customersRouter);
app.use("/api/segments", segmentsRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/communications", communicationsRouter);
app.use("/api/receipts", receiptsRouter);

app.use((_req, res) => {
  res.status(404).json({ success: false, data: null, error: "Route not found." });
});

// Global error handler — must have 4 params for Express to treat it as error middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ success: false, data: null, error: err.message ?? "Internal server error." });
});

app.listen(port, () => {
  console.log(`Brew & Co. CRM backend running on http://localhost:${port}`);
});
