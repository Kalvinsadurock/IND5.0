// =====================================================
// DRIZZLE SCHEMA - ISA-95 REFACTORED
// Purpose: Single source of truth for MES execution
// =====================================================

import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  uuid,
  index,
  decimal,
  primaryKey,
  foreignKey,
  CheckBuilder,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// =====================================================
// EXECUTION STATES (ISA-95 COMPLIANT)
// =====================================================

export const executionStates = [
  "planned",
  "active",
  "paused",
  "waiting",
  "blocked",
  "breakdown",
  "completed",
  "rework",
] as const;
export type ExecutionState = (typeof executionStates)[number];

export const qaStates = [
  "pending",
  "pass",
  "conditional_pass",
  "fail",
] as const;
export type QAState = (typeof qaStates)[number];

export const priorityLevels = ["normal", "high", "critical"] as const;
export type PriorityLevel = (typeof priorityLevels)[number];

export const entryReasons = [
  "normal",
  "rework",
  "trial",
  "external_operation",
  "resumed",
] as const;
export type EntryReason = (typeof entryReasons)[number];

// =====================================================
// MASTER DATA TABLES
// =====================================================

// Processes: Define manufacturing workflows
export const processes = pgTable("processes", {
  id: uuid("id").primaryKey().defaultRandom(),
  processNumber: integer("process_number").notNull().unique(),
  code: varchar("code", { length: 20 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 20 }).notNull().default("prefabricated"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Process Steps: Define sequential steps within a process
export const processSteps = pgTable(
  "process_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    processId: uuid("process_id")
      .notNull()
      .references(() => processes.id),
    stepNumber: varchar("step_number", { length: 20 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    sequence: integer("sequence").notNull(),
    targetCycleTime: integer("target_cycle_time"),
    isInspection: boolean("is_inspection").default(false),
    isStorage: boolean("is_storage").default(false),
    requiresMould: boolean("requires_mould").default(false),
    isBatchable: boolean("is_batchable").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_process_steps_process_id").on(table.processId)]
);

// Control Checkpoints: Quality gates for steps
export const controlCheckpoints = pgTable(
  "control_checkpoints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stepId: uuid("step_id")
      .notNull()
      .references(() => processSteps.id),
    characteristic: varchar("characteristic", { length: 200 }).notNull(),
    specification: text("specification"),
    tolerance: varchar("tolerance", { length: 100 }),
    measurementMethod: varchar("measurement_method", { length: 200 }),
    frequency: varchar("frequency", { length: 100 }),
    measuredBy: varchar("measured_by", { length: 50 }),
    sequence: integer("sequence").notNull(),
    isGating: boolean("is_gating").default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_checkpoints_step_id").on(table.stepId)]
);

// =====================================================
// CORE EXECUTION TABLES (SOURCE OF TRUTH)
// =====================================================

// Parts: Prefabricated blade instances (NO STATUS HERE)
export const parts = pgTable(
  "parts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partNumber: varchar("part_number", { length: 50 }).notNull().unique(),
    processId: uuid("process_id")
      .notNull()
      .references(() => processes.id),
    entryReason: varchar("entry_reason", { length: 30 }).default("normal"),
    priority: varchar("priority", { length: 20 }).notNull().default("normal"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_parts_process_id").on(table.processId),
    index("idx_parts_priority").on(table.priority),
    index("idx_parts_part_number").on(table.partNumber),
  ]
);

// Part Step Instances: CORE EXECUTION TABLE (ISA-95 Work Execution)
export const partStepInstances = pgTable(
  "part_step_instances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partId: uuid("part_id")
      .notNull()
      .references(() => parts.id),
    stepId: uuid("step_id")
      .notNull()
      .references(() => processSteps.id),

    // ✅ ISA-95: Single Source of Truth for Execution
    executionState: text("execution_state")
      .notNull()
      .default("planned"),
    
    // ✅ Quality state (separate from execution)
    qaState: text("qa_state")
      .notNull()
      .default("pending"),

    // ✅ Flexible payload for step-specific parameters
    stepPayload: jsonb("step_payload").$type<Record<string, any>>(),
    
    // ✅ Runtime execution context
    executionContext: jsonb("execution_context").$type<Record<string, any>>(),

    // Timing
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),

    // Metadata
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_execution_state").on(table.executionState),
    index("idx_qa_state").on(table.qaState),
    index("idx_part_execution").on(table.partId, table.executionState),
  ]
);

// Checkpoint Results: QA measurements (SIMPLIFIED)
export const checkpointResults = pgTable(
  "checkpoint_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instanceId: uuid("instance_id")
      .notNull()
      .references(() => partStepInstances.id),
    checkpointId: uuid("checkpoint_id")
      .notNull()
      .references(() => controlCheckpoints.id),

    measuredValue: text("measured_value"),
    
    // ✅ Single QA state field
    qaState: text("qa_state")
      .notNull()
      .default("pending"),

    deviationApproved: boolean("deviation_approved").default(false),
    
    // ✅ Evidence metadata as JSONB
    evidenceMetadata: jsonb("evidence_metadata").$type<{
      fileCount?: number;
      lastEvidenceAt?: string;
    }>(),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_checkpoint_results_instance").on(table.instanceId),
    index("idx_checkpoint_results_qa_state").on(table.qaState),
  ]
);

// =====================================================
// INVENTORY & TRACEABILITY TABLES
// =====================================================

// Inventory Consumption: Track material usage per part
export const inventoryConsumption = pgTable(
  "inventory_consumption",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partId: uuid("part_id")
      .notNull()
      .references(() => parts.id),
    stepInstanceId: uuid("step_instance_id")
      .notNull()
      .references(() => partStepInstances.id),
    supplyLotId: uuid("supply_lot_id")
      .notNull()
      .references(() => supplyLots.id),

    quantityUsed: decimal("quantity_used", { precision: 10, scale: 2 }).notNull(),
    unit: varchar("unit", { length: 20 }).notNull(),

    consumedBy: varchar("consumed_by", { length: 100 }),
    consumedAt: timestamp("consumed_at").defaultNow(),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_consumption_part").on(table.partId),
    index("idx_consumption_step").on(table.stepInstanceId),
    index("idx_consumption_lot").on(table.supplyLotId),
  ]
);

// Supply Lots: Material inventory
export const supplyLots = pgTable(
  "supply_lots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lotNumber: varchar("lot_number", { length: 50 }).notNull().unique(),
    materialType: varchar("material_type", { length: 100 }).notNull(),
    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
    unit: varchar("unit", { length: 20 }).notNull(),
    state: varchar("state", { length: 20 }).notNull().default("ready"),
    qaStatus: varchar("qa_status", { length: 20 }),
    rejectionReason: text("rejection_reason"),
    curingEndTime: timestamp("curing_end_time"),
    expiryDate: timestamp("expiry_date"),
    receivedAt: timestamp("received_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_supply_lots_state").on(table.state)]
);

// Supply Requirements: Step material needs
export const supplyRequirements = pgTable(
  "supply_requirements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stepId: uuid("step_id")
      .notNull()
      .references(() => processSteps.id),
    materialType: varchar("material_type", { length: 100 }).notNull(),
    quantityRequired: decimal("quantity_required", { precision: 10, scale: 2 }).notNull(),
    unit: varchar("unit", { length: 20 }).notNull(),
    isMandatory: boolean("is_mandatory").default(true),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_supply_requirements_step").on(table.stepId)]
);

// =====================================================
// RESOURCE & ASSIGNMENT TABLES
// =====================================================

// Employees
export const employees = pgTable(
  "employees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    employeeCode: varchar("employee_code", { length: 20 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    role: varchar("role", { length: 50 }).notNull(),
    department: varchar("department", { length: 50 }),
    email: varchar("email", { length: 100 }),
    phone: varchar("phone", { length: 20 }),
    isActive: boolean("is_active").default(true),
    currentShift: varchar("current_shift", { length: 20 }),
    authUserId: uuid("auth_user_id").unique(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_employees_code").on(table.employeeCode),
    index("idx_employees_auth_user_id").on(table.authUserId),
  ]
);

// Employee Assignments: Link employees to step executions
export const employeeAssignments = pgTable(
  "employee_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instanceId: uuid("instance_id")
      .notNull()
      .references(() => partStepInstances.id),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id),
    role: varchar("role", { length: 50 }),
    assignedAt: timestamp("assigned_at").defaultNow(),
    endedAt: timestamp("ended_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_assignment_instance").on(table.instanceId),
    index("idx_assignment_employee").on(table.employeeId),
  ]
);

// =====================================================
// AUDIT & HISTORY TABLES
// =====================================================

// State Transitions: Audit trail of execution state changes
export const stateTransitions = pgTable(
  "state_transitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instanceId: uuid("instance_id")
      .notNull()
      .references(() => partStepInstances.id),
    fromState: text("from_state"),
    toState: text("to_state").notNull(),
    reason: text("reason"),
    triggeredById: uuid("triggered_by_id").references(() => employees.id),
    triggeredAt: timestamp("triggered_at").defaultNow(),
    isAutomatic: boolean("is_automatic").default(false),
  },
  (table) => [index("idx_state_transitions_instance").on(table.instanceId)]
);

// Timeline Events: Complete history of all events
export const timelineEvents = pgTable(
  "timeline_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    partId: uuid("part_id")
      .notNull()
      .references(() => parts.id),
    eventType: varchar("event_type", { length: 50 }).notNull(),
    eventData: jsonb("event_data").$type<Record<string, any>>(),
    instanceId: uuid("instance_id").references(() => partStepInstances.id),
    stepId: uuid("step_id").references(() => processSteps.id),
    description: text("description"),
    recordedById: uuid("recorded_by_id").references(() => employees.id),
    occurredAt: timestamp("occurred_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_timeline_events_part").on(table.partId),
    index("idx_timeline_events_occurred_at").on(table.occurredAt),
  ]
);

// Evidence Files: QA evidence storage metadata
export const evidenceFiles = pgTable(
  "evidence_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    resultId: uuid("result_id")
      .notNull()
      .references(() => checkpointResults.id),
    storageKey: varchar("storage_key", { length: 500 }).notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileType: varchar("file_type", { length: 50 }),
    fileSize: integer("file_size"),
    capturedById: uuid("captured_by_id").references(() => employees.id),
    capturedAt: timestamp("captured_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [index("idx_evidence_files_result").on(table.resultId)]
);

// =====================================================
// PLM INTEGRATION TABLES
// =====================================================

// PLM Objects: Track synchronization to external PLM systems
export const plmObjects = pgTable(
  "plm_objects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    plmSystem: varchar("plm_system", { length: 50 }).notNull(),
    plmUid: varchar("plm_uid", { length: 255 }).notNull(),
    plmRevision: varchar("plm_revision", { length: 50 }),
    syncStatus: varchar("sync_status", { length: 20 }).default("pending"),
    lastSyncedAt: timestamp("last_synced_at"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("idx_plm_entity_type").on(table.entityType),
    index("idx_plm_sync_status").on(table.syncStatus),
  ]
);

// PLM Sync Events: Audit trail for PLM synchronization
export const plmSyncEvents = pgTable(
  "plm_sync_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    plmObjectId: uuid("plm_object_id")
      .notNull()
      .references(() => plmObjects.id),
    direction: varchar("direction", { length: 10 }).notNull(),
    payload: jsonb("payload").$type<Record<string, any>>(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    errorDetails: text("error_details"),
    syncedAt: timestamp("synced_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("idx_plm_sync_events_object").on(table.plmObjectId),
    index("idx_plm_sync_direction").on(table.direction),
  ]
);

// =====================================================
// RELATIONS (for Drizzle's relational API)
// =====================================================

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
  step: one(processSteps, {
    fields: [controlCheckpoints.stepId],
    references: [processSteps.id],
  }),
  results: many(checkpointResults),
}));

export const partsRelations = relations(parts, ({ one, many }) => ({
  process: one(processes, { fields: [parts.processId], references: [processes.id] }),
  stepInstances: many(partStepInstances),
  inventoryConsumption: many(inventoryConsumption),
  timelineEvents: many(timelineEvents),
}));

export const partStepInstancesRelations = relations(partStepInstances, ({ one, many }) => ({
  part: one(parts, { fields: [partStepInstances.partId], references: [parts.id] }),
  step: one(processSteps, { fields: [partStepInstances.stepId], references: [processSteps.id] }),
  checkpointResults: many(checkpointResults),
  employeeAssignments: many(employeeAssignments),
  stateTransitions: many(stateTransitions),
  inventoryConsumption: many(inventoryConsumption),
}));

export const checkpointResultsRelations = relations(checkpointResults, ({ one, many }) => ({
  instance: one(partStepInstances, {
    fields: [checkpointResults.instanceId],
    references: [partStepInstances.id],
  }),
  checkpoint: one(controlCheckpoints, {
    fields: [checkpointResults.checkpointId],
    references: [controlCheckpoints.id],
  }),
  evidenceFiles: many(evidenceFiles),
}));

export const employeesRelations = relations(employees, ({ many }) => ({
  assignments: many(employeeAssignments),
  stateTransitions: many(stateTransitions),
  timelineEvents: many(timelineEvents),
  evidenceFiles: many(evidenceFiles),
}));

export const employeeAssignmentsRelations = relations(employeeAssignments, ({ one }) => ({
  instance: one(partStepInstances, {
    fields: [employeeAssignments.instanceId],
    references: [partStepInstances.id],
  }),
  employee: one(employees, {
    fields: [employeeAssignments.employeeId],
    references: [employees.id],
  }),
}));

export const stateTransitionsRelations = relations(stateTransitions, ({ one }) => ({
  instance: one(partStepInstances, {
    fields: [stateTransitions.instanceId],
    references: [partStepInstances.id],
  }),
  triggeredBy: one(employees, {
    fields: [stateTransitions.triggeredById],
    references: [employees.id],
  }),
}));

export const timelineEventsRelations = relations(timelineEvents, ({ one }) => ({
  part: one(parts, { fields: [timelineEvents.partId], references: [parts.id] }),
  instance: one(partStepInstances, {
    fields: [timelineEvents.instanceId],
    references: [partStepInstances.id],
  }),
  step: one(processSteps, { fields: [timelineEvents.stepId], references: [processSteps.id] }),
  recordedBy: one(employees, {
    fields: [timelineEvents.recordedById],
    references: [employees.id],
  }),
}));

export const evidenceFilesRelations = relations(evidenceFiles, ({ one }) => ({
  result: one(checkpointResults, {
    fields: [evidenceFiles.resultId],
    references: [checkpointResults.id],
  }),
  capturedBy: one(employees, {
    fields: [evidenceFiles.capturedById],
    references: [employees.id],
  }),
}));

export const inventoryConsumptionRelations = relations(inventoryConsumption, ({ one }) => ({
  part: one(parts, { fields: [inventoryConsumption.partId], references: [parts.id] }),
  instance: one(partStepInstances, {
    fields: [inventoryConsumption.stepInstanceId],
    references: [partStepInstances.id],
  }),
  supplyLot: one(supplyLots, {
    fields: [inventoryConsumption.supplyLotId],
    references: [supplyLots.id],
  }),
}));

export const plmObjectsRelations = relations(plmObjects, ({ many }) => ({
  syncEvents: many(plmSyncEvents),
}));

export const plmSyncEventsRelations = relations(plmSyncEvents, ({ one }) => ({
  plmObject: one(plmObjects, {
    fields: [plmSyncEvents.plmObjectId],
    references: [plmObjects.id],
  }),
}));

// =====================================================
// TYPE EXPORTS
// =====================================================

export type Process = typeof processes.$inferSelect;
export type InsertProcess = typeof processes.$inferInsert;
export type ProcessStep = typeof processSteps.$inferSelect;
export type InsertProcessStep = typeof processSteps.$inferInsert;
export type Part = typeof parts.$inferSelect;
export type InsertPart = typeof parts.$inferInsert;
export type PartStepInstance = typeof partStepInstances.$inferSelect;
export type InsertPartStepInstance = typeof partStepInstances.$inferInsert;
export type CheckpointResult = typeof checkpointResults.$inferSelect;
export type InsertCheckpointResult = typeof checkpointResults.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;
export type InventoryConsumption = typeof inventoryConsumption.$inferSelect;
export type InsertInventoryConsumption = typeof inventoryConsumption.$inferInsert;
export type PlmObject = typeof plmObjects.$inferSelect;
export type InsertPlmObject = typeof plmObjects.$inferInsert;
export type PlmSyncEvent = typeof plmSyncEvents.$inferSelect;
export type InsertPlmSyncEvent = typeof plmSyncEvents.$inferInsert;

// =====================================================
// VALID STATE TRANSITIONS (ISA-95)
// =====================================================

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
