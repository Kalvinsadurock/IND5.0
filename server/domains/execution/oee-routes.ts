import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { oeeShiftRuns, oeeDowntimeEvents, oeeProductionCounts, platformAuditEvents } from "../../../shared/schema";

const router = Router();

function tenantIdFrom(req: any) {
  return req.header("x-tenant-id") || req.query.tenantId || req.body?.tenantId || null;
}

router.get("/oee/shift/runs", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
    const rows = await db.select().from(oeeShiftRuns).where(eq(oeeShiftRuns.tenantId, tenantId));
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch shift runs" });
  }
});

router.post("/oee/shift/start", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
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
    res.status(500).json({ error: "Failed to start shift run" });
  }
});

router.post("/oee/downtime/log", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
    const [created] = await db.insert(oeeDowntimeEvents).values({
      tenantId,
      shiftRunId: req.body.shiftRunId,
      downtimeReason: req.body.downtimeReason,
      durationMinutes: req.body.durationMinutes || 0,
    } as any).returning();
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: "Failed to log downtime" });
  }
});

router.post("/oee/production/log", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
    const [created] = await db.insert(oeeProductionCounts).values({
      tenantId,
      shiftRunId: req.body.shiftRunId,
      goodCount: req.body.goodCount || 0,
      rejectCount: req.body.rejectCount || 0,
    } as any).returning();
    res.status(201).json(created);
  } catch (error) {
    res.status(500).json({ error: "Failed to log production count" });
  }
});

export const oeeRouter = router;