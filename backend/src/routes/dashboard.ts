import { Router } from "express";
import { getDashboard } from "../controllers/dashboard.controller.js";
import { aiRateLimit } from "../lib/rateLimit.js";

const router = Router();

router.get("/", aiRateLimit, getDashboard);

export default router;
