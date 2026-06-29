# Configuration Studio Sprint 3 Implementation Plan

Date: 2026-06-29
Repository: Kalvinsadurock/IND5.0
Owner: Configuration Studio Developer Agent
Sprint Goal: Deliver the workflow designer MVP and industry template preview needed for the Sprint 3 operational pilot.

## Scope

Configuration Studio owns two Sprint 3 outcomes:

1. Workflow Designer MVP for the `work_order` lifecycle.
2. Read-only Industry Template Preview before tenant creation.

This plan intentionally keeps Platform Core as the owner of tenant creation, hierarchy, RBAC, invites, and platform audit storage. Configuration Studio should reuse the existing configuration model and APIs wherever possible, adding only thin orchestration endpoints when the current endpoint shape would create fragile client-side coordination.

## User Stories Covered

| Story | Priority | Configuration Studio Responsibility |
|---|---:|---|
| S3-004 Industry Template Preview Before Creation | P1 | Preview object types, custom fields, workflow states, workflow transitions, and starter assumptions before tenant bootstrap. |
| S3-007 Workflow Designer MVP | P0 | Display, edit, validate, and save work-order states and transitions without code changes. |
| S3-008 Workflow Transition Execution | P1 support | Provide workflow metadata and validation rules consumed by the MES work-order runtime. |

## Existing Assets To Reuse

### UI

- `src/app/components/ConfigurationStudioModule.tsx` as the module entry point.
- Shared UI primitives under `src/shared/ui/*`, especially tabs, dialog, sheet, select, input, textarea, switch, badge, button, table, scroll area, separator, alert, and tooltip.
- Existing icon export from `src/shared/ui/icons.ts`.
- `TenantOnboardingWizard` as the host for the industry template preview entry point.

### APIs

Reuse current `/api/configuration/*` endpoints:

- `GET /api/configuration/object-types`
- `GET /api/configuration/custom-fields?objectType=work_order`
- `GET /api/configuration/workflows?objectType=work_order`
- `GET /api/configuration/workflows/:workflowId/states`
- `POST /api/configuration/workflows/:workflowId/states`
- `GET /api/configuration/workflows/:workflowId/transitions`
- `POST /api/configuration/workflows/:workflowId/transitions`
- `POST /api/configuration/workflow-instances`
- `POST /api/configuration/workflow-instances/:instanceId/transition`
- `GET /api/configuration/workflow-instances/:instanceId/history`

### Tables

Reuse current Configuration Studio tables:

- `configurable_object_types`
- `custom_field_definitions`
- `custom_field_options`
- `custom_field_values`
- `workflow_definitions`
- `workflow_states`
- `workflow_transitions`
- `workflow_instances`
- `workflow_history`

Reuse `platform_audit_events` as the audit sink through the existing configuration audit helper until a shared audit service is introduced.

## New UI Components Needed

### Configuration Studio

1. `WorkflowDesigner`
   - Main designer view for a selected work-order workflow.
   - Left rail: states list with state category, initial marker, terminal marker, active/deactivated state.
   - Center canvas: read-only visual graph in MVP, with reposition controls if persisted layout is available.
   - Right panel: selected state or transition editor.
   - Footer/action bar: save draft, validate, activate/publish, discard pending edits.

2. `WorkflowStateEditor`
   - Fields: state name, state code, category, color, initial, terminal, allows editing, requires owner, SLA hours, active/deactivated.
   - Actions: add state, rename state, reorder/reposition state, deactivate state.

3. `WorkflowTransitionEditor`
   - Fields: source state, target state, display label, transition code, required permission, required role, requires comment, audit severity, active/deactivated.
   - Actions: add transition, edit transition, deactivate transition.

4. `WorkflowValidationPanel`
   - Shows blocking errors and warnings from validation.
   - Groups issues by states, transitions, permissions, active-instance safety, and publish readiness.

5. `WorkflowVersionBanner`
   - Shows whether the workflow is active, draft, cloned from active, or pending activation.
   - Explains when active work orders prevent destructive edits.

6. `WorkflowPreviewGraph`
   - Displays the default flow: Draft, Released, In Progress, Quality Hold, Closed.
   - Uses stable layout positions and color-coded state categories.
   - MVP can be click-to-select rather than full drag-and-drop.

### Onboarding Wizard

1. `IndustryTemplatePreview`
   - Read-only preview shown when the selected industry template changes.
   - Tabs: Overview, Object Types, Custom Fields, Workflow, Starter Hierarchy.

2. `TemplateObjectTypePreview`
   - Lists seeded object types and owning module.

3. `TemplateCustomFieldPreview`
   - Lists required and optional fields, type, default value, validation summary, and display order.

4. `TemplateWorkflowPreview`
   - Lists seeded workflow states, transitions, required permissions, and comment requirements.

5. `TemplateAssumptionPanel`
   - Shows starter hierarchy assumptions and any required post-onboarding actions.

## API Plan

### Reuse Existing APIs

The UI should continue reading object types, fields, workflows, states, and transitions through existing `/api/configuration/*` endpoints. This keeps Sprint 3 aligned with the Sprint 1 foundation and avoids a second configuration read model.

State and transition creation can reuse existing POST endpoints for MVP, but the UI should treat these as draft edits and should not expose destructive deletion for active workflows.

### New Configuration APIs

Add the following endpoints because the current state and transition endpoints are too granular for designer save, validation, and preview workflows:

| Endpoint | Purpose |
|---|---|
| `GET /api/configuration/workflows/:workflowId/designer` | Return workflow definition, states, transitions, permissions referenced by transitions, validation summary, and active-instance counts in one payload. |
| `PUT /api/configuration/workflows/:workflowId/designer` | Save a designer draft containing state updates, transition updates, deactivations, and layout metadata in one transaction where available. |
| `POST /api/configuration/workflows/:workflowId/validate` | Run activation validation without saving or activating. |
| `POST /api/configuration/workflows/:workflowId/activate` | Validate, block unsafe changes, and activate the draft or cloned workflow version. |
| `GET /api/configuration/templates/:industryKey/preview` | Return read-only template seed data for the onboarding preview without creating tenant records. |

### Platform API Reuse

Template preview must not call tenant bootstrap or create tenant records. It should either:

- read from the same seed/template definitions used by `/api/platform/onboarding/bootstrap`, or
- call a pure preview helper owned by Platform Core that returns the template payload without writes.

Configuration Studio should not create tenant, hierarchy, role, or permission records for preview.

### MES API Coordination

Workflow transition execution remains a runtime concern. The MES work-order API should call Configuration Studio workflow metadata or existing workflow instance endpoints. Configuration Studio should provide:

- allowed transitions metadata
- required permission metadata
- comment requirement metadata
- audit severity metadata

MES should own work-order status updates and user-facing transition execution.

## Validation Rules

### Template Preview

- Preview is read-only and must not create, update, or reserve tenant data.
- `industryKey` must be one of the supported onboarding templates, initially `discrete_manufacturing`, `process_manufacturing`, or `composites`.
- Preview payload must include only seed definitions safe to show before creation.
- Required content must be labeled separately from optional starter content.
- Switching templates must fully replace the preview payload and clear stale preview errors.
- Final tenant creation must submit the selected template key explicitly so the previewed template and applied template match.

### Workflow Designer

- A workflow must have exactly one initial state before activation.
- A workflow must have at least one terminal state before activation.
- Every active non-terminal state must have at least one outgoing active transition.
- Every active transition must reference active states in the same workflow.
- `stateCode` must be unique within the workflow.
- `transitionCode` must be unique within the workflow.
- State and transition codes must be stable, lowercase, and machine-readable.
- Required permissions on transitions must exist in the Platform permission catalog.
- A transition may not point from a terminal state unless explicitly marked as an approved reopen path.
- A workflow used by active work orders may not delete or deactivate the current state of any active instance.
- Destructive edits to active workflows must either be blocked or saved as a new draft/version for activation.
- Transition comment requirement must be enforced at runtime when `requiresComment` is true.
- Workflow activation must fail with a validation result, not a partial save.

## Audit Events

Emit audit events server-side after successful writes and for blocked activation attempts.

### Template Preview

- `template.preview_opened`
  - Entity type: `industry_template`
  - Metadata: `industryKey`, `source`, `requestId`
  - No tenant mutation.

- `template.preview_failed`
  - Entity type: `industry_template`
  - Metadata: `industryKey`, `reason`, `requestId`

### Workflow Designer

- `workflow.designer_opened`
  - Optional for admin traceability; can be lower severity.

- `workflow.designer_saved`
  - Entity type: `workflow`
  - Before/after snapshots should include changed states, changed transitions, and layout metadata.

- `workflow.state_created`
- `workflow.state_updated`
- `workflow.state_deactivated`
- `workflow.transition_created`
- `workflow.transition_updated`
- `workflow.transition_deactivated`

- `workflow.validation_run`
  - Metadata: error count, warning count, active instance count.

- `workflow.activation_blocked`
  - Metadata: validation failures and unsafe active-instance references.

- `workflow.activated`
  - Metadata: previous active workflow/version, activated workflow/version, object type.

### Runtime Support

Existing runtime events should remain in place:

- `workflow.transition_executed`
- `workflow.transition_blocked`

Add `work_order.transitioned` in the MES boundary if work-order status changes are saved outside Configuration Studio.

## Data Migration Considerations

### Required For MVP

- Ensure seeded work-order workflow data exists for each onboarded tenant with states:
  - `draft`
  - `released`
  - `in_progress`
  - `quality_hold`
  - `closed`
- Ensure seeded transitions exist for the pilot path:
  - Draft to Released
  - Released to In Progress
  - In Progress to Quality Hold
  - Quality Hold to In Progress
  - In Progress to Closed
- Ensure required transition permissions exist:
  - `configuration.workflow.design`
  - `configuration.workflow.publish`
  - `mes.work_order.transition`

### Recommended Schema Additions

If Sprint 3 migration capacity allows, add:

- `workflow_definitions.status` with `draft`, `active`, `archived`.
- `workflow_definitions.version` integer default `1`.
- `workflow_definitions.parent_workflow_id` for clone/version lineage.
- `workflow_states.metadata` JSON for layout coordinates and designer notes.
- `workflow_transitions.metadata` JSON for path styling and designer notes.
- Unique index on `(tenant_id, workflow_id, state_code)`.
- Unique index on `(tenant_id, workflow_id, transition_code)`.

If those additions are deferred, use current `isActive`, `displayOrder`, and `validationRules` fields, but block editing active workflows more aggressively.

### Backfill And Safety

- Backfill status/version for existing workflow definitions:
  - `isActive = true` becomes `status = active`, `version = 1`.
  - `isActive = false` becomes `status = draft`, `version = 1`.
- Do not mutate existing custom field definitions during template preview.
- Do not overwrite tenant-specific workflow customizations when adding new seed templates.
- Any migration that adds uniqueness must first detect duplicate state or transition codes and produce a cleanup list.
- Active workflow instances must be counted before allowing state deactivation or workflow activation.

## Delivery Sequence

1. Add template preview contract and seed read helper.
2. Add `IndustryTemplatePreview` to onboarding wizard behind selected industry template.
3. Add designer aggregate read endpoint.
4. Build `WorkflowDesigner`, `WorkflowPreviewGraph`, and state/transition editors using existing workflow records.
5. Add workflow validation endpoint and validation panel.
6. Add safe designer save endpoint with audit events.
7. Add activation endpoint with active-instance guardrails.
8. Wire transition metadata for MES work-order detail and transition execution.
9. Add focused acceptance checks for template preview read-only behavior and workflow activation validation.

## Definition Of Done

- Implementation consultants can preview supported industry templates before tenant creation.
- Template preview shows object types, custom fields, workflow states/transitions, and starter assumptions without creating tenant data.
- Configuration users can open a work-order workflow and inspect the pilot lifecycle visually.
- Configuration users can add, rename, reposition, and deactivate states subject to validation.
- Configuration users can add and edit transitions with source, target, label, and required permission.
- Workflow activation blocks invalid graphs and unsafe destructive changes against active work orders.
- All designer saves, activation attempts, and template preview events are audit-visible.
- Existing Sprint 1 and Sprint 2 APIs remain compatible.
