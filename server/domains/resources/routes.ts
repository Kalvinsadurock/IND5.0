import { Router } from "express";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import { employees, moulds } from "../../../shared/schema";
import { authenticate, requireTenant } from "../../middleware/auth";

const router = Router();
const canReadResources = [authenticate, requireTenant];

// GET /api/employees
router.get('/employees', canReadResources, async (req, res) => {
    try {
        const all = await db.select().from(employees).where(eq(employees.isActive, true));
        res.json(all);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch employees" });
    }
});

// GET /api/moulds
router.get('/moulds', canReadResources, async (req, res) => {
    try {
        const all = await db.select().from(moulds);
        res.json(all);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch moulds" });
    }
});

export const resourcesRouter = router;
