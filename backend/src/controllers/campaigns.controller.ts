import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { fail, ok, getStoreId } from "../lib/responses.js";
import { draftMessages, generateInsight } from "../services/ai.service.js";
import { getCampaignStats, getEventTimeline, getSegmentCustomerContexts, launchCampaign, listCampaignsWithStats } from "../services/campaign.service.js";

function routeId(req: Request): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : value;
}

export async function listCampaigns(req: Request, res: Response) {
  try {
    const storeId = getStoreId(req);
    return ok(res, await listCampaignsWithStats(storeId));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : "Unable to list campaigns.");
  }
}

export async function draftCampaignMessage(req: Request, res: Response) {
  try {
    const segmentId = String(req.body.segmentId ?? "");
    const goal = String(req.body.goal ?? "").trim();
    const channel = String(req.body.channel ?? "").trim();

    if (!segmentId || !goal || !channel) {
      return fail(res, "segmentId, goal, and channel are required.", 400);
    }

    const segment = await prisma.segment.findUnique({ where: { id: segmentId } });
    if (!segment) return fail(res, "Segment not found.", 404);

    const customerContext = await getSegmentCustomerContexts(segment.sqlQuery, segment.storeId ?? undefined, 5);
    const draft = await draftMessages(goal, channel, segment.description, customerContext);
    const variants = draft.variants;
    const usedAi = draft.usedAi;
    return ok(res, { variants, usedAi, previewCustomers: customerContext });
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : "Unable to draft messages.");
  }
}

export async function createCampaign(req: Request, res: Response) {
  try {
    const name = String(req.body.name ?? "").trim();
    const segmentId = String(req.body.segmentId ?? "");
    const message = String(req.body.message ?? "").trim();
    const channel = String(req.body.channel ?? "").trim();

    if (!name || !segmentId || !message || !channel) {
      return fail(res, "name, segmentId, message, and channel are required.", 400);
    }

    const storeId = getStoreId(req);
    const campaign = await prisma.campaign.create({
      data: { name, segmentId, message, channel, status: "draft", storeId },
      include: { segment: true }
    });

    return ok(res, campaign, 201);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : "Unable to create campaign.", 400);
  }
}

export async function launchCampaignById(req: Request, res: Response) {
  try {
    return ok(res, await launchCampaign(routeId(req)));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : "Unable to launch campaign.", 400);
  }
}

export async function getCampaign(req: Request, res: Response) {
  try {
    const id = routeId(req);
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        segment: true,
        communications: {
          take: 25,
          orderBy: { sentAt: "desc" },
          include: { customer: true, receipts: { orderBy: { timestamp: "desc" }, take: 5 } }
        }
      }
    });

    if (!campaign) return fail(res, "Campaign not found.", 404);

    const [stats, timeline] = await Promise.all([getCampaignStats(campaign.id), getEventTimeline(campaign.id)]);
    return ok(res, { ...campaign, stats, timeline });
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : "Unable to load campaign.");
  }
}

export async function getCampaignStatsById(req: Request, res: Response) {
  try {
    return ok(res, await getCampaignStats(routeId(req)));
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : "Unable to load campaign stats.");
  }
}

export async function getCampaignInsights(req: Request, res: Response) {
  try {
    const id = routeId(req);
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { segment: true }
    });

    if (!campaign) return fail(res, "Campaign not found.", 404);

    const stats = await getCampaignStats(campaign.id);
    const insight = await generateInsight(stats, campaign.segment.name, campaign.channel);
    return ok(res, { insight });
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : "Unable to generate insight.", 500);
  }
}

export async function quickLaunchCampaign(req: Request, res: Response) {
  try {
    const segmentQuery = String(req.body.segmentQuery ?? "").trim();
    const segmentName = String(req.body.segmentName ?? "").trim();
    const segmentDescription = String(req.body.segmentDescription ?? "").trim();
    const channel = String(req.body.channel ?? "").trim();
    const goal = String(req.body.goal ?? "").trim();

    if (!segmentQuery || !segmentName || !channel || !goal) {
      return fail(res, "segmentQuery, segmentName, channel, and goal are required.", 400);
    }

    // Validate SQL safety before anything else
    const { assertSafeSegmentSql } = await import("../lib/segmentSql.js");
    const safeSql = assertSafeSegmentSql(segmentQuery);

    const storeId = getStoreId(req);

    // 1. Create the segment
    const segment = await prisma.segment.create({
      data: {
        name: segmentName,
        description: segmentDescription || goal,
        sqlQuery: safeSql,
        storeId
      }
    });

    // 2. AI drafts the message
    const customerContext = await getSegmentCustomerContexts(segment.sqlQuery, storeId, 5);
    const draft = await draftMessages(goal, channel, segment.description, customerContext);
    const message = draft.variants[0] ?? goal;

    // 3. Create the campaign
    const dateStr = new Date().toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    const campaign = await prisma.campaign.create({
      data: {
        name: `${segmentName} — ${dateStr}`,
        segmentId: segment.id,
        message,
        channel,
        status: "draft",
        storeId
      },
      include: { segment: true }
    });

    // 4. Launch immediately
    const launchResult = await launchCampaign(campaign.id);

    return ok(res, { campaign, segment, queued: launchResult.queued }, 201);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : "Unable to quick-launch campaign.", 400);
  }
}
