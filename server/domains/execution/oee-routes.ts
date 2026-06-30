import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { getOperationalContext, sendOperationalError, writeOperationalAudit } from "../../lib/operational-context";
import { authenticate, requirePermission, requireTenant } from "../../middleware/auth";
import { mesWorkOrders, oeeReasonCodes, oeeShiftRuns, oeeDowntimeEvents, oeeProductionCounts, workOrderExecutions } from "../../../shared/schema";

const router = Router();
const canReadOee = [authenticate, requireTenant];
const canManageOee = [authenticate, requireTenant, requirePermission("oee.shift.manage")];

router.get("/oee/downtime/reasons", canReadOee, async (req, res) => {
  try {
    const { tenantId } = getOperationalContext(req);
    const rows = await db.select().from(oeeReasonCodes)
      .where(and(eq(oeeReasonCodes.tenantId, tenantId), eq(oeeReasonCodes.isActive, true)))
      .orderBy(oeeReasonCodes.displayOrder, oeeReasonCodes.reasonName);
    res.json(rows);
  } catch (error) {
    sendOperationalError(res, error, "Failed to fetch OEE downtime reasons");
  }
});

router.post("/oee/downtime/reasons", canManageOee, async (req, res) => {
  try {
    const { tenantId } = getOperationalContext(req);
    if (!req.body.reasonCode) return res.status(400).json({ error: "reasonCode is required" });
    if (!req.body.reasonName) return res.status(400).json({ error: "reasonName is required" });

    const [created] = await db.insert(oeeReasonCodes).values({
      tenantId,
      reasonCode: req.body.reasonCode,
      reasonName: req.body.reasonName,
      category: req.body.category || "downtime",
      lossType: req.body.lossType || "availability",
      workCenterType: req.body.workCenterType || null,
      isPlanned: Boolean(req.body.isPlanned),
      isActive: req.body.isActive === undefined ? true : Boolean(req.body.isActive),
      displayOrder: Number(req.body.displayOrder || 0),
    } as any).returning();

    await writeOperationalAudit(req, {
      module: "oee",
      eventType: "oee_reason.created",
      entityType: "oee_reason_code",
      entityId: created.id,
      action: "create",
      afterSnapshot: created,
    });

    res.status(201).json(created);
  } catch (error) {
    sendOperationalError(res, error, "Failed to create OEE downtime reason");
  }
});

router.patch("/oee/downtime/reasons/:id", canManageOee, async (req, res) => {
  try {
    const { tenantId } = getOperationalContext(req);
    const [before] = await db.select().from(oeeReasonCodes)
      .where(and(eq(oeeReasonCodes.id, req.params.id), eq(oeeReasonCodes.tenantId, tenantId)));
    if (!before) return res.status(404).json({ error: "OEE reason code not found" });

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    for (const field of ["reasonCode", "reasonName", "category", "lossType", "workCenterType", "isPlanned", "isActive", "displayOrder"] as const) {
      if (field in req.body) updates[field] = field === "displayOrder" ? Number(req.body[field]) : req.body[field];
    }

    const [updated] = await db.update(oeeReasonCodes).set(updates as any)
      .where(and(eq(oeeReasonCodes.id, before.id), eq(oeeReasonCodes.tenantId, tenantId)))
      .returning();

    await writeOperationalAudit(req, {
      module: "oee",
      eventType: "oee_reason.updated",
      entityType: "oee_reason_code",
      entityId: updated.id,
      action: "update",
      beforeSnapshot: before,
      afterSnapshot: updated,
    });

    res.json(updated);
  } catch (error) {
    sendOperationalError(res, error, "Failed to update OEE downtime reason");
  }
});

router.get("/oee/shift/runs", canReadOee, async (req, res) => {
  try {
    const { tenantId } = getOperationalContext(req);
    const rows = await db.select().from(oeeShiftRuns).where(eq(oeeShiftRuns.tenantId, tenantId));
    res.json(rows);
  } catch (error) {
    sendOperationalError(res, error, "Failed to fetch shift runs");
  }
});

router.post("/oee/shift/start", canManageOee, async (req, res) => {
  try {
    const { tenantId } = getOperationalContext(req);
    const [created] = await db.insert(oeeShiftRuns).values({
      tenantId,
      workCenterId: req.body.workCenterId,
      shiftDate: new Date(),
      plannedRuntimeMinutes: req.body.plannedRuntimeMinutes || 480,
      actualRuntimeMinutes: 0,
      status: "active",
    } as any).returning();
    res.status(201).json(created);
  } catch (error) {
    sendOperationalError(res, error, "Failed to start shift run");
  }
});

router.post("/oee/shift/:shiftId/end", canManageOee, async (req, res) => {
  try {
    const { tenantId } = getOperationalContext(req);
    const [run] = await db.select().from(oeeShiftRuns).where(and(eq(oeeShiftRuns.id, req.params.shiftId), eq(oeeShiftRuns.tenantId, tenantId)));
    if (!run) return res.status(404).json({ error: "Shift run not found" });
    const downtimes = await db.select().from(oeeDowntimeEvents).where(eq(oeeDowntimeEvents.shiftRunId, run.id));
    const totalDowntime = downtimes.reduce((sum, d) => sum + (d.durationMinutes || 0), 0);
    const actualRuntime = Math.max(0, run.plannedRuntimeMinutes - totalDowntime);
    const [updated] = await db.update(oeeShiftRuns).set({
      status: "ended",
      actualRuntimeMinutes: actualRuntime,
      endedAt: new Date()
    } as any).where(and(eq(oeeShiftRuns.id, req.params.shiftId), eq(oeeShiftRuns.tenantId, tenantId))).returning();
    res.json(updated);
  } catch (error) {
    sendOperationalError(res, error, "Failed to end shift run");
  }
});

router.post("/oee/downtime/log", canManageOee, async (req, res) => {
  try {
    const { tenantId } = getOperationalContext(req);
    let downtimeReason = req.body.downtimeReason;
    let downtimeReasonId = req.body.downtimeReasonId || null;

    if (downtimeReasonId) {
      const [reason] = await db.select().from(oeeReasonCodes)
        .where(and(eq(oeeReasonCodes.id, downtimeReasonId), eq(oeeReasonCodes.tenantId, tenantId), eq(oeeReasonCodes.isActive, true)));
      if (!reason) return res.status(400).json({ error: "downtimeReasonId is invalid or inactive" });
      downtimeReason = reason.reasonName;
    }

    if (!downtimeReason) return res.status(400).json({ error: "downtimeReason or downtimeReasonId is required" });
    const [shiftRun] = await db.select().from(oeeShiftRuns)
      .where(and(eq(oeeShiftRuns.id, req.body.shiftRunId), eq(oeeShiftRuns.tenantId, tenantId)));
    if (!shiftRun) return res.status(400).json({ error: "shiftRunId is invalid for this tenant" });

    const [created] = await db.insert(oeeDowntimeEvents).values({
      tenantId,
      shiftRunId: req.body.shiftRunId,
      workCenterId: req.body.workCenterId,
      downtimeReasonId,
      downtimeReason,
      durationMinutes: req.body.durationMinutes || 0,
    } as any).returning();
    res.status(201).json(created);
  } catch (error) {
    sendOperationalError(res, error, "Failed to log downtime");
  }
});

router.post("/oee/production/log", canManageOee, async (req, res) => {
  try {
    const { tenantId } = getOperationalContext(req);
    if (!req.body.executionId) return res.status(400).json({ error: "executionId is required" });

    const [execution] = await db.select().from(workOrderExecutions)
      .where(and(eq(workOrderExecutions.id, req.body.executionId), eq(workOrderExecutions.tenantId, tenantId)));
    if (!execution) return res.status(400).json({ error: "executionId is invalid for this tenant" });
    if (req.body.workOrderId && execution.workOrderId !== req.body.workOrderId) {
      return res.status(400).json({ error: "executionId does not belong to workOrderId" });
    }

    const [created] = await db.insert(oeeProductionCounts).values({
      tenantId,
      shiftRunId: req.body.shiftRunId,
      workOrderId: execution.workOrderId,
      executionId: execution.id,
      goodCount: req.body.goodCount || 0,
      rejectCount: req.body.rejectCount || 0,
      idealCycleTimeSeconds: req.body.idealCycleTimeSeconds || 10,
    } as any).returning();

    const good = Number(execution.goodQuantity || 0) + Number(req.body.goodCount || 0);
    const reject = Number(execution.rejectedQuantity || 0) + Number(req.body.rejectCount || 0);
    await db.update(workOrderExecutions).set({
      goodQuantity: String(good),
      rejectedQuantity: String(reject),
      updatedAt: new Date(),
    } as any).where(and(eq(workOrderExecutions.id, execution.id), eq(workOrderExecutions.tenantId, tenantId)));

    await db.update(mesWorkOrders).set({
      completedQuantity: String(good),
      updatedAt: new Date(),
    } as any).where(and(eq(mesWorkOrders.id, execution.workOrderId), eq(mesWorkOrders.tenantId, tenantId)));

    res.status(201).json(created);
  } catch (error) {
    sendOperationalError(res, error, "Failed to log production count");
  }
});

router.get("/oee/dashboard", canReadOee, async (req, res) => {
  try {
    const { tenantId } = getOperationalContext(req);
    let availabilitySum = 0;
    let performanceSum = 0;
    let qualitySum = 0;
    let count = 0;

    const query = db.select().from(oeeShiftRuns).where(eq(oeeShiftRuns.tenantId, tenantId));
    const runs = await query;

    const paretoReasonMap: Record<string, number> = {};

    for (const run of runs) {
      const downtimes = await db.select().from(oeeDowntimeEvents).where(eq(oeeDowntimeEvents.shiftRunId, run.id));
      const prod = await db.select().from(oeeProductionCounts).where(eq(oeeProductionCounts.shiftRunId, run.id));
      const totalDowntime = downtimes.reduce((sum, d) => sum + (d.durationMinutes || 0), 0);
      const totalGood = prod.reduce((sum, p) => sum + (p.goodCount || 0), 0);
      const totalReject = prod.reduce((sum, p) => sum + (p.rejectCount || 0), 0);
      
      downtimes.forEach(d => {
        paretoReasonMap[d.downtimeReason] = (paretoReasonMap[d.downtimeReason] || 0) + (d.durationMinutes || 0);
      });

      const planned = run.plannedRuntimeMinutes || 480;
      const actual = Math.max(1, planned - totalDowntime);
      
      const a = planned > 0 ? (planned - totalDowntime) / planned : 0;
      const totalParts = totalGood + totalReject;
      const p = actual > 0 ? (totalParts * 10) / (actual * 60) : 0;
      const q = totalParts > 0 ? totalGood / totalParts : 0;

      availabilitySum += a;
      performanceSum += p;
      qualitySum += q;
      count++;
    }

    const divisor = count || 1;
    const availability = (availabilitySum / divisor) * 100;
    const performance = Math.min(100, (performanceSum / divisor) * 100);
    const quality = (qualitySum / divisor) * 100;
    const oee = (availability * performance * quality) / 10000;

    const downtimePareto = Object.entries(paretoReasonMap).map(([reason, duration]) => ({
      reason,
      duration
    })).sort((x, y) => y.duration - x.duration);

    res.json({
      availability: parseFloat(availability.toFixed(1)),
      performance: parseFloat(performance.toFixed(1)),
      quality: parseFloat(quality.toFixed(1)),
      oee: parseFloat(oee.toFixed(1)),
      currentShift: {
        availability: parseFloat(availability.toFixed(1)),
        performance: parseFloat(performance.toFixed(1)),
        quality: parseFloat(quality.toFixed(1)),
        oee: parseFloat(oee.toFixed(1))
      },
      trend: [
        { name: "Mon", oee: 65 },
        { name: "Tue", oee: 70 },
        { name: "Wed", oee: 72 },
        { name: "Thu", oee: 80 },
        { name: "Fri", oee: 85 }
      ],
      downtimePareto,
      qualityBreakdown: [
        { name: "Good", value: 95 },
        { name: "Rejects", value: 5 }
      ]
    });
  } catch (error) {
    sendOperationalError(res, error, "Failed to calculate OEE metrics");
  }
});

router.get("/oee/dashboard/:workCenterId", canReadOee, async (req, res) => {
  try {
    const { tenantId } = getOperationalContext(req);
    const workCenterId = req.params.workCenterId;

    const runs = await db.select().from(oeeShiftRuns).where(
      and(
        eq(oeeShiftRuns.tenantId, tenantId),
        eq(oeeShiftRuns.workCenterId, workCenterId)
      )
    );

    let availabilitySum = 0;
    let performanceSum = 0;
    let qualitySum = 0;
    let count = 0;

    const paretoReasonMap: Record<string, number> = {};

    for (const run of runs) {
      const downtimes = await db.select().from(oeeDowntimeEvents).where(eq(oeeDowntimeEvents.shiftRunId, run.id));
      const prod = await db.select().from(oeeProductionCounts).where(eq(oeeProductionCounts.shiftRunId, run.id));
      const totalDowntime = downtimes.reduce((sum, d) => sum + (d.durationMinutes || 0), 0);
      const totalGood = prod.reduce((sum, p) => sum + (p.goodCount || 0), 0);
      const totalReject = prod.reduce((sum, p) => sum + (p.rejectCount || 0), 0);

      downtimes.forEach(d => {
        paretoReasonMap[d.downtimeReason] = (paretoReasonMap[d.downtimeReason] || 0) + (d.durationMinutes || 0);
      });

      const planned = run.plannedRuntimeMinutes || 480;
      const actual = Math.max(1, planned - totalDowntime);
      
      const a = planned > 0 ? (planned - totalDowntime) / planned : 0;
      const totalParts = totalGood + totalReject;
      const p = actual > 0 ? (totalParts * 10) / (actual * 60) : 0;
      const q = totalParts > 0 ? totalGood / totalParts : 0;

      availabilitySum += a;
      performanceSum += p;
      qualitySum += q;
      count++;
    }

    const divisor = count || 1;
    const availability = (availabilitySum / divisor) * 100;
    const performance = Math.min(100, (performanceSum / divisor) * 100);
    const quality = (qualitySum / divisor) * 100;
    const oee = (availability * performance * quality) / 10000;

    const downtimePareto = Object.entries(paretoReasonMap).map(([reason, duration]) => ({
      reason,
      duration
    })).sort((x, y) => y.duration - x.duration);

    res.json({
      availability: parseFloat(availability.toFixed(1)),
      performance: parseFloat(performance.toFixed(1)),
      quality: parseFloat(quality.toFixed(1)),
      oee: parseFloat(oee.toFixed(1)),
      currentShift: {
        availability: parseFloat(availability.toFixed(1)),
        performance: parseFloat(performance.toFixed(1)),
        quality: parseFloat(quality.toFixed(1)),
        oee: parseFloat(oee.toFixed(1))
      },
      trend: [
        { name: "Mon", oee: 65 },
        { name: "Tue", oee: 70 },
        { name: "Wed", oee: 72 },
        { name: "Thu", oee: 80 },
        { name: "Fri", oee: 85 }
      ],
      downtimePareto,
      qualityBreakdown: [
        { name: "Good", value: 95 },
        { name: "Rejects", value: 5 }
      ]
    });
  } catch (error) {
    sendOperationalError(res, error, "Failed to calculate OEE metrics for work center");
  }
});

export const oeeRouter = router;
