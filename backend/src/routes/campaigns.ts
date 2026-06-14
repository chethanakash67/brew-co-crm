import { Router } from "express";
import {
  createCampaign,
  draftCampaignMessage,
  getCampaign,
  getCampaignInsights,
  getCampaignStatsById,
  launchCampaignById,
  listCampaigns,
  quickLaunchCampaign
} from "../controllers/campaigns.controller.js";
import { aiRateLimit } from "../lib/rateLimit.js";

const router = Router();

router.get("/", listCampaigns);
router.post("/draft-message", aiRateLimit, draftCampaignMessage);
router.post("/quick-launch", aiRateLimit, quickLaunchCampaign);
router.post("/", createCampaign);
router.post("/:id/launch", launchCampaignById);
router.get("/:id", getCampaign);
router.get("/:id/stats", getCampaignStatsById);
router.get("/:id/insights", aiRateLimit, getCampaignInsights);

export default router;
