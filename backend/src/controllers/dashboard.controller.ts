import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { fail, ok, getStoreId } from "../lib/responses.js";
import { generateCampaignRecommendations, getFallbackCampaignRecommendations } from "../services/ai.service.js";
import { getCampaignStats, getRecentCampaigns } from "../services/campaign.service.js";
import { countSegmentSql } from "../lib/segmentSql.js";

export async function getDashboard(req: Request, res: Response) {
  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const storeId = getStoreId(req);
    const whereCustomers = storeId ? { storeId } : {};
    const whereSegments = storeId ? { storeId } : {};
    const whereCampaignsThisMonth = storeId ? { storeId, createdAt: { gte: monthStart } } : { createdAt: { gte: monthStart } };
    const whereCampaigns = storeId ? { storeId } : {};
    const whereInactiveCustomers = storeId ? { storeId, orders: { none: { orderedAt: { gte: sixtyDaysAgo } } } } : { orders: { none: { orderedAt: { gte: sixtyDaysAgo } } } };

    const [totalCustomers, activeSegments, campaignsThisMonth, campaigns, tierGroups, cityGroups, inactiveCustomers, recentCampaigns] =
      await Promise.all([
        prisma.customer.count({ where: whereCustomers }),
        prisma.segment.count({ where: whereSegments }),
        prisma.campaign.count({ where: whereCampaignsThisMonth }),
        prisma.campaign.findMany({ where: whereCampaigns, select: { id: true } }),
        prisma.customer.groupBy({ by: ["tier"], where: whereCustomers, _count: { tier: true } }),
        prisma.customer.groupBy({ by: ["city"], where: whereCustomers, _count: { city: true } }),
        prisma.customer.count({ where: whereInactiveCustomers }),
        getRecentCampaigns(5, storeId)
      ]);

    const campaignStats = await Promise.all(campaigns.map((campaign) => getCampaignStats(campaign.id)));
    const campaignsWithOpens = campaignStats.filter((stats) => stats.sent > 0);
    const avgOpenRate = campaignsWithOpens.length
      ? Math.round((campaignsWithOpens.reduce((sum, stats) => sum + stats.openRate, 0) / campaignsWithOpens.length) * 10) / 10
      : 0;

    const customerStats = {
      totalCustomers,
      tiers: tierGroups,
      cities: cityGroups,
      inactiveCustomers
    };

    const aiRecommendations =
      process.env.DASHBOARD_LIVE_AI === "true"
        ? await generateCampaignRecommendations(customerStats)
        : getFallbackCampaignRecommendations(customerStats);

    // Enrich recommendations with estimated audience counts
    const enrichedRecommendations = totalCustomers === 0 ? aiRecommendations.map((rec) => ({ ...rec, estimatedAudience: 0 })) : await Promise.all(
      aiRecommendations.map(async (rec) => {
        try {
          const estimatedAudience = await countSegmentSql(rec.suggestedSegmentQuery, storeId);
          return { ...rec, estimatedAudience };
        } catch {
          return { ...rec, estimatedAudience: 0 };
        }
      })
    );

    return ok(res, {
      totalCustomers,
      activeSegments,
      campaignsThisMonth,
      avgOpenRate,
      aiSuggestions: enrichedRecommendations.map((r) => r.title),
      aiRecommendations: enrichedRecommendations,
      recentCampaigns
    });
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : "Unable to load dashboard.");
  }
}
