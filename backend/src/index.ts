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
const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
const localFrontendOrigin = /^http:\/\/(localhost|127\.0\.0\.1):30\d\d$/;
const allowedOrigins = new Set([frontendUrl, "http://localhost:3000", "http://127.0.0.1:3000"]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || localFrontendOrigin.test(origin)) {
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
