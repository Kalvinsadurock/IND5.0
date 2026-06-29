import { Router } from 'express';
import { db } from '../../db';
import { partStepInstances, processes, parts } from '../../../shared/schema';
import { eq, and, sql, gte, inArray } from 'drizzle-orm';

const router = Router();

/**
 * ANALYTICS DOMAIN - READ-ONLY ROUTES
 * 
 * Purpose: Provide safe, read-only endpoints for dashboards and KPIs
 * 
 * ISA-95 Compliance:
 * - NO mutations to partStepInstances or execution state
 * - NO auto-consumption of materials
 * - NO execution authority
 * - Pure read operations only
 */

/**
 * GET /api/kpis
 * Returns KPI metrics for dashboard sidebar
 * Aggregates data from partStepInstances
 */
router.get('/kpis', async (req, res) => {
    try {
        // Get total completed blades (parts with status 'completed')
        const completedResult = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(parts)
            .where(eq(parts.status, 'completed'));

        const completedBlades = completedResult[0]?.count || 0;

        // Get total active parts (in_progress, waiting, paused)
        const activeResult = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(parts)
            .where(sql`status IN ('in_progress', 'waiting', 'paused')`);

        const activeParts = activeResult[0]?.count || 0;

        // Calculate daily run rate (completed today)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dailyResult = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(parts)
            .where(
                and(
                    eq(parts.status, 'completed'),
                    gte(parts.updatedAt, today)
                )
            );

        const dailyRunRate = dailyResult[0]?.count || 0;

        // TODO: Calculate yield rate from quality data when available
        const yieldRate = 0;

        return res.json({
            totalTarget: { sets: 0, blades: completedBlades },
            setProgress: { completed: completedBlades, total: completedBlades + activeParts, percent: completedBlades > 0 ? Math.round((completedBlades / (completedBlades + activeParts)) * 100) : 0 },
            completedBlades,
            dailyRunRate,
            yieldRate,
            trend: { direction: 'same', delta: 0 },
        });
    } catch (error) {
        console.error('KPI fetch error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/category-summary
 * Returns summary statistics by process category
 * Aggregates parts grouped by process category
 */
router.get('/category-summary', async (req, res) => {
    try {
        // Get all processes with their categories
        const allProcesses = await db.select().from(processes);

        // Group processes by category
        const categoriesMap = new Map<string, any[]>();
        allProcesses.forEach(proc => {
            if (!categoriesMap.has(proc.category)) {
                categoriesMap.set(proc.category, []);
            }
            categoriesMap.get(proc.category)!.push(proc);
        });

        // For each category, aggregate part counts
        const categoryData = [];

        for (const [category, procs] of categoriesMap.entries()) {
            const processIds = procs.map(p => p.id);

            // Skip if no processes in this category
            if (processIds.length === 0) {
                categoryData.push({
                    category,
                    title: category.charAt(0).toUpperCase() + category.slice(1),
                    processCount: 0,
                    inProgress: 0,
                    hold: 0,
                    completed: 0,
                    activeMoulds: [],
                });
                continue;
            }

            // Count parts by status for this category
            const inProgressResult = await db
                .select({ count: sql<number>`count(*)::int` })
                .from(parts)
                .where(
                    and(
                        inArray(parts.processId, processIds),
                        eq(parts.status, 'in_progress')
                    )
                );

            const holdResult = await db
                .select({ count: sql<number>`count(*)::int` })
                .from(parts)
                .where(
                    and(
                        inArray(parts.processId, processIds),
                        eq(parts.status, 'hold')
                    )
                );

            const completedResult = await db
                .select({ count: sql<number>`count(*)::int` })
                .from(parts)
                .where(
                    and(
                        inArray(parts.processId, processIds),
                        eq(parts.status, 'completed')
                    )
                );

            categoryData.push({
                category,
                title: category.charAt(0).toUpperCase() + category.slice(1),
                processCount: procs.length,
                inProgress: inProgressResult[0]?.count || 0,
                hold: holdResult[0]?.count || 0,
                completed: completedResult[0]?.count || 0,
                activeMoulds: [], // TODO: Implement when mould tracking is needed
            });
        }

        return res.json(categoryData);
    } catch (error) {
        console.error('Category summary fetch error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/trends/throughput
 * Returns throughput trend data
 * Status: STUB
 */
router.get('/trends/throughput', async (req, res) => {
    try {
        // STUB: Return empty throughput trend
        // TODO: Implement safe read-only time-series aggregation
        return res.json([]);
    } catch (error) {
        console.error('Throughput trends fetch error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/trends/status
 * Returns status distribution trend data
 * Status: STUB
 */
router.get('/trends/status', async (req, res) => {
    try {
        // STUB: Return empty status trend
        // TODO: Implement safe read-only status distribution over time
        return res.json([]);
    } catch (error) {
        console.error('Status trends fetch error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/trends/yield
 * Returns yield trend data
 * Status: STUB
 */
router.get('/trends/yield', async (req, res) => {
    try {
        // STUB: Return empty yield trend
        // TODO: Implement safe read-only yield calculation over time
        return res.json([]);
    } catch (error) {
        console.error('Yield trends fetch error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export const analyticsRouter = router;
