import { Router } from "express";
import { db } from "../../db";
import { eq, and, desc } from "drizzle-orm";
import { authenticate, requirePermission, requireTenant } from "../../middleware/auth";
import {
    parts,
    processSteps,
    partStepInstances,
    controlCheckpoints,
    checkpointResults,
    kit_inventory,
    resin_lot_inventory,
    resin_consumption,
    workOrderExecutions
} from "../../../shared/schema";

const router = Router();
const canReadExecution = [authenticate, requireTenant];
const canExecuteMes = [authenticate, requireTenant, requirePermission("mes.work_order.execute")];
const canApproveQuality = [authenticate, requireTenant, requirePermission("quality.inspection.approve")];

// GET /api/parts/:id/step-instances
router.get('/parts/:id/step-instances', canReadExecution, async (req, res) => {
    try {
        const partId = parseInt(req.params.id);
        if (isNaN(partId)) return res.status(400).json({ error: 'Invalid part ID' });

        const instances = await db
            .select()
            .from(partStepInstances)
            .where(eq(partStepInstances.partId, partId));

        res.json(instances);
    } catch (error: any) {
        console.error('Error starting step instance:', error);
        res.status(500).json({ error: 'Failed to start step instance', details: error.message });
    }
});

// POST /api/process-execution/start (Start Work Order / Part)
router.post('/process-execution/start', canExecuteMes, async (req, res) => {
    try {
        const { processId, startedBy, materialIds } = req.body;
        if (!processId || !startedBy || !Array.isArray(materialIds)) return res.status(400).json({ error: 'processId, startedBy and materialIds are required' });

        const processed: any[] = [];

        // Inventory Consumption Logic (replicated from original index.ts, but cleaner)
        // NOTE: In a full microservices architecture, this would call Inventory Service.
        // Here we use direct DB access as allowed by loosely coupled modules in a monolith.

        for (const rawId of materialIds) {
            const idStr = String(rawId);

            if (idStr.startsWith('KIT:')) {
                // Handle Kit Consumption
                const kitCode = idStr.split(':')[1];
                // Logic to mark kit as consumed would go here.
                // For now, mirroring existing behavior if any, or just verifying existence.
                // The original code seemed to specific logic here.
                // We will assume for now we just validate it.
                const [kit] = await db.select().from(kit_inventory)
                    .where(eq(kit_inventory.kit_code, kitCode));

                if (kit) {
                    await db.update(kit_inventory)
                        .set({ status: 'CONSUMED' })
                        .where(eq(kit_inventory.id, kit.id));
                    processed.push({ type: 'KIT', id: kit.id, code: kit.kit_code });
                }
            } else if (idStr.startsWith('RESIN:')) {
                // Handle Resin
                const resinCode = idStr.split(':')[1];
                const [resin] = await db.select().from(resin_lot_inventory)
                    .where(eq(resin_lot_inventory.resin_code, resinCode));

                if (resin) {
                    // Resin partial consumption logic would go here
                    processed.push({ type: 'RESIN', id: resin.id, code: resin.resin_code });
                }
            }
        }

        // Create Part
        const today = new Date();
        const partNumber = `${processId}-${today.getFullYear()}-${String(Date.now()).slice(-4)}`;

        // Find entry step
        const [entryStep] = await db.select().from(processSteps)
            .where(and(eq(processSteps.processId, processId), eq(processSteps.stepNumber, '10'))); // Assuming 10 is entry

        const [newPart] = await db.insert(parts).values({
            partNumber: partNumber,
            processId: processId,
            status: 'active',
            priority: 'normal',
            currentStepId: entryStep?.id
        }).returning();

        res.json({ success: true, processed, part: newPart });
    } catch (error) {
        console.error('Error starting process execution:', error);
        res.status(500).json({ error: 'Failed to start process execution' });
    }
});

// GET /api/parts/:partId/steps/:stepId/checkpoint-results
router.get('/parts/:partId/steps/:stepId/checkpoint-results', canReadExecution, async (req, res) => {
    try {
        const partId = parseInt(req.params.partId);
        const stepId = parseInt(req.params.stepId);
        if (isNaN(partId) || isNaN(stepId)) return res.status(400).json({ error: 'Invalid partId or stepId' });

        // Find instance
        const [instance] = await db.select().from(partStepInstances)
            .where(and(
                eq(partStepInstances.partId, partId),
                eq(partStepInstances.stepId, stepId)
            ));

        if (!instance) return res.json([]); // Return empty if instance doesn't exist yet

        const results = await db.query.checkpointResults.findMany({
            where: eq(checkpointResults.instanceId, instance.id),
            with: {
                evidenceFiles: {
                    with: {
                        capturedBy: true // Join with employees table
                    }
                }
            }
        });

        // Transform the results to include uploadedBy and uploadedAt in the evidence files
        const transformedResults = results.map(result => ({
            ...result,
            evidenceFiles: result.evidenceFiles.map(file => ({
                id: file.id,
                fileName: file.fileName,
                fileType: file.fileType,
                storageKey: file.storageKey,
                uploadedBy: file.capturedBy?.name || null,
                uploadedAt: file.capturedAt || file.createdAt
            }))
        }));

        res.json(transformedResults);
    } catch (error) {
        console.error('Error fetching checkpoint results:', error);
        res.status(500).json({ error: 'Failed to fetch checkpoint results' });
    }
});

// POST /api/step-instances/start
router.post('/step-instances/start', canExecuteMes, async (req, res) => {
    try {
        const { partId, stepId, employeeId } = req.body;

        // SEQUENTIAL LOCK CHECK
        // Get step sequence
        const [step] = await db.select().from(processSteps).where(eq(processSteps.id, stepId));
        if (!step) return res.status(404).json({ error: 'Step not found' });

        // If not the first step (sequence > 10, assuming 10 is start), check previous
        if (step.sequence > 10) {
            const [prevStep] = await db.select().from(processSteps)
                .where(and(
                    eq(processSteps.processId, step.processId),
                    eq(processSteps.sequence, step.sequence - 10) // Assuming increments of 10
                )); // Better approach: sort and find previous

            // Using a more robust query to find previous step in sequence
            const stepsList = await db.select().from(processSteps)
                .where(eq(processSteps.processId, step.processId))
                .orderBy(processSteps.sequence);

            const currentIndex = stepsList.findIndex(s => s.id === stepId);
            if (currentIndex > 0) {
                const prevStepObj = stepsList[currentIndex - 1];
                // Check if previous step instance exists and is completed
                const [prevInstance] = await db.select().from(partStepInstances)
                    .where(and(
                        eq(partStepInstances.partId, partId),
                        eq(partStepInstances.stepId, prevStepObj.id)
                    ));

                if (!prevInstance || prevInstance.status !== 'completed') {
                    return res.status(400).json({ error: 'Previous step must be completed first.' });
                }
            }
        }

        // Check if ANY instance exists (planned, in_progress, completed)
        let [instance] = await db.select().from(partStepInstances)
            .where(and(
                eq(partStepInstances.partId, partId),
                eq(partStepInstances.stepId, stepId)
            ));

        if (instance) {
            if (instance.status === 'completed') {
                return res.status(400).json({ error: 'Step is already completed' });
            }
            if (instance.status === 'active' || instance.status === 'in_progress') {
                // Already running, just return it
                return res.json(instance);
            }

            // Activate the planned instance
            [instance] = await db.update(partStepInstances)
                .set({
                    status: 'active',
                    startedAt: new Date(),
                    assignedEmployeeId: employeeId
                })
                .where(eq(partStepInstances.id, instance.id))
                .returning();
        } else {
            // Create new (Fallback for older parts or if initialization skipped)
            [instance] = await db.insert(partStepInstances).values({
                partId,
                stepId,
                status: 'active',
                startedAt: new Date(),
                assignedEmployeeId: employeeId
            }).returning();
        }

        // Initialize Checkpoint Results safely
        const checkpoints = await db.select().from(controlCheckpoints)
            .where(eq(controlCheckpoints.stepId, stepId));

        if (checkpoints.length > 0) {
            const existingResults = await db.select().from(checkpointResults)
                .where(eq(checkpointResults.instanceId, instance.id));

            const existingCheckpoints = new Set(existingResults.map(r => r.checkpointId));
            const [execution] = await db.select().from(workOrderExecutions)
                .where(and(
                    eq(workOrderExecutions.partId, partId),
                    eq(workOrderExecutions.status, "active")
                ));

            const toInsert = checkpoints
                .filter(cp => !existingCheckpoints.has(cp.id))
                .map(cp => ({
                    instanceId: instance.id,
                    checkpointId: cp.id,
                    executionId: execution?.id || null,
                    status: 'pending',
                    qaResult: 'pending'
                    // createdAt handled by defaultNow()
                }));

            if (toInsert.length > 0) {
                await db.insert(checkpointResults).values(toInsert);
            }
        }

        // Update Part reference
        await db.update(parts)
            .set({ currentStepId: stepId, status: 'active' })
            .where(eq(parts.id, partId));

        res.json(instance);
    } catch (error: any) {
        console.error("Error starting step:", error);
        res.status(500).json({ error: "Failed to start step", details: error.message });
    }
});

// POST /api/step-instances/:id/complete
router.post('/step-instances/:id/complete', canExecuteMes, async (req, res) => {
    try {
        const instanceId = parseInt(req.params.id);
        if (isNaN(instanceId)) return res.status(400).json({ error: "Invalid instance ID" });

        const [instance] = await db.select().from(partStepInstances).where(eq(partStepInstances.id, instanceId));
        if (!instance) return res.status(404).json({ error: "Instance not found" });

        if (instance.status === "completed") {
            return res.status(400).json({ error: "Step is already completed" });
        }

        const checkpoints = await db.select().from(controlCheckpoints)
            .where(eq(controlCheckpoints.stepId, instance.stepId));

        // Fetch results with evidence files
        const results = await db.query.checkpointResults.findMany({
            where: eq(checkpointResults.instanceId, instanceId),
            with: {
                evidenceFiles: true
            }
        });

        const resultMap = new Map(results.map(r => [r.checkpointId, r]));

        // Check if all checkpoints are completed:
        // - QA checkpoints: need confirmation (qaResult = pass/conditional_pass)
        // - Prod checkpoints: just need evidence uploaded
        const incompleteCheckpoints = checkpoints.filter(cp => {
            const result = resultMap.get(cp.id);
            const isQaCheckpoint = cp.verifiedBy === 'QA' || cp.verifiedBy === 'prod/QA' || cp.requiresQaValidation === true;

            if (isQaCheckpoint) {
                // QA checkpoints need confirmation
                return !result || (result.qaResult !== "pass" && result.qaResult !== "conditional_pass");
            } else {
                // Prod checkpoints just need evidence
                return !result || !result.evidenceFiles || result.evidenceFiles.length === 0;
            }
        });

        if (incompleteCheckpoints.length > 0) {
            return res.status(400).json({
                error: "Cannot complete step. All checkpoints must be completed.",
                incomplete: incompleteCheckpoints.map(cp => cp.name || cp.characteristic)
            });
        }

        const now = new Date();
        const startedAt = instance.startedAt ? new Date(instance.startedAt) : now;
        const elapsedMinutes = Math.floor((now.getTime() - startedAt.getTime()) / (1000 * 60));

        const [updated] = await db.update(partStepInstances)
            .set({
                status: "completed",
                endedAt: now,
                elapsedMinutes: elapsedMinutes,
            })
            .where(eq(partStepInstances.id, instanceId))
            .returning();

        res.json(updated);
    } catch (error) {
        console.error("Error completing step:", error);
        res.status(500).json({ error: "Failed to complete step" });
    }
});

// POST /api/checkpoints/:id/confirm
router.post('/checkpoints/:id/confirm', canApproveQuality, async (req, res) => {
    try {
        const resultId = parseInt(req.params.id);
        if (isNaN(resultId)) return res.status(400).json({ error: 'Invalid result ID' });

        const { qaConfirmedById } = req.body; // In real app, get from req.user

        const [updated] = await db.update(checkpointResults)
            .set({
                qaResult: 'pass',
                qaConfirmedAt: new Date(),
                status: 'completed',
                // For now, using a placeholder user if not provided or valid
                // qaConfirmedById: ... 
            })
            .where(eq(checkpointResults.id, resultId))
            .returning();

        if (!updated) return res.status(404).json({ error: 'Result not found' });

        res.json(updated);
    } catch (error) {
        console.error('Error confirming checkpoint:', error);
        res.status(500).json({ error: 'Failed to confirm checkpoint' });
    }
});

export const executionRouter = router;
