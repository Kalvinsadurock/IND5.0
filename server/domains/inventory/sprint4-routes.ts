import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db";
import { getOperationalContext, sendOperationalError, writeOperationalAudit } from "../../lib/operational-context";
import { authenticate, requirePermission, requireTenant } from "../../middleware/auth";
import { inventoryMaterials, inventoryStockLedger, workOrderExecutions } from "../../../shared/schema";

const router = Router();
const canReadInventory = [authenticate, requireTenant];
const canManageInventory = [authenticate, requireTenant, requirePermission("mes.work_order.execute")];

router.get("/materials", canReadInventory, async (req, res) => {
  try {
    const { tenantId } = getOperationalContext(req);
    const rows = await db.select().from(inventoryMaterials)
      .where(eq(inventoryMaterials.tenantId, tenantId))
      .orderBy(desc(inventoryMaterials.createdAt));
    res.json(rows);
  } catch (error) {
    sendOperationalError(res, error, "Failed to fetch material master");
  }
});

router.post("/materials", canManageInventory, async (req, res) => {
  try {
    const { tenantId, actorUserId } = getOperationalContext(req);
    if (!req.body.materialCode) return res.status(400).json({ error: "materialCode is required" });
    if (!req.body.materialName) return res.status(400).json({ error: "materialName is required" });

    const [created] = await db.insert(inventoryMaterials).values({
      tenantId,
      materialCode: req.body.materialCode,
      materialName: req.body.materialName,
      materialType: req.body.materialType || "raw_material",
      baseUom: req.body.baseUom || "ea",
      status: req.body.status || "active",
      lotControlled: Boolean(req.body.lotControlled),
      serialControlled: Boolean(req.body.serialControlled),
      createdBy: actorUserId,
      updatedBy: actorUserId,
    } as any).returning();

    await writeOperationalAudit(req, {
      module: "inventory",
      eventType: "material.created",
      entityType: "inventory_material",
      entityId: created.id,
      action: "create",
      afterSnapshot: created,
    });

    res.status(201).json(created);
  } catch (error) {
    sendOperationalError(res, error, "Failed to create material");
  }
});

router.patch("/materials/:id", canManageInventory, async (req, res) => {
  try {
    const { tenantId, actorUserId } = getOperationalContext(req);
    const [before] = await db.select().from(inventoryMaterials)
      .where(and(eq(inventoryMaterials.id, req.params.id), eq(inventoryMaterials.tenantId, tenantId)));
    if (!before) return res.status(404).json({ error: "Material not found" });

    const updates: Record<string, unknown> = { updatedAt: new Date(), updatedBy: actorUserId };
    for (const field of ["materialCode", "materialName", "materialType", "baseUom", "status", "lotControlled", "serialControlled"] as const) {
      if (field in req.body) updates[field] = req.body[field];
    }

    const [updated] = await db.update(inventoryMaterials).set(updates as any)
      .where(and(eq(inventoryMaterials.id, before.id), eq(inventoryMaterials.tenantId, tenantId)))
      .returning();

    await writeOperationalAudit(req, {
      module: "inventory",
      eventType: "material.updated",
      entityType: "inventory_material",
      entityId: updated.id,
      action: "update",
      beforeSnapshot: before,
      afterSnapshot: updated,
    });

    res.json(updated);
  } catch (error) {
    sendOperationalError(res, error, "Failed to update material");
  }
});

router.get("/stock/ledger", canReadInventory, async (req, res) => {
  try {
    const { tenantId } = getOperationalContext(req);
    const materialId = typeof req.query.materialId === "string" ? req.query.materialId : undefined;
    const executionId = typeof req.query.executionId === "string" ? req.query.executionId : undefined;
    const conditions = [eq(inventoryStockLedger.tenantId, tenantId)];
    if (materialId) conditions.push(eq(inventoryStockLedger.materialId, materialId));
    if (executionId) conditions.push(eq(inventoryStockLedger.executionId, executionId));

    const rows = await db.select().from(inventoryStockLedger)
      .where(and(...conditions))
      .orderBy(desc(inventoryStockLedger.postedAt));
    res.json(rows);
  } catch (error) {
    sendOperationalError(res, error, "Failed to fetch stock ledger");
  }
});

async function postMovement(req: any, res: any, movementType: string) {
  const { tenantId, actorUserId } = getOperationalContext(req);
  if (!req.body.materialId) return res.status(400).json({ error: "materialId is required" });
  if (req.body.quantity === undefined) return res.status(400).json({ error: "quantity is required" });
  if (!req.body.uom) return res.status(400).json({ error: "uom is required" });
  if (["issue", "return", "produce_receipt"].includes(movementType) && !req.body.executionId) {
    return res.status(400).json({ error: "executionId is required for pilot issue, return, and produced goods receipt" });
  }

  const [material] = await db.select().from(inventoryMaterials)
    .where(and(eq(inventoryMaterials.id, req.body.materialId), eq(inventoryMaterials.tenantId, tenantId)));
  if (!material) return res.status(404).json({ error: "Material not found" });

  let execution: any = null;
  if (req.body.executionId) {
    [execution] = await db.select().from(workOrderExecutions)
      .where(and(eq(workOrderExecutions.id, req.body.executionId), eq(workOrderExecutions.tenantId, tenantId)));
    if (!execution) return res.status(404).json({ error: "Work order execution not found" });
    if (req.body.workOrderId && req.body.workOrderId !== execution.workOrderId) {
      return res.status(400).json({ error: "workOrderId does not match executionId" });
    }
  }

  const [created] = await db.insert(inventoryStockLedger).values({
    tenantId,
    materialId: material.id,
    workOrderId: execution?.workOrderId || req.body.workOrderId || null,
    executionId: req.body.executionId || null,
    movementType,
    quantity: String(req.body.quantity),
    uom: req.body.uom,
    lotNumber: req.body.lotNumber || null,
    fromLocation: req.body.fromLocation || null,
    toLocation: req.body.toLocation || null,
    referenceType: req.body.referenceType || null,
    referenceId: req.body.referenceId || null,
    reason: req.body.reason || null,
    postedBy: actorUserId,
  } as any).returning();

  await writeOperationalAudit(req, {
    module: "inventory",
    eventType: `stock.${movementType}`,
    entityType: "inventory_stock_ledger",
    entityId: created.id,
    action: movementType,
    afterSnapshot: created,
    metadata: { materialCode: material.materialCode, executionId: created.executionId },
  });

  return res.status(201).json(created);
}

router.post("/stock/issue", canManageInventory, async (req, res) => {
  try {
    return await postMovement(req, res, "issue");
  } catch (error) {
    sendOperationalError(res, error, "Failed to issue stock");
  }
});

router.post("/stock/return", canManageInventory, async (req, res) => {
  try {
    return await postMovement(req, res, "return");
  } catch (error) {
    sendOperationalError(res, error, "Failed to return stock");
  }
});

router.post("/stock/receive", canManageInventory, async (req, res) => {
  try {
    return await postMovement(req, res, "receipt");
  } catch (error) {
    sendOperationalError(res, error, "Failed to receive stock");
  }
});

router.post("/stock/produce-receipt", canManageInventory, async (req, res) => {
  try {
    return await postMovement(req, res, "produce_receipt");
  } catch (error) {
    sendOperationalError(res, error, "Failed to post produced stock");
  }
});

export const sprint4InventoryRouter = router;
