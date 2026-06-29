import { Router } from 'express';
import { db } from '../../db';
import { eq, and, or, desc } from 'drizzle-orm';
import { 
  checkpointResults, 
  controlCheckpoints, 
  reworkEvents, 
  parts, 
  partStepInstances, 
  employees,
  timelineEvents 
} from '../../../shared/schema';

const router = Router();

/**
 * GET /api/quality/defects
 * Fetch all failed checkpoint results (defects)
 */
router.get('/defects', async (req, res) => {
  try {
    const defects = await db.select({
      id: checkpointResults.id,
      instanceId: checkpointResults.instanceId,
      checkpointId: checkpointResults.checkpointId,
      status: checkpointResults.status,
      qaResult: checkpointResults.qaResult,
      measuredValue: checkpointResults.measuredValue,
      measuredAt: checkpointResults.measuredAt,
      deviationNumber: checkpointResults.deviationNumber,
      notes: checkpointResults.notes,
      createdAt: checkpointResults.createdAt,
      checkpointName: controlCheckpoints.name,
      parameter: controlCheckpoints.parameter,
      specification: controlCheckpoints.specification,
      partId: parts.id,
      partNumber: parts.partNumber,
      serialNumber: parts.serialNumber,
      partStatus: parts.status,
      stepId: partStepInstances.stepId,
      stepName: partStepInstances.status,
    })
    .from(checkpointResults)
    .innerJoin(controlCheckpoints, eq(checkpointResults.checkpointId, controlCheckpoints.id))
    .innerJoin(partStepInstances, eq(checkpointResults.instanceId, partStepInstances.id))
    .innerJoin(parts, eq(partStepInstances.partId, parts.id))
    .where(
      or(
        eq(checkpointResults.qaResult, 'fail'),
        eq(checkpointResults.qaResult, 'conditional_pass')
      )
    )
    .orderBy(desc(checkpointResults.createdAt));

    res.json(defects);
  } catch (error) {
    console.error('Error fetching defects:', error);
    res.status(500).json({ error: 'Failed to fetch defects' });
  }
});

/**
 * POST /api/quality/treatment/rework
 * Initiate a rework loop for a part, resetting it back to a previous step
 */
router.post('/treatment/rework', async (req, res) => {
  try {
    const { resultId, toStepId, reason, initiatedById } = req.body;

    if (!resultId || !toStepId || !reason) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // 1. Get the checkpoint result and step instance
    const [result] = await db
      .select()
      .from(checkpointResults)
      .where(eq(checkpointResults.id, resultId));

    if (!result) {
      return res.status(404).json({ error: 'Checkpoint result not found' });
    }

    const [instance] = await db
      .select()
      .from(partStepInstances)
      .where(eq(partStepInstances.id, result.instanceId));

    if (!instance) {
      return res.status(404).json({ error: 'Step instance not found' });
    }

    // 2. Insert Rework Event
    const [reworkEvent] = await db.insert(reworkEvents).values({
      partId: instance.partId,
      fromStepId: instance.stepId,
      toStepId: toStepId,
      reason: reason,
      defectDescription: result.notes || 'Checkpoint check failed',
      initiatedById: initiatedById || null,
      status: 'active'
    }).returning();

    // 3. Update checkpoint result status to reworked
    await db.update(checkpointResults)
      .set({ status: 'completed', qaResult: 'fail' }) // keep result as failed but complete the check
      .where(eq(checkpointResults.id, resultId));

    // 4. Update the current active step instance to completed with rework status
    await db.update(partStepInstances)
      .set({ 
        status: 'completed', 
        endedAt: new Date()
      })
      .where(eq(partStepInstances.id, instance.id));

    // 5. Update part current step back to the target step, and set status to rework
    await db.update(parts)
      .set({ 
        currentStepId: toStepId, 
        status: 'rework' 
      })
      .where(eq(parts.id, instance.partId));

    // 6. Create a NEW active step instance for the target rework step
    const [newStepInstance] = await db.insert(partStepInstances).values({
      partId: instance.partId,
      stepId: toStepId,
      status: 'active',
      startedAt: new Date(),
      entryReason: 'rework'
    }).returning();

    // 7. Log timeline event
    await db.insert(timelineEvents).values({
      partId: instance.partId,
      eventType: 'rework_initiated',
      instanceId: newStepInstance.id,
      stepId: toStepId,
      description: `Rework initiated: ${reason} (Moved back from step ID ${instance.stepId} to ${toStepId})`,
      recordedById: initiatedById || null
    });

    res.json({ success: true, reworkEvent, newStepInstance });
  } catch (error) {
    console.error('Rework treatment error:', error);
    res.status(500).json({ error: 'Failed to initiate rework' });
  }
});

/**
 * POST /api/quality/treatment/scrap
 * Mark part as scrapped due to defect
 */
router.post('/treatment/scrap', async (req, res) => {
  try {
    const { resultId, reason, initiatedById } = req.body;

    if (!resultId || !reason) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // 1. Get the checkpoint result and step instance
    const [result] = await db
      .select()
      .from(checkpointResults)
      .where(eq(checkpointResults.id, resultId));

    if (!result) {
      return res.status(404).json({ error: 'Checkpoint result not found' });
    }

    const [instance] = await db
      .select()
      .from(partStepInstances)
      .where(eq(partStepInstances.id, result.instanceId));

    if (!instance) {
      return res.status(404).json({ error: 'Step instance not found' });
    }

    // 2. Update checkpoint result status to complete
    await db.update(checkpointResults)
      .set({ status: 'completed', qaResult: 'fail' })
      .where(eq(checkpointResults.id, resultId));

    // 3. Mark the active step instance as completed
    await db.update(partStepInstances)
      .set({ 
        status: 'completed', 
        endedAt: new Date()
      })
      .where(eq(partStepInstances.id, instance.id));

    // 4. Update part status to scrapped
    await db.update(parts)
      .set({ status: 'scrapped' })
      .where(eq(parts.id, instance.partId));

    // 5. Log timeline event
    await db.insert(timelineEvents).values({
      partId: instance.partId,
      eventType: 'scrapped',
      instanceId: instance.id,
      stepId: instance.stepId,
      description: `Part scrapped: ${reason}`,
      recordedById: initiatedById || null
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Scrap treatment error:', error);
    res.status(500).json({ error: 'Failed to scrap part' });
  }
});

/**
 * POST /api/quality/treatment/deviation
 * Approve a quality deviation for a checkpoint result
 */
router.post('/treatment/deviation', async (req, res) => {
  try {
    const { resultId, deviationNumber, notes, approvedById } = req.body;

    if (!resultId || !deviationNumber) {
      return res.status(400).json({ error: 'Missing deviation fields' });
    }

    // Update checkpoint result
    const [updated] = await db.update(checkpointResults)
      .set({
        qaResult: 'conditional_pass',
        deviationNumber: deviationNumber,
        notes: notes || 'Deviation approved',
        deviationApprovedById: approvedById || null,
        deviationApprovedAt: new Date(),
        isGatePassed: true,
        status: 'completed'
      })
      .where(eq(checkpointResults.id, resultId))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Checkpoint result not found' });
    }

    // Log timeline event
    const [instance] = await db
      .select()
      .from(partStepInstances)
      .where(eq(partStepInstances.id, updated.instanceId));

    if (instance) {
      await db.insert(timelineEvents).values({
        partId: instance.partId,
        eventType: 'deviation_approved',
        instanceId: instance.id,
        stepId: instance.stepId,
        description: `Deviation approved: ${deviationNumber}. Note: ${notes}`,
        recordedById: approvedById || null
      });
    }

    res.json({ success: true, result: updated });
  } catch (error) {
    console.error('Deviation treatment error:', error);
    res.status(500).json({ error: 'Failed to approve deviation' });
  }
});

export const qualityRouter = router;
