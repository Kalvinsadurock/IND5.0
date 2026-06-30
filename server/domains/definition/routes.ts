import { Router } from "express";
import { db } from "../../db";
import { eq, asc } from "drizzle-orm";
import { processes, processSteps, controlCheckpoints } from "../../../shared/schema";
import { authenticate, requireTenant } from "../../middleware/auth";

const router = Router();
const canReadDefinition = [authenticate, requireTenant];

// GET /api/processes
router.get('/processes', canReadDefinition, async (req, res) => {
    try {
        const all = await db.select().from(processes);
        res.json(all);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch processes" });
    }
});

// GET /api/processes/:id/steps
router.get('/processes/:id/steps', canReadDefinition, async (req, res) => {
    try {
        const processId = parseInt(req.params.id);
        const steps = await db.select().from(processSteps)
            .where(eq(processSteps.processId, processId))
            .orderBy(asc(processSteps.sequence));
        res.json(steps);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch steps" });
    }
});

// GET /api/steps/:id/checkpoints
router.get('/steps/:id/checkpoints', canReadDefinition, async (req, res) => {
    try {
        const stepId = parseInt(req.params.id);
        const cps = await db.select().from(controlCheckpoints)
            .where(eq(controlCheckpoints.stepId, stepId))
            .orderBy(asc(controlCheckpoints.sequence));
        res.json(cps);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch checkpoints" });
    }
});

export const definitionRouter = router;
