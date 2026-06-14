import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { fail, ok } from "../lib/responses.js";

export async function listStores(req: Request, res: Response) {
  try {
    // 1. Clean up duplicate "Brew & Co." stores with 0 customers
    const brewCoStores = await prisma.store.findMany({
      where: { name: { equals: "Brew & Co.", mode: "insensitive" } },
      include: {
        _count: {
          select: { customers: true }
        }
      }
    });

    if (brewCoStores.length > 1) {
      const storesWithCustomers = brewCoStores.filter(s => s._count.customers > 0);
      const storesWithNoCustomers = brewCoStores.filter(s => s._count.customers === 0);

      if (storesWithCustomers.length > 0 && storesWithNoCustomers.length > 0) {
        const idsToDelete = storesWithNoCustomers.map(s => s.id);
        await prisma.campaign.deleteMany({ where: { storeId: { in: idsToDelete } } });
        await prisma.segment.deleteMany({ where: { storeId: { in: idsToDelete } } });
        await prisma.order.deleteMany({ where: { storeId: { in: idsToDelete } } });
        await prisma.store.deleteMany({ where: { id: { in: idsToDelete } } });
      } else if (storesWithCustomers.length === 0) {
        // If all have 0 customers, keep the first one
        const [keep, ...deleteList] = brewCoStores;
        if (deleteList.length > 0) {
          const idsToDelete = deleteList.map(s => s.id);
          await prisma.campaign.deleteMany({ where: { storeId: { in: idsToDelete } } });
          await prisma.segment.deleteMany({ where: { storeId: { in: idsToDelete } } });
          await prisma.order.deleteMany({ where: { storeId: { in: idsToDelete } } });
          await prisma.store.deleteMany({ where: { id: { in: idsToDelete } } });
        }
      }
    }

    let stores = await prisma.store.findMany({ orderBy: { createdAt: "asc" } });

    // If there are no stores, create a default store
    if (stores.length === 0) {
      const defaultStore = await prisma.store.create({
        data: { name: "Brew & Co." }
      });
      
      // Auto-associate existing customers, segments, campaigns, orders with the default store
      await prisma.customer.updateMany({ data: { storeId: defaultStore.id } });
      await prisma.segment.updateMany({ data: { storeId: defaultStore.id } });
      await prisma.campaign.updateMany({ data: { storeId: defaultStore.id } });
      await prisma.order.updateMany({ data: { storeId: defaultStore.id } });

      stores = [defaultStore];
    }

    return ok(res, stores);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : "Unable to list stores.");
  }
}

export async function createStore(req: Request, res: Response) {
  try {
    const name = String(req.body.name ?? "").trim();
    if (!name) {
      return fail(res, "Store name is required.", 400);
    }

    const existing = await prisma.store.findFirst({
      where: { name: { equals: name, mode: "insensitive" } }
    });
    if (existing) {
      return fail(res, `A store named "${name}" already exists.`, 400);
    }

    const store = await prisma.store.create({
      data: { name }
    });

    return ok(res, store, 201);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : "Unable to create store.", 400);
  }
}
