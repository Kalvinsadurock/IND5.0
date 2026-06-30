import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { getOperationalContext, sendOperationalError, writeOperationalAudit } from "../../lib/operational-context";
import { authenticate, requirePermission, requireTenant } from "../../middleware/auth";
import { qualityInspectionPlans } from "../../../shared/schema";

const router = Router();
const canReadQuality = [authenticate, requireTenant];
const canManageQuality = [authenticate, requireTenant, requirePermission("quality.inspection.approve")];

function dateOrNull(value: unknown) {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

router.get("/inspection-plans", canReadQuality, async (req, res) => {
  try {
    const { tenantId } = getOperationalContext(req);
    const conditions = [eq(qualityInspectionPlans.tenantId, tenantId)];
    if (typeof req.query.processId === "string") conditions.push(eq(qualityInspectionPlans.processId, Number(req.query.processId)));
    if (typeof req.query.stepId === "string") conditions.push(eq(qualityInspectionPlans.stepId, Number(req.query.stepId)));
    if (typeof req.query.status === "string") conditions.push(eq(qualityInspectionPlans.status, req.query.status));

    const rows = await db.select().from(qualityInspectionPlans)
      .where(and(...conditions))
      .orderBy(desc(qualityInspectionPlans.updatedAt));
    res.json(rows);
  } catch (error) {
    sendOperationalError(res, error, "Failed to fetch inspection plans");
  }
});

router.post("/inspection-plans", canManageQuality, async (req, res) => {
  try {
    const { tenantId, actorUserId } = getOperationalContext(req);
    if (!req.body.planCode) return res.status(400).json({ error: "planCode is required" });
    if (!req.body.planName) return res.status(400).json({ error: "planName is required" });

    const [created] = await db.insert(qualityInspectionPlans).values({
      tenantId,
      planCode: req.body.planCode,
      planName: req.body.planName,
      objectType: req.body.objectType || "work_order_execution",
      processId: req.body.processId ? Number(req.body.processId) : null,
      stepId: req.body.stepId ? Number(req.body.stepId) : null,
      version: Number(req.body.version || 1),
      status: req.body.status || "draft",
      triggerStatus: req.body.triggerStatus || "in_progress",
      effectiveFrom: dateOrNull(req.body.effectiveFrom),
      effectiveTo: dateOrNull(req.body.effectiveTo),
      checkpointIds: Array.isArray(req.body.checkpointIds) ? req.body.checkpointIds.map(Number) : [],
      createdBy: actorUserId,
      updatedBy: actorUserId,
    } as any).returning();

    await writeOperationalAudit(req, {
      module: "quality",
      eventType: "inspection_plan.created",
      entityType: "quality_inspection_plan",
      entityId: created.id,
      action: "create",
      afterSnapshot: created,
    });

    res.status(201).json(created);
  } catch (error) {
    sendOperationalError(res, error, "Failed to create inspection plan");
  }
});

router.patch("/inspection-plans/:id", canManageQuality, async (req, res) => {
  try {
    const { tenantId, actorUserId } = getOperationalContext(req);
    const [before] = await db.select().from(qualityInspectionPlans)
      .where(and(eq(qualityInspectionPlans.id, req.params.id), eq(qualityInspectionPlans.tenantId, tenantId)));
    if (!before) return res.status(404).json({ error: "Inspection plan not found" });

    const updates: Record<string, unknown> = { updatedAt: new Date(), updatedBy: actorUserId };
    for (const field of ["planCode", "planName", "objectType", "status", "triggerStatus"] as const) {
      if (field in req.body) updates[field] = req.body[field];
    }
    if ("processId" in req.body) updates.processId = req.body.processId ? Number(req.body.processId) : null;
    if ("stepId" in req.body) updates.stepId = req.body.stepId ? Number(req.body.stepId) : null;
    if ("version" in req.body) updates.version = Number(req.body.version);
    if ("effectiveFrom" in req.body) updates.effectiveFrom = dateOrNull(req.body.effectiveFrom);
    if ("effectiveTo" in req.body) updates.effectiveTo = dateOrNull(req.body.effectiveTo);
    if ("checkpointIds" in req.body) updates.checkpointIds = Array.isArray(req.body.checkpointIds) ? req.body.checkpointIds.map(Number) : [];

    const [updated] = await db.update(qualityInspectionPlans).set(updates as any)
      .where(and(eq(qualityInspectionPlans.id, before.id), eq(qualityInspectionPlans.tenantId, tenantId)))
      .returning();

    await writeOperationalAudit(req, {
      module: "quality",
      eventType: "inspection_plan.updated",
      entityType: "quality_inspection_plan",
      entityId: updated.id,
      action: "update",
      beforeSnapshot: before,
      afterSnapshot: updated,
    });

    res.json(updated);
  } catch (error) {
    sendOperationalError(res, error, "Failed to update inspection plan");
  }
});

router.post("/inspection-plans/:id/activate", canManageQuality, async (req, res) => {
  try {
    const { tenantId, actorUserId } = getOperationalContext(req);
    const [before] = await db.select().from(qualityInspectionPlans)
      .where(and(eq(qualityInspectionPlans.id, req.params.id), eq(qualityInspectionPlans.tenantId, tenantId)));
    if (!before) return res.status(404).json({ error: "Inspection plan not found" });
    if (!before.checkpointIds || before.checkpointIds.length === 0) {
      return res.status(400).json({ error: "At least one checkpoint is required before activation" });
    }

    const [updated] = await db.update(qualityInspectionPlans).set({
      status: "active",
      effectiveFrom: before.effectiveFrom || new Date(),
      updatedAt: new Date(),
      updatedBy: actorUserId,
    } as any).where(and(eq(qualityInspectionPlans.id, before.id), eq(qualityInspectionPlans.tenantId, tenantId))).returning();

    await writeOperationalAudit(req, {
      module: "quality",
      eventType: "inspection_plan.activated",
      entityType: "quality_inspection_plan",
      entityId: updated.id,
      action: "activate",
      beforeSnapshot: before,
      afterSnapshot: updated,
    });

    res.json(updated);
  } catch (error) {
    sendOperationalError(res, error, "Failed to activate inspection plan");
  }
});

router.get("/steps/:stepId/active-inspection-plan", canReadQuality, async (req, res) => {
  try {
    const { tenantId } = getOperationalContext(req);
    const [plan] = await db.select().from(qualityInspectionPlans)
      .where(and(
        eq(qualityInspectionPlans.tenantId, tenantId),
        eq(qualityInspectionPlans.stepId, Number(req.params.stepId)),
        eq(qualityInspectionPlans.status, "active")
      ))
      .orderBy(desc(qualityInspectionPlans.version))
      .limit(1);
    res.json(plan || null);
  } catch (error) {
    sendOperationalError(res, error, "Failed to fetch active inspection plan");
  }
});

export const inspectionPlanRouter = router;
