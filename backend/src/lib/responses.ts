import type { Request, Response } from "express";

export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ success: true, data });
}

export function fail(res: Response, error: string, status = 500) {
  return res.status(status).json({ success: false, data: null, error });
}

export function getStoreId(req: Request): string | undefined {
  const headerVal = req.headers["x-store-id"];
  if (typeof headerVal === "string" && headerVal.trim()) {
    return headerVal.trim();
  }
  const queryVal = req.query.storeId;
  if (typeof queryVal === "string" && queryVal.trim()) {
    return queryVal.trim();
  }
  return undefined;
}
