import { Router } from 'express';
import { db } from '../../db';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { shiftLogs, employees } from '../../../shared/schema';

const router = Router();

/**
 * GET /api/shifts/active/:userId
 * Fetch currently active shift log for a user
 */
router.get('/active/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });

    const activeShift = await db.query.shiftLogs.findFirst({
      where: and(
        eq(shiftLogs.recordedById, userId),
        isNull(shiftLogs.endTime)
      )
    });

    res.json(activeShift || null);
  } catch (error) {
    console.error('Error fetching active shift:', error);
    res.status(500).json({ error: 'Failed to fetch active shift' });
  }
});

/**
 * GET /api/shifts/logs
 * Fetch all shift logs (completed and active)
 */
router.get('/logs', async (req, res) => {
  try {
    const logs = await db.select({
      id: shiftLogs.id,
      shiftCode: shiftLogs.shiftCode,
      shiftDate: shiftLogs.shiftDate,
      startTime: shiftLogs.startTime,
      endTime: shiftLogs.endTime,
      crewMembers: shiftLogs.crewMembers,
      elapsedMinutes: shiftLogs.elapsedMinutes,
      handoverNotes: shiftLogs.handoverNotes,
      recordedById: shiftLogs.recordedById,
      operatorName: employees.name,
    })
    .from(shiftLogs)
    .leftJoin(employees, eq(shiftLogs.recordedById, employees.id))
    .orderBy(desc(shiftLogs.startTime))
    .limit(30);

    res.json(logs);
  } catch (error) {
    console.error('Error fetching shift logs:', error);
    res.status(500).json({ error: 'Failed to fetch shift logs' });
  }
});

/**
 * POST /api/shifts/clock-in
 * Start a shift log session (Clock In)
 */
router.post('/clock-in', async (req, res) => {
  try {
    const { shiftCode, crewMembers, recordedById } = req.body;

    if (!shiftCode || !recordedById) {
      return res.status(400).json({ error: 'Missing shift code or user ID' });
    }

    // Check if there is already an active shift for this operator
    const existingActive = await db.query.shiftLogs.findFirst({
      where: and(
        eq(shiftLogs.recordedById, recordedById),
        isNull(shiftLogs.endTime)
      )
    });

    if (existingActive) {
      return res.status(400).json({ error: 'You are already clocked in to a shift' });
    }

    // Format today's date: YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];

    const [newShift] = await db.insert(shiftLogs).values({
      shiftCode,
      shiftDate: todayStr,
      startTime: new Date(),
      crewMembers: crewMembers || [],
      recordedById
    }).returning();

    res.json(newShift);
  } catch (error) {
    console.error('Clock-in error:', error);
    res.status(500).json({ error: 'Failed to clock in' });
  }
});

/**
 * POST /api/shifts/clock-out
 * Complete a shift log session (Clock Out + log Handover notes)
 */
router.post('/clock-out', async (req, res) => {
  try {
    const { shiftId, handoverNotes } = req.body;

    if (!shiftId) {
      return res.status(400).json({ error: 'Missing shift ID' });
    }

    const [shift] = await db.select().from(shiftLogs).where(eq(shiftLogs.id, shiftId));
    if (!shift) {
      return res.status(404).json({ error: 'Shift log not found' });
    }

    if (shift.endTime) {
      return res.status(400).json({ error: 'Shift is already completed' });
    }

    const now = new Date();
    const startTime = new Date(shift.startTime);
    const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));

    const [updated] = await db.update(shiftLogs)
      .set({
        endTime: now,
        elapsedMinutes: elapsedMinutes,
        handoverNotes: handoverNotes || 'No handover notes recorded.'
      })
      .where(eq(shiftLogs.id, shiftId))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error('Clock-out error:', error);
    res.status(500).json({ error: 'Failed to clock out' });
  }
});

export const shiftRouter = router;
