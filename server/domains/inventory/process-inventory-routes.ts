import { Router } from 'express';
import { db } from '../../db';
import { eq, and, sql } from 'drizzle-orm';
import { kit_inventory, resin_lot_inventory } from '../../../shared/schema';

const router = Router();

/**
 * GET /api/process/:id/inventory
 * Returns available inventory counts for a specific process
 * 
 * Phase 3: Inventory Read API
 * ISA-95 Compliance:
 * - READ-ONLY operation
 * - NO mutations to execution state
 * - Returns aggregated counts only
 */
router.get('/process/:id/inventory', async (req, res) => {
    try {
        const processId = parseInt(req.params.id);

        if (isNaN(processId)) {
            return res.status(400).json({ error: 'Invalid process ID' });
        }

        // Fetch available material kits
        const materialKits = await db
            .select()
            .from(kit_inventory)
            .where(
                and(
                    eq(kit_inventory.process_id, processId),
                    eq(kit_inventory.kit_type, 'KIT'),
                    eq(kit_inventory.status, 'AVAILABLE')
                )
            );

        // Fetch available glass kits
        const glassKits = await db
            .select()
            .from(kit_inventory)
            .where(
                and(
                    eq(kit_inventory.process_id, processId),
                    eq(kit_inventory.kit_type, 'GLASS'),
                    eq(kit_inventory.status, 'AVAILABLE')
                )
            );

        // Fetch available resin lots
        const resinLots = await db
            .select()
            .from(resin_lot_inventory)
            .where(sql`available_count > 0`);

        return res.json({
            kits: [...materialKits, ...glassKits],
            resin: resinLots,
            // Keep counts for backward compatibility if needed, though UI likely uses arrays now
            materialKits: materialKits.length,
            glassKits: glassKits.length,
            resinLots: resinLots.reduce((sum, lot) => sum + lot.available_count, 0),
        });
    } catch (error) {
        console.error('Inventory fetch error:', error);
        return res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

export const processInventoryRouter = router;
