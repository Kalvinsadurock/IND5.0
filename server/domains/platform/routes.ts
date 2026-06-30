import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { authenticate, requirePermission, requireTenant } from "../../middleware/auth";
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
  hrmsEmployeeProfiles,
  hrmsShiftCalendars,
  hrmsShiftAssignments
} from "../../../shared/schema";

const router = Router();
const manageTenant = requirePermission("platform.tenant.manage");
const manageCompany = requirePermission("platform.company.manage");
const managePlant = requirePermission("platform.plant.manage");
const manageUsers = requirePermission("platform.user.manage");
const manageRoles = requirePermission("platform.role.manage");
const manageHrmsEmployees = requirePermission("hrms.employee.manage");

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

function plantIdFrom(req: any) {
  return req.query.plantId || req.body?.plantId || null;
}

function hierarchyWhere(table: any, req: any) {
  const filters = [];
  const tenantId = tenantIdFrom(req);
  const plantId = plantIdFrom(req);
  if (tenantId) filters.push(eq(table.tenantId, tenantId));
  if (plantId && table.plantId) filters.push(eq(table.plantId, plantId));
  return filters.length > 1 ? and(...filters) : filters[0];
}

function cleanHierarchyUpdate(body: any, fields: string[]) {
  const update: Record<string, unknown> = {};
  for (const field of fields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) update[field] = body[field] || null;
  }
  update.updatedAt = new Date();
  return update;
}

async function findHierarchyRow(table: any, id: string, tenantId: string | null) {
  const filters = tenantId ? and(eq(table.id, id), eq(table.tenantId, tenantId)) : eq(table.id, id);
  const [row] = await db.select().from(table).where(filters);
  return row;
}

async function deleteHierarchyRow(req: any, res: any, config: {
  table: any;
  entityType: string;
  eventType: string;
  errorMessage: string;
}) {
  try {
    const tenantId = tenantIdFrom(req);
    const before = await findHierarchyRow(config.table, req.params.id, tenantId);
    if (!before) return res.status(404).json({ error: `${config.entityType} not found` });
    const filters = tenantId ? and(eq(config.table.id, req.params.id), eq(config.table.tenantId, tenantId)) : eq(config.table.id, req.params.id);
    const deletedRows = await db.delete(config.table).where(filters).returning() as any[];
    const [deleted] = deletedRows;
    await audit(req, {
      tenantId,
      eventType: config.eventType,
      entityType: config.entityType,
      entityId: req.params.id,
      action: "delete",
      beforeSnapshot: before,
    });
    res.json(deleted);
  } catch (error: any) {
    if (error?.code === "23503") {
      return res.status(409).json({ error: `${config.entityType} is still referenced by child hierarchy records` });
    }
    handleError(res, error, config.errorMessage);
  }
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
    console.error("Tenant onboarding bootstrap failed", error);
    res.status(500).json({ error: "Failed to bootstrap tenant onboarding" });
  }
});

router.use(authenticate, requireTenant);

router.get("/platform/tenant/readiness", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

    // 1. Hierarchy Check
    const plants = await db.select().from(platformPlants).where(eq(platformPlants.tenantId, tenantId));
    const lines = await db.select().from(platformLines).where(eq(platformLines.tenantId, tenantId));
    const workCenters = await db.select().from(platformWorkCenters).where(eq(platformWorkCenters.tenantId, tenantId));
    const hierarchyCompleted = plants.length > 0 && lines.length > 0 && workCenters.length > 0;

    // 2. Roles/Users Assignment Check
    const users = await db.select().from(platformUsers).where(and(eq(platformUsers.tenantId, tenantId), eq(platformUsers.status, "active")));
    const rolesCompleted = users.length > 0;

    // 3. Workflow Configuration Check
    const workflows = await db.select().from(workflowDefinitions).where(eq(workflowDefinitions.tenantId, tenantId));
    const workflowCompleted = workflows.length > 0;

    // 4. Work Order Released Check
    const { mesWorkOrders } = await import("../../../shared/schema");
    const workOrders = await db.select().from(mesWorkOrders).where(
      and(
        eq(mesWorkOrders.tenantId, tenantId),
        eq(mesWorkOrders.status, "released")
      )
    );
    const workOrderCompleted = workOrders.length > 0;

    // 5. OEE shift run logged check
    const { oeeShiftRuns } = await import("../../../shared/schema");
    const shiftRuns = await db.select().from(oeeShiftRuns).where(eq(oeeShiftRuns.tenantId, tenantId));
    const oeeCompleted = shiftRuns.length > 0;

    res.json([
      { item: "Factory Hierarchy Configured", completed: hierarchyCompleted, link: "/platform" },
      { item: "Admin Account Active", completed: users.some(u => u.status === "active"), link: "/platform" },
      { item: "Roles & Team Assigned", completed: rolesCompleted, link: "/platform" },
      { item: "Workflows Defined", completed: workflowCompleted, link: "/configuration" },
      { item: "Released Work Orders Available", completed: workOrderCompleted, link: "/operations" },
      { item: "OEE Tracking Active", completed: oeeCompleted, link: "/oee" }
    ]);
  } catch (error) {
    console.error("Tenant readiness check failed", error);
    res.status(500).json({ error: "Failed to fetch tenant readiness" });
  }
});

router.get("/platform/hierarchy/tree", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

    const plants = await db.select().from(platformPlants).where(eq(platformPlants.tenantId, tenantId));
    const areas = await db.select().from(platformAreas).where(eq(platformAreas.tenantId, tenantId));
    const lines = await db.select().from(platformLines).where(eq(platformLines.tenantId, tenantId));
    const workCenters = await db.select().from(platformWorkCenters).where(eq(platformWorkCenters.tenantId, tenantId));

    const tree = plants.map((plant) => {
      const plantAreas = areas.filter((a) => a.plantId === plant.id);
      return {
        id: plant.id,
        name: plant.name,
        code: plant.code,
        type: "plant",
        children: plantAreas.map((area) => {
          const areaLines = lines.filter((l) => l.areaId === area.id);
          return {
            id: area.id,
            name: area.name,
            code: area.code,
            type: "area",
            children: areaLines.map((line) => {
              const lineWC = workCenters.filter((wc) => wc.lineId === line.id);
              return {
                id: line.id,
                name: line.name,
                code: line.code,
                type: "line",
                children: lineWC.map((wc) => ({
                  id: wc.id,
                  name: wc.name,
                  code: wc.code,
                  type: "work_center"
                }))
              };
            })
          };
        })
      };
    });

    res.json(tree);
  } catch (error) {
    handleError(res, error, "Failed to fetch hierarchy tree");
  }
});

router.post("/platform/hierarchy/:type", managePlant, async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
    const { type } = req.params;
    const { name, code, parentId } = req.body;

    let created: any;
    if (type === "plant") {
      [created] = await db.insert(platformPlants).values({
        tenantId,
        name,
        code,
        status: "active"
      } as any).returning();
    } else if (type === "area") {
      [created] = await db.insert(platformAreas).values({
        tenantId,
        plantId: parentId,
        name,
        code,
        status: "active"
      } as any).returning();
    } else if (type === "line") {
      const [parentArea] = await db.select().from(platformAreas).where(eq(platformAreas.id, parentId));
      [created] = await db.insert(platformLines).values({
        tenantId,
        plantId: parentArea ? parentArea.plantId : null,
        areaId: parentId,
        name,
        code,
        status: "active"
      } as any).returning();
    } else if (type === "work_center") {
      const [parentLine] = await db.select().from(platformLines).where(eq(platformLines.id, parentId));
      [created] = await db.insert(platformWorkCenters).values({
        tenantId,
        plantId: parentLine ? parentLine.plantId : null,
        lineId: parentId,
        name,
        code,
        status: "active"
      } as any).returning();
    } else {
      return res.status(400).json({ error: "Invalid node type" });
    }

    await audit(req, {
      tenantId,
      eventType: "hierarchy.node_added",
      entityType: type,
      entityId: created.id,
      action: "create",
      afterSnapshot: created
    });

    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to add hierarchy node");
  }
});

router.patch("/platform/hierarchy/:type/:id", managePlant, async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
    const { type, id } = req.params;
    const { name, code } = req.body;

    let updated: any;
    if (type === "plant") {
      const [before] = await db.select().from(platformPlants).where(eq(platformPlants.id, id));
      [updated] = await db.update(platformPlants).set({ name, code } as any).where(eq(platformPlants.id, id)).returning();
      await audit(req, { tenantId, eventType: "hierarchy.node_updated", entityType: type, entityId: id, action: "update", beforeSnapshot: before, afterSnapshot: updated });
    } else if (type === "area") {
      const [before] = await db.select().from(platformAreas).where(eq(platformAreas.id, id));
      [updated] = await db.update(platformAreas).set({ name, code } as any).where(eq(platformAreas.id, id)).returning();
      await audit(req, { tenantId, eventType: "hierarchy.node_updated", entityType: type, entityId: id, action: "update", beforeSnapshot: before, afterSnapshot: updated });
    } else if (type === "line") {
      const [before] = await db.select().from(platformLines).where(eq(platformLines.id, id));
      [updated] = await db.update(platformLines).set({ name, code } as any).where(eq(platformLines.id, id)).returning();
      await audit(req, { tenantId, eventType: "hierarchy.node_updated", entityType: type, entityId: id, action: "update", beforeSnapshot: before, afterSnapshot: updated });
    } else if (type === "work_center") {
      const [before] = await db.select().from(platformWorkCenters).where(eq(platformWorkCenters.id, id));
      [updated] = await db.update(platformWorkCenters).set({ name, code } as any).where(eq(platformWorkCenters.id, id)).returning();
      await audit(req, { tenantId, eventType: "hierarchy.node_updated", entityType: type, entityId: id, action: "update", beforeSnapshot: before, afterSnapshot: updated });
    } else {
      return res.status(400).json({ error: "Invalid node type" });
    }

    res.json(updated);
  } catch (error) {
    handleError(res, error, "Failed to update hierarchy node");
  }
});

router.delete("/platform/hierarchy/:type/:id", managePlant, async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
    const { type, id } = req.params;

    if (type === "plant") {
      // Block: has child areas
      const areas = await db.select().from(platformAreas).where(eq(platformAreas.plantId, id));
      if (areas.length > 0) return res.status(400).json({ blocked: true, reason: `Cannot delete: Plant has ${areas.length} active area(s). Remove or reassign them first.` });
      const [deleted] = await db.delete(platformPlants).where(eq(platformPlants.id, id)).returning();
      await audit(req, { tenantId, eventType: "HIERARCHY_NODE_DELETED", entityType: type, entityId: id, action: "delete", beforeSnapshot: deleted, metadata: { childrenCount: 0 } });

    } else if (type === "area") {
      // Block: has child lines
      const childLines = await db.select().from(platformLines).where(eq(platformLines.areaId, id));
      if (childLines.length > 0) return res.status(400).json({ blocked: true, reason: `Cannot delete: Area has ${childLines.length} active line(s). Remove or reassign them first.` });
      const [deleted] = await db.delete(platformAreas).where(eq(platformAreas.id, id)).returning();
      await audit(req, { tenantId, eventType: "HIERARCHY_NODE_DELETED", entityType: type, entityId: id, action: "delete", beforeSnapshot: deleted, metadata: { childrenCount: 0 } });

    } else if (type === "line") {
      // Block: has child work centers
      const childWCs = await db.select().from(platformWorkCenters).where(eq(platformWorkCenters.lineId, id));
      if (childWCs.length > 0) return res.status(400).json({ blocked: true, reason: `Cannot delete: Line has ${childWCs.length} active work center(s). Remove or reassign them first.` });
      const [deleted] = await db.delete(platformLines).where(eq(platformLines.id, id)).returning();
      await audit(req, { tenantId, eventType: "HIERARCHY_NODE_DELETED", entityType: type, entityId: id, action: "delete", beforeSnapshot: deleted, metadata: { childrenCount: 0 } });

    } else if (type === "work_center") {
      // Block: has active OEE shift runs
      const { oeeShiftRuns, oeeProductionCounts, mesWorkOrders } = await import("../../../shared/schema");
      const { inArray } = await import("drizzle-orm");

      const activeShifts = await db.select().from(oeeShiftRuns).where(
        and(eq(oeeShiftRuns.workCenterId, id), eq(oeeShiftRuns.status, "active"))
      );
      if (activeShifts.length > 0) {
        return res.status(400).json({ blocked: true, reason: `Cannot delete: Work Center has ${activeShifts.length} active OEE shift run(s).` });
      }

      // Block: has active work orders via production counts
      const prodCounts = await db.select({ workOrderId: oeeProductionCounts.workOrderId })
        .from(oeeProductionCounts)
        .innerJoin(oeeShiftRuns, eq(oeeProductionCounts.shiftRunId, oeeShiftRuns.id))
        .where(eq(oeeShiftRuns.workCenterId, id));
      if (prodCounts.length > 0) {
        const woIds = [...new Set(prodCounts.map(p => p.workOrderId))];
        const activeWOs = await db.select().from(mesWorkOrders).where(
          and(
            inArray(mesWorkOrders.id, woIds),
            inArray(mesWorkOrders.status, ["released", "in_progress"])
          )
        );
        if (activeWOs.length > 0) {
          return res.status(400).json({ blocked: true, reason: `Cannot delete: ${activeWOs.length} active work order(s) assigned to this work center.` });
        }
      }

      const [deleted] = await db.delete(platformWorkCenters).where(eq(platformWorkCenters.id, id)).returning();
      await audit(req, { tenantId, eventType: "HIERARCHY_NODE_DELETED", entityType: type, entityId: id, action: "delete", beforeSnapshot: deleted, metadata: { childrenCount: 0 } });
    } else {
      return res.status(400).json({ error: "Invalid node type. Use: plant, area, line, or work_center" });
    }

    res.json({ success: true });
  } catch (error) {
    handleError(res, error, "Failed to delete hierarchy node");
  }
});

router.get("/platform/rbac/matrix", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

    const roles = await db.select().from(platformRoles).where(eq(platformRoles.tenantId, tenantId));
    const permissions = await db.select().from(platformPermissions);
    const rolePermissions = await db.select().from(platformRolePermissions).where(eq(platformRolePermissions.tenantId, tenantId));

    res.json({
      roles,
      permissions,
      matrix: rolePermissions
    });
  } catch (error) {
    handleError(res, error, "Failed to fetch RBAC matrix");
  }
});

router.put("/platform/rbac/matrix", manageRoles, async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });

    // Support both single-toggle and batch modes
    const grants: Array<{roleId: string, permissionId: string}> = req.body.grants || [];
    const revokes: Array<{roleId: string, permissionId: string}> = req.body.revokes || [];

    // Single-toggle backward compatibility
    if (req.body.roleId && req.body.permissionId) {
      if (req.body.state === false) {
        revokes.push({ roleId: req.body.roleId, permissionId: req.body.permissionId });
      } else {
        grants.push({ roleId: req.body.roleId, permissionId: req.body.permissionId });
      }
    }

    // Critical permission codes that require lockout prevention
    const criticalPermissions = ["platform.tenant.manage", "platform.role.manage"];

    // Lockout prevention: check each revoke against critical permissions
    for (const revoke of revokes) {
      const [perm] = await db.select().from(platformPermissions).where(eq(platformPermissions.id, revoke.permissionId));
      if (perm && criticalPermissions.includes(perm.code)) {
        // Count how many role-assignments still have this permission (across ALL roles)
        const remaining = await db.select().from(platformRolePermissions).where(
          and(
            eq(platformRolePermissions.tenantId, tenantId),
            eq(platformRolePermissions.permissionId, revoke.permissionId)
          )
        );
        if (remaining.length <= 1) {
          return res.status(400).json({
            error: `Cannot remove the last admin permission (${perm.code}). Tenant would be orphaned with no administrative access.`
          });
        }

        // Check if revoking from the only Tenant Admin role
        const [role] = await db.select().from(platformRoles).where(eq(platformRoles.id, revoke.roleId));
        if (role && (role.code === "tenant_admin" || role.name === "Tenant Admin")) {
          return res.status(400).json({
            error: `Cannot remove ${perm.code} from the Tenant Admin role. At least one admin role must retain administrative permissions.`
          });
        }
      }
    }

    let updated = 0;

    // Process revokes
    for (const revoke of revokes) {
      await db.delete(platformRolePermissions).where(
        and(
          eq(platformRolePermissions.tenantId, tenantId),
          eq(platformRolePermissions.roleId, revoke.roleId),
          eq(platformRolePermissions.permissionId, revoke.permissionId)
        )
      );
      updated++;
    }

    // Process grants
    for (const grant of grants) {
      // Upsert: check if already exists
      const existing = await db.select().from(platformRolePermissions).where(
        and(
          eq(platformRolePermissions.tenantId, tenantId),
          eq(platformRolePermissions.roleId, grant.roleId),
          eq(platformRolePermissions.permissionId, grant.permissionId)
        )
      );
      if (existing.length === 0) {
        await db.insert(platformRolePermissions).values({
          tenantId,
          roleId: grant.roleId,
          permissionId: grant.permissionId
        } as any);
        updated++;
      }
    }

    await audit(req, {
      tenantId,
      eventType: "RBAC_UPDATED",
      entityType: "rbac",
      entityId: tenantId,
      action: "matrix_update",
      metadata: { grants: grants.length, revokes: revokes.length, totalUpdated: updated }
    });

    res.json({ success: true, updated });
  } catch (error) {
    handleError(res, error, "Failed to update RBAC matrix");
  }
});

router.get("/platform/tenants", async (_req, res) => {
  try {
    res.json(await db.select().from(platformTenants));
  } catch (error) {
    handleError(res, error, "Failed to fetch tenants");
  }
});

router.post("/platform/tenants", manageTenant, async (req, res) => {
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

router.patch("/platform/tenants/current", manageTenant, async (req, res) => {
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

router.post("/platform/companies", manageCompany, async (req, res) => {
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

router.post("/platform/plants", managePlant, async (req, res) => {
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

router.post("/platform/areas", managePlant, async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
    const [created] = await db.insert(platformAreas).values({ tenantId, ...req.body } as any).returning();
    await audit(req, { tenantId, eventType: "area.created", entityType: "area", entityId: created.id, action: "create", afterSnapshot: created });
    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to create area");
  }
});

router.get("/platform/areas", async (req, res) => {
  try {
    const filters = hierarchyWhere(platformAreas, req);
    res.json(filters ? await db.select().from(platformAreas).where(filters) : await db.select().from(platformAreas));
  } catch (error) {
    handleError(res, error, "Failed to fetch areas");
  }
});

router.patch("/platform/areas/:id", managePlant, async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const before = await findHierarchyRow(platformAreas, req.params.id, tenantId);
    if (!before) return res.status(404).json({ error: "area not found" });
    const update = cleanHierarchyUpdate(req.body, ["plantId", "name", "code", "areaType", "status"]);
    const filters = tenantId ? and(eq(platformAreas.id, req.params.id), eq(platformAreas.tenantId, tenantId)) : eq(platformAreas.id, req.params.id);
    const [updated] = await db.update(platformAreas).set(update as any).where(filters).returning();
    await audit(req, { tenantId, eventType: "area.updated", entityType: "area", entityId: updated.id, action: "update", beforeSnapshot: before, afterSnapshot: updated });
    res.json(updated);
  } catch (error) {
    handleError(res, error, "Failed to update area");
  }
});

router.delete("/platform/areas/:id", managePlant, async (req, res) => {
  await deleteHierarchyRow(req, res, {
    table: platformAreas,
    entityType: "area",
    eventType: "area.deleted",
    errorMessage: "Failed to delete area",
  });
});

router.post("/platform/departments", managePlant, async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
    const [created] = await db.insert(platformDepartments).values({ tenantId, ...req.body } as any).returning();
    await audit(req, { tenantId, eventType: "department.created", entityType: "department", entityId: created.id, action: "create", afterSnapshot: created });
    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to create department");
  }
});

router.get("/platform/departments", async (req, res) => {
  try {
    const filters = hierarchyWhere(platformDepartments, req);
    res.json(filters ? await db.select().from(platformDepartments).where(filters) : await db.select().from(platformDepartments));
  } catch (error) {
    handleError(res, error, "Failed to fetch departments");
  }
});

router.patch("/platform/departments/:id", managePlant, async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const before = await findHierarchyRow(platformDepartments, req.params.id, tenantId);
    if (!before) return res.status(404).json({ error: "department not found" });
    const update = cleanHierarchyUpdate(req.body, ["plantId", "name", "code", "functionType", "status"]);
    const filters = tenantId ? and(eq(platformDepartments.id, req.params.id), eq(platformDepartments.tenantId, tenantId)) : eq(platformDepartments.id, req.params.id);
    const [updated] = await db.update(platformDepartments).set(update as any).where(filters).returning();
    await audit(req, { tenantId, eventType: "department.updated", entityType: "department", entityId: updated.id, action: "update", beforeSnapshot: before, afterSnapshot: updated });
    res.json(updated);
  } catch (error) {
    handleError(res, error, "Failed to update department");
  }
});

router.delete("/platform/departments/:id", managePlant, async (req, res) => {
  await deleteHierarchyRow(req, res, {
    table: platformDepartments,
    entityType: "department",
    eventType: "department.deleted",
    errorMessage: "Failed to delete department",
  });
});

router.post("/platform/lines", managePlant, async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
    const [created] = await db.insert(platformLines).values({ tenantId, ...req.body } as any).returning();
    await audit(req, { tenantId, eventType: "line.created", entityType: "line", entityId: created.id, action: "create", afterSnapshot: created });
    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to create line");
  }
});

router.get("/platform/lines", async (req, res) => {
  try {
    const filters = hierarchyWhere(platformLines, req);
    res.json(filters ? await db.select().from(platformLines).where(filters) : await db.select().from(platformLines));
  } catch (error) {
    handleError(res, error, "Failed to fetch lines");
  }
});

router.patch("/platform/lines/:id", managePlant, async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const before = await findHierarchyRow(platformLines, req.params.id, tenantId);
    if (!before) return res.status(404).json({ error: "line not found" });
    const update = cleanHierarchyUpdate(req.body, ["plantId", "areaId", "name", "code", "lineType", "status"]);
    const filters = tenantId ? and(eq(platformLines.id, req.params.id), eq(platformLines.tenantId, tenantId)) : eq(platformLines.id, req.params.id);
    const [updated] = await db.update(platformLines).set(update as any).where(filters).returning();
    await audit(req, { tenantId, eventType: "line.updated", entityType: "line", entityId: updated.id, action: "update", beforeSnapshot: before, afterSnapshot: updated });
    res.json(updated);
  } catch (error) {
    handleError(res, error, "Failed to update line");
  }
});

router.delete("/platform/lines/:id", managePlant, async (req, res) => {
  await deleteHierarchyRow(req, res, {
    table: platformLines,
    entityType: "line",
    eventType: "line.deleted",
    errorMessage: "Failed to delete line",
  });
});

router.post("/platform/work-centers", managePlant, async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
    const [created] = await db.insert(platformWorkCenters).values({ tenantId, ...req.body } as any).returning();
    await audit(req, { tenantId, eventType: "work_center.created", entityType: "work_center", entityId: created.id, action: "create", afterSnapshot: created });
    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to create work center");
  }
});

router.get("/platform/work-centers", async (req, res) => {
  try {
    const filters = hierarchyWhere(platformWorkCenters, req);
    res.json(filters ? await db.select().from(platformWorkCenters).where(filters) : await db.select().from(platformWorkCenters));
  } catch (error) {
    handleError(res, error, "Failed to fetch work centers");
  }
});

router.patch("/platform/work-centers/:id", managePlant, async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const before = await findHierarchyRow(platformWorkCenters, req.params.id, tenantId);
    if (!before) return res.status(404).json({ error: "work_center not found" });
    const update = cleanHierarchyUpdate(req.body, ["plantId", "lineId", "name", "code", "workCenterType", "status"]);
    const filters = tenantId ? and(eq(platformWorkCenters.id, req.params.id), eq(platformWorkCenters.tenantId, tenantId)) : eq(platformWorkCenters.id, req.params.id);
    const [updated] = await db.update(platformWorkCenters).set(update as any).where(filters).returning();
    await audit(req, { tenantId, eventType: "work_center.updated", entityType: "work_center", entityId: updated.id, action: "update", beforeSnapshot: before, afterSnapshot: updated });
    res.json(updated);
  } catch (error) {
    handleError(res, error, "Failed to update work center");
  }
});

router.delete("/platform/work-centers/:id", managePlant, async (req, res) => {
  await deleteHierarchyRow(req, res, {
    table: platformWorkCenters,
    entityType: "work_center",
    eventType: "work_center.deleted",
    errorMessage: "Failed to delete work center",
  });
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

router.post("/platform/users/invite", manageUsers, async (req, res) => {
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

router.patch("/platform/users/:id/status", manageUsers, async (req, res) => {
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

router.post("/platform/roles", manageRoles, async (req, res) => {
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

router.get("/platform/roles/:id/permissions", async (req, res) => {
  try {
    const rows = await db.select().from(platformRolePermissions).where(eq(platformRolePermissions.roleId, req.params.id));
    res.json(rows);
  } catch (error) {
    handleError(res, error, "Failed to fetch role permissions");
  }
});

router.post("/platform/roles/:id/permissions", manageRoles, async (req, res) => {
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

router.delete("/platform/roles/:id/permissions/:permissionId", manageRoles, async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const [deleted] = await db.delete(platformRolePermissions)
      .where(and(
        eq(platformRolePermissions.roleId, req.params.id),
        eq(platformRolePermissions.permissionId, req.params.permissionId)
      ))
      .returning();
    await audit(req, { tenantId, eventType: "role.permission_removed", entityType: "role", entityId: req.params.id, action: "revoke", afterSnapshot: deleted });
    res.json({ success: true, deleted });
  } catch (error) {
    handleError(res, error, "Failed to revoke role permission");
  }
});

router.post("/platform/users/:id/roles", manageUsers, async (req, res) => {
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

router.get("/platform/templates/:industryKey/preview", async (req, res) => {
  try {
    const template = industryTemplates[req.params.industryKey];
    if (!template) return res.status(404).json({ error: "Template not found" });
    res.json(template);
  } catch (error) {
    handleError(res, error, "Failed to fetch template preview");
  }
});

router.get("/hrms/employees", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
    const rows = await db.select().from(hrmsEmployeeProfiles).where(eq(hrmsEmployeeProfiles.tenantId, tenantId));
    res.json(rows);
  } catch (error) {
    handleError(res, error, "Failed to fetch HRMS employees");
  }
});

router.post("/hrms/employees", manageHrmsEmployees, async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
    const [created] = await db.insert(hrmsEmployeeProfiles).values({
      tenantId,
      employeeCode: req.body.employeeCode,
      displayName: req.body.displayName,
      employeeType: req.body.employeeType || "internal",
      status: req.body.status || "active",
      email: req.body.email,
      joiningDate: req.body.joiningDate ? new Date(req.body.joiningDate) : null,
    } as any).returning();
    await audit(req, { tenantId, eventType: "employee.created", entityType: "employee", entityId: created.id, action: "create", afterSnapshot: created });
    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to create HRMS employee");
  }
});

router.get("/hrms/shifts/assignments", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId is required" });
    const rows = await db.select().from(hrmsShiftAssignments).where(eq(hrmsShiftAssignments.tenantId, tenantId));
    res.json(rows);
  } catch (error) {
    handleError(res, error, "Failed to fetch shift assignments");
  }
});

export const platformRouter = router;
