import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  configurableObjectTypes,
  customFieldDefinitions,
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
  workflowDefinitions,
  workflowStates,
  workflowTransitions,
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

const defaultPermissions = [
  ["platform", "tenant", "manage", "platform.tenant.manage", "Create and maintain tenant setup"],
  ["platform", "company", "manage", "platform.company.manage", "Create and maintain companies"],
  ["platform", "plant", "manage", "platform.plant.manage", "Create and maintain plants and hierarchy"],
  ["platform", "user", "manage", "platform.user.manage", "Invite and maintain users"],
  ["platform", "role", "manage", "platform.role.manage", "Maintain roles and role permissions"],
  ["configuration", "object_type", "manage", "configuration.object_type.manage", "Maintain configurable objects"],
  ["configuration", "custom_field", "manage", "configuration.custom_field.manage", "Maintain custom fields"],
  ["configuration", "workflow", "manage", "configuration.workflow.manage", "Maintain workflows"],
  ["mes", "work_order", "execute", "mes.work_order.execute", "Execute production work orders"],
  ["quality", "inspection", "approve", "quality.inspection.approve", "Approve quality inspections"],
  ["oee", "shift", "manage", "oee.shift.manage", "Manage shifts, downtime, and production output"],
  ["hrms", "employee", "manage", "hrms.employee.manage", "Maintain workforce master data"],
] as const;

const defaultObjectTypes = [
  ["MES", "work_order", "Work Order", "Production order with routing, execution, traceability, and genealogy."],
  ["MES", "operation_step", "Operation Step", "Executable step inside a manufacturing process."],
  ["ERP", "material", "Material", "Material master for inventory, purchasing, and production consumption."],
  ["Quality", "quality_defect", "Quality Defect", "Defect, containment, disposition, and corrective action record."],
  ["OEE", "shift_run", "Shift Run", "Shift-level production, downtime, performance, and availability record."],
  ["HRMS", "employee", "Employee", "Employee, contractor, skill, certification, and onboarding master."],
  ["Work Management", "ticket", "Ticket", "Issue, task, escalation, and engineering action tracker."],
] as const;

const industryTemplates: Record<string, {
  label: string;
  plantArea: string;
  lineType: string;
  workCenters: string[];
  customFields: Array<[string, string, string, string, boolean]>;
}> = {
  discrete_manufacturing: {
    label: "Discrete Manufacturing",
    plantArea: "Assembly",
    lineType: "discrete",
    workCenters: ["Receiving", "Assembly", "Inspection", "Packing"],
    customFields: [
      ["work_order", "customer_priority", "Customer Priority", "select", false],
      ["quality_defect", "containment_required", "Containment Required", "boolean", false],
      ["material", "shelf_life_days", "Shelf Life Days", "number", false],
    ],
  },
  process_manufacturing: {
    label: "Process Manufacturing",
    plantArea: "Processing",
    lineType: "batch",
    workCenters: ["Raw Material Staging", "Batching", "Processing", "Lab Release"],
    customFields: [
      ["work_order", "batch_size", "Batch Size", "decimal", true],
      ["material", "storage_condition", "Storage Condition", "select", false],
      ["quality_defect", "lab_disposition", "Lab Disposition", "select", false],
    ],
  },
  composites: {
    label: "Composites",
    plantArea: "Blade Production",
    lineType: "composites",
    workCenters: ["Kitting", "Mould Prep", "Layup", "Infusion", "Demould", "Final Inspection"],
    customFields: [
      ["work_order", "blade_model", "Blade Model", "text", true],
      ["operation_step", "vacuum_hold_minutes", "Vacuum Hold Minutes", "number", false],
      ["quality_defect", "repair_class", "Repair Class", "select", false],
    ],
  },
};

function templateFor(industryType?: string) {
  return industryTemplates[industryType || ""] || industryTemplates.discrete_manufacturing;
}

function makeCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 36) || "TENANT";
}

async function ensurePermission(permission: typeof defaultPermissions[number]) {
  const [, , , code] = permission;
  const [existing] = await db.select().from(platformPermissions).where(eq(platformPermissions.code, code));
  if (existing) return existing;
  const [created] = await db.insert(platformPermissions).values({
    module: permission[0],
    resource: permission[1],
    action: permission[2],
    code: permission[3],
    description: permission[4],
  }).returning();
  return created;
}

async function ensureTenantRole(tenantId: string, name: string, code: string, description: string, roleType = "tenant_default") {
  const rows = await db.select().from(platformRoles).where(and(eq(platformRoles.tenantId, tenantId), eq(platformRoles.code, code)));
  if (rows[0]) return rows[0];
  const [created] = await db.insert(platformRoles).values({ tenantId, name, code, description, roleType, status: "active" } as any).returning();
  return created;
}

async function ensureRolePermission(tenantId: string, roleId: string, permissionId: string) {
  const rows = await db.select().from(platformRolePermissions).where(and(
    eq(platformRolePermissions.roleId, roleId),
    eq(platformRolePermissions.permissionId, permissionId),
  ));
  if (rows[0]) return rows[0];
  const [created] = await db.insert(platformRolePermissions).values({ tenantId, roleId, permissionId } as any).returning();
  return created;
}

async function ensureUserRole(tenantId: string, userId: string, roleId: string) {
  const rows = await db.select().from(platformUserRoleAssignments).where(and(
    eq(platformUserRoleAssignments.tenantId, tenantId),
    eq(platformUserRoleAssignments.userId, userId),
    eq(platformUserRoleAssignments.roleId, roleId),
  ));
  if (rows[0]) return rows[0];
  const [created] = await db.insert(platformUserRoleAssignments).values({
    tenantId,
    userId,
    roleId,
    scopeType: "tenant",
    status: "active",
  } as any).returning();
  return created;
}

async function ensureConfigObject(tenantId: string, object: typeof defaultObjectTypes[number]) {
  const rows = await db.select().from(configurableObjectTypes).where(and(
    eq(configurableObjectTypes.tenantId, tenantId),
    eq(configurableObjectTypes.objectType, object[1]),
  ));
  if (rows[0]) return rows[0];
  const [created] = await db.insert(configurableObjectTypes).values({
    tenantId,
    moduleKey: object[0],
    objectType: object[1],
    displayName: object[2],
    description: object[3],
    isSystem: false,
    isActive: true,
  } as any).returning();
  return created;
}

async function ensureCustomField(tenantId: string, field: [string, string, string, string, boolean], createdBy: string | null) {
  const rows = await db.select().from(customFieldDefinitions).where(and(
    eq(customFieldDefinitions.tenantId, tenantId),
    eq(customFieldDefinitions.objectType, field[0]),
    eq(customFieldDefinitions.fieldKey, field[1]),
  ));
  if (rows[0]) return rows[0];
  const [created] = await db.insert(customFieldDefinitions).values({
    tenantId,
    objectType: field[0],
    fieldKey: field[1],
    fieldLabel: field[2],
    fieldType: field[3],
    isRequired: field[4],
    isActive: true,
    createdBy,
    updatedBy: createdBy,
  } as any).returning();
  return created;
}

async function ensureWorkflow(tenantId: string, actorUserId: string | null) {
  const rows = await db.select().from(workflowDefinitions).where(and(
    eq(workflowDefinitions.tenantId, tenantId),
    eq(workflowDefinitions.workflowKey, "work_order_standard"),
  ));
  const workflow = rows[0] || (await db.insert(workflowDefinitions).values({
    tenantId,
    moduleKey: "MES",
    objectType: "work_order",
    workflowKey: "work_order_standard",
    workflowName: "Standard Work Order Lifecycle",
    description: "Draft, release, execute, inspect, and close manufacturing work orders.",
    isActive: true,
    isSystem: false,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  } as any).returning())[0];

  const stateSpecs = [
    ["draft", "Draft", "draft", "slate", true, false],
    ["released", "Released", "waiting", "blue", false, false],
    ["in_progress", "In Progress", "active", "emerald", false, false],
    ["quality_hold", "Quality Hold", "blocked", "amber", false, false],
    ["closed", "Closed", "closed", "zinc", false, true],
  ] as const;

  const states: Record<string, any> = {};
  for (const state of stateSpecs) {
    const existing = await db.select().from(workflowStates).where(and(eq(workflowStates.workflowId, workflow.id), eq(workflowStates.stateCode, state[0])));
    states[state[0]] = existing[0] || (await db.insert(workflowStates).values({
      tenantId,
      workflowId: workflow.id,
      stateCode: state[0],
      stateName: state[1],
      stateCategory: state[2],
      color: state[3],
      isInitial: state[4],
      isTerminal: state[5],
      allowsEditing: !state[5],
      displayOrder: Object.keys(states).length + 1,
    } as any).returning())[0];
  }

  const transitionSpecs = [
    ["release", "Release", "draft", "released", "mes.work_order.execute"],
    ["start", "Start Work", "released", "in_progress", "mes.work_order.execute"],
    ["hold_quality", "Hold For Quality", "in_progress", "quality_hold", "quality.inspection.approve"],
    ["resume", "Resume Work", "quality_hold", "in_progress", "quality.inspection.approve"],
    ["close", "Close Work Order", "in_progress", "closed", "quality.inspection.approve"],
  ] as const;

  const transitions = [];
  for (const transition of transitionSpecs) {
    const existing = await db.select().from(workflowTransitions).where(and(
      eq(workflowTransitions.workflowId, workflow.id),
      eq(workflowTransitions.transitionCode, transition[0]),
    ));
    transitions.push(existing[0] || (await db.insert(workflowTransitions).values({
      tenantId,
      workflowId: workflow.id,
      transitionCode: transition[0],
      transitionName: transition[1],
      fromStateId: states[transition[2]].id,
      toStateId: states[transition[3]].id,
      requiredPermission: transition[4],
      requiresComment: transition[0].includes("hold"),
      auditSeverity: transition[0].includes("hold") ? "important" : "normal",
      isActive: true,
    } as any).returning())[0]);
  }

  return { workflow, states: Object.values(states), transitions };
}

router.post("/platform/onboarding/bootstrap", async (req, res) => {
  try {
    if (!req.body.tenantName && !req.body.companyName) {
      return res.status(400).json({ error: "tenantName or companyName is required" });
    }
    if (!req.body.adminEmail) {
      return res.status(400).json({ error: "adminEmail is required" });
    }

    const actorUserId = actorUserIdFrom(req);
    const tenantCode = makeCode(req.body.tenantCode || req.body.tenantName || req.body.companyName || "TENANT");
    const template = templateFor(req.body.industryType);

    const [existingTenant] = await db.select().from(platformTenants).where(eq(platformTenants.code, tenantCode));
    const tenant = existingTenant || (await db.insert(platformTenants).values({
      name: req.body.tenantName || req.body.companyName,
      code: tenantCode,
      industryType: req.body.industryType || "discrete_manufacturing",
      status: "active",
      defaultTimezone: req.body.timezone || "UTC",
      defaultLocale: req.body.defaultLocale || "en",
      subscriptionTier: req.body.subscriptionTier || "starter",
      createdBy: actorUserId,
    } as any).returning())[0];

    const [existingCompany] = await db.select().from(platformCompanies).where(and(
      eq(platformCompanies.tenantId, tenant.id),
      eq(platformCompanies.displayName, req.body.companyName || tenant.name),
    ));
    const company = existingCompany || (await db.insert(platformCompanies).values({
      tenantId: tenant.id,
      legalName: req.body.legalName || req.body.companyName || tenant.name,
      displayName: req.body.companyName || tenant.name,
      status: "active",
    } as any).returning())[0];

    const plantCode = makeCode(req.body.plantCode || req.body.plantName || "MAIN_PLANT");
    const [existingPlant] = await db.select().from(platformPlants).where(and(
      eq(platformPlants.tenantId, tenant.id),
      eq(platformPlants.code, plantCode),
    ));
    const plant = existingPlant || (await db.insert(platformPlants).values({
      tenantId: tenant.id,
      companyId: company.id,
      name: req.body.plantName || "Main Plant",
      code: plantCode,
      location: req.body.plantLocation || null,
      timezone: req.body.timezone || tenant.defaultTimezone,
      status: "active",
    } as any).returning())[0];

    const [existingArea] = await db.select().from(platformAreas).where(and(eq(platformAreas.tenantId, tenant.id), eq(platformAreas.plantId, plant.id), eq(platformAreas.code, "PRIMARY")));
    const area = existingArea || (await db.insert(platformAreas).values({
      tenantId: tenant.id,
      plantId: plant.id,
      name: template.plantArea,
      code: "PRIMARY",
      areaType: "production",
      status: "active",
    } as any).returning())[0];

    const [existingLine] = await db.select().from(platformLines).where(and(eq(platformLines.tenantId, tenant.id), eq(platformLines.plantId, plant.id), eq(platformLines.code, "LINE_1")));
    const line = existingLine || (await db.insert(platformLines).values({
      tenantId: tenant.id,
      plantId: plant.id,
      areaId: area.id,
      name: "Line 1",
      code: "LINE_1",
      lineType: template.lineType,
      status: "active",
    } as any).returning())[0];

    const workCenters = [];
    for (const [index, name] of template.workCenters.entries()) {
      const code = makeCode(name);
      const existing = await db.select().from(platformWorkCenters).where(and(eq(platformWorkCenters.tenantId, tenant.id), eq(platformWorkCenters.plantId, plant.id), eq(platformWorkCenters.code, code)));
      workCenters.push(existing[0] || (await db.insert(platformWorkCenters).values({
        tenantId: tenant.id,
        plantId: plant.id,
        lineId: line.id,
        name,
        code,
        workCenterType: index === 0 ? "receiving" : "production_station",
        status: "active",
      } as any).returning())[0]);
    }

    const permissions = [];
    for (const permission of defaultPermissions) permissions.push(await ensurePermission(permission));

    const adminRole = await ensureTenantRole(tenant.id, "Tenant Admin", "TENANT_ADMIN", "Full tenant administration across platform and configuration.");
    const plantManagerRole = await ensureTenantRole(tenant.id, "Plant Manager", "PLANT_MANAGER", "Plant-level MES, OEE, quality, and workforce operations.");
    const operatorRole = await ensureTenantRole(tenant.id, "Operator", "OPERATOR", "Shop-floor execution access.");

    for (const permission of permissions) await ensureRolePermission(tenant.id, adminRole.id, permission.id);
    for (const permission of permissions.filter((p) => ["mes", "quality", "oee", "hrms"].includes(p.module))) {
      await ensureRolePermission(tenant.id, plantManagerRole.id, permission.id);
    }
    for (const permission of permissions.filter((p) => p.code === "mes.work_order.execute" || p.code === "oee.shift.manage")) {
      await ensureRolePermission(tenant.id, operatorRole.id, permission.id);
    }

    const [existingAdmin] = await db.select().from(platformUsers).where(and(eq(platformUsers.tenantId, tenant.id), eq(platformUsers.email, req.body.adminEmail)));
    const adminUser = existingAdmin || (await db.insert(platformUsers).values({
      tenantId: tenant.id,
      email: req.body.adminEmail,
      displayName: req.body.adminName || req.body.adminEmail,
      userType: "internal",
      status: "invited",
    } as any).returning())[0];
    await ensureUserRole(tenant.id, adminUser.id, adminRole.id);

    const objectTypes = [];
    for (const object of defaultObjectTypes) objectTypes.push(await ensureConfigObject(tenant.id, object));

    const customFields = [];
    for (const field of template.customFields) customFields.push(await ensureCustomField(tenant.id, field, adminUser.id));

    const workflow = await ensureWorkflow(tenant.id, adminUser.id);

    await audit(req, {
      tenantId: tenant.id,
      eventType: "tenant.onboarded",
      entityType: "tenant",
      entityId: tenant.id,
      action: "bootstrap",
      afterSnapshot: { tenant, company, plant, area, line, workCenters, roles: [adminRole, plantManagerRole, operatorRole], template: template.label },
    });

    res.status(existingTenant ? 200 : 201).json({
      tenant,
      company,
      plant,
      hierarchy: { area, line, workCenters },
      adminUser,
      roles: [adminRole, plantManagerRole, operatorRole],
      permissions,
      objectTypes,
      customFields,
      workflow,
      industryTemplate: template.label,
    });
  } catch (error) {
    handleError(res, error, "Failed to bootstrap tenant onboarding");
  }
});

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
