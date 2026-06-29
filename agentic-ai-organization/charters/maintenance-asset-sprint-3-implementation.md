# Maintenance and Asset Management Sprint 3 Implementation Plan

Date: 2026-06-29
Repository: Kalvinsadurock/IND5.0
Owner: Maintenance and Asset Agent
Sprint Goal: Deliver the Maintenance and Asset Management foundation needed for the IND5.0 pilot: asset registry, asset-to-line mapping, preventive maintenance, breakdown handling, spare-part coordination, work requests, technician assignment, calibration, safety lockout, and reliability reporting.

## Mission

Build an operational maintenance layer that keeps production assets visible, serviceable, safe, and connected to manufacturing execution. Sprint 3 should let plant teams answer four questions without spreadsheets:

1. Which asset is installed where, and what production line or machine does it affect?
2. What preventive, calibration, breakdown, or safety work is due or active?
3. Which technician can safely and skillfully perform the work?
4. How do maintenance events affect OEE downtime, spare-parts inventory, work orders, and reliability metrics?

## Sprint 3 Scope

Included:
- Asset registry for plants, areas, lines, machines, subassemblies, tools, gauges, and maintainable components.
- Machine and line mapping shared with OEE and MES work-order execution.
- Preventive maintenance plans based on time, usage, condition readings, and production calendar windows.
- Breakdown capture, maintenance work orders, fault classification, root cause, repair action, and return-to-service flow.
- Spare-parts reservation, issue, return, and consumption linkage through Inventory spares.
- Work requests from operators, supervisors, OEE downtime events, safety teams, and maintenance planners.
- Technician assignment using HRMS skills, certifications, shift availability, and safety authorization.
- MTTR, MTBF, downtime impact, open-work aging, backlog, compliance, and asset reliability dashboards.
- Calibration schedule, calibration execution, certificate capture, tolerance status, and quality hold triggers.
- Safety lockout/tagout controls, permit checks, isolation steps, authorization, and release approval.
- Integration contracts with OEE downtime, Inventory spares, HRMS skills, and MES work orders.

Excluded:
- Predictive maintenance models, vibration analytics, PLC/SCADA auto-ingestion, and IoT historian integrations.
- Full EAM financial depreciation, capital budgeting, and SAP fixed-asset accounting.
- Advanced route optimization for technicians.
- Native mobile offline mode beyond responsive tablet-ready flows.
- Payroll, contractor payment, and procurement approval workflows.

## Pilot Outcomes

- Maintenance users can create and maintain asset master data with hierarchy, ownership, location, status, criticality, and warranty information.
- OEE and MES can resolve a production machine or line to the correct maintainable asset record.
- Preventive maintenance work can be generated, assigned, executed, closed, audited, and measured for compliance.
- Breakdowns can be reported from OEE downtime or shop-floor work requests and converted into maintenance work orders.
- Spare parts can be reserved and consumed against maintenance work, with inventory balance visibility.
- Technician assignment respects HRMS skill, certification, safety, and shift-readiness constraints.
- Reliability metrics show MTTR, MTBF, downtime minutes, top failure modes, recurring assets, and backlog risk.
- Calibration assets can be scheduled, executed, certified, marked out of tolerance, and blocked when unsafe for production or inspection use.
- Safety lockout is enforced before hazardous maintenance work starts and released only after required approvals.

## Core Entities

| Entity | Description | Source / Owner |
|---|---|---|
| Maintenance Asset | Maintainable equipment, machine, tool, fixture, gauge, utility, or component | Maintenance |
| Asset Hierarchy | Parent-child asset structure from plant to component | Maintenance / Platform Core |
| Asset Location | Plant, area, line, work center, station, or storage location where asset is installed | Platform Core / Maintenance |
| Machine-Line Mapping | Link between maintainable assets, MES machines, OEE machines, and production lines | Maintenance / OEE / MES |
| Maintenance Strategy | Reactive, preventive, calibration, statutory, inspection, or condition-based approach | Maintenance |
| PM Plan | Recurring preventive maintenance definition with trigger, tasks, parts, and skill needs | Maintenance |
| PM Schedule | Dated generated work based on PM plan and production calendar | Maintenance |
| Maintenance Work Order | Planned or unplanned maintenance execution record | Maintenance |
| Work Request | Request raised before formal work-order planning | Operations / OEE / Maintenance |
| Breakdown Event | Unplanned failure affecting asset availability or quality | Maintenance / OEE |
| Failure Code | Failure mode, cause, remedy, and fault classification catalog | Maintenance |
| Spare Part | Inventory item used for maintenance repair or preventive work | Inventory |
| Technician Assignment | Planned owner for work execution with skills and shift context | Maintenance / HRMS |
| Calibration Record | Scheduled or completed calibration with result and certificate | Maintenance / Quality |
| Lockout Record | Safety isolation, tagout, permit, and release record for hazardous work | Maintenance / Safety |
| Reliability Snapshot | Calculated MTTR, MTBF, downtime, compliance, and backlog metrics | Maintenance |

## Asset Registry

- Support tenant, company, plant, area, line, work center, station, asset, and component hierarchy.
- Capture asset code, name, type, model, serial number, manufacturer, commissioning date, warranty dates, criticality, owner department, location, and active status.
- Track asset status: active, standby, under maintenance, breakdown, calibration due, locked out, retired, or quarantined.
- Identify OEE-impacting assets and MES-executable machines separately from support assets.
- Support asset documents such as manuals, drawings, checklists, certificates, and safety procedures.
- Record effective-dated changes to location, line mapping, criticality, and operating status.
- Prevent deletion of assets with historical work, downtime, calibration, spare consumption, or OEE linkage; use deactivation instead.

## Machine And Line Mapping

- Map each OEE machine to one maintainable asset and optionally to child components for deeper fault tracking.
- Map each MES work center, routing machine, or production line to the corresponding maintenance asset.
- Support bottleneck machine mapping so OEE downtime and maintenance downtime refer to the same asset.
- Allow one line to contain many maintainable assets and one asset to support multiple lines only where explicitly configured.
- Preserve mapping history so historical downtime, MTTR, MTBF, and work-order reports remain accurate after line changes.
- Flag unmapped OEE machines or MES work centers as integration readiness blockers.

## Preventive Maintenance

- Create PM plans by asset, asset type, line, criticality, meter reading, run hours, calendar frequency, or production count.
- Define PM tasks, safety precautions, required skills, estimated duration, required spares, tools, checklist steps, and acceptance criteria.
- Generate PM schedules with due date, due meter, planning window, preferred shift, and production impact flag.
- Coordinate PM windows with MES planned work and OEE planned downtime so availability calculations treat approved PM correctly.
- Support skipped, deferred, completed, partially completed, and overdue PM states with reason codes.
- Require supervisor approval for deferrals on critical assets.
- Track PM compliance by asset, line, technician, planner, and plant.

## Breakdowns

- Capture breakdown source: operator request, supervisor request, OEE downtime conversion, manual maintenance entry, or safety incident.
- Record failure start time, response time, repair start time, repair end time, return-to-service time, asset, line, work order, downtime event, symptom, failure mode, cause, remedy, and production impact.
- Support emergency breakdown work orders with minimal required data at creation and required classification before closure.
- Allow OEE downtime events to be linked to a maintenance breakdown and synchronized when repair times change.
- Separate production downtime, maintenance repair time, waiting-for-parts time, waiting-for-technician time, and safety lockout time for analysis.
- Require root cause and corrective action for repeat or critical-asset breakdowns.
- Prevent closure until required spare consumption, calibration impact, lockout release, and return-to-service checks are complete.

## Spare Parts

- Link PM plans and corrective work orders to planned spare parts, quantities, substitutes, and required availability dates.
- Check Inventory spares availability before work release for planned maintenance.
- Reserve parts against maintenance work orders and release unused reservations when work is cancelled or closed.
- Issue, consume, return, scrap, or substitute parts with reason and technician confirmation.
- Track part consumption by asset, component, failure mode, PM plan, and maintenance work order.
- Raise low-stock or no-stock signals to Inventory for critical spares used by critical assets.
- Support warranty and serial/batch capture for high-value or traceable spares.

## Work Requests

- Provide a quick request flow for operators, supervisors, quality, safety, and maintenance planners.
- Required fields: asset or line, symptom, priority, safety concern flag, production impact, requested by, and attachment or note where available.
- Allow request triage into duplicate, rejected, deferred, planned work, breakdown work order, PM follow-up, calibration work, or safety work.
- Convert OEE long downtime or repeated downtime into a work request with the downtime reason and asset context.
- Keep request status visible to the requester: submitted, triaged, planned, assigned, in progress, completed, rejected, or duplicate.
- Audit triage decisions and rejected requests.

## Technician Assignment

- Assign work by skill, certification, safety authorization, shift availability, plant scope, current workload, and asset familiarity.
- Consume HRMS employee identity, active status, role, shift assignment, skills, certifications, contractor expiry, and safety induction status.
- Show blockers when a technician lacks required skill, certification, lockout authorization, calibration authorization, or shift readiness.
- Support primary technician, assisting technicians, planner, approver, and safety observer roles.
- Allow reassignment with reason and preserve assignment history.
- Track actual labor time by technician and maintenance work order for reliability and capacity reporting.

## MTTR And MTBF

| Metric | Formula | Notes |
|---|---|---|
| Response Time | Repair start time - failure reported time | Measures maintenance responsiveness |
| Repair Time | Repair end time - repair start time | Core input to MTTR |
| Return-to-Service Time | Return-to-service time - failure reported time | Includes waiting, lockout, testing, and approval |
| MTTR | Sum repair time for breakdowns / breakdown count | Calculate by asset, line, failure mode, shift, technician team, and plant |
| Operating Time Between Failures | Next failure start - previous return-to-service time | Exclude planned downtime where configured |
| MTBF | Sum operating time between failures / failure intervals | Calculate for active, OEE-impacting assets |
| PM Compliance | Completed PM before due / due PM count | Include justified deferrals separately |
| Backlog Aging | Current date - work request or work-order creation date | Segment by priority and criticality |

- Store metric inputs with calculation snapshots for auditability.
- Exclude non-breakdown work from MTTR and MTBF unless explicitly classified as failure-related.
- Mark incomplete metrics when failure, repair, or return-to-service timestamps are missing.
- Recalculate reliability snapshots when breakdown classification, work-order closure, or asset mapping changes.

## Calibration

- Identify calibration-controlled assets such as gauges, measuring tools, inspection equipment, torque tools, sensors, and lab devices.
- Define calibration frequency, tolerance, method, standard used, external/internal provider, certificate requirement, and responsible owner.
- Generate calibration work orders separately from normal PM where compliance requires traceability.
- Record calibration result: pass, fail, adjusted, limited use, out of tolerance, damaged, or retired.
- Attach certificate, measured values, standard reference, technician, approver, and next due date.
- Block or warn MES/Quality use of out-of-calibration inspection assets where integration is enabled.
- Trigger quality impact review when an asset is found out of tolerance after use in production or inspection.

## Safety Lockout

- Require lockout/tagout workflow for work types or assets marked hazardous.
- Define isolation points, energy sources, lock sequence, tag requirements, permit references, verification steps, and release steps.
- Require authorized personnel for lock application, verification, work start, work completion, and release.
- Prevent hazardous work start until lockout is active and verified.
- Prevent asset return to service until all locks are released, guards restored, tests completed, and safety sign-off recorded.
- Link lockout duration to maintenance work order and optionally to OEE downtime classification.
- Audit every lock, tag, verification, override, and release event.

## Screens

1. Maintenance Dashboard
   - Open breakdowns, overdue PM, critical asset status, calibration due, safety lockouts, backlog, MTTR, MTBF, and spare-part blockers.

2. Asset Registry
   - Searchable asset list with plant, line, asset type, criticality, status, OEE mapping, MES mapping, and calibration flag.

3. Asset Detail
   - Tabs for profile, hierarchy, line mapping, work history, PM plans, spare parts, calibration, documents, lockout history, downtime, and audit trail.

4. PM Planner
   - Calendar and backlog view for due PM, resource needs, production impact, required spares, and deferral approvals.

5. Work Request Board
   - Intake, triage, duplicate detection, conversion to maintenance work order, and requester status visibility.

6. Maintenance Work Order
   - Planning, assignment, safety, parts, checklist, labor, downtime linkage, failure classification, attachments, closure, and audit.

7. Breakdown Console
   - Active breakdowns by line and asset with OEE downtime, response timer, technician status, spare blockers, and return-to-service checklist.

8. Spare Parts Panel
   - Planned, reserved, issued, consumed, returned, substituted, and unavailable parts for each work order.

9. Calibration Board
   - Due, overdue, in calibration, failed, out-of-tolerance, and certified assets with certificate status.

10. Safety Lockout Board
   - Active lockouts, assets under isolation, authorized personnel, open permits, and release readiness.

11. Reliability Reports
   - MTTR, MTBF, downtime Pareto, failure mode Pareto, PM compliance, backlog aging, repeat failure, spare consumption, and calibration compliance.

## API Groups

- /api/maintenance/assets
- /api/maintenance/assets/:id/hierarchy
- /api/maintenance/assets/:id/mapping
- /api/maintenance/pm-plans
- /api/maintenance/pm-schedules
- /api/maintenance/work-requests
- /api/maintenance/work-orders
- /api/maintenance/work-orders/:id/assignments
- /api/maintenance/work-orders/:id/parts
- /api/maintenance/work-orders/:id/labor
- /api/maintenance/breakdowns
- /api/maintenance/failure-codes
- /api/maintenance/calibrations
- /api/maintenance/lockouts
- /api/maintenance/reliability
- /api/maintenance/reports

## Integration Contracts

### OEE Downtime

- Consume OEE machine, line, active work-order run, downtime event, downtime reason, start time, end time, duration, and production impact.
- Convert eligible OEE downtime into maintenance work requests or breakdown work orders.
- Return maintenance work order status, technician response, repair start, repair end, return-to-service, and fault classification.
- Distinguish planned PM downtime from unplanned breakdown downtime for availability calculation.
- Keep shared asset IDs and mapping effective dates aligned between Maintenance and OEE.

### Inventory Spares

- Consume spare-part item master, stock location, on-hand quantity, available quantity, reserved quantity, reorder point, lot/serial details, and substitute parts.
- Reserve planned parts before work release.
- Issue, consume, return, scrap, or substitute parts against maintenance work orders.
- Send critical-spare demand, stockout risk, and actual usage back to Inventory.
- Do not own purchasing or warehouse valuation in Sprint 3.

### HRMS Skills

- Consume employee identity, active status, contractor status, shift assignment, skill catalog, skill proficiency, certification status, safety induction, and lockout authorization.
- Validate technician eligibility at assignment and work start.
- Return maintenance labor activity references for workforce utilization reporting.
- Do not expose private HR details in maintenance screens; show only operational eligibility and blocker reasons.

### MES Work Orders

- Consume released MES work orders, routing operations, target machine, line, production status, planned production windows, and hold status.
- Link maintenance work to affected MES work order when breakdown or PM occurs during production.
- Notify MES when an asset status changes to under maintenance, breakdown, locked out, calibration failed, or returned to service.
- Prevent MES execution on unavailable assets where the tenant enables hard blocking.
- Coordinate planned PM windows with MES work-order scheduling and OEE planned downtime.

## Permissions

- maintenance.asset.view
- maintenance.asset.manage
- maintenance.asset.mapping.manage
- maintenance.pm.view
- maintenance.pm.manage
- maintenance.pm.defer
- maintenance.request.create
- maintenance.request.triage
- maintenance.work_order.view
- maintenance.work_order.plan
- maintenance.work_order.assign
- maintenance.work_order.execute
- maintenance.work_order.close
- maintenance.breakdown.manage
- maintenance.parts.reserve
- maintenance.parts.consume
- maintenance.calibration.manage
- maintenance.calibration.approve
- maintenance.lockout.apply
- maintenance.lockout.verify
- maintenance.lockout.release
- maintenance.reliability.view
- maintenance.report.export

## Audit Events

- maintenance.asset.created
- maintenance.asset.updated
- maintenance.asset.deactivated
- maintenance.asset.mapping_updated
- maintenance.pm_plan.created
- maintenance.pm_plan.updated
- maintenance.pm_schedule.generated
- maintenance.pm.deferred
- maintenance.work_request.created
- maintenance.work_request.triaged
- maintenance.work_order.created
- maintenance.work_order.assigned
- maintenance.work_order.started
- maintenance.work_order.completed
- maintenance.work_order.closed
- maintenance.breakdown.reported
- maintenance.breakdown.classified
- maintenance.part.reserved
- maintenance.part.issued
- maintenance.part.consumed
- maintenance.part.returned
- maintenance.technician.assigned
- maintenance.labor.recorded
- maintenance.calibration.completed
- maintenance.calibration.failed
- maintenance.lockout.applied
- maintenance.lockout.verified
- maintenance.lockout.released
- maintenance.asset.returned_to_service
- maintenance.report.exported

## Sprint Work Plan

### Week 1: Asset Foundation And Mapping

- Finalize asset hierarchy, asset type catalog, criticality model, asset status values, and mapping fields.
- Define OEE machine, MES work center, and maintenance asset cross-reference contracts.
- Design asset registry, asset detail, and mapping views.
- Identify pilot assets, critical spares, calibration-controlled assets, and hazardous assets.
- Create sample asset hierarchy and line mapping data for dry-run validation.

### Week 2: Maintenance Work Management

- Define work request, PM plan, PM schedule, maintenance work order, checklist, and failure-code contracts.
- Design request intake, triage, PM planner, work-order execution, breakdown console, and closure workflows.
- Add technician assignment rules based on HRMS skill, certification, shift, and safety readiness.
- Define spare reservation, issue, consume, return, and substitution flows with Inventory.
- Define OEE downtime conversion and maintenance status sync behavior.

### Week 3: Calibration, Safety, And Reliability

- Design calibration board, calibration execution, certificate capture, and out-of-tolerance handling.
- Design safety lockout/tagout workflow with isolation points, authorization, verification, and release.
- Define MTTR, MTBF, PM compliance, backlog, failure Pareto, downtime impact, and spare consumption calculations.
- Add dashboard and report requirements for maintenance planner, supervisor, technician lead, safety officer, and plant manager.
- Finalize audit events, permissions, and exception handling.

### Week 4: Pilot Readiness And Acceptance

- Run end-to-end dry runs for preventive maintenance, breakdown from OEE downtime, spare stockout, technician skill blocker, calibration failure, and lockout release.
- Validate asset mapping against OEE downtime, Inventory spares, HRMS skills, and MES work-order scenarios.
- Confirm return-to-service rules for assets affecting active production.
- Prepare pilot playbook, role training checklist, reporting pack, and go-live sign-off criteria.

## Acceptance Criteria

### Asset Registry And Mapping

- Maintenance can create, update, search, and deactivate assets by tenant, plant, line, type, status, and criticality.
- Asset hierarchy supports parent-child components without losing work history.
- Each pilot OEE machine and MES work center maps to a maintenance asset.
- Mapping history preserves historical downtime and reliability reporting.
- Asset status changes are visible to OEE and MES where configured.

### Preventive Maintenance

- PM plans define recurrence, tasks, duration, skill needs, parts, safety requirements, and acceptance criteria.
- PM schedules generate due work and show overdue, due soon, deferred, and completed states.
- Planned PM can be aligned with OEE planned downtime and MES production windows.
- Critical-asset PM deferral requires reason and approval.
- PM compliance reports match underlying schedules and closures.

### Breakdowns And Work Requests

- Operators and supervisors can raise work requests with asset, symptom, priority, safety flag, and production impact.
- OEE downtime can create or link to a maintenance breakdown.
- Breakdown work orders track response, repair, return-to-service, failure mode, cause, remedy, downtime, and closure checks.
- Repeat breakdowns and critical failures require root cause and corrective action.
- Requesters can see current status after triage and conversion.

### Spare Parts

- Work orders can reserve, issue, consume, return, scrap, and substitute parts through Inventory spares.
- Planned work release warns or blocks when critical spares are unavailable.
- Actual spare consumption is linked to asset, component, failure mode, and work order.
- Unused reservations are released at cancellation or closure.
- Critical spare shortages appear as maintenance planning blockers.

### Technician Assignment

- Assignment validates HRMS active status, shift readiness, skill, certification, contractor access, and safety authorization.
- Work start is blocked when required technician eligibility is missing.
- Reassignment requires reason and preserves history.
- Labor time can be captured by technician and role.
- Maintenance screens show only operational eligibility, not private HR data.

### Calibration

- Calibration-controlled assets generate due and overdue calibration work.
- Calibration execution records result, measured values, certificate, technician, approver, and next due date.
- Failed or out-of-tolerance calibration changes asset status and triggers review.
- MES or Quality receives block/warn status for inspection assets where configured.
- Calibration compliance reports match due and completed records.

### Safety Lockout

- Hazardous work requires lockout before execution.
- Lockout records include isolation points, locks, tags, authorized personnel, verification, and release.
- Asset return to service is blocked until lockout is released and safety checks are complete.
- Lockout duration is visible on the maintenance work order and downtime analysis.
- All lockout events are audited.

### Metrics And Reports

- MTTR and MTBF calculate from breakdown timestamps and exclude non-breakdown work unless configured.
- Downtime Pareto can be grouped by asset, line, failure mode, cause, and work order.
- Reports cover PM compliance, backlog aging, repeat failures, spare consumption, calibration compliance, and technician workload.
- Metrics flag incomplete calculations when required timestamps or classifications are missing.
- Reliability snapshots retain source inputs for auditability.

### Integrations

- OEE downtime, Maintenance breakdowns, and asset status remain synchronized for pilot scenarios.
- Inventory spares supports reservation, issue, consumption, return, and substitution from maintenance work.
- HRMS skill and certification blockers are deterministic and visible during technician assignment.
- MES work orders receive asset availability and return-to-service signals.
- Integration failures produce actionable retry or blocker states instead of silent data loss.

## Sprint 3 Definition Of Done

- Implementation-ready data model, API groups, screens, workflows, integrations, permissions, audit events, and acceptance criteria are documented.
- Asset registry, machine/line mapping, PM, breakdowns, spare parts, work requests, technician assignment, MTTR/MTBF, calibration, and safety lockout are all represented.
- OEE downtime, Inventory spares, HRMS skills, and MES work-order integration boundaries are explicit.
- Pilot dry-run scenarios cover planned maintenance, unplanned breakdown, spare shortage, skill blocker, calibration failure, and lockout release.
- No code changes are required by this planning artifact.
