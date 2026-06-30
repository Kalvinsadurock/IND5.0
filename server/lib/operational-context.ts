import type { Request } from "express";
import { db } from "../db";
import { platformAuditEvents } from "../../shared/schema";

export type OperationalContext = {
  tenantId: string;
  actorUserId: string | null;
};

function decodeAuthContext(req: Request): Partial<OperationalContext> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return {};

  try {
    const token = authHeader.slice("Bearer ".length);
    const payloadB64 = token.split(".")[1];
    if (!payloadB64) return {};
    const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString());
    return {
      tenantId: payload.tenantId || payload.tenant_id,
      actorUserId: payload.userId || payload.user_id || payload.sub,
    };
  } catch {
    return {};
  }
}

export function getOperationalContext(req: Request): OperationalContext {
  const authContext = decodeAuthContext(req);
  const requestedTenantId =
    req.header("x-tenant-id") ||
    (typeof req.query.tenantId === "string" ? req.query.tenantId : undefined) ||
    req.body?.tenantId;
  const tenantId = authContext.tenantId || requestedTenantId;

  if (!tenantId) {
    const error = new Error("tenantId is required") as Error & { status?: number };
    error.status = 400;
    throw error;
  }

  if (authContext.tenantId && requestedTenantId && authContext.tenantId !== requestedTenantId) {
    const error = new Error("tenant context mismatch") as Error & { status?: number };
    error.status = 403;
    throw error;
  }

  return {
    tenantId,
    actorUserId: authContext.actorUserId ||
      req.header("x-user-id") ||
      req.body?.actorUserId ||
      req.body?.userId ||
      null,
  };
}

export async function writeOperationalAudit(req: Request, event: {
  module: string;
  eventType: string;
  entityType: string;
  entityId?: string | null;
  action: string;
  beforeSnapshot?: unknown;
  afterSnapshot?: unknown;
  metadata?: unknown;
}) {
  const context = getOperationalContext(req);

  await db.insert(platformAuditEvents).values({
    tenantId: context.tenantId,
    actorUserId: context.actorUserId,
    actorType: "user",
    module: event.module,
    eventType: event.eventType,
    entityType: event.entityType,
    entityId: event.entityId || null,
    action: event.action,
    beforeSnapshot: event.beforeSnapshot as any,
    afterSnapshot: event.afterSnapshot as any,
    metadata: {
      ...(event.metadata && typeof event.metadata === "object" ? event.metadata : { value: event.metadata }),
      method: req.method,
      path: req.path,
    } as any,
  } as any);
}

export function sendOperationalError(res: any, error: unknown, fallbackMessage: string) {
  const status = typeof error === "object" && error && "status" in error ? Number((error as any).status) : 500;
  const message = error instanceof Error ? error.message : fallbackMessage;
  if (status >= 500) console.error(fallbackMessage, error);
  return res.status(status || 500).json({ error: message || fallbackMessage });
}
