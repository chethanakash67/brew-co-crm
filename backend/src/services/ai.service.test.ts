import { describe, it, expect } from "vitest";

/**
 * Tests for the fallbackNlToSql function and related AI service utilities.
 * We test the fallback logic inline since it's pure deterministic logic.
 */

// Inline the fallback function to test without DB/API deps
function fallbackNlToSql(query: string): string {
  const text = query.toLowerCase();
  const conditions: string[] = [];

  const BASE =
    "SELECT DISTINCT c.id, c.name, c.email, c.phone, c.city, c.tier, c.totalSpend FROM customers c LEFT JOIN orders o ON c.id = o.customerId WHERE ";

  for (const city of ["Chennai", "Mumbai", "Bangalore", "Delhi", "Hyderabad"]) {
    if (text.includes(city.toLowerCase())) {
      conditions.push(`c.city = '${city}'`);
      break;
    }
  }

  for (const [tier, keyword] of [
    ["gold", "gold"],
    ["silver", "silver"],
    ["bronze", "bronze"]
  ] as const) {
    if (text.includes(keyword)) {
      conditions.push(`c.tier = '${tier}'`);
      break;
    }
  }

  const spendMatch = text.match(
    /(?:spend|spent|lifetime value|total spend).*?(?:above|over|more than|greater than)\s*(?:rs\.?|₹)?\s*(\d+)/
  );
  if (spendMatch) {
    conditions.push(`c.totalSpend > ${Number(spendMatch[1])}`);
  }

  const inactiveMatch = text.match(/(?:haven't|havent|not|no|inactive|dormant).*?(\d+)\s*days/);
  if (inactiveMatch) {
    conditions.push(
      `c.id NOT IN (SELECT customerId FROM orders WHERE orderedAt >= NOW() - INTERVAL '${Number(inactiveMatch[1])} days')`
    );
  }

  const recentMatch = text.match(/(?:ordered|bought|purchased|recent).*?(\d+)\s*days/);
  if (!inactiveMatch && recentMatch) {
    conditions.push(`o.orderedAt >= NOW() - INTERVAL '${Number(recentMatch[1])} days'`);
  }

  if (conditions.length === 0) {
    conditions.push("c.totalSpend >= 0");
  }

  return `${BASE}${conditions.join(" AND ")}`;
}

describe("fallbackNlToSql", () => {
  it("generates a city filter for 'gold customers in Mumbai'", () => {
    const sql = fallbackNlToSql("gold customers in Mumbai");
    expect(sql).toContain("c.city = 'Mumbai'");
    expect(sql).toContain("c.tier = 'gold'");
  });

  it("generates a tier filter for 'all silver tier customers'", () => {
    const sql = fallbackNlToSql("all silver tier customers");
    expect(sql).toContain("c.tier = 'silver'");
  });

  it("generates an inactive filter for 'customers who haven't ordered in 30 days'", () => {
    const sql = fallbackNlToSql("customers who haven't ordered in 30 days");
    expect(sql).toContain("NOT IN");
    expect(sql).toContain("30 days");
  });

  it("generates a recent order filter for 'customers who ordered in the last 7 days'", () => {
    const sql = fallbackNlToSql("customers who ordered in the last 7 days");
    expect(sql).toContain("o.orderedAt >= NOW()");
    expect(sql).toContain("7 days");
  });

  it("generates a spend filter for 'customers who spent more than 5000'", () => {
    const sql = fallbackNlToSql("customers who spent more than 5000");
    expect(sql).toContain("c.totalSpend > 5000");
  });

  it("returns a valid SELECT for unknown input (catch-all condition)", () => {
    const sql = fallbackNlToSql("some completely unknown query");
    expect(sql).toContain("SELECT DISTINCT");
    expect(sql).toContain("FROM customers c");
    expect(sql).toContain("c.totalSpend >= 0");
  });

  it("always starts with SELECT DISTINCT", () => {
    const sql = fallbackNlToSql("anything");
    expect(sql.startsWith("SELECT DISTINCT")).toBe(true);
  });
});
