# Sprint 3 Operational Pilot Architecture

Date: 2026-06-29
Repository: Kalvinsadurock/IND5.0
Owner: Solution Architecture Agent

## Purpose

Sprint 3 should convert the Sprint 1/2 platform foundation into an operational pilot that a tenant admin and plant manager can use after onboarding. The architecture should keep Platform Core as the authority for tenants, hierarchy, users, roles, permissions, and audit events, while Configuration Studio remains the authority for custom fields and workflow definitions.

The target pilot capabilities are:

- tenant-scoped plant hierarchy editing
- RBAC permission matrix management
- configurable work-order editor
- workflow designer MVP
- auditability across configuration and operational changes

## Current Foundation

Sprint 1 established the multi-tenant platform model and Configuration Studio model:

- Platform tables: `platform_tenants`, `platform_companies`, `platform_plants`, `platform_areas`, `platform_departments`, `platform_lines`, `platform_work_centers`, `platform_users`, `platform_roles`, `platform_permissions`, `platform_role_permissions`, `platform_user_role_assignments`, `platform_audit_events`
- Configuration tables: `configurable_object_types`, `custom_field_definitions`, `custom_field_options`, `custom_field_values`, `workflow_definitions`, `workflow_states`, `workflow_transitions`, `workflow_instances`, `workflow_history`
- Existing API groups: `/api/platform/*` and `/api/configuration/*`
- Existing UI modules: `PlatformCoreModule`, `TenantOnboardingWizard`, and `ConfigurationStudioModule`

Sprint 2 added tenant bootstrap at `/api/platform/onboarding/bootstrap`, including idempotent creation of tenant, company, plant, starter hierarchy, roles, permission catalog, configurable object catalog, industry custom fields, and the standard work-order workflow.

Sprint 3 should build on those assets instead of creating a second administration model.

## Architecture Principles

1. All reads and writes must be tenant-scoped.
2. Hierarchy, RBAC, custom fields, workflow definitions, workflow runtime, and audit events must remain separate bounded contexts with explicit API contracts.
3. The operational work-order editor should use Configuration Studio metadata but should not own field definitions.
4. Workflow designer changes should remain draftable until activation validation passes.
5. Audit capture should be server-side and uniform across Platform Core, Configuration Studio, and MES work-order operations.
6. Existing legacy MES process tables should remain untouched unless a bridging field is required for pilot work-order records.

## Proposed Bounded Contexts

| Context | Owns | Sprint 3 Responsibility |
|---|---|---|
| Platform Core | Tenant, company, plant hierarchy, users, roles, permissions, assignments, audit log | Editable hierarchy tree, RBAC matrix, scoped permission checks |
| Configuration Studio | Object types, custom fields, workflow definitions, workflow states/transitions | Work-order field metadata, workflow designer draft and activation rules |
| MES Pilot | Work-order records and runtime workflow instances | Configurable work-order editor and lifecycle actions |
| Audit | Append-only event records in `platform_audit_events` | Normalized event envelope and query filters |

## Data Model Impact

### Plant Hierarchy

The existing hierarchy tables are sufficient for the MVP. Sprint 3 should add service-level validation and, if database migration capacity allows, unique constraints for stable tenant-scoped codes:

- `platform_plants`: unique `(tenant_id, code)`
- `platform_areas`: unique `(tenant_id, plant_id, code)`
- `platform_departments`: unique `(tenant_id, plant_id, code)`
- `platform_lines`: unique `(tenant_id, plant_id, code)`
- `platform_work_centers`: unique `(tenant_id, plant_id, code)`

No new hierarchy table is required for Sprint 3. Parent-child rules should stay explicit:

- plant contains areas, departments, lines, and work centers
- area may contain lines
- line may contain work centers
- department remains a functional classification and should not become a physical parent for work centers in this sprint

### RBAC Matrix

The current role, permission, role-permission, and user-role assignment tables support the matrix. Sprint 3 should add or formalize:

- permission catalog grouping by `module`, `resource`, and `action`
- role matrix read model joining roles to permissions by tenant
- idempotent role-permission upsert behavior
- role-permission delete endpoint for unchecking permissions
- scoped user role assignment validation for `tenant`, `company`, `plant`, `area`, `line`, and `work_center`

Recommended permission additions:

- `platform.hierarchy.read`
- `platform.hierarchy.create`
- `platform.hierarchy.update`
- `platform.hierarchy.deactivate`
- `platform.role_permission.read`
- `platform.role_permission.update`
- `mes.work_order.read`
- `mes.work_order.create`
- `mes.work_order.update`
- `mes.work_order.transition`
- `configuration.workflow.design`
- `configuration.workflow.publish`

### Work Orders

Sprint 3 needs a tenant-scoped work-order record table to give custom fields and workflow instances a stable operational record. The legacy `parts` and process execution tables are process-centric and should not be overloaded as the work-order master.

Proposed table: `mes_work_orders`

| Column | Purpose |
|---|---|
| `id` | UUID primary key, referenced by custom-field values and workflow instances |
| `tenant_id` | Tenant isolation |
| `plant_id` | Pilot plant scope |
| `work_center_id` | Optional target work center |
| `work_order_number` | Tenant-visible identifier |
| `title` | Short operational description |
| `description` | Longer instruction or context |
| `priority` | `normal`, `high`, `critical` |
| `status` | Denormalized current lifecycle label for listing |
| `planned_start_at` | Planning metadata |
| `planned_end_at` | Planning metadata |
| `created_by`, `updated_by` | User traceability |
| `created_at`, `updated_at` | Timestamps |

The work-order editor should store base fields in `mes_work_orders` and dynamic fields in `custom_field_values` using `objectType = "work_order"` and `recordId = mes_work_orders.id`.

### Workflow Designer

The existing workflow definition, state, transition, instance, and history tables are suitable for the MVP. Sprint 3 should add two fields if versioning can be included without broad refactoring:

- `workflow_definitions.status`: `draft`, `active`, `archived`
- `workflow_definitions.version`: integer, default `1`

If those fields are deferred, Sprint 3 can use `isActive` as the publish flag and restrict editing on active workflows at the API layer.

Designer-specific data should be stored in existing JSON columns where possible:

- state node coordinates in `workflow_states.displayOrder` for simple layout, or `workflow_states.metadata` in a later migration
- transition validation rules in `workflow_transitions.validationRules`

### Audit Events

Use `platform_audit_events` as the single operational audit stream. Required Sprint 3 event types:

- `hierarchy.node_created`
- `hierarchy.node_updated`
- `hierarchy.node_deactivated`
- `role.permission_added`
- `role.permission_removed`
- `role.permission_matrix_updated`
- `work_order.created`
- `work_order.updated`
- `work_order.custom_fields_updated`
- `work_order.transitioned`
- `workflow.designer_saved`
- `workflow.activated`
- `workflow.activation_blocked`
- `permission.denied`

Audit snapshots should include `beforeSnapshot`, `afterSnapshot`, and metadata with `tenantId`, `plantId`, `module`, and `requestId` when available.

## API Boundaries

### Platform Core API

Extend existing `/api/platform/*` routes:

- `GET /api/platform/plants/:id/hierarchy`
- `POST /api/platform/hierarchy/:nodeType`
- `PATCH /api/platform/hierarchy/:nodeType/:id`
- `POST /api/platform/hierarchy/:nodeType/:id/deactivate`
- `GET /api/platform/roles/:id/permissions`
- `PUT /api/platform/roles/:id/permissions`
- `DELETE /api/platform/roles/:id/permissions/:permissionId`
- `GET /api/platform/rbac/matrix`

`nodeType` must be restricted to `plant`, `area`, `department`, `line`, and `work_center`. Each handler must resolve tenant ownership before write.

### Configuration Studio API

Extend existing `/api/configuration/*` routes:

- `GET /api/configuration/workflows/:workflowId/designer`
- `PUT /api/configuration/workflows/:workflowId/designer`
- `POST /api/configuration/workflows/:workflowId/validate`
- `POST /api/configuration/workflows/:workflowId/activate`
- `GET /api/configuration/custom-fields?objectType=work_order`

Activation validation should require:

- exactly one initial state
- at least one terminal state
- every non-terminal state has an outgoing transition
- every transition references valid states
- required permissions exist in `platform_permissions`
- no duplicate `stateCode` or `transitionCode` within the workflow

### MES Pilot API

Add a small `/api/mes/work-orders/*` boundary:

- `GET /api/mes/work-orders`
- `POST /api/mes/work-orders`
- `GET /api/mes/work-orders/:id`
- `PATCH /api/mes/work-orders/:id`
- `PUT /api/mes/work-orders/:id/custom-fields`
- `POST /api/mes/work-orders/:id/workflow/start`
- `POST /api/mes/work-orders/:id/workflow/transition`
- `GET /api/mes/work-orders/:id/audit`

The MES API should orchestrate:

1. base work-order persistence
2. custom-field validation and save through Configuration Studio services
3. workflow instance creation or transition
4. audit event capture

## Frontend Module Boundaries

### Platform Core Module

Add focused subviews under the existing `PlatformCoreModule`:

- `PlantHierarchyEditor`
- `RolePermissionMatrix`
- `UserScopeAssignmentPanel`
- `AuditTrailView`

The hierarchy editor should use a tree/list hybrid with a detail panel. The RBAC matrix should group permissions by module and resource, with roles as columns or selected-role tabs depending on screen width.

### Configuration Studio Module

Add subviews under the existing `ConfigurationStudioModule`:

- `WorkOrderFieldPreview`
- `WorkflowDesigner`
- `WorkflowValidationPanel`

The workflow designer MVP does not need full drag/drop persistence on day one. It should support state create/edit/delete, transition create/edit/delete, visual preview, validation, and activation.

### MES Pilot Module

Introduce a new operational pilot area rather than embedding work-order editing inside Configuration Studio:

- `WorkOrderList`
- `WorkOrderEditor`
- `WorkOrderCustomFieldsPanel`
- `WorkOrderWorkflowPanel`
- `WorkOrderAuditPanel`

The work-order editor should fetch:

- base work-order record from `/api/mes/work-orders/:id`
- custom field definitions from `/api/configuration/custom-fields?objectType=work_order`
- custom field values from `/api/configuration/custom-field-values/work_order/:id`
- workflow state and transitions from the MES orchestration response

## Tenant And Permission Enforcement

Sprint 3 should introduce shared server helpers before adding many new endpoints:

- `resolveTenantId(req)`
- `resolveActorUserId(req)`
- `requireTenantScope(req, tenantId)`
- `requirePermission(req, code, scopeType?, scopeId?)`
- `writeAuditEvent(req, event)`

The current routes use `x-tenant-id` and `x-user-id` headers or request body fields. Sprint 3 may continue that pattern for the pilot, but should centralize extraction and validation so later Supabase-auth claims can replace header trust without rewriting every route.

## Auditability Design

Every write endpoint should emit one audit event after a successful commit. Blocked permission checks and failed workflow activation should also emit audit events with no entity mutation.

Audit event shape:

- `tenantId`: required except global permission catalog operations
- `actorUserId`: current platform user when known
- `module`: `platform`, `configuration`, or `mes`
- `eventType`: stable event code
- `entityType`: table/domain object name
- `entityId`: entity UUID when available
- `action`: `create`, `update`, `delete`, `activate`, `transition`, `deny`
- `beforeSnapshot`: previous persisted state for updates
- `afterSnapshot`: new persisted state or validation result
- `metadata`: request context, object type, plant scope, workflow state, severity

## Risks And Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Tenant header trust is currently lightweight | Cross-tenant access risk in pilot demos | Centralize tenant and permission checks in server helpers before adding Sprint 3 writes |
| Custom field values currently insert new rows on every save | Duplicate values for the same field and record | Add upsert semantics by `(tenant_id, object_type, record_id, field_id)` |
| Active workflow editing can break running work orders | Runtime state inconsistency | Treat active workflow edits as blocked or require clone-to-new-version |
| RBAC matrix bulk updates can create duplicate role-permission rows | Confusing effective permissions | Use idempotent diff-based update in a transaction |
| Hierarchy deactivation may orphan lines/work centers | Bad planning and OEE scope | Validate child counts and require cascade confirmation for deactivation |
| Work-order table may overlap with legacy `parts` execution flow | Data model confusion | Keep `mes_work_orders` as pilot work-order header and defer execution/genealogy integration |
| Audit writes can fail after domain writes | Missing traceability | Use transaction boundaries where available; otherwise log and surface audit failure for admin writes |

## Implementation Order

1. Add shared tenant, permission, and audit helpers for new Sprint 3 endpoints.
2. Harden Platform Core hierarchy APIs with update, deactivate, tenant validation, and audit events.
3. Add RBAC matrix read/update APIs with idempotent role-permission diffing.
4. Add `mes_work_orders` and the `/api/mes/work-orders/*` pilot boundary.
5. Add custom-field value upsert behavior for work-order records.
6. Add workflow designer read/save/validate/activate APIs.
7. Build `PlantHierarchyEditor` and wire it into `PlatformCoreModule`.
8. Build `RolePermissionMatrix` and verify permission changes through audit events.
9. Build `WorkOrderList` and `WorkOrderEditor` using work-order base fields plus custom fields.
10. Build `WorkflowDesigner` MVP with validation and activation.
11. Add audit views and filters by tenant, plant, module, event type, and entity.
12. Run pilot acceptance tests across tenant bootstrap, hierarchy edit, role update, work-order create/edit, workflow transition, and audit trace.

## Acceptance Criteria

- A tenant admin can edit plant hierarchy nodes for the selected tenant without seeing or changing another tenant.
- A tenant admin can view and update role-permission assignments through a matrix.
- A plant manager can create and edit a work order with both base fields and configured custom fields.
- A work order can start a workflow instance and execute valid transitions.
- Workflow designers can save and validate a work-order workflow before activation.
- Permission denials, hierarchy changes, role-permission changes, work-order updates, and workflow transitions appear in the audit trail.
- Existing Sprint 1/2 onboarding continues to work without changing its external contract.

