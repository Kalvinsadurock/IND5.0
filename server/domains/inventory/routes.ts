import { Router } from "express";
import { db } from "../../db";
import { eq, and, like, desc, gt } from "drizzle-orm";
import { kit_inventory, resin_lot_inventory, resin_consumption, parts, processes } from "../../../shared/schema";

const router = Router();

// Helper to generate Kit Code
async function generateKitCode(processId: number, kitType: 'KIT' | 'GLASS'): Promise<string> {
    const processCodeMap: Record<number, string> = {
        1: 'CUT',
        4: 'LAY',
        5: 'MOLD',
        6: 'TRIM',
        7: 'FIN',
        8: 'ASSY',
        9: 'CRATE'
    };
    const processCode = processCodeMap[processId] || 'GEN';
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    // Get all existing kits matching the pattern (don't filter by process_id since kit_code is unique globally)
    const pattern = `${kitType}-${processCode}-${today}-%`;

    console.log(`[generateKitCode] Searching for kits with pattern: ${pattern}`);

    const existingKits = await db
        .select()
        .from(kit_inventory)
        .where(
            like(kit_inventory.kit_code, pattern)
        );

    console.log(`[generateKitCode] Found ${existingKits.length} existing kits matching pattern: ${pattern}`);
    if (existingKits.length > 0) {
        console.log(`[generateKitCode] Existing kit codes:`, existingKits.map(k => k.kit_code));
    }

    // Find the highest sequence number
    let maxSeq = 0;
    existingKits.forEach(kit => {
        const parts = kit.kit_code.split('-');
        const seqStr = parts[parts.length - 1];
        const seq = parseInt(seqStr, 10);
        if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
        }
    });

    const nextSeq = maxSeq + 1;
    const kitCode = `${kitType}-${processCode}-${today}-${String(nextSeq).padStart(3, '0')}`;

    console.log(`[generateKitCode] Generated new kit code: ${kitCode} (next seq: ${nextSeq}, max found: ${maxSeq})`);

    return kitCode;
}

// Helper to generate Resin Code
async function generateResinCode(): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');

    const existingResins = await db
        .select()
        .from(resin_lot_inventory)
        .where(like(resin_lot_inventory.resin_code, `RESIN-${today}-%`));

    const nextSeq = existingResins.length + 1;
    return `RESIN-${today}-${String(nextSeq).padStart(3, '0')}`;
}

// POST /api/resin/create - Create a new Resin Lot
router.post('/resin/create', async (req, res) => {
    try {
        const { photoUrl, createdBy, weight } = req.body;

        if (!photoUrl || !createdBy) {
            return res.status(400).json({ error: 'Photo and User are required' });
        }

        const nextCode = await generateResinCode();

        const newResin = await db.insert(resin_lot_inventory).values({
            resin_code: nextCode,
            photo_url: photoUrl,
            created_by: createdBy,
        }).returning();

        return res.json({ resin: newResin[0] });

    } catch (error) {
        console.error('Error creating resin lot:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// GET /api/materials/available
router.get('/available', async (req, res) => {
    try {
        const processIdParam = req.query.processId as string;
        const materialType = req.query.materialType as string | undefined;

        if (!processIdParam || isNaN(parseInt(processIdParam))) {
            return res.status(400).json({ error: 'Valid processId is required' });
        }

        const processId = parseInt(processIdParam);
        const results: any[] = [];

        // Kits (KIT / GLASS)
        if (!materialType || materialType === 'KIT' || materialType === 'GLASS') {
            try {
                const kitConditions: any[] = [
                    eq(kit_inventory.process_id, processId),
                    eq(kit_inventory.status, 'AVAILABLE')
                ];

                if (materialType) {
                    kitConditions.push(eq(kit_inventory.kit_type, materialType));
                }

                const kits = await db.select().from(kit_inventory)
                    .where(and(...kitConditions))
                    .orderBy(desc(kit_inventory.created_at));

                for (const k of kits) {
                    results.push({
                        id: k.id,
                        uid: `KIT:${k.id}`, // Constructed UID
                        material_code: k.kit_code,
                        material_type: k.kit_type,
                        created_by: k.created_by,
                        created_at: k.created_at,
                        photo_url: k.photo_url,
                    });
                }
            } catch (kitError) {
                console.error('Error fetching kits:', kitError);
            }
        }

        // Resin
        if (!materialType || materialType === 'RESIN') {
            try {
                const resins = await db.select().from(resin_lot_inventory)
                    .where(gt(resin_lot_inventory.available_count, 0))
                    .orderBy(desc(resin_lot_inventory.created_at));

                for (const r of resins) {
                    results.push({
                        id: r.id,
                        uid: `RESIN:${r.id}`, // Constructed UID
                        material_code: r.resin_code,
                        material_type: 'RESIN',
                        created_by: r.created_by, // correct column
                        created_at: r.created_at,
                        available_count: r.available_count,
                    });
                }
            } catch (resinError) {
                console.error('Error fetching resins:', resinError);
            }
        }

        res.json(results);
    } catch (error) {
        console.error('Error fetching available materials:', error);
        res.status(500).json({ error: 'Failed to fetch materials' });
    }
});

// POST /api/materials/create
router.post('/create', async (req, res) => {
    try {
        const { materialType, createdBy, photoUrl, targetProcessId } = req.body;

        if (!materialType) return res.status(400).json({ error: 'materialType is required' });
        if (!createdBy) return res.status(400).json({ error: 'createdBy is required' });

        // Handle KIT creation
        if (materialType === 'KIT' || materialType === 'GLASS') {
            if (!targetProcessId || !photoUrl) {
                return res.status(400).json({ error: 'targetProcessId and photoUrl required for Kits' });
            }

            const kitCode = await generateKitCode(targetProcessId, materialType);

            const [newKit] = await db.insert(kit_inventory).values({
                kit_code: kitCode,
                kit_type: materialType as 'KIT' | 'GLASS',
                process_id: targetProcessId,
                status: 'AVAILABLE',
                created_by: createdBy,
                photo_url: photoUrl
                // removed uid
            }).returning();

            return res.json({ ...newKit, uid: `KIT:${newKit.id}` });
        }

        // Handle RESIN creation
        if (materialType === 'RESIN') {
            const resinCode = await generateResinCode();

            const [newResin] = await db.insert(resin_lot_inventory).values({
                resin_code: resinCode,
                // status removed
                created_by: createdBy, // was received_by
                available_count: 1,
                photo_url: photoUrl || '' // required in schema
            }).returning();

            return res.json({ ...newResin, uid: `RESIN:${newResin.id}` });
        }

        res.status(400).json({ error: 'Unsupported materialType' });
    } catch (error) {
        console.error('Error creating material:', error);
        res.status(500).json({ error: 'Failed to create material' });
    }
});

/**
 * POST /api/resin/create
 * Create a new resin lot in inventory
 * 
 * ISA-95 Compliance:
 * - Writes ONLY to resin_lot_inventory
 * - NO linkage to execution or consumption
 * - NO auto-consumption
 * - Admin/Inventory operation only
 */
router.post('/resin/create', async (req, res) => {
    try {
        const { photoUrl, createdBy, availableCount } = req.body;

        if (!photoUrl || !createdBy) {
            return res.status(400).json({
                error: 'Missing required fields: photoUrl, createdBy'
            });
        }

        // Generate unique resin code
        const resinCode = await generateResinCode();

        // Insert into resin_lot_inventory ONLY (matches actual schema)
        const [newResin] = await db
            .insert(resin_lot_inventory)
            .values({
                resin_code: resinCode,
                photo_url: photoUrl,
                created_by: createdBy,
                available_count: availableCount || 1,
            })
            .returning();

        return res.status(201).json({
            success: true,
            resin: newResin,
        });
    } catch (error) {
        console.error('Resin creation error:', error);
        return res.status(500).json({ error: 'Failed to create resin lot' });
    }
});

/**
 * POST /api/kits/create
 * Create a new kit in inventory
 * 
 * ISA-95 Compliance:
 * - Writes ONLY to kit_inventory
 * - NO linkage to execution or consumption
 * - NO auto-consumption
 * - Admin/Inventory operation only
 */
router.post('/kits/create', async (req, res) => {
    try {
        const { processId, kitType, photoUrl, createdBy } = req.body;

        console.log('[Kit Creation] Received request:', { processId, kitType, photoUrl: photoUrl?.substring(0, 50), createdBy });

        if (!processId || !kitType || !photoUrl || !createdBy) {
            console.log('[Kit Creation] Missing fields:', { processId: !!processId, kitType: !!kitType, photoUrl: !!photoUrl, createdBy: !!createdBy });
            return res.status(400).json({
                error: 'Missing required fields: processId, kitType, photoUrl, createdBy'
            });
        }

        if (kitType !== 'KIT' && kitType !== 'GLASS') {
            console.log('[Kit Creation] Invalid kitType:', kitType);
            return res.status(400).json({
                error: 'Invalid kitType. Must be "KIT" or "GLASS"'
            });
        }

        // Generate unique kit code
        console.log('[Kit Creation] Generating kit code for processId:', processId, 'kitType:', kitType);
        const kitCode = await generateKitCode(parseInt(processId), kitType);
        console.log('[Kit Creation] Generated kit code:', kitCode);

        // Insert into kit_inventory ONLY (matches actual schema)
        console.log('[Kit Creation] Inserting into database...');
        const [newKit] = await db
            .insert(kit_inventory)
            .values({
                kit_code: kitCode,
                process_id: parseInt(processId),
                kit_type: kitType,
                photo_url: photoUrl,
                created_by: createdBy,
                status: 'AVAILABLE',
            })
            .returning();

        console.log('[Kit Creation] Successfully created kit:', newKit.kit_code);

        return res.status(201).json({
            success: true,
            kit: newKit,
        });
    } catch (error) {
        console.error('[Kit Creation] ERROR:', error);
        console.error('[Kit Creation] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        return res.status(500).json({ error: 'Failed to create kit', details: error instanceof Error ? error.message : String(error) });
    }
});

// GET /api/inventory/dashboard-summary
router.get('/dashboard-summary', async (req, res) => {
    try {
        const { processId, area } = req.query;

        // 1. Available counts (status = 'AVAILABLE')
        let availableKitsQuery = db.select().from(kit_inventory)
            .where(and(
                eq(kit_inventory.kit_type, 'KIT'),
                eq(kit_inventory.status, 'AVAILABLE')
            ));

        let availableGlassQuery = db.select().from(kit_inventory)
            .where(and(
                eq(kit_inventory.kit_type, 'GLASS'),
                eq(kit_inventory.status, 'AVAILABLE')
            ));

        // Resin Available (Sum of available_count)
        const resinLots = await db.select().from(resin_lot_inventory);
        const totalResinAvailable = resinLots.reduce((sum, lot) => sum + (lot.available_count || 0), 0);

        if (processId) {
            const pid = parseInt(processId as string);
            availableKitsQuery = db.select().from(kit_inventory)
                .where(and(
                    eq(kit_inventory.kit_type, 'KIT'),
                    eq(kit_inventory.status, 'AVAILABLE'),
                    eq(kit_inventory.process_id, pid)
                ));
            // Glass is usually process-specific too
            availableGlassQuery = db.select().from(kit_inventory)
                .where(and(
                    eq(kit_inventory.kit_type, 'GLASS'),
                    eq(kit_inventory.status, 'AVAILABLE'),
                    eq(kit_inventory.process_id, pid)
                ));
        }

        const [availableKits, availableGlass] = await Promise.all([
            availableKitsQuery,
            availableGlassQuery
        ]);

        // 2. In Use / Consumed (Joined with Parts)
        // Fetch all consumed kits with their part status
        const consumedKits = await db.query.kit_inventory.findMany({
            where: eq(kit_inventory.status, 'CONSUMED'),
            with: {
                part: true
            }
        });

        // Filter and aggregate Kits
        let kitsInUse = 0;
        let kitsConsumed = 0;
        let glassInUse = 0;
        let glassConsumed = 0;

        for (const kit of consumedKits) {
            // Filter by processId if requested
            if (processId && kit.process_id !== parseInt(processId as string)) continue;

            const isCompleted = kit.part?.status === 'completed';
            const isCancelled = kit.part?.status === 'cancelled';

            if (isCancelled) continue; // Ignore cancelled?

            if (kit.kit_type === 'KIT') {
                if (isCompleted) kitsConsumed++;
                else kitsInUse++;
            } else if (kit.kit_type === 'GLASS') {
                if (isCompleted) glassConsumed++;
                else glassInUse++;
            }
        }

        // 3. Resin Usage
        // Fetch resin usage logs with part status
        const resinUsage = await db.query.resin_consumption.findMany({
            with: {
                part: true
            }
        });

        // Current 'In Use' logic for Resin:
        // Technically resin is "consumed" instantly from the lot.
        // But for the dashboard "In Use" metric, we can count the *parts* that used resin and are still active.
        let resinInUse = 0; // Active parts using resin (not explicitly requested but good for parity)

        // Wait, dashboard only asks for 'Available' for Resin in summary interface?
        // "resin: { available: number; status: string };" in frontend.
        // But backend plan says: "Resin (C): Sum available_count... Status logic."
        // Frontend card for Resin DOES NOT show In Use / Consumed metrics, only "Common Pool".
        // Let's check InventorySection.tsx line 242...
        // It shows "RESIN – COMMON POOL (C)" and a status chip. No breakdown.
        // So we don't strictly need Resin In Use/Consumed for the card display.
        // Keeping it simple for now as requested.

        // Required Cards Logic (Mapping based on Excel)
        let requiredCards: string[] = [];
        if (processId) {
            const pid = parseInt(processId as string);

            // Fix: Fetch actual process number from DB because frontend sends ID (PK)
            const [proc] = await db.select().from(processes).where(eq(processes.id, pid));
            const pNum = proc ? proc.processNumber : 0;

            if (pNum === 20 || pNum === 30) {
                requiredCards = ['A', 'C']; // Expose C to show "Not Required"
            } else if (pNum >= 40 && pNum <= 90) {
                requiredCards = ['A', 'B', 'C'];
            } else if (pNum >= 100 && pNum <= 110) {
                requiredCards = ['A', 'B', 'C']; // Expose C to show "Not Required"
            } else if (pNum >= 120 && pNum <= 200) {
                requiredCards = ['A', 'B', 'C'];
            } else if (pNum >= 210 && pNum <= 220) {
                requiredCards = ['B', 'C']; // Shell (No Raw Material)
            } else if (pNum >= 230 && pNum <= 340) {
                requiredCards = []; // Assembly/Finishing steps with no material consumption
            } else if (pNum >= 350) {
                requiredCards = ['A', 'B', 'C'];
            } else {
                requiredCards = [];
            }
        } else {
            // If no process selected (Overall View), show all relevant inventory types specific to area or generally all
            // User requested: "when ther is no process selection show overall raw material, glass cutting and resin"
            requiredCards = ['A', 'B', 'C'];
        }

        // Resin Status Logic
        let resinStatus = totalResinAvailable > 500 ? 'OK' : 'Low';
        if (processId) {
            const pid = parseInt(processId as string);
            const [proc] = await db.select().from(processes).where(eq(processes.id, pid));
            const pNum = proc ? proc.processNumber : 0;
            if ([20, 30, 100, 110].includes(pNum)) {
                resinStatus = 'Not Required';
            }
        }

        res.json({
            rawMaterial: {
                available: availableKits.length,
                inUse: kitsInUse,
                consumed: kitsConsumed,
                status: availableKits.length > 5 ? 'Sufficient' : 'Low'
            },
            glassKits: {
                available: availableGlass.length,
                inUse: glassInUse,
                consumed: glassConsumed,
                status: availableGlass.length > 2 ? 'Monitor' : 'Low'
            },
            resin: {
                available: totalResinAvailable,
                status: resinStatus
            },
            requiredCards
        });

    } catch (error) {
        console.error('Dashboard summary error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard summary' });
    }
});

export const inventoryRouter = router;
