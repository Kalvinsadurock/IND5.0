import { Router } from 'express';
import { db } from '../../db';
import { eq, and, sql } from 'drizzle-orm';
import {
    processes,
    processSteps,
    parts,
    partStepInstances,
    kit_inventory,
    resin_lot_inventory,
    resin_consumption,
} from '../../../shared/schema';

const router = Router();

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
router.post('/processes/:id/start', async (req, res) => {
    const processId = parseInt(req.params.id);
    const { employeeId, materialBindings } = req.body;

    if (isNaN(processId)) {
        return res.status(400).json({ error: 'Invalid process ID' });
    }

    if (!employeeId) {
        return res.status(400).json({ error: 'employeeId is required' });
    }

    if (!materialBindings || typeof materialBindings !== 'object') {
        return res.status(400).json({ error: 'materialBindings is required' });
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
            }

            return {
                part: newPart,
                stepInstances,
                consumedMaterials,
            };
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
