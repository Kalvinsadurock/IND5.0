import { Router } from 'express';
import { db } from '../../db';
import { eq, and, sql } from 'drizzle-orm';
import { getOperationalContext, sendOperationalError, writeOperationalAudit } from '../../lib/operational-context';
import { authenticate, requirePermission, requireTenant } from '../../middleware/auth';
import {
    processes,
    processSteps,
    parts,
    partStepInstances,
    kit_inventory,
    resin_lot_inventory,
    resin_consumption,
    inventoryMaterials,
    inventoryStockLedger,
    mesWorkOrders,
    workOrderExecutions,
} from '../../../shared/schema';

const router = Router();
const canExecuteMes = [authenticate, requireTenant, requirePermission('mes.work_order.execute')];

async function ensureSystemMaterial(tx: any, tenantId: string, materialCode: string, materialName: string, materialType: string) {
    const [existing] = await tx
        .select()
        .from(inventoryMaterials)
        .where(and(eq(inventoryMaterials.tenantId, tenantId), eq(inventoryMaterials.materialCode, materialCode)));

    if (existing) return existing;

    const [created] = await tx.insert(inventoryMaterials).values({
        tenantId,
        materialCode,
        materialName,
        materialType,
        baseUom: 'ea',
        status: 'active',
        lotControlled: true,
        serialControlled: false,
    } as any).returning();

    return created;
}

/**
 * POST /api/processes/:id/start
 * 
 * ISA-95 Compliant Process Start
 * - Creates part (work order)
 * - Initializes all step instances
 * - Atomically consumes materials
 * - Maintains execution authority
 * 
 * Transaction-safe with full rollback on failure
 */
router.post('/processes/:id/start', canExecuteMes, async (req, res) => {
    const processId = parseInt(req.params.id);
    const { employeeId, materialBindings, workOrderId, executionId } = req.body;
    let context;
    try {
        context = getOperationalContext(req);
    } catch (error) {
        return sendOperationalError(res, error, 'Failed to resolve operational context');
    }
    const { tenantId, actorUserId } = context;

    if (isNaN(processId)) {
        return res.status(400).json({ error: 'Invalid process ID' });
    }

    if (!employeeId) {
        return res.status(400).json({ error: 'employeeId is required' });
    }

    if (!materialBindings || typeof materialBindings !== 'object') {
        return res.status(400).json({ error: 'materialBindings is required' });
    }

    if ((workOrderId || executionId) && !tenantId) {
        return res.status(400).json({ error: 'tenantId is required when starting a work order execution' });
    }

    try {
        // Use transaction for atomic operations
        const result = await db.transaction(async (tx) => {
            // 1. Validate process exists
            const [process] = await tx
                .select()
                .from(processes)
                .where(eq(processes.id, processId));

            if (!process) {
                throw new Error('Process not found');
            }

            // 2. Validate and prepare material consumption
            const consumedMaterials: any = {};

            // Material Kit (for non-moulding processes)
            if (materialBindings.materialKitId) {
                const [kit] = await tx
                    .select()
                    .from(kit_inventory)
                    .where(
                        and(
                            eq(kit_inventory.id, materialBindings.materialKitId),
                            eq(kit_inventory.status, 'AVAILABLE')
                        )
                    );

                if (!kit) {
                    throw new Error('Material kit not available');
                }

                consumedMaterials.materialKit = { id: kit.id, kit_code: kit.kit_code };
            }

            // Glass Kit (for moulding processes)
            if (materialBindings.glassKitId) {
                const [glassKit] = await tx
                    .select()
                    .from(kit_inventory)
                    .where(
                        and(
                            eq(kit_inventory.id, materialBindings.glassKitId),
                            eq(kit_inventory.status, 'AVAILABLE')
                        )
                    );

                if (!glassKit) {
                    throw new Error('Glass kit not available');
                }

                consumedMaterials.glassKit = { id: glassKit.id, kit_code: glassKit.kit_code };
            }

            // Resin Lot (for moulding processes)
            if (materialBindings.resinLotId) {
                const [resinLot] = await tx
                    .select()
                    .from(resin_lot_inventory)
                    .where(eq(resin_lot_inventory.id, materialBindings.resinLotId));

                if (!resinLot || resinLot.available_count <= 0) {
                    throw new Error('Resin lot not available or insufficient quantity');
                }

                consumedMaterials.resinLot = {
                    id: resinLot.id,
                    resin_code: resinLot.resin_code,
                };
            }

            // 3. Create Part (Work Order)
            const partNumber = `P${process.processNumber}-${Date.now().toString().slice(-6)}`;

            const [newPart] = await tx
                .insert(parts)
                .values({
                    partNumber,
                    processId,
                    status: 'waiting',
                    priority: 'normal',
                    createdAt: new Date(),
                })
                .returning();

            // 4. Get all process steps
            const steps = await tx
                .select()
                .from(processSteps)
                .where(eq(processSteps.processId, processId))
                .orderBy(processSteps.stepNumber);

            if (steps.length === 0) {
                throw new Error('No steps found for this process');
            }

            // 5. Initialize all step instances
            const stepInstancesData = steps.map((step, index) => ({
                partId: newPart.id,
                stepId: step.id,
                status: index === 0 ? 'waiting' : 'planned', // Only first step is waiting/ready
                // sequenceNumber: index + 1, // Removed if not in schema or if implicit
                createdAt: new Date(),
            }));

            const stepInstances = await tx
                .insert(partStepInstances)
                .values(stepInstancesData)
                .returning();

            let linkedExecution: any = null;
            let linkedWorkOrder: any = null;

            if (tenantId && (executionId || workOrderId)) {
                if (executionId) {
                    const [existingExecution] = await tx
                        .select()
                        .from(workOrderExecutions)
                        .where(and(
                            eq(workOrderExecutions.id, executionId),
                            eq(workOrderExecutions.tenantId, tenantId)
                        ));
                    if (!existingExecution) throw new Error('Work order execution not found');
                    linkedExecution = existingExecution;
                    linkedWorkOrder = { id: existingExecution.workOrderId };
                } else {
                    const [existingWorkOrder] = await tx
                        .select()
                        .from(mesWorkOrders)
                        .where(and(
                            eq(mesWorkOrders.id, workOrderId),
                            eq(mesWorkOrders.tenantId, tenantId)
                        ));
                    if (!existingWorkOrder) throw new Error('Work order not found');
                    linkedWorkOrder = existingWorkOrder;
                    const [createdExecution] = await tx.insert(workOrderExecutions).values({
                        tenantId,
                        workOrderId: existingWorkOrder.id,
                        partId: newPart.id,
                        processId,
                        currentStepId: steps[0].id,
                        executionNumber: `${existingWorkOrder.workOrderNumber}-EX-${Date.now()}`,
                        status: 'active',
                        plannedQuantity: String(existingWorkOrder.plannedQuantity || '1'),
                        startedAt: new Date(),
                        createdBy: actorUserId,
                        updatedBy: actorUserId,
                    } as any).returning();
                    linkedExecution = createdExecution;
                }

                if (linkedExecution) {
                    const [updatedExecution] = await tx.update(workOrderExecutions).set({
                        partId: newPart.id,
                        processId,
                        currentStepId: steps[0].id,
                        status: 'active',
                        startedAt: linkedExecution.startedAt || new Date(),
                        updatedAt: new Date(),
                        updatedBy: actorUserId,
                    } as any).where(and(
                        eq(workOrderExecutions.id, linkedExecution.id),
                        eq(workOrderExecutions.tenantId, tenantId)
                    )).returning();
                    linkedExecution = updatedExecution;

                    await tx.update(mesWorkOrders).set({
                        status: 'in_progress',
                        startedAt: new Date(),
                        updatedAt: new Date(),
                        updatedBy: actorUserId,
                    } as any).where(and(
                        eq(mesWorkOrders.id, linkedExecution.workOrderId),
                        eq(mesWorkOrders.tenantId, tenantId)
                    ));
                }
            }

            // 6. Consume materials atomically
            if (consumedMaterials.materialKit) {
                await tx
                    .update(kit_inventory)
                    .set({
                        status: 'CONSUMED',
                        process_instance_id: newPart.id,
                        consumed_at: new Date(),
                        consumed_by: newPart.id.toString() // Or associate with employee if available, but partId is critical
                    })
                    .where(eq(kit_inventory.id, consumedMaterials.materialKit.id));

                if (tenantId && linkedExecution) {
                    const material = await ensureSystemMaterial(tx, tenantId, 'LEGACY_KIT', 'Legacy Material Kit', 'kit');
                    await tx.insert(inventoryStockLedger).values({
                        tenantId,
                        materialId: material.id,
                        workOrderId: linkedExecution.workOrderId,
                        executionId: linkedExecution.id,
                        movementType: 'issue',
                        quantity: '1',
                        uom: 'ea',
                        lotNumber: consumedMaterials.materialKit.kit_code,
                        referenceType: 'kit_inventory',
                        referenceId: String(consumedMaterials.materialKit.id),
                        reason: 'Issued by process start',
                        postedBy: actorUserId,
                    } as any);
                }
            }

            if (consumedMaterials.glassKit) {
                await tx
                    .update(kit_inventory)
                    .set({
                        status: 'CONSUMED',
                        process_instance_id: newPart.id,
                        consumed_at: new Date(),
                        consumed_by: newPart.id.toString()
                    })
                    .where(eq(kit_inventory.id, consumedMaterials.glassKit.id));

                if (tenantId && linkedExecution) {
                    const material = await ensureSystemMaterial(tx, tenantId, 'LEGACY_GLASS', 'Legacy Glass Kit', 'glass_kit');
                    await tx.insert(inventoryStockLedger).values({
                        tenantId,
                        materialId: material.id,
                        workOrderId: linkedExecution.workOrderId,
                        executionId: linkedExecution.id,
                        movementType: 'issue',
                        quantity: '1',
                        uom: 'ea',
                        lotNumber: consumedMaterials.glassKit.kit_code,
                        referenceType: 'kit_inventory',
                        referenceId: String(consumedMaterials.glassKit.id),
                        reason: 'Issued by process start',
                        postedBy: actorUserId,
                    } as any);
                }
            }

            if (consumedMaterials.resinLot) {
                await tx
                    .update(resin_lot_inventory)
                    .set({
                        available_count: sql`${resin_lot_inventory.available_count} - 1`,
                    })
                    .where(eq(resin_lot_inventory.id, consumedMaterials.resinLot.id));

                await tx
                    .insert(resin_consumption)
                    .values({
                        resin_lot_id: consumedMaterials.resinLot.id,
                        process_id: processId,
                        process_instance_id: newPart.id,
                        consumed_by: newPart.id.toString(),
                        consumed_at: new Date(),
                    });

                if (tenantId && linkedExecution) {
                    const material = await ensureSystemMaterial(tx, tenantId, 'LEGACY_RESIN', 'Legacy Resin Lot', 'resin');
                    await tx.insert(inventoryStockLedger).values({
                        tenantId,
                        materialId: material.id,
                        workOrderId: linkedExecution.workOrderId,
                        executionId: linkedExecution.id,
                        movementType: 'issue',
                        quantity: '1',
                        uom: 'ea',
                        lotNumber: consumedMaterials.resinLot.resin_code,
                        referenceType: 'resin_lot_inventory',
                        referenceId: String(consumedMaterials.resinLot.id),
                        reason: 'Issued by process start',
                        postedBy: actorUserId,
                    } as any);
                }
            }

            return {
                part: newPart,
                stepInstances,
                consumedMaterials,
                execution: linkedExecution,
            };
        });

        await writeOperationalAudit(req, {
            module: 'mes',
            eventType: 'process_execution.started',
            entityType: 'work_order_execution',
            entityId: result.execution?.id ? String(result.execution.id) : null,
            action: 'start',
            afterSnapshot: result.execution || result.part,
            metadata: {
                processId,
                partId: result.part.id,
                materialKeys: Object.keys(result.consumedMaterials || {}),
            },
        });

        // Success response
        return res.status(201).json({
            success: true,
            part: {
                id: result.part.id,
                partNumber: result.part.partNumber,
                status: result.part.status,
                processId: result.part.processId,
            },
            stepInstances: result.stepInstances.map(si => ({
                id: si.id,
                stepId: si.stepId,
                status: si.status,
            })),
            consumedMaterials: result.consumedMaterials,
            execution: result.execution,
        });
    } catch (error) {
        console.error('Process start error:', error);

        // Return appropriate error
        if (error instanceof Error) {
            if (error.message.includes('not found') || error.message.includes('not available')) {
                return res.status(400).json({ error: error.message });
            }
        }

        return res.status(500).json({ error: 'Failed to start process execution' });
    }
});

export const startRouter = router;
