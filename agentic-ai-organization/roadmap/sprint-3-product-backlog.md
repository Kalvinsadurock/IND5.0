# Sprint 3 Product Backlog

Date: 2026-06-29
Repository: Kalvinsadurock/IND5.0
Product Owner: IND5.0 Product Owner Agent

## Sprint Goal

Convert the Sprint 2 tenant onboarding foundation into an operational pilot where an implementation consultant and tenant admin can inspect the selected industry template, accept the first admin invite, adjust plant structure, configure pilot roles, create work orders with custom fields, and model a basic work-order workflow without developer support.

## Pilot Outcome

By the end of Sprint 3, a newly onboarded tenant should be usable for a controlled plant pilot. The platform should support the first post-onboarding administration tasks and one configured work-order execution path that proves the Industry 5.0 platform can move from tenant creation to operational readiness.

## Priority Legend

- P0: Required for the operational pilot demo.
- P1: Required for pilot usability and admin confidence.
- P2: Important follow-up if Sprint 3 capacity allows.

## Epics

### Epic 1: Tenant Operations Readiness

Enable the tenant admin and implementation consultant to move from a seeded tenant to a usable plant operating model.

### Epic 2: Access Governance

Make the Sprint 2 role and permission seed data visible, adjustable, and safe enough for a pilot customer to review.

### Epic 3: Template Confidence

Allow teams to preview what an industry template will create before committing to tenant setup.

### Epic 4: Configured Work Execution

Prove the configurable object model by creating and editing work orders that use industry-specific custom fields.

### Epic 5: Workflow Configuration MVP

Give implementation teams a visual way to adjust work-order lifecycle states and transitions for the pilot.

## User Stories

### S3-001: Editable Plant Hierarchy Tree

Priority: P0
Epic: Tenant Operations Readiness

As an implementation consultant, I want to view and edit the tenant plant hierarchy in a tree, so that the seeded company, plant, area, line, and work-center structure can match the pilot site before go-live.

Acceptance Criteria:

- Given a tenant created through Sprint 2 onboarding, when I open the plant hierarchy screen, then I can see company, plant, area, line, and work-center nodes in parent-child order.
- Given I have tenant administration permission, when I add, rename, move, deactivate, or reactivate a hierarchy node, then the change is saved without breaking existing child records.
- Given I attempt to remove or move a node with dependent pilot records, when the action would orphan data, then the platform blocks the action and explains what depends on that node.
- Given a hierarchy change is saved, then the platform records who changed it, when it changed, and the before/after values needed for audit review.
- Given I do not have the required permission, when I open the hierarchy screen, then edit actions are hidden or disabled while read-only browsing remains available where permitted.

### S3-002: Role-Permission Matrix

Priority: P0
Epic: Access Governance

As a tenant admin, I want a role-permission matrix, so that I can review and adjust the seeded Tenant Admin, Plant Manager, and Operator access model for the pilot.

Acceptance Criteria:

- Given default roles and permissions were seeded during onboarding, when I open the matrix, then permissions are grouped by platform, configuration, MES, quality, OEE, and HRMS domains.
- Given I select a role, when I toggle a permission, then the matrix shows the pending change and requires an explicit save before applying it.
- Given I attempt to remove the last permission needed to manage tenant access, then the platform prevents the tenant from losing all administrative control.
- Given permission changes are saved, then updated role assignments take effect for subsequent API and UI authorization checks.
- Given a permission change is saved, then an audit event records the role, permission, actor, timestamp, and old/new state.

### S3-003: Admin Invite Acceptance

Priority: P0
Epic: Access Governance

As the invited tenant admin, I want to accept my onboarding invite and create my account, so that I can sign in and complete pilot setup myself.

Acceptance Criteria:

- Given onboarding sends or creates an admin invite, when the invited user opens the invite link, then the platform validates the token, tenant, email, and expiry state.
- Given the invite is valid, when the admin sets credentials or completes the configured identity-provider flow, then the user is activated and assigned the Tenant Admin role for the tenant.
- Given the invite token is expired, already used, or invalid, then the platform shows a clear recovery path to request a new invite.
- Given invite acceptance succeeds, then the invite cannot be reused.
- Given acceptance succeeds or fails, then the platform records an audit event with tenant, invited email, status, and timestamp.

### S3-004: Industry Template Preview Before Creation

Priority: P1
Epic: Template Confidence

As an implementation consultant, I want to preview an industry template before tenant creation, so that I can choose the best starting configuration with the customer.

Acceptance Criteria:

- Given I am in the onboarding wizard, when I select Discrete Manufacturing, Process Manufacturing, or Composites, then I can preview the included object types, custom fields, workflow states, and starter hierarchy assumptions before creating the tenant.
- Given I switch templates, when the preview refreshes, then the wizard clearly shows what will change without creating or modifying tenant records.
- Given a template has required fields or workflow defaults, then the preview distinguishes required configuration from optional starter content.
- Given I confirm tenant creation, then the selected previewed template is the one applied to the tenant.
- Given a template preview is opened, then no tenant data is created until the final onboarding submission is confirmed.

### S3-005: Work-Order Editor Using Custom Fields

Priority: P0
Epic: Configured Work Execution

As a plant manager, I want to create and edit work orders using configured custom fields, so that the pilot can run realistic work-order scenarios for the selected industry.

Acceptance Criteria:

- Given a tenant has the Sprint 2 work-order object type and custom fields, when I create a work order, then the editor renders standard work-order fields and template-specific custom fields in a usable form.
- Given a custom field is required, when I save without a valid value, then the editor identifies the missing or invalid field and prevents an incomplete work order from being saved.
- Given a custom field has options, numeric rules, dates, or text constraints, then the editor enforces the configured input type and validation rule.
- Given I edit an existing work order, when I save changes, then standard field values and custom field values are persisted together.
- Given work-order data is changed, then the platform records the actor, timestamp, changed fields, and workflow state context for auditability.

### S3-006: Work-Order List and Detail Pilot View

Priority: P1
Epic: Configured Work Execution

As a plant manager, I want a work-order list and detail view, so that I can find pilot work orders and inspect their configured data quickly.

Acceptance Criteria:

- Given work orders exist for a tenant, when I open the work-order list, then I can see key fields including work-order number, status, plant, line or work center, due date, and owner.
- Given custom fields are configured for the tenant, then the list can expose selected custom fields without hard-coding industry-specific columns.
- Given I select a work order, then the detail view shows standard fields, custom fields, current workflow state, and recent workflow history.
- Given I do not have permission to view work orders, then work-order data is not shown.
- Given a work order belongs to another tenant, then it is never returned in the current tenant view.

### S3-007: Workflow Designer MVP

Priority: P0
Epic: Workflow Configuration MVP

As an implementation consultant, I want a workflow designer MVP for work orders, so that I can adjust pilot lifecycle states and transitions without changing code.

Acceptance Criteria:

- Given the default work-order workflow exists, when I open the designer, then I can see draft, released, in-progress, quality-hold, and closed states with their allowed transitions.
- Given I have configuration permission, when I add, rename, reposition, or deactivate a state, then the designer validates that the workflow still has a usable start state and at least one terminal state.
- Given I add or edit a transition, then I can define source state, target state, display label, and required permission.
- Given active work orders already use a workflow, then destructive changes that would strand active instances are blocked or require a safe migration decision.
- Given workflow changes are saved, then a new workflow version is created or the change is otherwise traceable for audit and rollback planning.

### S3-008: Workflow Transition Execution

Priority: P1
Epic: Workflow Configuration MVP

As a plant manager, I want to move a work order through allowed workflow transitions, so that the pilot can demonstrate controlled execution from draft to closure.

Acceptance Criteria:

- Given a work order is in a workflow state, when I view the work-order detail, then I can see only the transitions allowed from the current state and my permissions.
- Given I perform an allowed transition, then the work order moves to the target state and records workflow history.
- Given I attempt a transition without permission or from an invalid state, then the action is blocked and no state change is saved.
- Given a transition requires a comment or reason, then the platform captures it before saving the state change.
- Given a transition completes, then list and detail views show the updated state immediately after refresh.

### S3-009: Pilot Readiness Checklist

Priority: P2
Epic: Tenant Operations Readiness

As a product owner, I want a pilot readiness checklist for each tenant, so that customer-facing teams can confirm the tenant is ready before a plant walkthrough.

Acceptance Criteria:

- Given a tenant has completed onboarding, when I open the readiness checklist, then I can see status for hierarchy setup, admin activation, role review, template selection, work-order configuration, and workflow configuration.
- Given a readiness item is incomplete, then the checklist links to the area that needs attention.
- Given all P0 readiness items are complete, then the tenant can be marked ready for operational pilot.
- Given a readiness status changes, then the platform records who changed it and when.

## Sprint 3 Release Scope

In scope:

- Post-onboarding tenant administration for the operational pilot.
- Editable plant hierarchy for company, plant, area, line, and work-center records.
- Role-permission matrix for seeded and pilot-created roles.
- Admin invite acceptance and activation.
- Onboarding template preview before tenant creation.
- Work-order editor, list, and detail views using configurable custom fields.
- Work-order workflow designer MVP and transition execution.

Out of scope:

- Full identity-provider administration beyond admin invite acceptance.
- Bulk plant hierarchy import.
- Advanced workflow rules, timers, branching approvals, SLA escalation, or simulation.
- Full production scheduling, inventory reservation, or quality inspection execution.
- Cross-tenant template marketplace or template authoring UI.

## Dependencies

- Sprint 2 onboarding bootstrap API and seeded tenant records.
- Existing Platform Core tenant, hierarchy, user, role, permission, and audit models.
- Existing Configuration Studio object type, custom field, workflow definition, workflow state, workflow transition, workflow instance, and workflow history models.
- Tenant-aware authorization checks for every administration and work-order action.

## Risks and Product Decisions

- Plant hierarchy editing needs clear guardrails so pilot cleanup does not orphan MES records.
- Role-permission editing must prevent tenants from accidentally removing all admin access.
- Workflow editing must distinguish draft configuration changes from changes that affect active work orders.
- Custom-field validation should be driven by configuration metadata rather than industry-specific hard-coded forms.
- Template preview must remain read-only until the final onboarding submission to preserve idempotent onboarding behavior.

## Suggested Delivery Order

1. Admin invite acceptance.
2. Role-permission matrix.
3. Editable plant hierarchy tree.
4. Industry template preview.
5. Work-order editor using custom fields.
6. Work-order list and detail pilot view.
7. Workflow designer MVP.
8. Workflow transition execution.
9. Pilot readiness checklist.
