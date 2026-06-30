# IND5.0 / MES2 Full Use-Case Adaptation Study

Date: 2026-06-29  
Agent: Solution Architect Agent  
Scope: MES2 codebase, attached product context, architecture notes, sprint backlog, module charters, schema, routes, and screens.

## Executive Summary

MES2 is already more than a composites MES prototype. The current codebase contains a configurable industrial platform foundation with tenant onboarding, plant hierarchy, RBAC, audit events, Configuration Studio, configurable work orders, MES execution, quality checkpoints, process inventory, OEE shift runs, HRMS profiles, SAP integration UI shell, reporting stubs, and pilot readiness screens.

The main architecture gap is not "missing modules" in the abstract. The gap is that some modules are implemented as concrete tables/routes/screens, while others exist as Sprint 3 planning artifacts or UI placeholders. Sprint 4 should harden the configurable operational core and tenant isolation. Sprint 5 should add domain depth for quality, inventory, maintenance, ERP/SAP, HRMS, and ticketing. Sprint 6 should industrialize reporting, AI, industry templates, compliance, and scale for 100-10,000 employee tenants.

## Current Product Evidence

### Implemented Or Strongly Implied In Code

| Area | Actual Evidence | Current Use Cases |
|---|---|---|
| Platform Core | `platform_tenants`, companies, plants, areas, departments, lines, work centers, users, roles, permissions, role assignments, audit events; `/api/platform/*`; `PlatformCoreModule`, `TenantOnboardingWizard`, `PlantHierarchyManager`, `RolePermissionMatrix`, `PilotReadinessChecklist` | Tenant bootstrap, plant hierarchy, user invite, role-permission matrix, audit review, template preview, pilot readiness |
| Configuration Studio | `configurable_object_types`, custom fields/options/values, workflow definitions/states/transitions/instances/history; `/api/configuration/*`; `ConfigurationStudioModule` | Configure object types, custom fields, workflow designer, workflow validation/activation, custom field values |
| MES Execution | `processes`, `process_steps`, `parts`, `part_step_instances`, state transitions, shift logs, timeline events; execution routes; `ProcessTab`, `ProcessFlowView`, `StartProcessDialog`, `RunningStepDialog` | Start process, execute steps, digital traveler, step status, rework events, shift logs, part timeline |
| MES Work Orders | `mes_work_orders`; `/api/mes/work-orders`; `WorkOrderStudio` | Configurable work-order list/create/update/status, custom fields, pilot lifecycle statuses |
| Quality | `control_checkpoints`, `checkpoint_results`, `evidence_files`, rework events; `/api/quality/defects`, rework/scrap/deviation routes; `QualityTab`, checkpoint photo upload | Control plan checkpoints, QA confirmation, photo evidence, defects, rework, scrap, deviation |
| Inventory | `kit_inventory`, `resin_lot_inventory`, `resin_consumption`, `supply_lots`, `supply_requirements`; inventory/material routes; `InventorySection`, `IncomingPage`, material dialogs | Material creation, kit creation, resin lot creation, process inventory, readiness supply checks |
| OEE | `oee_shift_runs`, downtime events, production counts; `/api/oee/*`; OEE module/operator/supervisor/report components | Shift start/end, downtime log, production counts, OEE dashboard, machine drilldown, shift reports |
| HRMS | `hrms_employee_profiles`, skill catalog, employee skills, shift calendars/assignments; `/api/hrms/*`; `WorkforceManager` | Employee profile setup, skill catalog basis, shift assignment view, workforce readiness foundation |
| Maintenance/Assets | legacy `moulds`, `mould_events`, batches; `OperationsTab`, moulding UI; Sprint 3 maintenance charter | Mould status/events, batch association, maintenance-ready asset concepts, but no full maintenance API yet |
| ERP/SAP | `SapIntegrationModule`; ERP/SAP Sprint 3 charter | SAP-compatible integration planning, mapping and posting concepts, but no integration runtime tables/routes yet |
| Reporting/AI | analytics routes, dashboard components, OEE PDF reports, reporting/AI charter | KPIs, trends, dashboard, OEE reports; AI/report catalog still planned |
| Work Management/Ticketing | `DefectSprintBoard`, `NotificationBell`, work-management charter | Defect/action board and notifications exist; generalized ticketing not implemented |
| Security/Audit | JWT/Supabase auth, invite acceptance, RBAC tables, audit events, auth middleware | Login, invite acceptance, role permissions, audit event storage; enforcement needs hardening |
| ICT | `ICTModule` | ICT screen shell exists; operational use cases are not yet modeled |

## Actual Use-Case Inventory By Domain

### MES
- Define process masters and ordered process steps.
- Start a process/work execution instance for a part or work order.
- Track current step, step status, elapsed time, target time, waiting/block/breakdown/pause reasons.
- Assign employees to step instances and shifts.
- Maintain digital traveler context with part, process, current step, timeline, material, and quality state.
- Execute checkpoint-gated steps with QA confirmation and evidence.
- Handle rework from one step to another.
- Run configured work-order headers with custom fields and lifecycle status.

Missing for configurable product:
- Versioned routings/operations and process templates.
- Work-order to routing/operation bridge between `mes_work_orders` and legacy `parts` execution.
- Dispatch list by plant/line/work center/shift.
- Lot/serial genealogy across consumed and produced material.
- Operator tablet mode with offline/poor-network handling.
- Electronic work instructions and parameter capture by operation.

### ERP/SAP
- Current code has UI/planning only; Sprint 3 charter defines material/BOM/routing/order/receipt/posting contracts.

Missing:
- Integration connection profiles, object mappings, inbox/outbox, posting attempts, reconciliation items.
- Material master, BOM, routing, PO, production order import APIs.
- Goods issue/receipt, quality usage decision, valuation hook events.
- Retry/replay/dead-letter and ticket generation for failures.
- Tenant-configurable source-of-truth and posting policy.

### OEE
- Start/end shift runs by work center.
- Log downtime and production counts.
- Compute dashboard availability/performance/quality/OEE.
- Operator and supervisor OEE screens; shift/monthly PDF reports.

Missing:
- Reason-code hierarchy by industry and plant.
- Planned downtime, changeover, microstop, speed-loss, and rate model configuration.
- Shift lock/approval and correction audit.
- Machine/line/asset mapping history.
- OEE link to maintenance breakdowns, quality defects, and ERP production confirmations.

### HRMS
- Employee profile, skill catalog, employee skills, shift calendars, shift assignments.
- Legacy employee login and shop-floor assignment support.

Missing:
- Attendance/clocking model unified with OEE shift clock.
- Certification expiry, training matrix, contractor validity, safety induction.
- Skill eligibility checks for operation, inspection, maintenance, and approval.
- Supervisor/crew structure and responsibility matrix.
- Privacy controls for HR-sensitive data in reports, tickets, notifications.

### Quality
- Control plan checkpoints per process step.
- Checkpoint results with measured value, QA status, deviation number, evidence files.
- Defect list and rework/scrap/deviation actions.

Missing:
- Inspection plan studio with versions, triggers, sampling, characteristic types.
- Inspection instances independent of legacy checkpoints.
- Nonconformance, CAPA, deviation lifecycle, customer complaints, certificate center.
- Material hold/release and lot status integration.
- E-signature-ready approval metadata and correction audit.

### Inventory
- Kits, glass kits, resin lots, resin consumption, supply lots, supply requirements.
- Process inventory/readiness and dashboard summary.

Missing:
- Canonical material master, UOM conversion, stock locations, lot/serial status.
- Reservation, issue, return, transfer, adjustment, cycle count, expiry, quarantine.
- Finished goods and semi-finished goods inventory.
- Spares inventory for maintenance.
- Inventory movement ledger and ERP reconciliation.

### Maintenance
- Mould master/events and batch linkage exist.
- Maintenance charter defines asset registry, PM, breakdown, spares, calibration, lockout.

Missing:
- Asset registry and asset-to-line/work-center mapping.
- PM plans/schedules/work orders.
- Breakdown work orders linked to OEE downtime.
- Calibration and safety lockout.
- Spare reservation/consumption and reliability metrics.

### ICT
- ICT module shell only.

Missing:
- Device/terminal registry, network devices, shop-floor kiosk health, printer/scanner support.
- ICT service tickets, asset assignment, software/version tracking.
- Integration endpoint monitoring and support escalation.

### Reporting/AI
- Dashboard KPIs, category summaries, trends, OEE reports.

Missing:
- Report catalog, KPI dictionary, report runs, exports, data freshness, traceability explorer.
- Governed AI assistant constrained to approved datasets.
- Anomaly queue for OEE, quality, inventory, workforce, work-order, and access signals.
- Tenant/plant/role scoped reporting and export audit.

### Workflow/Ticketing
- Workflow engine tables exist in Configuration Studio.
- Work-order workflow APIs and defect board exist.

Missing:
- General ticket board, ticket/task/link/comment/attachment/SLA/approval model.
- Cross-module ticket intake from MES, OEE, Quality, Maintenance, HRMS, Inventory, SAP.
- Notification preferences and escalation policies.

### Security/Audit
- Auth, invites, platform users/roles/permissions/assignments/audit events.

Missing:
- Centralized server-side permission enforcement on every route.
- Record/plant/work-center scope checks.
- Audit helper used by all write APIs.
- Segregation of duties for regulated and finance-impacting approvals.
- Tenant isolation test suite and export/download access controls.

## Missing Use Cases For 100-10,000 Employee Industrial Product

1. Multi-plant operating model with plant-scoped admins, supervisors, auditors, and cross-plant leadership.
2. Industry template marketplace or template library for process, quality, OEE, inventory, roles, forms, reports, and integrations.
3. Configurable routing and work-instruction templates with version/effective-date control.
4. Full material master, stock ledger, lot/serial genealogy, and warehouse location model.
5. Purchase receipt, incoming quality, material release, production issue, finished goods receipt.
6. Quality plan, inspection queue, nonconformance, CAPA, complaints, certificates, e-signature readiness.
7. Maintenance asset registry, PM, breakdown, calibration, lockout, spares.
8. HRMS eligibility engine for skills, certification, training, shifts, contractor validity, safety.
9. SAP/ERP integration runtime with idempotency, mapping, approvals, retries, reconciliation, tickets.
10. Work management as cross-module operating layer for blockers, approvals, escalations, and support work.
11. Report catalog, KPI governance, traceability, export controls, AI guardrails, anomaly review.
12. Tenant-scale security: scoped RBAC, audit immutability, row-level tenant isolation, data retention, backup/restore.

## Industry Adaptation Matrix

| Industry | Must Adapt | Existing Fit | Priority Gaps |
|---|---|---|---|
| Discrete manufacturing | Work orders, routings, serial/lot traceability, work centers, inspections, maintenance, OEE | Work orders, processes, OEE, checkpoints | Routing versions, dispatch, material issue/receipt, serial genealogy |
| Process manufacturing | Batch recipes, tanks/vessels, formula control, yields, holds, cleaning, expiry | Batches, supply lots, process steps | Recipe/formula model, batch genealogy, potency/UOM, clean-in-place, lot release |
| Automotive | APQP/PPAP, control plans, traceability, line OEE, rework/scrap, supplier quality | Control checkpoints, OEE, defects | PPAP docs, SPC, serial trace, customer complaints, containment, supplier NCR |
| Pharma/medical | eBR, validation, e-signature, deviations, CAPA, line clearance, equipment calibration | Audit/RBAC base, quality evidence | Part 11-ready signatures, batch records, line clearance, validated audit, calibration block |
| Food & beverage | Recipe/batch, allergen, expiry, sanitation, HACCP, recall traceability | Supply lots, batches, checkpoints | Allergen controls, sanitation records, expiry/FEFO, forward/backward recall |
| Plastics/injection molding | Moulds, machines, cavities, cycle time, resin lots, parameters, scrap | Moulds, resin lots, OEE | Machine parameter capture, cavity count, setup/changeover, mould PM, resin drying |
| Electronics | SMT/work cells, serials, test results, rework, ESD, component lots | Step execution, evidence, checkpoints | Serial genealogy, test integrations, ESD checks, component trace, firmware/version |
| Heavy industry | Assets, maintenance, permits, shift logs, safety, mobile inspection, downtime | OEE, shifts, maintenance charter | Asset hierarchy, lockout/permit, mobile rounds, long-cycle WIP, contractor controls |

## No-Code Configuration Dimensions

| Dimension | Configuration Objects Needed |
|---|---|
| Tenant | industry type, subscription tier, locale/timezone, modules enabled, data retention, numbering schemes |
| Company/Plant | legal entity, plant, area, department, line, work center, storage location, asset location |
| Lines/Work Centers | line type, work-center type, machine/asset mapping, rate model, shift calendar, OEE calculation policy |
| Process Templates | routing template, operation sequence, work instructions, parameters, evidence rules, version/effective date |
| Quality Plans | inspection triggers, characteristics, sampling rules, defect codes, holds, disposition, signatures, certificates |
| Roles/RBAC | roles, permissions, scope type, scope assignment, segregation-of-duties rules, approval authority |
| Forms/Custom Fields | object types, field definitions, options, validation, visibility, editability, display order |
| Workflows/Approvals | states, transitions, permissions, comments, approvals, SLA, e-signature, versioning, activation validation |
| Reports/KPIs | report catalog, KPI formulas, dimensions, saved views, export eligibility, sensitivity, freshness |
| Integrations | source of truth, mapping tables, connection profile, posting mode, retry policy, reconciliation, ticket routing |
| Notifications | channel, recipient rules, severity, digest/immediate, escalation, quiet hours |
| Terminology | tenant-specific labels for work order, batch, lot, line, shift, asset, inspection, defect |

## Sprint 4 / 5 / 6 Prioritization

### Sprint 4: Harden Configurable Operational Core

Outcome: a tenant can be onboarded, configured, secured, and run a realistic work-order/OEE/quality/inventory pilot without code changes.

1. Central tenant/RBAC/audit helper used by all new Platform, Configuration, MES, OEE, HRMS, and work-order routes.
2. Bridge `mes_work_orders` to execution routing/parts or define an explicit execution-run model.
3. Work-order editor maturity: standard fields, custom fields, workflow instance, audit, plant/work-center scope.
4. Plant hierarchy and role matrix hardening: unique codes, dependency checks, no last-admin lockout.
5. Configuration Studio activation/versioning for workflows and custom-field value upsert.
6. OEE reason-code configuration, shift lock, correction audit, and work-order link.
7. Inventory material master MVP with stock locations, lot status, movement ledger, reservation/issue to work order.
8. Quality gate service for current checkpoint and defect/deviation decisions.
9. Pilot reporting: operational dashboard, KPI definitions, traceability for one work order.
10. Tenant isolation and permission test suite.

### Sprint 5: Add Domain Depth And Cross-Module Workflows

Outcome: the product supports real plant operations across quality, inventory, maintenance, workforce, and ERP/SAP integration.

1. Quality plan studio, inspection queue/execution, nonconformance, deviation, CAPA starter lifecycle.
2. Maintenance asset registry, asset mapping, work requests, PM plans/schedules, breakdown link to OEE.
3. HRMS skills/certifications/shift eligibility checks for operator, inspector, technician, and approver actions.
4. SAP/ERP integration foundation: connections, mappings, inbox/outbox, material/BOM/routing/production order import.
5. Inventory receipts, quality hold/release, transfers, cycle count, expiry, spares reservation.
6. Work-management/ticketing foundation with boards, tickets, links, comments, attachments, SLAs, approvals.
7. Cross-module events: work-order blocker ticket, OEE downtime to maintenance request, quality defect to NC/ticket.
8. Industry template expansion for discrete, process, automotive, pharma/medical, F&B, plastics, electronics, heavy industry.

### Sprint 6: Industrialize Scale, Compliance, Reporting, AI

Outcome: IND5.0 is ready for multi-site customers with 100-10,000 employees and regulated/ERP-connected operations.

1. Report catalog, KPI dictionary, governed exports, freshness/lineage, traceability explorer.
2. AI reporting assistant with approved datasets, citations, permission checks, and audit.
3. Anomaly detection MVP for OEE loss, quality trend, inventory variance, workforce gaps, late work orders, access anomalies.
4. E-signature-ready quality/approval points, audit immutability review, regulated evidence packets.
5. SAP-compatible postings: goods issue, goods receipt, quality usage decision, valuation hooks, reconciliation, retry/replay.
6. Maintenance calibration, lockout/tagout, spares consumption, MTTR/MTBF reporting.
7. Multi-plant scale hardening: pagination, indexes, archiving, background jobs, notification delivery, export retention.
8. Template governance: template preview, clone, version, compare, upgrade, tenant override diff.

## Recommended Module Agent Ownership

| Workstream | Primary Owner | Partner Agents |
|---|---|---|
| Tenant/RBAC/audit hardening | Platform Core | Security and Release, Configuration Studio |
| No-code object/form/workflow engine | Configuration Studio | Platform Core, MES, Quality, Work Management |
| Work-order execution bridge | MES | OEE, Inventory, Quality, Reporting |
| OEE shift/downtime/count maturity | OEE | MES, Maintenance, HRMS, Reporting |
| Material master and movement ledger | ERP and Inventory | SAP Integration, Quality, MES |
| SAP-compatible runtime | SAP Integration | ERP and Inventory, Quality, Work Management, Security |
| Quality plan/NC/CAPA/compliance | Quality and Compliance | MES, ERP and Inventory, HRMS, Reporting |
| Asset/maintenance/calibration/lockout | Maintenance and Asset | OEE, Inventory, HRMS, Quality |
| Skills/shift/eligibility | HRMS and Workforce | Platform Core, OEE, Quality, Maintenance |
| Ticketing/SLA/approvals | Work Management | All module teams, Platform Core |
| Dashboards/reports/AI/anomalies | Reporting, Analytics, and AI | All source-domain owners, Security |
| Tenant isolation/release quality | Security and Release | Platform Core, QA Governance |
| Industry templates | Industry Template Strategist | Configuration Studio, all module product owners |
| Data ownership/canonical model | Data Governance Agent | Chief Platform Architect, module architects |

## Highest-Risk Architecture Decisions

1. Do not let legacy `parts` remain a hidden work-order master while `mes_work_orders` becomes a second master. Define the bridge or migration path in Sprint 4.
2. Do not add more module write APIs until tenant, permission, and audit helpers are centralized.
3. Do not hard-code industry behavior in React screens; use Configuration Studio metadata and industry templates.
4. Do not implement SAP posting before idempotent integration logs, mapping validation, approval gates, and retry/replay exist.
5. Do not treat reporting/AI as direct database access; use governed report datasets with permissions and freshness.
6. Do not build Quality as only checkpoint confirmation; regulated customers need plans, inspections, NC, CAPA, holds, signatures, and certificates.
7. Do not build Maintenance as only mould events; it must own maintainable assets and map to OEE/MES work centers.
8. Do not expose HRMS data broadly in tickets, reports, AI, or notifications; use eligibility signals and scoped views.
9. Do not scale to 10,000 employees without pagination, indexes, background jobs, audit retention, export limits, and notification controls.
10. Do not create separate approval engines in every module; use Configuration Studio workflow plus Work Management approval gates.

## Immediate Architecture Backlog

1. Create a canonical object ownership matrix for tenant, plant, work center, work order, routing, material, lot, asset, employee, inspection, defect, ticket, report, integration event.
2. Add server helper package: tenant resolution, actor resolution, permission check, plant scope check, audit write.
3. Define `mes_execution_runs` or work-order-to-part bridge.
4. Add integration runtime tables before SAP feature build.
5. Add ticketing core tables before cross-module generated tickets.
6. Add quality plan/inspection model before expanding defect workflows.
7. Add material master/movement ledger before ERP reconciliation.
8. Add asset registry before maintenance/OEE integration.
9. Add report/KPI catalog before AI assistant.
10. Add template versioning and tenant override model before broad industry rollout.

## Accepted Tactical Correction For Sprint 4

Date: 2026-06-29  
Source: Product owner architecture review  
Decision: accepted because it narrows scope and aligns with the current plan.

### 1. Work Order And Execution Ownership

`mes_work_orders` is the planning header. It owns quantity, dates, priority, plant/work-center targeting, lifecycle status, and configurable planning fields.

Execution must remain a separate operational instance. Sprint 4 should add a `work_order_executions` model that links a work order to the existing process/part execution flow, or to a future explicit execution-run table. Do not merge `mes_work_orders` and `parts`.

This keeps the existing Process Flow UI usable while giving OEE, Inventory, and Quality one stable execution context.

### 2. Quality Scope

Sprint 4 should not build full NC/CAPA. The accepted Sprint 4 quality scope is inspection plan hardening:

- versioned inspection/control plans
- effective dates
- checkpoint triggers from work-order or execution status
- reuse of the current checkpoint result and evidence flow

NC/CAPA starts in Sprint 5 as a thin layer linking defects, work orders, and deviations.

### 3. Inventory Scope

Sprint 4 inventory is not full WMS or procurement. It is a WIP/material control foundation:

- material master MVP
- unit of measure
- stock movement ledger
- issue and return against work-order execution
- produced quantity and finished/semi-finished receipt hooks

Procurement, GRN, putaway, picking, and advanced warehousing move to later ERP/inventory depth.

### 4. Refined Sprint Priority

Sprint 4 theme: operational glue. Make existing modules communicate securely before adding broad depth.

P0:
- centralized security, tenant, permission, and audit middleware
- `work_order_executions` bridge between work orders and process execution

P1:
- material master MVP
- stock ledger and work-order consumption

P2:
- inspection plan versioning
- OEE downtime/reason configuration through Configuration Studio

### 5. Industry Template Constraint

Do not attempt all industry templates in Sprint 4. Pilot only:

- Discrete manufacturing: BOM/routing/work-order flow
- Composites/plastics: kits, resin lots, curing/process execution, mould/machine linkage

The broader industry matrix remains valid, but Sprint 4 should prove template mechanics with these two first.

### 6. Deployment Direction

For MVP, use a shared database with strict tenant isolation and row-level security direction. Dedicated infrastructure can become an enterprise option later for very large or regulated customers.

### 7. Sprint 6 Pilot KPI

By the end of Sprint 6, the product should prove this complete flow:

Release work order -> execute with OEE, quality, and inventory tracking -> close work order -> post to SAP/ERP mock with reconciliation and audit.
