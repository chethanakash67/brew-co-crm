import type { Campaign, Communication, Customer } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { runSegmentSql } from "../lib/segmentSql.js";
import type { CampaignStats } from "../types/index.js";
import type { DraftCustomerContext } from "./ai.service.js";
import { sendCommunication } from "./channel.service.js";

const terminalDeliveredStatuses = new Set(["delivered", "opened", "clicked"]);
const terminalOpenedStatuses = new Set(["opened", "clicked"]);

function roundRate(value: number): number {
  return Math.round(value * 10) / 10;
}

function itemNames(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (item && typeof item === "object" && "name" in item) {
        return String((item as { name?: unknown }).name ?? "").trim();
      }
      return "";
    })
    .filter(Boolean);
}

function daysSince(date: Date | null | undefined): number | null {
  if (!date) return null;
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 86_400_000));
}

export async function getCampaignStats(campaignId: string): Promise<CampaignStats> {
  const statusCounts = await prisma.communication.groupBy({
    by: ["status"],
    where: { campaignId },
    _count: { id: true }
  });

  let sent = 0;
  let failed = 0;
  let delivered = 0;
  let opened = 0;
  let clicked = 0;

  for (const group of statusCounts) {
    const status = group.status;
    const count = group._count.id;

    sent += count;

    if (status === "failed") {
      failed += count;
    }
    if (terminalDeliveredStatuses.has(status)) {
      delivered += count;
    }
    if (terminalOpenedStatuses.has(status)) {
      opened += count;
    }
    if (status === "clicked") {
      clicked += count;
    }
  }

  return {
    sent,
    delivered,
    failed,
    opened,
    clicked,
    deliveryRate: sent ? roundRate((delivered / sent) * 100) : 0,
    openRate: delivered ? roundRate((opened / delivered) * 100) : 0,
    clickRate: opened ? roundRate((clicked / opened) * 100) : 0
  };
}

export async function listCampaignsWithStats(storeId?: string) {
  const where = storeId ? { storeId } : {};
  const campaigns = await prisma.campaign.findMany({
    where,
    include: { segment: true },
    orderBy: { createdAt: "desc" }
  });

  return Promise.all(
    campaigns.map(async (campaign) => ({
      ...campaign,
      stats: await getCampaignStats(campaign.id)
    }))
  );
}

export async function getRecentCampaigns(limit = 5, storeId?: string) {
  const where = storeId ? { storeId } : {};
  const campaigns = await prisma.campaign.findMany({
    where,
    take: limit,
    include: { segment: true },
    orderBy: { createdAt: "desc" }
  });

  return Promise.all(
    campaigns.map(async (campaign) => ({
      ...campaign,
      stats: await getCampaignStats(campaign.id)
    }))
  );
}

/** Replaces {{variable}} tokens with actual customer data for personalised dispatch. */
function personalizeMessage(template: string, customer: Customer, context?: DraftCustomerContext): string {
  const firstName = customer.name.split(" ")[0] ?? customer.name;
  return template
    .replace(/\{\{name\}\}/gi, firstName)
    .replace(/\{\{city\}\}/gi, customer.city)
    .replace(/\{\{tier\}\}/gi, customer.tier)
    .replace(/\{\{totalSpend\}\}/gi, String(Math.round(customer.totalSpend)))
    .replace(/\{\{totalOrders\}\}/gi, String(context?.totalOrders ?? 0))
    .replace(/\{\{favoriteItem\}\}/gi, context?.favoriteItem ?? "your favourite coffee")
    .replace(/\{\{lastItem\}\}/gi, context?.lastItem ?? "your last coffee")
    .replace(/\{\{lastOrderDaysAgo\}\}/gi, context?.lastOrderDaysAgo === null || context?.lastOrderDaysAgo === undefined ? "a few" : String(context.lastOrderDaysAgo));
}

async function dispatchBatch(campaign: Campaign, items: Array<{ communication: Communication; customer: Customer }>) {
  const results = await Promise.allSettled(
    items.map(({ communication, customer }) => {
      return sendCommunication(communication, customer, campaign.name);
    })
  );

  const failures = results.filter((result) => result.status === "rejected");

  await Promise.all(
    results.map(async (result, index) => {
      if (result.status === "rejected") {
        await prisma.$transaction(async (tx) => {
          await tx.communication.update({
            where: { id: items[index].communication.id },
            data: { status: "failed", sentAt: new Date() }
          });
          await tx.receipt.create({
            data: { communicationId: items[index].communication.id, eventType: "failed" }
          });
        });
      }
    })
  );

  return failures.length;
}

export async function buildCustomerContexts(customers: Customer[]): Promise<Map<string, DraftCustomerContext>> {
  if (customers.length === 0) return new Map();

  const orders = await prisma.order.findMany({
    where: { customerId: { in: customers.map((customer) => customer.id) } },
    orderBy: { orderedAt: "desc" }
  });

  const ordersByCustomer = new Map<string, typeof orders>();
  for (const order of orders) {
    const customerOrders = ordersByCustomer.get(order.customerId) ?? [];
    customerOrders.push(order);
    ordersByCustomer.set(order.customerId, customerOrders);
  }

  return new Map(
    customers.map((customer) => {
      const customerOrders = ordersByCustomer.get(customer.id) ?? [];
      const itemCounts = new Map<string, number>();
      for (const order of customerOrders) {
        for (const item of itemNames(order.items)) {
          itemCounts.set(item, (itemCounts.get(item) ?? 0) + 1);
        }
      }

      const favoriteItem = Array.from(itemCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "coffee";
      const lastOrder = customerOrders[0];
      const lastItem = itemNames(lastOrder?.items)[0] ?? favoriteItem;
      const firstName = customer.name.split(" ")[0] ?? customer.name;

      return [
        customer.id,
        {
          name: firstName,
          city: customer.city,
          tier: customer.tier,
          totalSpend: customer.totalSpend,
          totalOrders: customerOrders.length,
          favoriteItem,
          lastItem,
          lastOrderDaysAgo: daysSince(lastOrder?.orderedAt)
        }
      ];
    })
  );
}

export async function getSegmentCustomerContexts(segmentSql: string, storeId?: string, limit = 5): Promise<DraftCustomerContext[]> {
  const segmentCustomers = await runSegmentSql(segmentSql, limit, storeId);
  const customers = await prisma.customer.findMany({ where: { id: { in: segmentCustomers.map((customer) => customer.id) } } });
  const contextByCustomerId = await buildCustomerContexts(customers);
  return customers.map((customer) => contextByCustomerId.get(customer.id)).filter((context): context is DraftCustomerContext => Boolean(context));
}

export async function launchCampaign(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { segment: true }
  });

  if (!campaign) {
    throw new Error("Campaign not found.");
  }

  const existing = await prisma.communication.count({ where: { campaignId } });
  if (existing > 0) {
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: "launched" } });
    return { campaignId, queued: existing, dispatchFailures: 0 };
  }

  const segmentCustomers = await runSegmentSql(campaign.segment.sqlQuery, undefined, campaign.storeId ?? undefined);
  const customerIds = segmentCustomers.map((customer) => customer.id);
  const customers = await prisma.customer.findMany({ where: { id: { in: customerIds } } });
  const contextByCustomerId = await buildCustomerContexts(customers);

  const communications = await prisma.$transaction(
    customers.map((customer) => {
      const message = personalizeMessage(campaign.message, customer, contextByCustomerId.get(customer.id));
      return (
      prisma.communication.create({
        data: {
          campaignId: campaign.id,
          customerId: customer.id,
          message,
          channel: campaign.channel,
          status: "queued"
        }
      })
      );
    })
  );

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "launched" }
  });

  // Execute campaign dispatch in the background so we do not block the Express event loop
  void (async () => {
    let dispatchFailures = 0;
    try {
      for (let index = 0; index < communications.length; index += 50) {
        const batchCommunications = communications.slice(index, index + 50);
        const batch = batchCommunications.map((communication) => ({
          communication,
          customer: customers.find((customer) => customer.id === communication.customerId)!
        }));
        dispatchFailures += await dispatchBatch(campaign, batch);
      }
      console.log(`Campaign ${campaignId} background dispatch completed. Failures: ${dispatchFailures}`);
    } catch (err) {
      console.error(`Error executing campaign background dispatch for ${campaignId}:`, err);
    }
  })();

  return { campaignId, queued: communications.length, dispatchFailures: 0 };
}

export async function getEventTimeline(campaignId: string) {
  const receipts = await prisma.receipt.findMany({
    where: { communication: { campaignId } },
    orderBy: { timestamp: "asc" }
  });

  const buckets = new Map<string, Record<string, number | string>>();
  for (const receipt of receipts) {
    const key = receipt.timestamp.toISOString().slice(0, 10);
    const current = buckets.get(key) ?? { date: key, delivered: 0, failed: 0, opened: 0, clicked: 0 };
    current[receipt.eventType] = Number(current[receipt.eventType] ?? 0) + 1;
    buckets.set(key, current);
  }

  return Array.from(buckets.values());
}
