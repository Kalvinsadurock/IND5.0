import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import {
  configurableObjectTypes,
  customFieldDefinitions,
  customFieldOptions,
  customFieldValues,
  platformAuditEvents,
  workflowDefinitions,
  workflowHistory,
  workflowInstances,
  workflowStates,
  workflowTransitions,
} from "../../../shared/schema";

const router = Router();

function tenantIdFrom(req: any) {
  return req.header("x-tenant-id") || req.query.tenantId || req.body?.tenantId || null;
}

function actorUserIdFrom(req: any) {
  return req.header("x-user-id") || req.body?.actorUserId || null;
}

async function audit(req: any, event: {
  eventType: string;
  entityType: string;
  entityId?: string | null;
  action: string;
  objectType?: string;
  beforeSnapshot?: unknown;
  afterSnapshot?: unknown;
  severity?: string;
}) {
  await db.insert(platformAuditEvents).values({
    tenantId: tenantIdFrom(req),
    actorUserId: actorUserIdFrom(req),
    actorType: "user",
    module: "configuration",
    eventType: event.eventType,
    entityType: event.entityType,
    entityId: event.entityId || null,
    action: event.action,
    beforeSnapshot: event.beforeSnapshot as any,
    afterSnapshot: event.afterSnapshot as any,
    metadata: { objectType: event.objectType, severity: event.severity || "normal" },
  } as any);
}

function handleError(res: any, error: unknown, message: string) {
  console.error(message, error);
  res.status(500).json({ error: message });
}

router.get("/configuration/object-types", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const rows = await db.select().from(configurableObjectTypes);
    res.json(rows.filter((row) => !tenantId || row.tenantId === tenantId || row.isSystem));
  } catch (error) {
    handleError(res, error, "Failed to fetch configurable object types");
  }
});

router.post("/configuration/object-types", async (req, res) => {
  try {
    const [created] = await db.insert(configurableObjectTypes).values({
      tenantId: tenantIdFrom(req),
      moduleKey: req.body.moduleKey,
      objectType: req.body.objectType,
      displayName: req.body.displayName,
      description: req.body.description,
      isSystem: req.body.isSystem || false,
      isActive: req.body.isActive ?? true,
    } as any).returning();
    await audit(req, { eventType: "object_type.created", entityType: "configurable_object_type", entityId: created.id, action: "create", objectType: created.objectType, afterSnapshot: created });
    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to create configurable object type");
  }
});

router.get("/configuration/custom-fields", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const objectType = req.query.objectType as string | undefined;
    let rows = await db.select().from(customFieldDefinitions);
    if (tenantId) rows = rows.filter((row) => row.tenantId === tenantId || !row.tenantId);
    if (objectType) rows = rows.filter((row) => row.objectType === objectType);
    res.json(rows);
  } catch (error) {
    handleError(res, error, "Failed to fetch custom fields");
  }
});

router.post("/configuration/custom-fields", async (req, res) => {
  try {
    const [created] = await db.insert(customFieldDefinitions).values({
      tenantId: tenantIdFrom(req),
      objectType: req.body.objectType,
      fieldKey: req.body.fieldKey,
      fieldLabel: req.body.fieldLabel,
      fieldType: req.body.fieldType,
      description: req.body.description,
      isRequired: req.body.isRequired || false,
      isUnique: req.body.isUnique || false,
      isActive: req.body.isActive ?? true,
      defaultValue: req.body.defaultValue,
      validationRules: req.body.validationRules,
      visibilityRules: req.body.visibilityRules,
      editabilityRules: req.body.editabilityRules,
      displayOrder: req.body.displayOrder || 0,
      createdBy: actorUserIdFrom(req),
      updatedBy: actorUserIdFrom(req),
    } as any).returning();
    await audit(req, { eventType: "custom_field.created", entityType: "custom_field", entityId: created.id, action: "create", objectType: created.objectType, afterSnapshot: created });
    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to create custom field");
  }
});

router.patch("/configuration/custom-fields/:fieldId", async (req, res) => {
  try {
    const [before] = await db.select().from(customFieldDefinitions).where(eq(customFieldDefinitions.id, req.params.fieldId));
    const [updated] = await db.update(customFieldDefinitions).set({
      fieldLabel: req.body.fieldLabel,
      description: req.body.description,
      isRequired: req.body.isRequired,
      isUnique: req.body.isUnique,
      defaultValue: req.body.defaultValue,
      validationRules: req.body.validationRules,
      visibilityRules: req.body.visibilityRules,
      editabilityRules: req.body.editabilityRules,
      displayOrder: req.body.displayOrder,
      updatedBy: actorUserIdFrom(req),
      updatedAt: new Date(),
    } as any).where(eq(customFieldDefinitions.id, req.params.fieldId)).returning();
    await audit(req, { eventType: "custom_field.updated", entityType: "custom_field", entityId: updated.id, action: "update", objectType: updated.objectType, beforeSnapshot: before, afterSnapshot: updated });
    res.json(updated);
  } catch (error) {
    handleError(res, error, "Failed to update custom field");
  }
});

router.post("/configuration/custom-fields/:fieldId/:state", async (req, res) => {
  try {
    const active = req.params.state === "activate";
    const [updated] = await db.update(customFieldDefinitions).set({ isActive: active, updatedAt: new Date() } as any)
      .where(eq(customFieldDefinitions.id, req.params.fieldId)).returning();
    await audit(req, {
      eventType: active ? "custom_field.activated" : "custom_field.deactivated",
      entityType: "custom_field",
      entityId: updated.id,
      action: active ? "activate" : "deactivate",
      objectType: updated.objectType,
      afterSnapshot: updated,
    });
    res.json(updated);
  } catch (error) {
    handleError(res, error, "Failed to change custom field state");
  }
});

router.get("/configuration/custom-fields/:fieldId/options", async (req, res) => {
  try {
    res.json(await db.select().from(customFieldOptions).where(eq(customFieldOptions.fieldId, req.params.fieldId)));
  } catch (error) {
    handleError(res, error, "Failed to fetch custom field options");
  }
});

router.post("/configuration/custom-fields/:fieldId/options", async (req, res) => {
  try {
    const [created] = await db.insert(customFieldOptions).values({
      tenantId: tenantIdFrom(req),
      fieldId: req.params.fieldId,
      optionValue: req.body.optionValue,
      optionLabel: req.body.optionLabel,
      color: req.body.color,
      displayOrder: req.body.displayOrder || 0,
      isActive: req.body.isActive ?? true,
    } as any).returning();
    await audit(req, { eventType: "custom_field.option_added", entityType: "custom_field_option", entityId: created.id, action: "create", afterSnapshot: created });
    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to create custom field option");
  }
});

router.get("/configuration/custom-field-values/:objectType/:recordId", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const whereClause = tenantId
      ? and(eq(customFieldValues.objectType, req.params.objectType), eq(customFieldValues.recordId, req.params.recordId), eq(customFieldValues.tenantId, tenantId))
      : and(eq(customFieldValues.objectType, req.params.objectType), eq(customFieldValues.recordId, req.params.recordId));
    res.json(await db.select().from(customFieldValues).where(whereClause));
  } catch (error) {
    handleError(res, error, "Failed to fetch custom field values");
  }
});

router.put("/configuration/custom-field-values/:objectType/:recordId", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const values = Array.isArray(req.body.values) ? req.body.values : [];
    const saved = [];
    for (const value of values) {
      const [created] = await db.insert(customFieldValues).values({
        tenantId,
        objectType: req.params.objectType,
        recordId: req.params.recordId,
        fieldId: value.fieldId,
        valueText: value.valueText,
        valueNumber: value.valueNumber,
        valueBoolean: value.valueBoolean,
        valueDate: value.valueDate ? new Date(value.valueDate) : null,
        valueJson: value.valueJson,
        createdBy: actorUserIdFrom(req),
        updatedBy: actorUserIdFrom(req),
      } as any).returning();
      saved.push(created);
    }
    await audit(req, { eventType: "custom_field.value_updated", entityType: req.params.objectType, entityId: req.params.recordId, action: "update", objectType: req.params.objectType, afterSnapshot: saved });
    res.json(saved);
  } catch (error) {
    handleError(res, error, "Failed to save custom field values");
  }
});

router.get("/configuration/workflows", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const objectType = req.query.objectType as string | undefined;
    let rows = await db.select().from(workflowDefinitions);
    if (tenantId) rows = rows.filter((row) => row.tenantId === tenantId || !row.tenantId);
    if (objectType) rows = rows.filter((row) => row.objectType === objectType);
    res.json(rows);
  } catch (error) {
    handleError(res, error, "Failed to fetch workflows");
  }
});

router.post("/configuration/workflows", async (req, res) => {
  try {
    const [created] = await db.insert(workflowDefinitions).values({
      tenantId: tenantIdFrom(req),
      moduleKey: req.body.moduleKey,
      objectType: req.body.objectType,
      workflowKey: req.body.workflowKey,
      workflowName: req.body.workflowName,
      description: req.body.description,
      isActive: req.body.isActive || false,
      isSystem: req.body.isSystem || false,
      createdBy: actorUserIdFrom(req),
      updatedBy: actorUserIdFrom(req),
    } as any).returning();
    await audit(req, { eventType: "workflow.created", entityType: "workflow", entityId: created.id, action: "create", objectType: created.objectType, afterSnapshot: created });
    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to create workflow");
  }
});

router.get("/configuration/workflows/:workflowId/states", async (req, res) => {
  try {
    res.json(await db.select().from(workflowStates).where(eq(workflowStates.workflowId, req.params.workflowId)));
  } catch (error) {
    handleError(res, error, "Failed to fetch workflow states");
  }
});

router.post("/configuration/workflows/:workflowId/states", async (req, res) => {
  try {
    const [created] = await db.insert(workflowStates).values({
      tenantId: tenantIdFrom(req),
      workflowId: req.params.workflowId,
      stateCode: req.body.stateCode,
      stateName: req.body.stateName,
      stateCategory: req.body.stateCategory || "active",
      color: req.body.color || "slate",
      isInitial: req.body.isInitial || false,
      isTerminal: req.body.isTerminal || false,
      allowsEditing: req.body.allowsEditing ?? true,
      allowsDeletion: req.body.allowsDeletion || false,
      requiresOwner: req.body.requiresOwner || false,
      slaHours: req.body.slaHours,
      displayOrder: req.body.displayOrder || 0,
    } as any).returning();
    await audit(req, { eventType: "workflow.state_created", entityType: "workflow_state", entityId: created.id, action: "create", afterSnapshot: created });
    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to create workflow state");
  }
});

router.get("/configuration/workflows/:workflowId/transitions", async (req, res) => {
  try {
    res.json(await db.select().from(workflowTransitions).where(eq(workflowTransitions.workflowId, req.params.workflowId)));
  } catch (error) {
    handleError(res, error, "Failed to fetch workflow transitions");
  }
});

router.post("/configuration/workflows/:workflowId/transitions", async (req, res) => {
  try {
    const [created] = await db.insert(workflowTransitions).values({
      tenantId: tenantIdFrom(req),
      workflowId: req.params.workflowId,
      fromStateId: req.body.fromStateId,
      toStateId: req.body.toStateId,
      transitionCode: req.body.transitionCode,
      transitionName: req.body.transitionName,
      requiredPermission: req.body.requiredPermission,
      requiredRole: req.body.requiredRole,
      requiresComment: req.body.requiresComment || false,
      requiresApproval: req.body.requiresApproval || false,
      requiresEsignature: req.body.requiresEsignature || false,
      validationRules: req.body.validationRules,
      auditSeverity: req.body.auditSeverity || "normal",
      isActive: req.body.isActive ?? true,
    } as any).returning();
    await audit(req, { eventType: "workflow.transition_created", entityType: "workflow_transition", entityId: created.id, action: "create", afterSnapshot: created });
    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to create workflow transition");
  }
});

router.post("/configuration/workflow-instances", async (req, res) => {
  try {
    const [created] = await db.insert(workflowInstances).values({
      tenantId: tenantIdFrom(req),
      workflowId: req.body.workflowId,
      objectType: req.body.objectType,
      recordId: req.body.recordId,
      currentStateId: req.body.currentStateId,
      ownerUserId: req.body.ownerUserId,
      status: "active",
    } as any).returning();
    res.status(201).json(created);
  } catch (error) {
    handleError(res, error, "Failed to create workflow instance");
  }
});

router.post("/configuration/workflow-instances/:instanceId/transition", async (req, res) => {
  try {
    const [instance] = await db.select().from(workflowInstances).where(eq(workflowInstances.id, req.params.instanceId));
    if (!instance) return res.status(404).json({ error: "Workflow instance not found" });
    const [transition] = await db.select().from(workflowTransitions).where(eq(workflowTransitions.id, req.body.transitionId));
    if (!transition) return res.status(404).json({ error: "Workflow transition not found" });
    if (transition.requiresComment && !req.body.comment) {
      await audit(req, { eventType: "workflow.transition_blocked", entityType: "workflow_instance", entityId: instance.id, action: "transition", objectType: instance.objectType, severity: transition.auditSeverity || "important" });
      return res.status(400).json({ error: "Comment is required for this transition" });
    }
    const [updated] = await db.update(workflowInstances).set({
      currentStateId: transition.toStateId,
      updatedAt: new Date(),
    } as any).where(eq(workflowInstances.id, req.params.instanceId)).returning();
    const [history] = await db.insert(workflowHistory).values({
      tenantId: tenantIdFrom(req),
      workflowInstanceId: instance.id,
      transitionId: transition.id,
      fromStateId: instance.currentStateId,
      toStateId: transition.toStateId,
      performedBy: actorUserIdFrom(req),
      comment: req.body.comment,
      metadata: req.body.metadata,
    } as any).returning();
    await audit(req, { eventType: "workflow.transition_executed", entityType: "workflow_instance", entityId: instance.id, action: "transition", objectType: instance.objectType, afterSnapshot: { updated, history }, severity: transition.auditSeverity || "normal" });
    res.json({ instance: updated, history });
  } catch (error) {
    handleError(res, error, "Failed to execute workflow transition");
  }
});

router.get("/configuration/workflow-instances/:instanceId/history", async (req, res) => {
  try {
    res.json(await db.select().from(workflowHistory).where(eq(workflowHistory.workflowInstanceId, req.params.instanceId)));
  } catch (error) {
    handleError(res, error, "Failed to fetch workflow history");
  }
});

export const configurationRouter = router;
