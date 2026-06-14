import { Router } from "express";
import { createSegment, getSegmentCustomers, listSegments, previewSegment } from "../controllers/segments.controller.js";
import { aiRateLimit } from "../lib/rateLimit.js";

const router = Router();

router.get("/", listSegments);
router.post("/preview", aiRateLimit, previewSegment);
router.post("/", createSegment);
router.get("/:id/customers", getSegmentCustomers);

export default router;
