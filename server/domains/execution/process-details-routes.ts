import { Router } from 'express';
import { db } from '../../db';
import { eq, and, sql, desc } from 'drizzle-orm';
import { parts, kit_inventory, resin_lot_inventory } from '../../../shared/schema';

const router = Router();

/**
 * GET /api/processes/:id/summary
 * Returns status counts for parts in a given process
 */
router.get('/processes/:id/summary', async (req, res) => {
    try {
        const processId = parseInt(req.params.id);
        if (isNaN(processId)) return res.status(400).json({ error: 'Invalid process ID' });

        const summary = await db
            .select({
                status: parts.status,
                count: sql<number>`count(*)::int`,
            })
            .from(parts)
            .where(eq(parts.processId, processId))
            .groupBy(parts.status);

        const result = {
            inProgress: 0,
            hold: 0,
            completed: 0
        };

        summary.forEach(item => {
            if (['active', 'in_progress'].includes(item.status)) result.inProgress += item.count;
            else if (['hold', 'qa_hold', 'blocked'].includes(item.status)) result.hold += item.count;
            else if (['completed', 'shipped'].includes(item.status)) result.completed += item.count;
        });

        res.json(result);
    } catch (error) {
        console.error('Process summary error:', error);
        res.status(500).json({ error: 'Failed to fetch process summary' });
    }
});

/**
 * GET /api/processes/:id/parts
 * Returns list of parts for the process
 */
router.get('/processes/:id/parts', async (req, res) => {
    try {
        const processId = parseInt(req.params.id);
        if (isNaN(processId)) return res.status(400).json({ error: 'Invalid process ID' });

        const partsList = await db
            .select()
            .from(parts)
            .where(eq(parts.processId, processId))
            .orderBy(desc(parts.createdAt))
            .limit(50); // Limit for performance

        res.json(partsList);
    } catch (error) {
        console.error('Process parts error:', error);
        res.status(500).json({ error: 'Failed to fetch parts' });
    }
});

/**
 * GET /api/processes/:id/supply-check
 * Returns supply status summary (can reuse inventory logic)
 */
router.get('/processes/:id/supply-check', async (req, res) => {
    try {
        const processId = parseInt(req.params.id);
        if (isNaN(processId)) return res.status(400).json({ error: 'Invalid process ID' });

        // Simple aggregation of available kits vs required (mock logic or real if we have demand data)
        // For now, returning availability counts to populate the graph

        const kitCount = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(kit_inventory)
            .where(and(
                eq(kit_inventory.process_id, processId),
                eq(kit_inventory.status, 'AVAILABLE')
            ));

        // Mocking "missing" and "qaHold" logic as we don't have a demand table easily accessible
        // Use realistic data based on what's available
        const available = kitCount[0]?.count || 0;

        res.json({
            available: available,
            missing: 0, // Placeholder
            qaHold: 0   // Placeholder
        });
    } catch (error) {
        console.error('Supply check error:', error);
        res.status(500).json({ error: 'Failed to fetch supply status' });
    }
});

/**
 * GET /api/processes/:id/active-parts
 * Returns list of active parts for the process
 */
router.get('/processes/:id/active-parts', async (req, res) => {
    try {
        const processId = parseInt(req.params.id);
        if (isNaN(processId)) return res.status(400).json({ error: 'Invalid ID' });

        const activeParts = await db
            .select()
            .from(parts)
            .where(and(
                eq(parts.processId, processId),
                sql`status IN ('pending', 'in_progress', 'paused', 'active')`
            ))
            .orderBy(desc(parts.createdAt));

        res.json(activeParts);
    } catch (err) {
        console.error('Error fetching active parts:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export const processDetailsRouter = router;
