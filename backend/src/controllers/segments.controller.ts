import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { countSegmentSql, runSegmentSql, assertSafeSegmentSql } from "../lib/segmentSql.js";
import { fail, ok, getStoreId } from "../lib/responses.js";
import { nlToSQL } from "../services/ai.service.js";

function routeId(req: Request): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : value;
}

export async function listSegments(req: Request, res: Response) {
  try {
    const storeId = getStoreId(req);
    const where = storeId ? { storeId } : {};
    const segments = await prisma.segment.findMany({
      where,
      orderBy: { createdAt: "desc" }
    });
    const data = await Promise.all(
      segments.map(async (segment) => ({
        ...segment,
        customerCount: await countSegmentSql(segment.sqlQuery, storeId)
      }))
    );

    return ok(res, data);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : "Unable to list segments.");
  }
}

export async function previewSegment(req: Request, res: Response) {
  try {
    const naturalLanguage = String(req.body.naturalLanguage ?? "").trim();
    if (!naturalLanguage) return fail(res, "naturalLanguage is required.", 400);

    const storeId = getStoreId(req);
    const sql = assertSafeSegmentSql(await nlToSQL(naturalLanguage));
    const [count, customers] = await Promise.all([
      countSegmentSql(sql, storeId),
      runSegmentSql(sql, 50, storeId)
    ]);

    return ok(res, { count, customers, sql });
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : "Unable to preview segment.", 400);
  }
}

export async function createSegment(req: Request, res: Response) {
  try {
    const name = String(req.body.name ?? "").trim();
    const description = String(req.body.description ?? "").trim();
    const sqlQuery = assertSafeSegmentSql(String(req.body.sqlQuery ?? ""));

    if (!name || !description || !sqlQuery) {
      return fail(res, "name, description, and sqlQuery are required.", 400);
    }

    const storeId = getStoreId(req);
    const segment = await prisma.segment.create({
      data: { name, description, sqlQuery, storeId }
    });

    return ok(res, segment, 201);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : "Unable to save segment.", 400);
  }
}

export async function getSegmentCustomers(req: Request, res: Response) {
  try {
    const segment = await prisma.segment.findUnique({ where: { id: routeId(req) } });
    if (!segment) return fail(res, "Segment not found.", 404);

    const storeId = getStoreId(req);
    const customers = await runSegmentSql(segment.sqlQuery, undefined, storeId);
    return ok(res, { segment, customers });
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : "Unable to load segment customers.");
  }
}
