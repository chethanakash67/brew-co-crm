import type { SegmentCustomer } from "../types/index.js";
import { prisma } from "./prisma.js";

/** Validates that a storeId is a safe CUID-style string before SQL interpolation. */
function assertSafeStoreId(storeId: string): void {
  if (!/^c[a-z0-9]{20,}$/.test(storeId)) {
    throw new Error("Invalid storeId format.");
  }
}

const forbiddenTokens = /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|execute|call|merge)\b/i;

export function cleanSegmentSql(sql: string): string {
  return sql
    .replace(/```sql/gi, "")
    .replace(/```/g, "")
    .replace(/"totalSpend"/g, "totalSpend")
    .replace(/"createdAt"/g, "createdAt")
    .replace(/"customerId"/g, "customerId")
    .replace(/"orderedAt"/g, "orderedAt")
    .trim()
    .replace(/;+\s*$/g, "");
}

export function assertSafeSegmentSql(sql: string): string {
  const cleaned = cleanSegmentSql(sql);
  const normalized = cleaned.toLowerCase();

  if (!normalized.startsWith("select ")) {
    throw new Error("Segment SQL must be a SELECT query.");
  }

  if (!normalized.includes(" from customers c")) {
    throw new Error("Segment SQL must query from customers c.");
  }

  if (!normalized.includes("c.id")) {
    throw new Error("Segment SQL must return customer IDs.");
  }

  if (cleaned.includes(";") || cleaned.includes("--") || cleaned.includes("/*") || cleaned.includes("*/")) {
    throw new Error("Segment SQL contains disallowed SQL syntax.");
  }

  if (forbiddenTokens.test(cleaned)) {
    throw new Error("Segment SQL contains a disallowed statement.");
  }

  return cleaned;
}

function normalizeCustomer(row: Record<string, unknown>): SegmentCustomer {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    phone: String(row.phone),
    city: String(row.city),
    tier: String(row.tier),
    totalSpend: Number(row.totalSpend ?? row.totalspend ?? 0)
  };
}

export async function runSegmentSql(sql: string, limit?: number, storeId?: string): Promise<SegmentCustomer[]> {
  const safeSql = assertSafeSegmentSql(sql);
  let finalSql = safeSql;
  if (storeId) {
    assertSafeStoreId(storeId);
    finalSql = `SELECT DISTINCT main_c.id, main_c.name, main_c.email, main_c.phone, main_c.city, main_c.tier, main_c.totalspend AS "totalSpend"
                FROM (${safeSql}) sub_c
                JOIN customers main_c ON sub_c.id = main_c.id
                WHERE main_c.storeid = '${storeId}'`;
  }
  const limitedSql = typeof limit === "number" ? `SELECT * FROM (${finalSql}) segment_customers LIMIT ${limit}` : finalSql;
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(limitedSql);
  return rows.map(normalizeCustomer);
}

export async function countSegmentSql(sql: string, storeId?: string): Promise<number> {
  const safeSql = assertSafeSegmentSql(sql);
  let finalSql = safeSql;
  if (storeId) {
    assertSafeStoreId(storeId);
    finalSql = `SELECT DISTINCT main_c.id
                FROM (${safeSql}) sub_c
                JOIN customers main_c ON sub_c.id = main_c.id
                WHERE main_c.storeid = '${storeId}'`;
  }
  const rows = await prisma.$queryRawUnsafe<{ count: bigint | number | string }[]>(
    `SELECT COUNT(*)::int AS count FROM (${finalSql}) segment_customers`
  );
  return Number(rows[0]?.count ?? 0);
}
