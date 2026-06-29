# Sprint 3 QA Gates

Date: 2026-06-29
Repository: Kalvinsadurock/IND5.0
Owner: QA Agent

## Scope

Sprint 3 converts the initialized tenant foundation into an operational pilot. QA coverage must protect the Sprint 1 Platform Core and Configuration Studio foundation, the Sprint 2 onboarding bootstrap flow, and the new Sprint 3 operating surfaces:

- editable plant hierarchy tree
- role-permission matrix screen
- admin invite acceptance path
- industry template preview before creation
- work-order object editor using the custom-field model
- workflow designer MVP with drag/drop states and transitions

## Current Build and Test Baseline

- Sprint 1 notes report `npm run build` passed with a Vite production build.
- Full TypeScript checking is not a release-quality signal yet because it is blocked by pre-existing MES issues in quality routes, shift routes, helper scripts, and lucide type declarations.
- Sprint 1 notes state no Sprint 1 Platform Core or Configuration Studio file appeared in the reported TypeScript errors.
- Sprint 2 notes identify the onboarding bootstrap route as idempotent and safe to re-run for demos and implementation retries.
- Available package scripts are `npm run build`, `npm run build:production`, `npm run dev`, `npm run db:push`, `npm run db:seed`, and `npm run server`.

## Release Gate Summary

| Gate | Release Requirement | Decision |
| --- | --- | --- |
| Smoke tests | Core app, server, onboarding, dashboards, and new Sprint 3 screens load without fatal errors. | Block release on failure. |
| API contract checks | Platform and configuration APIs keep required request/response shapes and validation behavior. | Block release on breaking changes. |
| Onboarding regression checks | Bootstrap remains idempotent and creates the same tenant foundation across retries. | Block release on data corruption or duplicate records. |
| RBAC matrix checks | Role-permission assignments are visible, editable, auditable, and tenant-scoped. | Block release on privilege escalation or cross-tenant leakage. |
| Workflow designer checks | State and transition editing preserves workflow integrity and prevents invalid lifecycle graphs. | Block release on broken save/load or unsafe transitions. |
| Database migration checks | Schema changes apply cleanly and preserve existing tenant, role, permission, object, and workflow data. | Block release on destructive or non-repeatable migration behavior. |
| TypeScript issue isolation | Known legacy TypeScript errors remain isolated from Sprint 3 work. | Conditional pass only if no new Sprint 3 files are implicated. |

## Gate 1: Smoke Tests

### Purpose

Confirm that the platform still starts, builds, and exposes the minimum demo path after Sprint 3 changes.

### Checks

- Run `npm run build` and confirm the Vite production build completes.
- Start the app with the standard dev/server flow used by the team.
- Load the main dashboard and verify the sidebar includes Platform Core, Configuration, and relevant operational modules.
- Open Platform Core dashboard and confirm tenant, plant, user, role, permission, and audit panels render.
- Open Configuration Studio dashboard and confirm object catalogs, custom fields, and workflow readiness render.
- Open the onboarding wizard and confirm all form steps render without client errors.
- Open the Sprint 3 plant hierarchy, RBAC matrix, work-order editor, and workflow designer screens.

### Pass Criteria

- No white screen, uncaught client exception, or fatal server startup error.
- Navigation between core Sprint 1, Sprint 2, and Sprint 3 screens works.
- Build output does not introduce new fatal bundling errors.

### Fail Criteria

- `npm run build` fails for a Sprint 3-owned file.
- Any Sprint 3 screen cannot load enough for functional validation.
- Existing dashboards regress from the Sprint 1/Sprint 2 baseline.

## Gate 2: API Contract Checks

### Purpose

Protect the API contract used by onboarding, Platform Core, Configuration Studio, RBAC, workflow designer, and object editor features.

### Checks

- `/api/platform/onboarding/bootstrap` rejects missing tenant/company data and invalid admin email data.
- `/api/platform/onboarding/bootstrap` creates or reuses tenant, company, plant, area, line, starter work centers, roles, permissions, assignments, object catalog records, custom fields, and workflow records.
- Platform Core routes under `/api/platform/*` keep stable response shapes for tenant, company, plant, user, role, permission, assignment, and audit data.
- Configuration Studio routes under `/api/configuration/*` keep stable response shapes for object types, custom fields, field options, workflow definitions, states, transitions, instances, and history.
- New Sprint 3 endpoints return clear validation errors for malformed hierarchy edits, invalid role-permission updates, invalid custom-field payloads, and invalid workflow transitions.
- API errors are consistent enough for the UI to show actionable failure states.

### Pass Criteria

- Required fields are validated before writes.
- Successful responses include stable identifiers and enough data for immediate UI refresh.
- Invalid requests do not partially write tenant, hierarchy, RBAC, object, or workflow records.

### Fail Criteria

- Response shape changes break existing dashboard or wizard clients.
- Validation gaps allow orphaned hierarchy nodes, role assignments without valid users/roles, custom-field values without object ownership, or transitions referencing missing states.

## Gate 3: Onboarding Regression Checks

### Purpose

Ensure Sprint 3 work does not weaken the customer tenant initialization path delivered in Sprint 2.

### Test Data

- One new tenant code for first-run creation.
- One repeated tenant code for idempotency checks.
- Three industry templates: Discrete Manufacturing, Process Manufacturing, and Composites.
- Admin user email and display name.

### Checks

- First-run onboarding creates tenant, company, plant, starter area, line, work centers, admin user invite, Tenant Admin role assignment, default role set, default permission catalog, object catalog, template fields, and standard MES work-order workflow.
- Re-running onboarding with the same tenant code reuses existing tenant, role, permission, object type, custom field, and workflow records where intended.
- Re-running onboarding does not duplicate Tenant Admin, Plant Manager, Operator, default permissions, object types, workflow states, or workflow transitions.
- Industry template selection creates the expected template-specific custom fields.
- Onboarding completion refreshes Platform Core dashboard metrics.

### Pass Criteria

- Repeated onboarding is safe for demos and implementation retries.
- Created records are tenant-scoped and traceable to the initialized tenant.
- User-facing completion state is clear after success and after validation failure.

### Fail Criteria

- Duplicate foundational records appear after retry.
- Template-specific fields are mixed across industry templates.
- Admin invite or Tenant Admin role assignment is missing after successful bootstrap.

## Gate 4: RBAC Matrix Checks

### Purpose

Validate that role-permission management is accurate, safe, and auditable.

### Matrix Coverage

| Role | Platform | Configuration | MES | Quality | OEE | HRMS | Expected Boundary |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tenant Admin | Manage | Manage | Manage | Manage | Manage | Manage | Tenant-wide administration only. |
| Plant Manager | View/manage assigned plant operations | View limited configuration | Manage plant execution | Manage plant quality | Manage plant OEE | View assigned workforce data | Assigned plant scope only. |
| Operator | No admin access | No configuration access | Execute assigned work | Record assigned checks | View own shift context | No HRMS administration | Own assigned work center or shift only. |

### Checks

- RBAC matrix loads existing default roles and permissions after onboarding.
- Permission toggles persist and reload correctly.
- Tenant Admin can assign and remove permissions within the tenant.
- Plant Manager cannot grant tenant-wide administrative privileges unless explicitly permitted.
- Operator cannot access Platform Core administration, Configuration Studio administration, or RBAC management.
- Removing a permission blocks the related UI action and API write.
- Adding a permission enables the related UI action and API write.
- Every RBAC mutation creates an audit event with actor, tenant, role, permission, action, and timestamp.
- RBAC data for one tenant is not visible or mutable from another tenant context.

### Pass Criteria

- UI visibility and API authorization agree.
- Permission changes take effect after refresh and re-login.
- Audit events allow reviewers to reconstruct who changed access and when.

### Fail Criteria

- UI hides an action but the API still allows it.
- Cross-tenant role or permission records are exposed.
- Operators can perform administrative writes.

## Gate 5: Workflow Designer Checks

### Purpose

Protect the configurable workflow model while adding visual editing.

### Checks

- Designer loads the standard MES work-order workflow created during onboarding.
- Dragging states changes layout without changing state identifiers or lifecycle semantics.
- Creating a state requires valid name, code, and workflow ownership.
- Editing a state preserves existing transitions unless explicitly changed.
- Creating a transition requires valid source state, target state, label, and workflow ownership.
- Deleting a state is blocked when active transitions or workflow instances depend on it.
- Deleting a transition is blocked or warned when workflow instances depend on it.
- Saving and reloading preserves states, transitions, and visual positions.
- Invalid graphs are blocked, including missing initial state, duplicate state code, duplicate transition code, transition to missing state, and transition from missing state.
- Workflow history records meaningful changes.

### Pass Criteria

- The designer can edit and reload a valid work-order workflow.
- Invalid graph changes are prevented before they corrupt the workflow definition.
- Existing workflow definitions and instances remain readable after designer saves.

### Fail Criteria

- Save/load loses states or transitions.
- Designer-generated records cannot be used by execution or configuration APIs.
- Invalid transitions allow impossible work-order lifecycle movement.

## Gate 6: Database Migration Checks

### Purpose

Ensure Sprint 3 schema changes are repeatable, non-destructive, and compatible with existing Sprint 1/Sprint 2 data.

### Checks

- Review migration or schema changes before applying them to confirm tenant-scoped ownership is preserved.
- Apply database changes with `npm run db:push` only against the selected Supabase/Postgres project.
- Verify existing tenant, company, plant, area, line, work center, user, role, permission, assignment, audit, object type, custom field, workflow, state, transition, instance, and history data remains readable.
- Verify new hierarchy, RBAC, object editor, and workflow designer fields are nullable or backfilled where existing records require it.
- Confirm unique constraints prevent duplicate tenant codes, role codes per tenant, permission codes, object type codes per tenant, workflow codes per tenant, state codes per workflow, and transition codes per workflow.
- Confirm foreign keys or equivalent application checks prevent orphaned hierarchy, RBAC, custom-field, and workflow records.
- Confirm rollback notes exist for any destructive migration.

### Pass Criteria

- Schema changes apply cleanly from the current baseline.
- Existing Sprint 1/Sprint 2 demo data remains usable.
- Re-running onboarding after migration remains idempotent.

### Fail Criteria

- Migration drops or corrupts foundational tenant/configuration data.
- Migration requires manual data repair for normal Sprint 1/Sprint 2 records.
- New schema allows orphaned RBAC or workflow records.

## Gate 7: Work-Order Object Editor Checks

### Purpose

Validate the operational object editor built on top of the custom-field model.

### Checks

- Work-order object editor loads object type metadata and template-specific custom fields.
- Required fields block save when missing.
- Field options render consistently with configured option sets.
- Custom-field values save with the correct tenant, object type, object instance, field, and value type.
- Updating a work-order preserves existing custom-field values not shown on the current screen.
- Invalid field types are rejected before persistence.
- Read-only users can view but not edit object configuration or work-order records.

### Pass Criteria

- Editor can create, update, reload, and validate work-order records for each supported template.
- Custom-field values remain attached to the correct tenant and work-order record.

### Fail Criteria

- Field values are saved under the wrong tenant, object type, or field.
- Template-specific fields leak between tenants or industries.

## Known Pre-Existing TypeScript Issues to Isolate

Full TypeScript checking is a conditional gate until legacy issues are remediated. QA should track these as pre-existing blockers and verify Sprint 3 does not add to them.

### Isolation Buckets

- Quality routes: pre-existing MES quality route type errors.
- Shift routes: pre-existing MES shift route type errors.
- Helper scripts: pre-existing script type errors.
- Lucide declarations: pre-existing lucide type declaration issues.

### Isolation Rules

- A Sprint 3 release can receive a conditional pass if TypeScript errors remain limited to the known legacy buckets above and `npm run build` passes.
- A Sprint 3 release must fail if any new error appears in Platform Core, Configuration Studio, onboarding, RBAC matrix, plant hierarchy, work-order editor, workflow designer, shared schema changes, or shared API client changes.
- QA must capture the TypeScript error file list for each release candidate and compare it to the known baseline.
- Developers should not suppress errors globally to make the TypeScript gate appear cleaner.

## Regression Impact

Sprint 3 has high regression risk because it edits foundational configuration and access-control data. The most important regression paths are:

- onboarding bootstrap still creates a complete tenant foundation
- Platform Core dashboard still reflects tenant, plant, user, role, permission, and audit records
- Configuration Studio still reflects object catalogs, custom fields, and workflow readiness
- RBAC changes do not bypass tenant isolation
- workflow designer saves do not break execution workflows
- migrations do not damage existing demo data

## Release Decision Policy

### Pass

- All smoke, API contract, onboarding, RBAC, workflow designer, work-order editor, and migration gates pass.
- `npm run build` passes.
- Full TypeScript check is clean or only reports known pre-existing issues that are documented and unchanged.

### Conditional Pass

- Functional Sprint 3 gates pass.
- `npm run build` passes.
- TypeScript remains blocked only by known pre-existing quality routes, shift routes, helper scripts, or lucide declaration issues.
- No Sprint 3-owned files appear in the TypeScript error list.

### Fail

- Build fails.
- Onboarding idempotency fails.
- Tenant isolation fails.
- RBAC permits unauthorized administrative access.
- Workflow designer corrupts workflow definitions.
- Database migration damages existing Sprint 1/Sprint 2 data.
- TypeScript errors expand into Sprint 3-owned or shared foundation files.

## Open Defects Log

| Defect | Area | Severity | Status | Release Impact |
| --- | --- | --- | --- | --- |
| Full TypeScript check blocked by pre-existing quality routes, shift routes, helper scripts, and lucide type declarations. | Legacy MES/type baseline | Medium | Known pre-existing | Conditional pass allowed only if unchanged and isolated. |
