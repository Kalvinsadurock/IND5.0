import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { getOperationalContext, sendOperationalError, writeOperationalAudit } from "../../lib/operational-context";
import { authenticate, requirePermission, requireTenant } from "../../middleware/auth";
import { validateCustomFields } from "../../lib/validation";
import {
  inventoryMaterials,
  inventoryStockLedger,
  mesWorkOrders,
  parts,
  processes,
  workOrderExecutions,
  workOrderStatuses,
  type WorkOrderStatus,
} from "../../../shared/schema";

const router = Router();

const canReadMes = [authenticate, requireTenant];
const canManageWorkOrders = [authenticate, requireTenant, requirePermission("mes.work_order.execute")];

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

function handleError(res: any, error: unknown, message: string) {
  sendOperationalError(res, error, message);
}

const allowedStatusTransitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  draft: ["released", "cancelled"],
  released: ["in_progress", "cancelled"],
  in_progress: ["quality_hold", "completed", "cancelled"],
  quality_hold: ["in_progress", "completed", "cancelled"],
  completed: [],
  cancelled: [],
};

function canTransitionWorkOrder(from: WorkOrderStatus, to: WorkOrderStatus) {
  if (from === to) return true;
  return allowedStatusTransitions[from]?.includes(to) || false;
}

function actorUserIdFrom(req: any) {
  return getOperationalContext(req).actorUserId;
}

function objectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

async function ensureFinishedGoodMaterial(tenantId: string, workOrder: any, actorUserId: string | null) {
  const productCode = workOrder.productCode || `WO-${workOrder.workOrderNumber}`;
  const [existing] = await db.select().from(inventoryMaterials)
    .where(and(eq(inventoryMaterials.tenantId, tenantId), eq(inventoryMaterials.materialCode, productCode)));
  if (existing) return existing;

  const [created] = await db.insert(inventoryMaterials).values({
    tenantId,
    materialCode: productCode,
    materialName: workOrder.productName || workOrder.title || productCode,
    materialType: "finished_good",
    baseUom: workOrder.unit || "ea",
    status: "active",
    lotControlled: true,
    serialControlled: false,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  } as any).returning();
  return created;
}

router.get("/mes/work-orders", canReadMes, async (req, res) => {
  try {
    const { tenantId } = getOperationalContext(req);

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

router.post("/mes/work-orders", canManageWorkOrders, async (req, res) => {
  try {
    const { tenantId } = getOperationalContext(req);
    if (!req.body.workOrderNumber) return res.status(400).json({ error: "workOrderNumber is required" });
    if (!req.body.title) return res.status(400).json({ error: "title is required" });

    // Server-side custom fields validation based on dynamic config schema
    if (req.body.customFields) {
      const validationResult = await validateCustomFields(tenantId, "work_order", req.body.customFields);
      if (!validationResult.valid) {
        await writeOperationalAudit(req, {
          module: "mes",
          eventType: "work_order.validation_failed",
          entityType: "work_order",
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

    await writeOperationalAudit(req, {
      module: "mes",
      eventType: "work_order.created",
      entityType: "work_order",
      entityId: created.id,
      action: "create",
      afterSnapshot: created,
    });

    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to create work order");
  }
});

router.patch("/mes/work-orders/:id", canManageWorkOrders, async (req, res) => {
  try {
    const { tenantId } = getOperationalContext(req);

    const [before] = await db.select().from(mesWorkOrders).where(and(eq(mesWorkOrders.id, req.params.id), eq(mesWorkOrders.tenantId, tenantId)));
    if (!before) return res.status(404).json({ error: "Work order not found" });

    if (req.body.customFields) {
      const mergedFields = { ...objectRecord(before.customFields), ...objectRecord(req.body.customFields) };
      const validationResult = await validateCustomFields(tenantId, "work_order", mergedFields);
      if (!validationResult.valid) {
        await writeOperationalAudit(req, {
          module: "mes",
          eventType: "work_order.validation_failed",
          entityType: "work_order",
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

    await writeOperationalAudit(req, {
      module: "mes",
      eventType: "work_order.updated",
      entityType: "work_order",
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

router.patch("/mes/work-orders/:id/status", canManageWorkOrders, async (req, res) => {
  try {
    const { tenantId } = getOperationalContext(req);
    if (!isWorkOrderStatus(req.body.status)) return res.status(400).json({ error: "Valid status is required" });

    const [before] = await db.select().from(mesWorkOrders).where(and(eq(mesWorkOrders.id, req.params.id), eq(mesWorkOrders.tenantId, tenantId)));
    if (!before) return res.status(404).json({ error: "Work order not found" });
    if (!canTransitionWorkOrder(before.status as WorkOrderStatus, req.body.status)) {
      await writeOperationalAudit(req, {
        module: "mes",
        eventType: "work_order.transition_denied",
        entityType: "work_order",
        entityId: before.id,
        action: "status_change_denied",
        beforeSnapshot: before,
        metadata: { fromStatus: before.status, toStatus: req.body.status, comment: req.body.comment },
      });
      return res.status(409).json({ error: `Invalid transition from ${before.status} to ${req.body.status}` });
    }

    const [updated] = await db.update(mesWorkOrders)
      .set({
        status: req.body.status,
        updatedAt: new Date(),
        updatedBy: actorUserIdFrom(req),
        ...statusTimestamps(req.body.status),
      } as any)
      .where(and(eq(mesWorkOrders.id, req.params.id), eq(mesWorkOrders.tenantId, tenantId)))
      .returning();

    await writeOperationalAudit(req, {
      module: "mes",
      eventType: "work_order.status_changed",
      entityType: "work_order",
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

router.get("/mes/work-orders/:id/executions", canReadMes, async (req, res) => {
  try {
    const { tenantId } = getOperationalContext(req);
    const rows = await db.select().from(workOrderExecutions)
      .where(and(eq(workOrderExecutions.tenantId, tenantId), eq(workOrderExecutions.workOrderId, req.params.id)))
      .orderBy(desc(workOrderExecutions.createdAt));
    res.json(rows);
  } catch (error) {
    handleError(res, error, "Failed to fetch work order executions");
  }
});

router.post("/mes/work-orders/:id/executions", canManageWorkOrders, async (req, res) => {
  try {
    const { tenantId, actorUserId } = getOperationalContext(req);
    const [workOrder] = await db.select().from(mesWorkOrders)
      .where(and(eq(mesWorkOrders.id, req.params.id), eq(mesWorkOrders.tenantId, tenantId)));
    if (!workOrder) return res.status(404).json({ error: "Work order not found" });

    if (req.body.partId) {
      const [part] = await db.select().from(parts).where(eq(parts.id, Number(req.body.partId)));
      if (!part) return res.status(400).json({ error: "partId does not reference an existing part" });
    }

    if (req.body.processId) {
      const [process] = await db.select().from(processes).where(eq(processes.id, Number(req.body.processId)));
      if (!process) return res.status(400).json({ error: "processId does not reference an existing process" });
    }

    const executionNumber = req.body.executionNumber || `${workOrder.workOrderNumber}-EX-${Date.now()}`;
    const [created] = await db.insert(workOrderExecutions).values({
      tenantId,
      workOrderId: workOrder.id,
      partId: req.body.partId ? Number(req.body.partId) : null,
      processId: req.body.processId ? Number(req.body.processId) : null,
      currentStepId: req.body.currentStepId ? Number(req.body.currentStepId) : null,
      workCenterId: req.body.workCenterId || null,
      executionNumber,
      status: req.body.status || "planned",
      plannedQuantity: String(req.body.plannedQuantity || workOrder.plannedQuantity || "1"),
      createdBy: actorUserId,
      updatedBy: actorUserId,
    } as any).returning();

    await writeOperationalAudit(req, {
      module: "mes",
      eventType: "work_order_execution.created",
      entityType: "work_order_execution",
      entityId: created.id,
      action: "create",
      afterSnapshot: created,
      metadata: { workOrderId: workOrder.id, partId: created.partId, processId: created.processId },
    });

    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to create work order execution");
  }
});

router.patch("/mes/work-order-executions/:executionId/status", canManageWorkOrders, async (req, res) => {
  try {
    const { tenantId, actorUserId } = getOperationalContext(req);
    if (!req.body.status) return res.status(400).json({ error: "status is required" });

    const [before] = await db.select().from(workOrderExecutions)
      .where(and(eq(workOrderExecutions.id, req.params.executionId), eq(workOrderExecutions.tenantId, tenantId)));
    if (!before) return res.status(404).json({ error: "Work order execution not found" });
    const [workOrder] = await db.select().from(mesWorkOrders)
      .where(and(eq(mesWorkOrders.id, before.workOrderId), eq(mesWorkOrders.tenantId, tenantId)));
    if (!workOrder) return res.status(404).json({ error: "Work order not found for execution" });

    const now = new Date();
    const nextGoodQuantity = req.body.goodQuantity === undefined ? before.goodQuantity : String(req.body.goodQuantity);
    const [updated] = await db.update(workOrderExecutions).set({
      status: req.body.status,
      currentStepId: req.body.currentStepId ? Number(req.body.currentStepId) : before.currentStepId,
      goodQuantity: nextGoodQuantity,
      rejectedQuantity: req.body.rejectedQuantity === undefined ? before.rejectedQuantity : String(req.body.rejectedQuantity),
      startedAt: req.body.status === "active" && !before.startedAt ? now : before.startedAt,
      endedAt: ["completed", "cancelled"].includes(req.body.status) ? now : before.endedAt,
      updatedAt: now,
      updatedBy: actorUserId,
    } as any).where(and(eq(workOrderExecutions.id, before.id), eq(workOrderExecutions.tenantId, tenantId))).returning();

    if (req.body.status === "completed" && before.status !== "completed") {
      const material = await ensureFinishedGoodMaterial(tenantId, workOrder, actorUserId);
      await db.insert(inventoryStockLedger).values({
        tenantId,
        materialId: material.id,
        workOrderId: workOrder.id,
        executionId: updated.id,
        movementType: "produce_receipt",
        quantity: String(Number(nextGoodQuantity || 0)),
        uom: workOrder.unit || "ea",
        lotNumber: updated.executionNumber,
        referenceType: "work_order_execution",
        referenceId: updated.id,
        reason: "Produced goods received on execution completion",
        postedBy: actorUserId,
      } as any);

      await db.update(mesWorkOrders).set({
        completedQuantity: String(Number(nextGoodQuantity || 0)),
        updatedAt: now,
        updatedBy: actorUserId,
      } as any).where(and(eq(mesWorkOrders.id, workOrder.id), eq(mesWorkOrders.tenantId, tenantId)));
    }

    await writeOperationalAudit(req, {
      module: "mes",
      eventType: "work_order_execution.status_changed",
      entityType: "work_order_execution",
      entityId: updated.id,
      action: "status_change",
      beforeSnapshot: before,
      afterSnapshot: updated,
      metadata: { fromStatus: before.status, toStatus: updated.status, comment: req.body.comment },
    });

    res.json(updated);
  } catch (error) {
    handleError(res, error, "Failed to update work order execution status");
  }
});

router.post("/mes/work-orders/:id/close", canManageWorkOrders, async (req, res) => {
  try {
    const { tenantId, actorUserId } = getOperationalContext(req);
    const [workOrder] = await db.select().from(mesWorkOrders)
      .where(and(eq(mesWorkOrders.id, req.params.id), eq(mesWorkOrders.tenantId, tenantId)));
    if (!workOrder) return res.status(404).json({ error: "Work order not found" });
    if (workOrder.status === "completed") return res.json({ workOrder, summary: { alreadyCompleted: true } });
    if (!canTransitionWorkOrder(workOrder.status as WorkOrderStatus, "completed")) {
      return res.status(409).json({ error: `Work order cannot be closed from ${workOrder.status}` });
    }

    const executions = await db.select().from(workOrderExecutions)
      .where(and(eq(workOrderExecutions.tenantId, tenantId), eq(workOrderExecutions.workOrderId, workOrder.id)));
    if (!executions.length) return res.status(409).json({ error: "At least one execution is required before close" });

    const incompleteExecutions = executions.filter((execution) => execution.status !== "completed");
    if (incompleteExecutions.length) {
      return res.status(409).json({
        error: "All executions must be completed before close",
        incompleteExecutionIds: incompleteExecutions.map((execution) => execution.id),
      });
    }

    const produceReceipts = await db.select().from(inventoryStockLedger).where(and(
      eq(inventoryStockLedger.tenantId, tenantId),
      eq(inventoryStockLedger.workOrderId, workOrder.id),
      eq(inventoryStockLedger.movementType, "produce_receipt")
    ));
    if (!produceReceipts.length) return res.status(409).json({ error: "Finished goods receipt is required before close" });

    const receiptQuantityByExecution = new Map<string, number>();
    for (const receipt of produceReceipts) {
      if (!receipt.executionId) continue;
      receiptQuantityByExecution.set(
        receipt.executionId,
        (receiptQuantityByExecution.get(receipt.executionId) || 0) + Number(receipt.quantity || 0)
      );
    }
    const missingReceipts = executions
      .map((execution) => ({
        id: execution.id,
        goodQuantity: Number(execution.goodQuantity || 0),
        receiptQuantity: receiptQuantityByExecution.get(execution.id) || 0,
      }))
      .filter((execution) => execution.receiptQuantity < execution.goodQuantity);
    if (missingReceipts.length) {
      return res.status(409).json({
        error: "Every completed execution needs a matching produced-goods receipt",
        missingReceipts,
      });
    }

    const goodQuantity = executions.reduce((sum, execution) => sum + Number(execution.goodQuantity || 0), 0);
    const rejectedQuantity = executions.reduce((sum, execution) => sum + Number(execution.rejectedQuantity || 0), 0);
    const [updated] = await db.update(mesWorkOrders).set({
      status: "completed",
      completedQuantity: String(goodQuantity),
      completedAt: new Date(),
      updatedAt: new Date(),
      updatedBy: actorUserId,
    } as any).where(and(eq(mesWorkOrders.id, workOrder.id), eq(mesWorkOrders.tenantId, tenantId))).returning();

    const summary = {
      executionCount: executions.length,
      goodQuantity,
      rejectedQuantity,
      produceReceiptCount: produceReceipts.length,
      plannedQuantity: Number(workOrder.plannedQuantity || 0),
    };

    await writeOperationalAudit(req, {
      module: "mes",
      eventType: "work_order.closed",
      entityType: "work_order",
      entityId: updated.id,
      action: "close",
      beforeSnapshot: workOrder,
      afterSnapshot: updated,
      metadata: summary,
    });

    res.json({ workOrder: updated, summary });
  } catch (error) {
    handleError(res, error, "Failed to close work order");
  }
});

export const workOrderRouter = router;
