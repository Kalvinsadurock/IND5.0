import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  platformAreas,
  platformAuditEvents,
  platformCompanies,
  platformDepartments,
  platformLines,
  platformPermissions,
  platformPlants,
  platformRolePermissions,
  platformRoles,
  platformTenants,
  platformUserRoleAssignments,
  platformUsers,
  platformWorkCenters,
} from "../../../shared/schema";

const router = Router();

const actorType = "user";

function tenantIdFrom(req: any) {
  return req.header("x-tenant-id") || req.query.tenantId || req.body?.tenantId || null;
}

function actorUserIdFrom(req: any) {
  return req.header("x-user-id") || req.body?.actorUserId || null;
}

async function audit(req: any, event: {
  tenantId?: string | null;
  module?: string;
  eventType: string;
  entityType: string;
  entityId?: string | null;
  action: string;
  beforeSnapshot?: unknown;
  afterSnapshot?: unknown;
  metadata?: unknown;
}) {
  await db.insert(platformAuditEvents).values({
    tenantId: event.tenantId ?? tenantIdFrom(req),
    actorUserId: actorUserIdFrom(req),
    actorType,
    module: event.module || "platform",
    eventType: event.eventType,
    entityType: event.entityType,
    entityId: event.entityId || null,
    action: event.action,
    beforeSnapshot: event.beforeSnapshot as any,
    afterSnapshot: event.afterSnapshot as any,
    metadata: event.metadata as any,
  } as any);
}

function handleError(res: any, error: unknown, message: string) {
  console.error(message, error);
  res.status(500).json({ error: message });
}

router.get("/platform/tenants", async (_req, res) => {
  try {
    res.json(await db.select().from(platformTenants));
  } catch (error) {
    handleError(res, error, "Failed to fetch tenants");
  }
});

router.post("/platform/tenants", async (req, res) => {
  try {
    const [created] = await db.insert(platformTenants).values({
      name: req.body.name,
      code: req.body.code,
      industryType: req.body.industryType,
      status: req.body.status || "draft",
      defaultTimezone: req.body.defaultTimezone || "UTC",
      defaultLocale: req.body.defaultLocale || "en",
      subscriptionTier: req.body.subscriptionTier || "starter",
      createdBy: actorUserIdFrom(req),
    } as any).returning();
    await audit(req, {
      tenantId: created.id,
      eventType: "tenant.created",
      entityType: "tenant",
      entityId: created.id,
      action: "create",
      afterSnapshot: created,
    });
    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to create tenant");
  }
});

router.get("/platform/tenants/current", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const rows = tenantId
      ? await db.select().from(platformTenants).where(eq(platformTenants.id, tenantId))
      : await db.select().from(platformTenants);
    res.json(rows[0] || null);
  } catch (error) {
    handleError(res, error, "Failed to fetch current tenant");
  }
});

router.patch("/platform/tenants/current", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
    const [before] = await db.select().from(platformTenants).where(eq(platformTenants.id, tenantId));
    const [updated] = await db.update(platformTenants).set({
      name: req.body.name,
      industryType: req.body.industryType,
      status: req.body.status,
      defaultTimezone: req.body.defaultTimezone,
      defaultLocale: req.body.defaultLocale,
      subscriptionTier: req.body.subscriptionTier,
      updatedAt: new Date(),
    } as any).where(eq(platformTenants.id, tenantId)).returning();
    await audit(req, {
      tenantId,
      eventType: "tenant.updated",
      entityType: "tenant",
      entityId: tenantId,
      action: "update",
      beforeSnapshot: before,
      afterSnapshot: updated,
    });
    res.json(updated);
  } catch (error) {
    handleError(res, error, "Failed to update tenant");
  }
});

router.get("/platform/companies", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const query = db.select().from(platformCompanies);
    res.json(tenantId ? await query.where(eq(platformCompanies.tenantId, tenantId)) : await query);
  } catch (error) {
    handleError(res, error, "Failed to fetch companies");
  }
});

router.post("/platform/companies", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
    const [created] = await db.insert(platformCompanies).values({
      tenantId,
      legalName: req.body.legalName,
      displayName: req.body.displayName || req.body.legalName,
      registrationNumber: req.body.registrationNumber,
      taxId: req.body.taxId,
      status: req.body.status || "active",
    } as any).returning();
    await audit(req, { tenantId, eventType: "company.created", entityType: "company", entityId: created.id, action: "create", afterSnapshot: created });
    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to create company");
  }
});

router.get("/platform/plants", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const query = db.select().from(platformPlants);
    res.json(tenantId ? await query.where(eq(platformPlants.tenantId, tenantId)) : await query);
  } catch (error) {
    handleError(res, error, "Failed to fetch plants");
  }
});

router.post("/platform/plants", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
    const [created] = await db.insert(platformPlants).values({
      tenantId,
      companyId: req.body.companyId || null,
      name: req.body.name,
      code: req.body.code,
      location: req.body.location,
      timezone: req.body.timezone || "UTC",
      status: req.body.status || "active",
    } as any).returning();
    await audit(req, { tenantId, eventType: "plant.created", entityType: "plant", entityId: created.id, action: "create", afterSnapshot: created });
    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to create plant");
  }
});

router.get("/platform/plants/:id/hierarchy", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const plantId = req.params.id;
    const [plant] = await db.select().from(platformPlants).where(eq(platformPlants.id, plantId));
    if (!plant) return res.status(404).json({ error: "Plant not found" });
    const tenantFilter = tenantId ? eq(platformAreas.tenantId, tenantId) : undefined;
    const [areas, departments, lines, workCenters] = await Promise.all([
      db.select().from(platformAreas).where(tenantFilter ? and(eq(platformAreas.plantId, plantId), tenantFilter) : eq(platformAreas.plantId, plantId)),
      db.select().from(platformDepartments).where(tenantId ? and(eq(platformDepartments.plantId, plantId), eq(platformDepartments.tenantId, tenantId)) : eq(platformDepartments.plantId, plantId)),
      db.select().from(platformLines).where(tenantId ? and(eq(platformLines.plantId, plantId), eq(platformLines.tenantId, tenantId)) : eq(platformLines.plantId, plantId)),
      db.select().from(platformWorkCenters).where(tenantId ? and(eq(platformWorkCenters.plantId, plantId), eq(platformWorkCenters.tenantId, tenantId)) : eq(platformWorkCenters.plantId, plantId)),
    ]);
    res.json({ plant, areas, departments, lines, workCenters });
  } catch (error) {
    handleError(res, error, "Failed to fetch plant hierarchy");
  }
});

router.post("/platform/areas", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const [created] = await db.insert(platformAreas).values({ tenantId, ...req.body } as any).returning();
    await audit(req, { tenantId, eventType: "area.created", entityType: "area", entityId: created.id, action: "create", afterSnapshot: created });
    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to create area");
  }
});

router.post("/platform/departments", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const [created] = await db.insert(platformDepartments).values({ tenantId, ...req.body } as any).returning();
    await audit(req, { tenantId, eventType: "department.created", entityType: "department", entityId: created.id, action: "create", afterSnapshot: created });
    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to create department");
  }
});

router.post("/platform/lines", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const [created] = await db.insert(platformLines).values({ tenantId, ...req.body } as any).returning();
    await audit(req, { tenantId, eventType: "line.created", entityType: "line", entityId: created.id, action: "create", afterSnapshot: created });
    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to create line");
  }
});

router.post("/platform/work-centers", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const [created] = await db.insert(platformWorkCenters).values({ tenantId, ...req.body } as any).returning();
    await audit(req, { tenantId, eventType: "work_center.created", entityType: "work_center", entityId: created.id, action: "create", afterSnapshot: created });
    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to create work center");
  }
});

router.get("/platform/users", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const query = db.select().from(platformUsers);
    res.json(tenantId ? await query.where(eq(platformUsers.tenantId, tenantId)) : await query);
  } catch (error) {
    handleError(res, error, "Failed to fetch users");
  }
});

router.post("/platform/users/invite", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
    const [created] = await db.insert(platformUsers).values({
      tenantId,
      email: req.body.email,
      displayName: req.body.displayName || req.body.email,
      userType: req.body.userType || "internal",
      status: "invited",
    } as any).returning();
    await audit(req, { tenantId, eventType: "user.invited", entityType: "user", entityId: created.id, action: "invite", afterSnapshot: created });
    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to invite user");
  }
});

router.patch("/platform/users/:id/status", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const [before] = await db.select().from(platformUsers).where(eq(platformUsers.id, req.params.id));
    const [updated] = await db.update(platformUsers).set({ status: req.body.status, updatedAt: new Date() } as any).where(eq(platformUsers.id, req.params.id)).returning();
    await audit(req, { tenantId, eventType: `user.${req.body.status}`, entityType: "user", entityId: updated.id, action: "update", beforeSnapshot: before, afterSnapshot: updated });
    res.json(updated);
  } catch (error) {
    handleError(res, error, "Failed to update user status");
  }
});

router.get("/platform/roles", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const rows = await db.select().from(platformRoles);
    res.json(rows.filter((role) => !tenantId || role.tenantId === tenantId || role.roleType === "system"));
  } catch (error) {
    handleError(res, error, "Failed to fetch roles");
  }
});

router.post("/platform/roles", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const [created] = await db.insert(platformRoles).values({
      tenantId,
      name: req.body.name,
      code: req.body.code,
      description: req.body.description,
      roleType: req.body.roleType || "custom",
      status: req.body.status || "active",
    } as any).returning();
    await audit(req, { tenantId, eventType: "role.created", entityType: "role", entityId: created.id, action: "create", afterSnapshot: created });
    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to create role");
  }
});

router.get("/platform/permissions", async (_req, res) => {
  try {
    res.json(await db.select().from(platformPermissions));
  } catch (error) {
    handleError(res, error, "Failed to fetch permissions");
  }
});

router.post("/platform/roles/:id/permissions", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const permissionIds = Array.isArray(req.body.permissionIds) ? req.body.permissionIds : [];
    const created = [];
    for (const permissionId of permissionIds) {
      const [row] = await db.insert(platformRolePermissions).values({ tenantId, roleId: req.params.id, permissionId } as any).returning();
      created.push(row);
    }
    await audit(req, { tenantId, eventType: "role.permission_added", entityType: "role", entityId: req.params.id, action: "assign", afterSnapshot: created });
    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to assign role permissions");
  }
});

router.post("/platform/users/:id/roles", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const [created] = await db.insert(platformUserRoleAssignments).values({
      tenantId,
      userId: req.params.id,
      roleId: req.body.roleId,
      scopeType: req.body.scopeType || "tenant",
      scopeId: req.body.scopeId || null,
      status: req.body.status || "active",
      startsAt: req.body.startsAt ? new Date(req.body.startsAt) : null,
      endsAt: req.body.endsAt ? new Date(req.body.endsAt) : null,
    } as any).returning();
    await audit(req, { tenantId, eventType: "user.role_assigned", entityType: "user", entityId: req.params.id, action: "assign", afterSnapshot: created });
    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to assign user role");
  }
});

router.get("/platform/audit-events", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const query = db.select().from(platformAuditEvents);
    res.json(tenantId ? await query.where(eq(platformAuditEvents.tenantId, tenantId)) : await query);
  } catch (error) {
    handleError(res, error, "Failed to fetch audit events");
  }
});

export const platformRouter = router;
