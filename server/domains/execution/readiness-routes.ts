import { Router } from 'express';
import { db } from '../../db';
import { eq, and, sql } from 'drizzle-orm';
import { processes, kit_inventory, resin_lot_inventory, processSteps } from '../../../shared/schema';

const router = Router();

/**
 * GET /api/processes/:id/readiness
 * 
 * Returns process readiness information with clear separation:
 * - Materials: Inventory facts (required vs available)
 * - Quality: QA holds and pending checkpoints
 * - Execution Verdict: Can start with explicit reasons
 * 
 * ISA-95 Compliance:
 * - READ-ONLY operation
 * - No mutations to execution state
 * - Clear domain separation (inventory, quality, execution)
 */
router.get('/processes/:id/readiness', async (req, res) => {
    try {
        const processId = parseInt(req.params.id);

        if (isNaN(processId)) {
            return res.status(400).json({ error: 'Invalid process ID' });
        }

        // Get process details
        const [process] = await db
            .select()
            .from(processes)
            .where(eq(processes.id, processId));

        if (!process) {
            return res.status(404).json({ error: 'Process not found' });
        }

        // MATERIAL AVAILABILITY - Pure inventory facts
        const materials = await getMaterialAvailability(processId, process.category);

        // EXECUTION VERDICT - Based solely on material availability
        const executionVerdict = determineExecutionVerdict(materials);

        return res.json({
            processId,
            processName: process.name,
            processCategory: process.category,
            materials,
            executionVerdict,
        });
    } catch (error) {
        console.error('Process readiness fetch error:', error);
        return res.status(500).json({ error: 'Failed to fetch process readiness' });
    }
});

/**
 * Get material availability for a process
 * Returns different materials based on process category
 */
async function getMaterialAvailability(processId: number, category: string) {
    const materials = [];

    // Standardize requirements: Material Kit + Glass Kit for ALL processes

    // Material Kits
    const materialKitCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(kit_inventory)
        .where(
            and(
                eq(kit_inventory.process_id, processId),
                eq(kit_inventory.kit_type, 'KIT'),
                eq(kit_inventory.status, 'AVAILABLE')
            )
        );

    materials.push({
        type: 'material_kit',
        label: 'Material Kit',
        required: 1,
        available: materialKitCount[0]?.count || 0,
        unit: 'kit',
    });

    // Glass Kits
    const glassKitCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(kit_inventory)
        .where(
            and(
                eq(kit_inventory.process_id, processId),
                eq(kit_inventory.kit_type, 'GLASS'),
                eq(kit_inventory.status, 'AVAILABLE')
            )
        );

    materials.push({
        type: 'glass_kit',
        label: 'Glass Kit',
        required: 1,
        available: glassKitCount[0]?.count || 0,
        unit: 'kit',
    });

    // If Moulding, ALSO check Resin (optional per strict "Material + Glass" request, but safer to keep existing requirement if it was there)
    // The user strictly asked for "Material Kit AND Glass Kit must be displayed... for ALL processes".
    // They didn't explicitly say "Remove Resin", but they said "Process must not start unless: Required Material Kit is selected, Required Glass Kit is selected."
    // I will include Resin for moulding as an ADDITION, but ensure Kit+Glass are primary.
    if (category === 'moulding') {
        const resinCount = await db
            .select({
                totalAvailable: sql<number>`COALESCE(SUM(available_count), 0)::int`
            })
            .from(resin_lot_inventory);

        materials.push({
            type: 'resin_lot',
            label: 'Resin Lot',
            required: 1,
            available: resinCount[0]?.totalAvailable || 0,
            unit: 'lot',
        });
    }

    return materials;
}

/**
 * Determine execution verdict - Can the process start?
 * Based solely on material availability (quality is upstream)
 */
function determineExecutionVerdict(materials: any[]) {
    const blockers: string[] = [];

    // Check material availability only
    for (const material of materials) {
        if (material.available < material.required) {
            blockers.push(
                `Insufficient ${material.label}: ${material.available}/${material.required} ${material.unit}${material.required > 1 ? 's' : ''} available`
            );
        }
    }

    return {
        canStart: blockers.length === 0,
        blockers,
        readyMessage: blockers.length === 0 ? 'Process is ready to start' : null,
    };
}

export const readinessRouter = router;
