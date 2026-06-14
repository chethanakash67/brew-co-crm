import type { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { fail, ok } from "../lib/responses.js";

const allowedEvents = new Set(["delivered", "failed", "opened", "clicked", "read"]);

export async function receiveCallback(req: Request, res: Response) {
  try {
    const communicationId = String(req.body.communicationId ?? "").trim();
    const eventType = String(req.body.eventType ?? "").trim();

    if (!communicationId || !allowedEvents.has(eventType)) {
      return fail(res, "Valid communicationId and eventType are required.", 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingReceipt = await tx.receipt.findFirst({
        where: { communicationId, eventType },
        orderBy: { timestamp: "desc" }
      });

      const receipt =
        existingReceipt ??
        (await tx.receipt.create({
          data: { communicationId, eventType }
        }));

      const communication = await tx.communication.update({
        where: { id: communicationId },
        data: {
          status: eventType,
          sentAt: eventType === "delivered" || eventType === "failed" ? new Date() : undefined
        }
      });

      return { receipt, communication };
    });

    return ok(res, result, 201);
  } catch (error) {
    return fail(res, error instanceof Error ? error.message : "Unable to process receipt.", 400);
  }
}
