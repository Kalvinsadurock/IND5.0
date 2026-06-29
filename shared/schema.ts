import { pgTable, serial, varchar, text, timestamp, integer, boolean, jsonb, index, decimal, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const executionStates = ["planned", "active", "paused", "waiting", "blocked", "breakdown", "rework", "completed"] as const;
export type ExecutionState = typeof executionStates[number];

export const entryReasons = ["normal", "rework", "trial", "external_operation", "resumed"] as const;
export type EntryReason = typeof entryReasons[number];

export const priorityLevels = ["normal", "high", "critical"] as const;
export type PriorityLevel = typeof priorityLevels[number];

export const qualityResults = ["pending", "pass", "conditional_pass", "fail"] as const;
export type QualityResult = typeof qualityResults[number];

export const supplyStates = ["ready", "usable", "qa_pending", "rejected"] as const;
export type SupplyState = typeof supplyStates[number];

export const platformTenants = pgTable("platform_tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  industryType: varchar("industry_type", { length: 80 }),
  status: varchar("status", { length: 24 }).notNull().default("draft"),
  defaultTimezone: varchar("default_timezone", { length: 80 }).notNull().default("UTC"),
  defaultLocale: varchar("default_locale", { length: 20 }).notNull().default("en"),
  subscriptionTier: varchar("subscription_tier", { length: 40 }).default("starter"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("platform_tenants_code_idx").on(table.code),
  index("platform_tenants_status_idx").on(table.status),
]);

export const platformCompanies = pgTable("platform_companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id).notNull(),
  legalName: varchar("legal_name", { length: 200 }).notNull(),
  displayName: varchar("display_name", { length: 160 }).notNull(),
  registrationNumber: varchar("registration_number", { length: 80 }),
  taxId: varchar("tax_id", { length: 80 }),
  status: varchar("status", { length: 24 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("platform_companies_tenant_idx").on(table.tenantId),
  index("platform_companies_status_idx").on(table.status),
]);

export const platformPlants = pgTable("platform_plants", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id).notNull(),
  companyId: uuid("company_id").references(() => platformCompanies.id),
  name: varchar("name", { length: 160 }).notNull(),
  code: varchar("code", { length: 40 }).notNull(),
  location: text("location"),
  timezone: varchar("timezone", { length: 80 }).notNull().default("UTC"),
  status: varchar("status", { length: 24 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("platform_plants_tenant_idx").on(table.tenantId),
  index("platform_plants_company_idx").on(table.companyId),
  index("platform_plants_code_idx").on(table.code),
]);

export const platformAreas = pgTable("platform_areas", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id).notNull(),
  plantId: uuid("plant_id").references(() => platformPlants.id).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  code: varchar("code", { length: 40 }).notNull(),
  areaType: varchar("area_type", { length: 50 }).notNull().default("production"),
  status: varchar("status", { length: 24 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("platform_areas_tenant_idx").on(table.tenantId),
  index("platform_areas_plant_idx").on(table.plantId),
]);

export const platformDepartments = pgTable("platform_departments", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id).notNull(),
  plantId: uuid("plant_id").references(() => platformPlants.id),
  name: varchar("name", { length: 160 }).notNull(),
  code: varchar("code", { length: 40 }).notNull(),
  functionType: varchar("function_type", { length: 60 }).notNull().default("production"),
  status: varchar("status", { length: 24 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("platform_departments_tenant_idx").on(table.tenantId),
  index("platform_departments_plant_idx").on(table.plantId),
]);

export const platformLines = pgTable("platform_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id).notNull(),
  plantId: uuid("plant_id").references(() => platformPlants.id).notNull(),
  areaId: uuid("area_id").references(() => platformAreas.id),
  name: varchar("name", { length: 160 }).notNull(),
  code: varchar("code", { length: 40 }).notNull(),
  lineType: varchar("line_type", { length: 40 }).notNull().default("discrete"),
  status: varchar("status", { length: 24 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("platform_lines_tenant_idx").on(table.tenantId),
  index("platform_lines_plant_idx").on(table.plantId),
  index("platform_lines_area_idx").on(table.areaId),
]);

export const platformWorkCenters = pgTable("platform_work_centers", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id).notNull(),
  plantId: uuid("plant_id").references(() => platformPlants.id).notNull(),
  lineId: uuid("line_id").references(() => platformLines.id),
  name: varchar("name", { length: 160 }).notNull(),
  code: varchar("code", { length: 40 }).notNull(),
  workCenterType: varchar("work_center_type", { length: 60 }).notNull().default("manual_station"),
  status: varchar("status", { length: 24 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("platform_work_centers_tenant_idx").on(table.tenantId),
  index("platform_work_centers_plant_idx").on(table.plantId),
  index("platform_work_centers_line_idx").on(table.lineId),
]);

export const platformUsers = pgTable("platform_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id).notNull(),
  email: varchar("email", { length: 180 }).notNull(),
  displayName: varchar("display_name", { length: 160 }).notNull(),
  userType: varchar("user_type", { length: 40 }).notNull().default("internal"),
  status: varchar("status", { length: 30 }).notNull().default("invited"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("platform_users_tenant_idx").on(table.tenantId),
  index("platform_users_email_idx").on(table.email),
  index("platform_users_status_idx").on(table.status),
]);

export const platformRoles = pgTable("platform_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id),
  name: varchar("name", { length: 120 }).notNull(),
  code: varchar("code", { length: 80 }).notNull(),
  description: text("description"),
  roleType: varchar("role_type", { length: 24 }).notNull().default("custom"),
  status: varchar("status", { length: 24 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("platform_roles_tenant_idx").on(table.tenantId),
  index("platform_roles_code_idx").on(table.code),
]);

export const platformPermissions = pgTable("platform_permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  module: varchar("module", { length: 60 }).notNull(),
  resource: varchar("resource", { length: 80 }).notNull(),
  action: varchar("action", { length: 60 }).notNull(),
  code: varchar("code", { length: 140 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("platform_permissions_code_idx").on(table.code),
  index("platform_permissions_module_idx").on(table.module),
]);

export const platformRolePermissions = pgTable("platform_role_permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id),
  roleId: uuid("role_id").references(() => platformRoles.id).notNull(),
  permissionId: uuid("permission_id").references(() => platformPermissions.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("platform_role_permissions_role_idx").on(table.roleId),
  index("platform_role_permissions_permission_idx").on(table.permissionId),
]);

export const platformUserRoleAssignments = pgTable("platform_user_role_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id).notNull(),
  userId: uuid("user_id").references(() => platformUsers.id).notNull(),
  roleId: uuid("role_id").references(() => platformRoles.id).notNull(),
  scopeType: varchar("scope_type", { length: 40 }).notNull().default("tenant"),
  scopeId: uuid("scope_id"),
  status: varchar("status", { length: 24 }).notNull().default("active"),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("platform_user_role_assignments_tenant_idx").on(table.tenantId),
  index("platform_user_role_assignments_user_idx").on(table.userId),
  index("platform_user_role_assignments_role_idx").on(table.roleId),
]);

export const platformAuditEvents = pgTable("platform_audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id),
  actorUserId: uuid("actor_user_id").references(() => platformUsers.id),
  actorType: varchar("actor_type", { length: 30 }).notNull().default("user"),
  module: varchar("module", { length: 60 }).notNull(),
  eventType: varchar("event_type", { length: 120 }).notNull(),
  entityType: varchar("entity_type", { length: 80 }).notNull(),
  entityId: uuid("entity_id"),
  action: varchar("action", { length: 60 }).notNull(),
  beforeSnapshot: jsonb("before_snapshot"),
  afterSnapshot: jsonb("after_snapshot"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("platform_audit_events_tenant_idx").on(table.tenantId),
  index("platform_audit_events_actor_idx").on(table.actorUserId),
  index("platform_audit_events_entity_idx").on(table.entityType, table.entityId),
  index("platform_audit_events_event_type_idx").on(table.eventType),
]);

export const configurableObjectTypes = pgTable("configurable_object_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id),
  moduleKey: varchar("module_key", { length: 60 }).notNull(),
  objectType: varchar("object_type", { length: 80 }).notNull(),
  displayName: varchar("display_name", { length: 120 }).notNull(),
  description: text("description"),
  isSystem: boolean("is_system").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("configurable_object_types_tenant_idx").on(table.tenantId),
  index("configurable_object_types_object_idx").on(table.objectType),
]);

export const customFieldDefinitions = pgTable("custom_field_definitions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id),
  objectType: varchar("object_type", { length: 80 }).notNull(),
  fieldKey: varchar("field_key", { length: 100 }).notNull(),
  fieldLabel: varchar("field_label", { length: 140 }).notNull(),
  fieldType: varchar("field_type", { length: 40 }).notNull(),
  description: text("description"),
  isRequired: boolean("is_required").default(false),
  isUnique: boolean("is_unique").default(false),
  isActive: boolean("is_active").default(true),
  defaultValue: jsonb("default_value"),
  validationRules: jsonb("validation_rules"),
  visibilityRules: jsonb("visibility_rules"),
  editabilityRules: jsonb("editability_rules"),
  displayOrder: integer("display_order").default(0),
  createdBy: uuid("created_by").references(() => platformUsers.id),
  updatedBy: uuid("updated_by").references(() => platformUsers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("custom_field_definitions_tenant_idx").on(table.tenantId),
  index("custom_field_definitions_object_idx").on(table.objectType),
  index("custom_field_definitions_key_idx").on(table.fieldKey),
]);

export const customFieldOptions = pgTable("custom_field_options", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id),
  fieldId: uuid("field_id").references(() => customFieldDefinitions.id).notNull(),
  optionValue: varchar("option_value", { length: 100 }).notNull(),
  optionLabel: varchar("option_label", { length: 140 }).notNull(),
  color: varchar("color", { length: 40 }),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("custom_field_options_field_idx").on(table.fieldId),
]);

export const customFieldValues = pgTable("custom_field_values", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id),
  objectType: varchar("object_type", { length: 80 }).notNull(),
  recordId: uuid("record_id").notNull(),
  fieldId: uuid("field_id").references(() => customFieldDefinitions.id).notNull(),
  valueText: text("value_text"),
  valueNumber: decimal("value_number", { precision: 18, scale: 6 }),
  valueBoolean: boolean("value_boolean"),
  valueDate: timestamp("value_date"),
  valueJson: jsonb("value_json"),
  createdBy: uuid("created_by").references(() => platformUsers.id),
  updatedBy: uuid("updated_by").references(() => platformUsers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("custom_field_values_record_idx").on(table.objectType, table.recordId),
  index("custom_field_values_field_idx").on(table.fieldId),
]);

export const workflowDefinitions = pgTable("workflow_definitions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id),
  moduleKey: varchar("module_key", { length: 60 }).notNull(),
  objectType: varchar("object_type", { length: 80 }).notNull(),
  workflowKey: varchar("workflow_key", { length: 100 }).notNull(),
  workflowName: varchar("workflow_name", { length: 140 }).notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(false),
  isSystem: boolean("is_system").default(false),
  createdBy: uuid("created_by").references(() => platformUsers.id),
  updatedBy: uuid("updated_by").references(() => platformUsers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("workflow_definitions_tenant_idx").on(table.tenantId),
  index("workflow_definitions_object_idx").on(table.objectType),
]);

export const workflowStates = pgTable("workflow_states", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id),
  workflowId: uuid("workflow_id").references(() => workflowDefinitions.id).notNull(),
  stateCode: varchar("state_code", { length: 80 }).notNull(),
  stateName: varchar("state_name", { length: 120 }).notNull(),
  stateCategory: varchar("state_category", { length: 40 }).notNull().default("active"),
  color: varchar("color", { length: 40 }).default("slate"),
  isInitial: boolean("is_initial").default(false),
  isTerminal: boolean("is_terminal").default(false),
  allowsEditing: boolean("allows_editing").default(true),
  allowsDeletion: boolean("allows_deletion").default(false),
  requiresOwner: boolean("requires_owner").default(false),
  slaHours: integer("sla_hours"),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("workflow_states_workflow_idx").on(table.workflowId),
]);

export const workflowTransitions = pgTable("workflow_transitions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id),
  workflowId: uuid("workflow_id").references(() => workflowDefinitions.id).notNull(),
  fromStateId: uuid("from_state_id").references(() => workflowStates.id).notNull(),
  toStateId: uuid("to_state_id").references(() => workflowStates.id).notNull(),
  transitionCode: varchar("transition_code", { length: 100 }).notNull(),
  transitionName: varchar("transition_name", { length: 140 }).notNull(),
  requiredPermission: varchar("required_permission", { length: 160 }),
  requiredRole: varchar("required_role", { length: 100 }),
  requiresComment: boolean("requires_comment").default(false),
  requiresApproval: boolean("requires_approval").default(false),
  requiresEsignature: boolean("requires_esignature").default(false),
  validationRules: jsonb("validation_rules"),
  auditSeverity: varchar("audit_severity", { length: 30 }).default("normal"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("workflow_transitions_workflow_idx").on(table.workflowId),
  index("workflow_transitions_from_idx").on(table.fromStateId),
  index("workflow_transitions_to_idx").on(table.toStateId),
]);

export const workflowInstances = pgTable("workflow_instances", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id),
  workflowId: uuid("workflow_id").references(() => workflowDefinitions.id).notNull(),
  objectType: varchar("object_type", { length: 80 }).notNull(),
  recordId: uuid("record_id").notNull(),
  currentStateId: uuid("current_state_id").references(() => workflowStates.id).notNull(),
  ownerUserId: uuid("owner_user_id").references(() => platformUsers.id),
  status: varchar("status", { length: 30 }).notNull().default("active"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("workflow_instances_record_idx").on(table.objectType, table.recordId),
  index("workflow_instances_workflow_idx").on(table.workflowId),
]);

export const workflowHistory = pgTable("workflow_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id),
  workflowInstanceId: uuid("workflow_instance_id").references(() => workflowInstances.id).notNull(),
  transitionId: uuid("transition_id").references(() => workflowTransitions.id),
  fromStateId: uuid("from_state_id").references(() => workflowStates.id),
  toStateId: uuid("to_state_id").references(() => workflowStates.id).notNull(),
  performedBy: uuid("performed_by").references(() => platformUsers.id),
  performedAt: timestamp("performed_at").defaultNow().notNull(),
  comment: text("comment"),
  approvalId: uuid("approval_id"),
  metadata: jsonb("metadata"),
}, (table) => [
  index("workflow_history_instance_idx").on(table.workflowInstanceId),
]);

export const workOrderStatuses = ["draft", "released", "in_progress", "quality_hold", "completed", "cancelled"] as const;
export type WorkOrderStatus = typeof workOrderStatuses[number];

export const mesWorkOrders = pgTable("mes_work_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id).notNull(),
  workOrderNumber: varchar("work_order_number", { length: 80 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description"),
  productCode: varchar("product_code", { length: 80 }),
  productName: varchar("product_name", { length: 180 }),
  plannedQuantity: decimal("planned_quantity", { precision: 14, scale: 3 }).notNull().default("1"),
  completedQuantity: decimal("completed_quantity", { precision: 14, scale: 3 }).notNull().default("0"),
  unit: varchar("unit", { length: 24 }).notNull().default("ea"),
  priority: varchar("priority", { length: 20 }).notNull().default("normal"),
  status: varchar("status", { length: 30 }).notNull().default("draft"),
  plannedStartAt: timestamp("planned_start_at"),
  plannedEndAt: timestamp("planned_end_at"),
  releasedAt: timestamp("released_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  customFields: jsonb("custom_fields"),
  createdBy: uuid("created_by").references(() => platformUsers.id),
  updatedBy: uuid("updated_by").references(() => platformUsers.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("mes_work_orders_tenant_idx").on(table.tenantId),
  index("mes_work_orders_number_idx").on(table.tenantId, table.workOrderNumber),
  index("mes_work_orders_status_idx").on(table.tenantId, table.status),
  index("mes_work_orders_priority_idx").on(table.tenantId, table.priority),
]);

export const hrmsEmployeeProfiles = pgTable("hrms_employee_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id).notNull(),
  employeeCode: varchar("employee_code", { length: 80 }).notNull(),
  displayName: varchar("display_name", { length: 180 }).notNull(),
  employeeType: varchar("employee_type", { length: 40 }).notNull().default("internal"),
  status: varchar("status", { length: 40 }).notNull().default("active"),
  email: varchar("email", { length: 180 }),
  joiningDate: timestamp("joining_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("hrms_employees_tenant_idx").on(table.tenantId),
  index("hrms_employees_code_idx").on(table.tenantId, table.employeeCode),
]);

export const hrmsSkillCatalog = pgTable("hrms_skill_catalog", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id).notNull(),
  skillCode: varchar("skill_code", { length: 80 }).notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  category: varchar("category", { length: 80 }),
  active: boolean("active").notNull().default(true),
});

export const hrmsEmployeeSkills = pgTable("hrms_employee_skills", {
  id: uuid("id").defaultRandom().primaryKey(),
  employeeId: uuid("employee_id").references(() => hrmsEmployeeProfiles.id).notNull(),
  skillId: uuid("skill_id").references(() => hrmsSkillCatalog.id).notNull(),
  proficiencyLevel: varchar("proficiency_level", { length: 40 }).notNull().default("beginner"),
});

export const hrmsShiftCalendars = pgTable("hrms_shift_calendars", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id).notNull(),
  shiftCode: varchar("shift_code", { length: 40 }).notNull(),
  name: varchar("name", { length: 180 }).notNull(),
  startTime: varchar("start_time", { length: 10 }).notNull(),
  endTime: varchar("end_time", { length: 10 }).notNull(),
  active: boolean("active").notNull().default(true),
});

export const hrmsShiftAssignments = pgTable("hrms_shift_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").references(() => platformTenants.id).notNull(),
  shiftCalendarId: uuid("shift_calendar_id").references(() => hrmsShiftCalendars.id).notNull(),
  shiftDate: timestamp("shift_date").notNull(),
  employeeId: uuid("employee_id").references(() => hrmsEmployeeProfiles.id).notNull(),
  status: varchar("status", { length: 40 }).notNull().default("assigned"),
});

// KIT INVENTORY (Process-driven, one kit = one row)
export const kit_inventory = pgTable("kit_inventory", {
  id: serial("id").primaryKey(),
  kit_code: varchar("kit_code", { length: 50 }).notNull().unique(), // KIT-{PROCESS_CODE}-{YYYYMMDD}-{SEQ}
  process_id: integer("process_id").references(() => processes.id).notNull(),
  kit_type: varchar("kit_type", { length: 20 }).notNull(), // KIT or GLASS
  status: varchar("status", { length: 20 }).notNull().default("AVAILABLE"), // AVAILABLE or CONSUMED
  photo_url: text("photo_url").notNull(), // Mandatory photo at creation
  created_by: varchar("created_by", { length: 100 }).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  consumed_by: varchar("consumed_by", { length: 100 }),
  consumed_at: timestamp("consumed_at"),
  process_instance_id: integer("process_instance_id"), // Link to manufacturing execution
}, (table) => [
  index("kit_inventory_process_idx").on(table.process_id),
  index("kit_inventory_status_idx").on(table.status),
  index("kit_inventory_kit_type_idx").on(table.kit_type),
]);

// RESIN LOT INVENTORY (Shared, not tied to single process)
export const resin_lot_inventory = pgTable("resin_lot_inventory", {
  id: serial("id").primaryKey(),
  resin_code: varchar("resin_code", { length: 50 }).notNull().unique(), // RESIN-{YYYYMMDD}-{SEQ}
  available_count: integer("available_count").notNull().default(1),
  photo_url: text("photo_url").notNull(),
  created_by: varchar("created_by", { length: 100 }).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("resin_lot_available_idx").on(table.available_count),
]);

// RESIN CONSUMPTION LOG (Tracks resin usage)
export const resin_consumption = pgTable("resin_consumption", {
  id: serial("id").primaryKey(),
  resin_lot_id: integer("resin_lot_id").references(() => resin_lot_inventory.id).notNull(),
  process_id: integer("process_id").references(() => processes.id).notNull(),
  process_instance_id: integer("process_instance_id"),
  consumed_by: varchar("consumed_by", { length: 100 }).notNull(),
  consumed_at: timestamp("consumed_at").defaultNow().notNull(),
}, (table) => [
  index("resin_consumption_resin_idx").on(table.resin_lot_id),
  index("resin_consumption_process_idx").on(table.process_id),
]);

// LEGACY TABLES REMOVED (material_master, process_execution, kits, etc.)
// See migration plan for details.

export const moulds = pgTable("moulds", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("available"),
  currentPartId: integer("current_part_id"),
  lastBreakdownAt: timestamp("last_breakdown_at"),
  totalDowntimeMinutes: integer("total_downtime_minutes").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mouldEvents = pgTable("mould_events", {
  id: serial("id").primaryKey(),
  mouldId: integer("mould_id").references(() => moulds.id).notNull(),
  eventType: varchar("event_type", { length: 20 }).notNull(),
  reason: text("reason"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  downtimeMinutes: integer("downtime_minutes"),
  recordedById: integer("recorded_by_id").references(() => employees.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("mould_events_mould_id_idx").on(table.mouldId),
]);

export const batches = pgTable("batches", {
  id: serial("id").primaryKey(),
  batchNumber: varchar("batch_number", { length: 50 }).notNull().unique(),
  operationType: varchar("operation_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  mouldId: integer("mould_id").references(() => moulds.id),
  stepId: integer("step_id").references(() => processSteps.id),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const batchParts = pgTable("batch_parts", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").references(() => batches.id).notNull(),
  partId: integer("part_id").references(() => parts.id).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
}, (table) => [
  index("batch_parts_batch_id_idx").on(table.batchId),
  index("batch_parts_part_id_idx").on(table.partId),
]);

export const supplyLots = pgTable("supply_lots", {
  id: serial("id").primaryKey(),
  lotNumber: varchar("lot_number", { length: 50 }).notNull().unique(),
  materialType: varchar("material_type", { length: 100 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  state: varchar("state", { length: 20 }).notNull().default("ready"),
  qaStatus: varchar("qa_status", { length: 20 }),
  rejectionReason: text("rejection_reason"),
  curingEndTime: timestamp("curing_end_time"),
  expiryDate: timestamp("expiry_date"),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("supply_lots_state_idx").on(table.state),
]);

export const supplyRequirements = pgTable("supply_requirements", {
  id: serial("id").primaryKey(),
  stepId: integer("step_id").references(() => processSteps.id).notNull(),
  materialType: varchar("material_type", { length: 100 }).notNull(),
  quantityRequired: decimal("quantity_required", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  isMandatory: boolean("is_mandatory").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("supply_requirements_step_id_idx").on(table.stepId),
]);

export const processCategories = ["inventory", "prefabricated", "moulding", "finishing"] as const;
export type ProcessCategory = typeof processCategories[number];

export const processes = pgTable("processes", {
  id: serial("id").primaryKey(),
  processNumber: integer("process_number").notNull().unique(),
  code: varchar("code", { length: 20 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 20 }).notNull().default("prefabricated"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("processes_category_idx").on(table.category),
]);

export const processSteps = pgTable("process_steps", {
  id: serial("id").primaryKey(),
  processId: integer("process_id").references(() => processes.id).notNull(),
  stepNumber: varchar("step_number", { length: 20 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  sequence: integer("sequence").notNull(),
  targetCycleTime: integer("target_cycle_time"),
  isInspection: boolean("is_inspection").default(false),
  isStorage: boolean("is_storage").default(false),
  requiresMould: boolean("requires_mould").default(false),
  isBatchable: boolean("is_batchable").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("process_steps_process_id_idx").on(table.processId),
]);

export const controlCheckpoints = pgTable("control_checkpoints", {
  id: serial("id").primaryKey(),
  stepId: integer("step_id").references(() => processSteps.id).notNull(),
  processStep: varchar("process_step", { length: 50 }), // e.g., "40.01", "40.04"
  name: text("name"), // Checkpoint name/description
  characteristic: varchar("characteristic", { length: 200 }).notNull(), // Legacy field, keep for compatibility
  specification: text("specification"),
  tolerance: varchar("tolerance", { length: 100 }),
  measurementMethod: varchar("measurement_method", { length: 200 }),
  method: varchar("method", { length: 200 }), // New field for method description
  frequency: varchar("frequency", { length: 100 }),
  measuredBy: varchar("measured_by", { length: 50 }), // Legacy field
  verifiedBy: varchar("verified_by", { length: 50 }), // "QA", "Prod", "prod/QA"
  requiresQaValidation: boolean("requires_qa_validation").default(false), // Computed: true if verifiedBy = "QA" or "prod/QA"
  sampleSize: varchar("sample_size", { length: 100 }),
  reactionPlan: text("reaction_plan"),
  sequence: integer("sequence").notNull(),
  isGating: boolean("is_gating").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("checkpoints_step_id_idx").on(table.stepId),
]);

export const parts = pgTable("parts", {
  id: serial("id").primaryKey(),
  partNumber: varchar("part_number", { length: 50 }).notNull().unique(),
  processId: integer("process_id").references(() => processes.id).notNull(),
  bladeType: varchar("blade_type", { length: 100 }),
  status: varchar("status", { length: 20 }).notNull().default("in_progress"),
  priority: varchar("priority", { length: 20 }).notNull().default("normal"),
  entryReason: varchar("entry_reason", { length: 30 }).default("normal"),
  entryStepId: integer("entry_step_id").references(() => processSteps.id),
  entryNotes: text("entry_notes"),
  currentStepId: integer("current_step_id").references(() => processSteps.id),
  currentMouldId: integer("current_mould_id").references(() => moulds.id),
  currentBatchId: integer("current_batch_id").references(() => batches.id),
  blockedReason: text("blocked_reason"),
  blockedAt: timestamp("blocked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("parts_part_number_idx").on(table.partNumber),
  index("parts_process_id_idx").on(table.processId),
  index("parts_priority_idx").on(table.priority),
  index("parts_status_idx").on(table.status),
]);

export const partStepInstances = pgTable("part_step_instances", {
  id: serial("id").primaryKey(),
  partId: integer("part_id").references(() => parts.id).notNull(),
  stepId: integer("step_id").references(() => processSteps.id).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("planned"),
  previousStatus: varchar("previous_status", { length: 20 }),
  priority: varchar("priority", { length: 20 }).default("normal"),
  mouldId: integer("mould_id").references(() => moulds.id),
  batchId: integer("batch_id").references(() => batches.id),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  plannedStartAt: timestamp("planned_start_at"),
  elapsedMinutes: integer("elapsed_minutes").default(0),
  waitingReason: text("waiting_reason"),
  blockedReason: text("blocked_reason"),
  breakdownReason: text("breakdown_reason"),
  pauseReason: text("pause_reason"),
  lastStateChangeAt: timestamp("last_state_change_at"),
  isDeferred: boolean("is_deferred").default(false),
  deferredReason: text("deferred_reason"),
  deferredOriginalTime: timestamp("deferred_original_time"),
  qaApproved: boolean("qa_approved").default(false),
  qaApprovedAt: timestamp("qa_approved_at"),
  qaApprovedBy: integer("qa_approved_by").references(() => employees.id),
  assignedEmployeeId: integer("assigned_employee_id").references(() => employees.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("step_instances_part_id_idx").on(table.partId),
  index("step_instances_step_id_idx").on(table.stepId),
  index("step_instances_status_idx").on(table.status),
  index("step_instances_mould_id_idx").on(table.mouldId),
]);

export const stateTransitions = pgTable("state_transitions", {
  id: serial("id").primaryKey(),
  instanceId: integer("instance_id").references(() => partStepInstances.id).notNull(),
  fromState: varchar("from_state", { length: 20 }),
  toState: varchar("to_state", { length: 20 }).notNull(),
  reason: text("reason"),
  triggeredById: integer("triggered_by_id").references(() => employees.id),
  triggeredAt: timestamp("triggered_at").defaultNow().notNull(),
  isAutomatic: boolean("is_automatic").default(false),
}, (table) => [
  index("state_transitions_instance_id_idx").on(table.instanceId),
]);

export const shiftLogs = pgTable("shift_logs", {
  id: serial("id").primaryKey(),
  instanceId: integer("instance_id").references(() => partStepInstances.id).notNull(),
  shiftCode: varchar("shift_code", { length: 20 }).notNull(),
  shiftDate: timestamp("shift_date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  crewMembers: jsonb("crew_members").$type<number[]>(),
  elapsedMinutes: integer("elapsed_minutes").default(0),
  handoverNotes: text("handover_notes"),
  isOfflineEntry: boolean("is_offline_entry").default(false),
  offlineReason: text("offline_reason"),
  recordedById: integer("recorded_by_id").references(() => employees.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("shift_logs_instance_id_idx").on(table.instanceId),
  index("shift_logs_shift_date_idx").on(table.shiftDate),
]);

export const checkpointResults = pgTable("checkpoint_results", {
  id: serial("id").primaryKey(),
  instanceId: integer("instance_id").references(() => partStepInstances.id).notNull(),
  checkpointId: integer("checkpoint_id").references(() => controlCheckpoints.id).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  qaResult: varchar("qa_result", { length: 20 }).default("pending"),
  measuredValue: text("measured_value"),
  measuredById: integer("measured_by_id").references(() => employees.id),
  measuredAt: timestamp("measured_at"),
  qaConfirmedById: integer("qa_confirmed_by_id").references(() => employees.id),
  qaConfirmedAt: timestamp("qa_confirmed_at"),
  deviationNumber: varchar("deviation_number", { length: 50 }),
  deviationApprovedById: integer("deviation_approved_by_id").references(() => employees.id),
  deviationApprovedAt: timestamp("deviation_approved_at"),
  isGatePassed: boolean("is_gate_passed").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("checkpoint_results_instance_id_idx").on(table.instanceId),
  index("checkpoint_results_qa_result_idx").on(table.qaResult),
]);

export const reworkEvents = pgTable("rework_events", {
  id: serial("id").primaryKey(),
  partId: integer("part_id").references(() => parts.id).notNull(),
  fromStepId: integer("from_step_id").references(() => processSteps.id).notNull(),
  toStepId: integer("to_step_id").references(() => processSteps.id).notNull(),
  reason: text("reason").notNull(),
  defectDescription: text("defect_description"),
  initiatedById: integer("initiated_by_id").references(() => employees.id),
  approvedById: integer("approved_by_id").references(() => employees.id),
  initiatedAt: timestamp("initiated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("rework_events_part_id_idx").on(table.partId),
]);

export const timelineEvents = pgTable("timeline_events", {
  id: serial("id").primaryKey(),
  partId: integer("part_id").references(() => parts.id).notNull(),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  eventData: jsonb("event_data"),
  instanceId: integer("instance_id").references(() => partStepInstances.id),
  stepId: integer("step_id").references(() => processSteps.id),
  description: text("description"),
  recordedById: integer("recorded_by_id").references(() => employees.id),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("timeline_events_part_id_idx").on(table.partId),
  index("timeline_events_occurred_at_idx").on(table.occurredAt),
]);

export const evidenceFiles = pgTable("evidence_files", {
  id: serial("id").primaryKey(),
  resultId: integer("result_id").references(() => checkpointResults.id).notNull(),
  storageKey: varchar("storage_key", { length: 500 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileType: varchar("file_type", { length: 50 }),
  fileSize: integer("file_size"),
  capturedById: integer("captured_by_id").references(() => employees.id),
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("evidence_files_result_id_idx").on(table.resultId),
]);

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  employeeCode: varchar("employee_code", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  role: varchar("role", { length: 50 }).notNull(),
  department: varchar("department", { length: 50 }),
  skills: jsonb("skills").$type<string[]>(),
  email: varchar("email", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  isActive: boolean("is_active").default(true),
  currentShift: varchar("current_shift", { length: 20 }),
  auth_user_id: uuid("auth_user_id").unique(), // Links to Supabase auth.users.id
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("employees_code_idx").on(table.employeeCode),
  index("employees_auth_user_id_idx").on(table.auth_user_id),
]);

export const employeeAssignments = pgTable("employee_assignments", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  instanceId: integer("instance_id").references(() => partStepInstances.id),
  shiftLogId: integer("shift_log_id").references(() => shiftLogs.id),
  role: varchar("role", { length: 50 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("assignments_employee_id_idx").on(table.employeeId),
  index("assignments_instance_id_idx").on(table.instanceId),
]);

export const employeeStatusHistory = pgTable("employee_status_history", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => employees.id).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  reason: text("reason"),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
}, (table) => [
  index("status_history_employee_id_idx").on(table.employeeId),
]);

export const mouldsRelations = relations(moulds, ({ many }) => ({
  events: many(mouldEvents),
  batches: many(batches),
  stepInstances: many(partStepInstances),
}));

export const mouldEventsRelations = relations(mouldEvents, ({ one }) => ({
  mould: one(moulds, { fields: [mouldEvents.mouldId], references: [moulds.id] }),
  recordedBy: one(employees, { fields: [mouldEvents.recordedById], references: [employees.id] }),
}));

export const batchesRelations = relations(batches, ({ one, many }) => ({
  mould: one(moulds, { fields: [batches.mouldId], references: [moulds.id] }),
  step: one(processSteps, { fields: [batches.stepId], references: [processSteps.id] }),
  batchParts: many(batchParts),
}));

export const batchPartsRelations = relations(batchParts, ({ one }) => ({
  batch: one(batches, { fields: [batchParts.batchId], references: [batches.id] }),
  part: one(parts, { fields: [batchParts.partId], references: [parts.id] }),
}));

export const supplyLotsRelations = relations(supplyLots, ({ many }) => ({
  requirements: many(supplyRequirements),
}));

export const supplyRequirementsRelations = relations(supplyRequirements, ({ one }) => ({
  step: one(processSteps, { fields: [supplyRequirements.stepId], references: [processSteps.id] }),
}));

export const processesRelations = relations(processes, ({ many }) => ({
  steps: many(processSteps),
  parts: many(parts),
}));

export const processStepsRelations = relations(processSteps, ({ one, many }) => ({
  process: one(processes, { fields: [processSteps.processId], references: [processes.id] }),
  checkpoints: many(controlCheckpoints),
  instances: many(partStepInstances),
  supplyRequirements: many(supplyRequirements),
}));

export const controlCheckpointsRelations = relations(controlCheckpoints, ({ one, many }) => ({
  step: one(processSteps, { fields: [controlCheckpoints.stepId], references: [processSteps.id] }),
  results: many(checkpointResults),
}));

export const partsRelations = relations(parts, ({ one, many }) => ({
  process: one(processes, { fields: [parts.processId], references: [processes.id] }),
  entryStep: one(processSteps, { fields: [parts.entryStepId], references: [processSteps.id] }),
  currentStep: one(processSteps, { fields: [parts.currentStepId], references: [processSteps.id] }),
  currentMould: one(moulds, { fields: [parts.currentMouldId], references: [moulds.id] }),
  currentBatch: one(batches, { fields: [parts.currentBatchId], references: [batches.id] }),
  stepInstances: many(partStepInstances),
  reworkEvents: many(reworkEvents),
  timelineEvents: many(timelineEvents),
  batchParts: many(batchParts),
  kitInventoryItems: many(kit_inventory),
  resinConsumptions: many(resin_consumption),
}));

export const partStepInstancesRelations = relations(partStepInstances, ({ one, many }) => ({
  part: one(parts, { fields: [partStepInstances.partId], references: [parts.id] }),
  step: one(processSteps, { fields: [partStepInstances.stepId], references: [processSteps.id] }),
  mould: one(moulds, { fields: [partStepInstances.mouldId], references: [moulds.id] }),
  batch: one(batches, { fields: [partStepInstances.batchId], references: [batches.id] }),
  assignedEmployee: one(employees, { fields: [partStepInstances.assignedEmployeeId], references: [employees.id] }),
  qaApprovedByEmployee: one(employees, { fields: [partStepInstances.qaApprovedBy], references: [employees.id] }),
  checkpointResults: many(checkpointResults),
  assignments: many(employeeAssignments),
  stateTransitions: many(stateTransitions),
  shiftLogs: many(shiftLogs),
  timelineEvents: many(timelineEvents),
}));

export const stateTransitionsRelations = relations(stateTransitions, ({ one }) => ({
  instance: one(partStepInstances, { fields: [stateTransitions.instanceId], references: [partStepInstances.id] }),
  triggeredBy: one(employees, { fields: [stateTransitions.triggeredById], references: [employees.id] }),
}));

export const shiftLogsRelations = relations(shiftLogs, ({ one, many }) => ({
  instance: one(partStepInstances, { fields: [shiftLogs.instanceId], references: [partStepInstances.id] }),
  recordedBy: one(employees, { fields: [shiftLogs.recordedById], references: [employees.id] }),
  assignments: many(employeeAssignments),
}));

export const checkpointResultsRelations = relations(checkpointResults, ({ one, many }) => ({
  instance: one(partStepInstances, { fields: [checkpointResults.instanceId], references: [partStepInstances.id] }),
  checkpoint: one(controlCheckpoints, { fields: [checkpointResults.checkpointId], references: [controlCheckpoints.id] }),
  measuredBy: one(employees, { fields: [checkpointResults.measuredById], references: [employees.id] }),
  qaConfirmedBy: one(employees, { fields: [checkpointResults.qaConfirmedById], references: [employees.id] }),
  deviationApprovedBy: one(employees, { fields: [checkpointResults.deviationApprovedById], references: [employees.id] }),
  evidenceFiles: many(evidenceFiles),
}));

export const reworkEventsRelations = relations(reworkEvents, ({ one }) => ({
  part: one(parts, { fields: [reworkEvents.partId], references: [parts.id] }),
  fromStep: one(processSteps, { fields: [reworkEvents.fromStepId], references: [processSteps.id] }),
  toStep: one(processSteps, { fields: [reworkEvents.toStepId], references: [processSteps.id] }),
  initiatedBy: one(employees, { fields: [reworkEvents.initiatedById], references: [employees.id] }),
  approvedBy: one(employees, { fields: [reworkEvents.approvedById], references: [employees.id] }),
}));

export const timelineEventsRelations = relations(timelineEvents, ({ one }) => ({
  part: one(parts, { fields: [timelineEvents.partId], references: [parts.id] }),
  instance: one(partStepInstances, { fields: [timelineEvents.instanceId], references: [partStepInstances.id] }),
  step: one(processSteps, { fields: [timelineEvents.stepId], references: [processSteps.id] }),
  recordedBy: one(employees, { fields: [timelineEvents.recordedById], references: [employees.id] }),
}));

export const evidenceFilesRelations = relations(evidenceFiles, ({ one }) => ({
  result: one(checkpointResults, { fields: [evidenceFiles.resultId], references: [checkpointResults.id] }),
  capturedBy: one(employees, { fields: [evidenceFiles.capturedById], references: [employees.id] }),
}));

export const employeesRelations = relations(employees, ({ many }) => ({
  assignments: many(employeeAssignments),
  statusHistory: many(employeeStatusHistory),
  stepInstances: many(partStepInstances),
  mouldEvents: many(mouldEvents),
  shiftLogs: many(shiftLogs),
  stateTransitions: many(stateTransitions),
  timelineEvents: many(timelineEvents),
}));

export const employeeAssignmentsRelations = relations(employeeAssignments, ({ one }) => ({
  employee: one(employees, { fields: [employeeAssignments.employeeId], references: [employees.id] }),
  instance: one(partStepInstances, { fields: [employeeAssignments.instanceId], references: [partStepInstances.id] }),
  shiftLog: one(shiftLogs, { fields: [employeeAssignments.shiftLogId], references: [shiftLogs.id] }),
}));

export const employeeStatusHistoryRelations = relations(employeeStatusHistory, ({ one }) => ({
  employee: one(employees, { fields: [employeeStatusHistory.employeeId], references: [employees.id] }),
}));

// KIT INVENTORY RELATIONS (NEW - Process-driven)
export const kitInventoryRelations = relations(kit_inventory, ({ one }) => ({
  process: one(processes, { fields: [kit_inventory.process_id], references: [processes.id] }),
  part: one(parts, { fields: [kit_inventory.process_instance_id], references: [parts.id] }),
}));

// RESIN LOT INVENTORY RELATIONS (NEW - Shared)
export const resinLotInventoryRelations = relations(resin_lot_inventory, ({ many }) => ({
  consumptions: many(resin_consumption),
}));

// RESIN CONSUMPTION RELATIONS (NEW)
export const resinConsumptionRelations = relations(resin_consumption, ({ one }) => ({
  resinLot: one(resin_lot_inventory, { fields: [resin_consumption.resin_lot_id], references: [resin_lot_inventory.id] }),
  process: one(processes, { fields: [resin_consumption.process_id], references: [processes.id] }),
  part: one(parts, { fields: [resin_consumption.process_instance_id], references: [parts.id] }),
}));

// Legacy relations removed.

export const validStateTransitions: Record<ExecutionState, ExecutionState[]> = {
  planned: ["active", "waiting", "blocked"],
  active: ["paused", "waiting", "blocked", "breakdown", "completed"],
  paused: ["active", "waiting", "blocked"],
  waiting: ["active", "blocked"],
  blocked: ["active", "waiting"],
  breakdown: ["active", "waiting"],
  rework: ["active", "completed"],
  completed: ["rework"],
};
