import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { validateCustomFields } from "../../lib/validation";
import {
  mesWorkOrders,
  platformAuditEvents,
  workOrderStatuses,
  type WorkOrderStatus,
} from "../../../shared/schema";

const router = Router();

function tenantIdFrom(req: any) {
  return req.header("x-tenant-id") || req.query.tenantId || req.body?.tenantId || null;
}

function actorUserIdFrom(req: any) {
  return req.header("x-user-id") || req.body?.actorUserId || null;
}

function dateOrNull(value: unknown) {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isWorkOrderStatus(value: unknown): value is WorkOrderStatus {
  return typeof value === "string" && (workOrderStatuses as readonly string[]).includes(value);
}

function statusTimestamps(status: WorkOrderStatus) {
  const now = new Date();
  if (status === "released") return { releasedAt: now };
  if (status === "in_progress") return { startedAt: now };
  if (status === "completed") return { completedAt: now };
  if (status === "cancelled") return { cancelledAt: now };
  return {};
}

async function audit(req: any, event: {
  tenantId: string;
  eventType: string;
  entityId?: string | null;
  action: string;
  beforeSnapshot?: unknown;
  afterSnapshot?: unknown;
  metadata?: unknown;
}) {
  await db.insert(platformAuditEvents).values({
    tenantId: event.tenantId,
    actorUserId: actorUserIdFrom(req),
    actorType: "user",
    module: "mes",
    eventType: event.eventType,
    entityType: "work_order",
    entityId: event.entityId || null,
    action: event.action,
    beforeSnapshot: event.beforeSnapshot as any,
    afterSnapshot: event.afterSnapshot as any,
    metadata: event.metadata as any,
  } as any);
}

function handleError(res: any, error: unknown, message: string) {
  console.error(message, error);
  res.status(500).json({ error: message });
}

router.get("/mes/work-orders", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

    const status = req.query.status as string | undefined;
    const whereClause = status
      ? and(eq(mesWorkOrders.tenantId, tenantId), eq(mesWorkOrders.status, status))
      : eq(mesWorkOrders.tenantId, tenantId);

    const rows = await db.select().from(mesWorkOrders).where(whereClause).orderBy(desc(mesWorkOrders.createdAt));
    res.json(rows);
  } catch (error) {
    handleError(res, error, "Failed to fetch work orders");
  }
});

router.post("/mes/work-orders", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
    if (!req.body.workOrderNumber) return res.status(400).json({ error: "workOrderNumber is required" });
    if (!req.body.title) return res.status(400).json({ error: "title is required" });

    // Server-side custom fields validation based on dynamic config schema
    if (req.body.customFields) {
      const validationResult = await validateCustomFields(tenantId, "work_order", req.body.customFields);
      if (!validationResult.valid) {
        await audit(req, {
          tenantId,
          eventType: "work_order.validation_failed",
          action: "validation",
          metadata: { errors: validationResult.errors, customFields: req.body.customFields }
        });
        return res.status(400).json({ error: "Validation failed", errors: validationResult.errors });
      }
    }

    const status = isWorkOrderStatus(req.body.status) ? req.body.status : "draft";
    const [created] = await db.insert(mesWorkOrders).values({
      tenantId,
      workOrderNumber: req.body.workOrderNumber,
      title: req.body.title,
      description: req.body.description || null,
      productCode: req.body.productCode || null,
      productName: req.body.productName || null,
      plannedQuantity: String(req.body.plannedQuantity || "1"),
      completedQuantity: String(req.body.completedQuantity || "0"),
      unit: req.body.unit || "ea",
      priority: req.body.priority || "normal",
      status,
      plannedStartAt: dateOrNull(req.body.plannedStartAt),
      plannedEndAt: dateOrNull(req.body.plannedEndAt),
      customFields: req.body.customFields,
      createdBy: actorUserIdFrom(req),
      updatedBy: actorUserIdFrom(req),
      ...statusTimestamps(status),
    } as any).returning();

    await audit(req, {
      tenantId,
      eventType: "work_order.created",
      entityId: created.id,
      action: "create",
      afterSnapshot: created,
    });

    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to create work order");
  }
});

router.patch("/mes/work-orders/:id", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

    const [before] = await db.select().from(mesWorkOrders).where(and(eq(mesWorkOrders.id, req.params.id), eq(mesWorkOrders.tenantId, tenantId)));
    if (!before) return res.status(404).json({ error: "Work order not found" });

    if (req.body.customFields) {
      const mergedFields = { ...(before.customFields || {}), ...req.body.customFields };
      const validationResult = await validateCustomFields(tenantId, "work_order", mergedFields);
      if (!validationResult.valid) {
        await audit(req, {
          tenantId,
          eventType: "work_order.validation_failed",
          entityId: before.id,
          action: "validation",
          metadata: { errors: validationResult.errors, customFields: mergedFields }
        });
        return res.status(400).json({ error: "Validation failed", errors: validationResult.errors });
      }
    }

    const updates: Record<string, unknown> = { updatedAt: new Date(), updatedBy: actorUserIdFrom(req) };
    for (const field of ["workOrderNumber", "title", "description", "productCode", "productName", "plannedQuantity", "completedQuantity", "unit", "priority", "customFields"] as const) {
      if (field in req.body) updates[field] = field.includes("Quantity") ? String(req.body[field]) : req.body[field];
    }
    if ("plannedStartAt" in req.body) updates.plannedStartAt = dateOrNull(req.body.plannedStartAt);
    if ("plannedEndAt" in req.body) updates.plannedEndAt = dateOrNull(req.body.plannedEndAt);

    const [updated] = await db.update(mesWorkOrders)
      .set(updates as any)
      .where(and(eq(mesWorkOrders.id, req.params.id), eq(mesWorkOrders.tenantId, tenantId)))
      .returning();

    await audit(req, {
      tenantId,
      eventType: "work_order.updated",
      entityId: updated.id,
      action: "update",
      beforeSnapshot: before,
      afterSnapshot: updated,
    });

    res.json(updated);
  } catch (error) {
    handleError(res, error, "Failed to update work order");
  }
});

router.patch("/mes/work-orders/:id/status", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
    if (!isWorkOrderStatus(req.body.status)) return res.status(400).json({ error: "Valid status is required" });

    const [before] = await db.select().from(mesWorkOrders).where(and(eq(mesWorkOrders.id, req.params.id), eq(mesWorkOrders.tenantId, tenantId)));
    if (!before) return res.status(404).json({ error: "Work order not found" });

    const [updated] = await db.update(mesWorkOrders)
      .set({
        status: req.body.status,
        updatedAt: new Date(),
        updatedBy: actorUserIdFrom(req),
        ...statusTimestamps(req.body.status),
      } as any)
      .where(and(eq(mesWorkOrders.id, req.params.id), eq(mesWorkOrders.tenantId, tenantId)))
      .returning();

    await audit(req, {
      tenantId,
      eventType: "work_order.status_changed",
      entityId: updated.id,
      action: "status_change",
      beforeSnapshot: before,
      afterSnapshot: updated,
      metadata: { fromStatus: before.status, toStatus: updated.status, comment: req.body.comment },
    });

    res.json(updated);
  } catch (error) {
    handleError(res, error, "Failed to change work order status");
  }
});

export const workOrderRouter = router;
