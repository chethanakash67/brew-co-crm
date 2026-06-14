import type { Prisma } from "@prisma/client";
import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { fail, ok, getStoreId } from "../lib/responses.js";

interface BulkCustomerInput {
  name: unknown;
  email: unknown;
  phone: unknown;
  city: unknown;
  tier?: unknown;
  totalSpend?: unknown;
}

function parseText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function routeId(req: Request): string {
  const value = req.params.id;
  return Array.isArray(value) ? value[0] : value;
}

export async function listCustomers(req: Request, res: Response) {
  try {
    const search = parseText(req.query.search);
    const city = parseText(req.query.city);
    const tier = parseText(req.query.tier);
    const lastOrderDays = Number(req.query.lastOrderDays);
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};
    const storeId = getStoreId(req);
    if (storeId) where.storeId = storeId;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } }
      ];
    }

    if (city && city !== "all") where.city = city;
    if (tier && tier !== "all") where.tier = tier;

    if (Number.isFinite(lastOrderDays) && lastOrderDays > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - lastOrderDays);
      where.orders = { some: { orderedAt: { gte: cutoff } } };
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        include: {
          orders: {
            take: 1,
            orderBy: { orderedAt: "desc" },
            select: { orderedAt: true }
          }
        },
        orderBy: { totalSpend: "desc" },
        skip,
        take: limit
      })
    ]);

    return ok(res, {
      customers: customers.map((customer) => ({
        ...customer,
        lastOrderAt: customer.orders[0]?.orderedAt ?? null,
        orders: undefined
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : "Unable to list customers.");
  }
}

export async function getCustomer(req: Request, res: Response) {
  try {
    const id = routeId(req);
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        orders: { orderBy: { orderedAt: "desc" } },
        communications: {
          take: 10,
          orderBy: { sentAt: "desc" },
          include: { campaign: true }
        }
      }
    });

    if (!customer) return fail(res, "Customer not found.", 404);

    return ok(res, {
      ...customer,
      totalOrders: customer.orders.length,
      lifetimeValue: customer.totalSpend
    });
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : "Unable to load customer.");
  }
}

export async function createCustomer(req: Request, res: Response) {
  try {
    const name = String(req.body.name ?? "").trim();
    const email = String(req.body.email ?? "").trim().toLowerCase();
    const phone = String(req.body.phone ?? "").trim();
    const city = String(req.body.city ?? "").trim();
    const tier = String(req.body.tier ?? "bronze").trim().toLowerCase();
    const totalSpend = Number(req.body.totalSpend ?? 0);

    if (!name || !email || !phone || !city) {
      return fail(res, "name, email, phone, and city are required.", 400);
    }

    const storeId = getStoreId(req);

    const customer = await prisma.customer.create({
      data: { name, email, phone, city, tier, totalSpend, storeId }
    });

    return ok(res, customer, 201);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : "Unable to create customer.", 400);
  }
}

export async function bulkCreateCustomers(req: Request, res: Response) {
  try {
    const customersList = req.body.customers;
    if (!Array.isArray(customersList)) {
      return fail(res, "customers array is required.", 400);
    }

    const storeId = getStoreId(req);

    const dataToCreate = (customersList as BulkCustomerInput[]).map((c) => ({
      name: String(c.name ?? "").trim(),
      email: String(c.email ?? "").trim().toLowerCase(),
      phone: String(c.phone ?? "").trim(),
      city: String(c.city ?? "").trim(),
      tier: String(c.tier ?? "bronze").trim().toLowerCase(),
      totalSpend: Number(c.totalSpend ?? 0),
      storeId
    })).filter((c) => c.name && c.email && c.phone && c.city);

    if (dataToCreate.length === 0) {
      return fail(res, "No valid customers found in the payload.", 400);
    }

    const emails = dataToCreate.map((c) => c.email);
    const existing = await prisma.customer.findMany({
      where: { email: { in: emails } },
      select: { email: true }
    });
    const existingEmails = new Set(existing.map((c) => c.email));

    const uniqueToCreate = dataToCreate.filter((c) => !existingEmails.has(c.email));

    if (uniqueToCreate.length === 0) {
      return fail(res, "All customers already exist in the database.", 400);
    }

    const count = await prisma.customer.createMany({
      data: uniqueToCreate,
      skipDuplicates: true
    });

    return ok(res, { count: count.count, skipped: dataToCreate.length - uniqueToCreate.length }, 201);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : "Unable to bulk insert customers.", 400);
  }
}
