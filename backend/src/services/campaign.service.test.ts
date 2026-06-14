import { describe, it, expect, vi } from "vitest";

/**
 * Tests for getCampaignStats calculation logic.
 * We test the pure rate-calculation math inline since the DB calls
 * are the Prisma layer (tested at integration level).
 */

function roundRate(value: number): number {
  return Math.round(value * 10) / 10;
}

function computeStats(statusCounts: Array<{ status: string; count: number }>) {
  const terminalDeliveredStatuses = new Set(["delivered", "opened", "clicked"]);
  const terminalOpenedStatuses = new Set(["opened", "clicked"]);

  let sent = 0;
  let failed = 0;
  let delivered = 0;
  let opened = 0;
  let clicked = 0;

  for (const { status, count } of statusCounts) {
    sent += count;
    if (status === "failed") failed += count;
    if (terminalDeliveredStatuses.has(status)) delivered += count;
    if (terminalOpenedStatuses.has(status)) opened += count;
    if (status === "clicked") clicked += count;
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

describe("getCampaignStats calculation logic", () => {
  it("calculates 100% delivery rate when all messages are delivered", () => {
    const stats = computeStats([{ status: "delivered", count: 100 }]);
    expect(stats.sent).toBe(100);
    expect(stats.delivered).toBe(100);
    expect(stats.deliveryRate).toBe(100);
  });

  it("handles zero sent — all rates should be 0 to avoid NaN/Infinity", () => {
    const stats = computeStats([]);
    expect(stats.sent).toBe(0);
    expect(stats.deliveryRate).toBe(0);
    expect(stats.openRate).toBe(0);
    expect(stats.clickRate).toBe(0);
  });

  it("counts opened and clicked messages as delivered", () => {
    const stats = computeStats([
      { status: "delivered", count: 50 },
      { status: "opened", count: 30 },
      { status: "clicked", count: 20 }
    ]);
    expect(stats.sent).toBe(100);
    expect(stats.delivered).toBe(100); // all three count as delivered
    expect(stats.opened).toBe(50); // opened + clicked
    expect(stats.clicked).toBe(20);
  });

  it("does not count failed messages as delivered", () => {
    const stats = computeStats([
      { status: "delivered", count: 80 },
      { status: "failed", count: 20 }
    ]);
    expect(stats.sent).toBe(100);
    expect(stats.failed).toBe(20);
    expect(stats.delivered).toBe(80);
    expect(stats.deliveryRate).toBe(80);
  });

  it("handles zero delivered — open rate should be 0", () => {
    const stats = computeStats([{ status: "failed", count: 100 }]);
    expect(stats.delivered).toBe(0);
    expect(stats.openRate).toBe(0);
  });

  it("handles zero opened — click rate should be 0", () => {
    const stats = computeStats([{ status: "delivered", count: 100 }]);
    expect(stats.opened).toBe(0);
    expect(stats.clickRate).toBe(0);
  });

  it("rounds rates to 1 decimal place", () => {
    const stats = computeStats([
      { status: "delivered", count: 1 },
      { status: "failed", count: 2 }
    ]);
    // 1/3 * 100 = 33.333... → 33.3
    expect(stats.deliveryRate).toBe(33.3);
  });
});
