import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { fail, ok } from "../lib/responses.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const campaignId = typeof req.query.campaignId === "string" ? req.query.campaignId : undefined;
    const communications = await prisma.communication.findMany({
      where: campaignId ? { campaignId } : undefined,
      take: 100,
      orderBy: { sentAt: "desc" },
      include: { customer: true, campaign: true, receipts: { orderBy: { timestamp: "desc" }, take: 3 } }
    });

    return ok(res, communications);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : "Unable to list communications.");
  }
});

export default router;
