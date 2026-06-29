# OEE Sprint 3 Implementation Plan

## Mission
Deliver an operational OEE pilot for IND5.0 that captures shop-floor reality by machine, line, shift, work order, and operator, then turns it into actionable availability, performance, quality, and OEE insight.

## Sprint 3 Scope
Included: machine and line setup, shift clocking, planned vs actual production tracking, downtime reason capture, quality loss capture, OEE calculations, operator view, supervisor view, alerts, reports, MES work order integration, HRMS shift integration, acceptance tests, and pilot readiness checks.

Excluded: automated PLC/SCADA ingestion, predictive maintenance, advanced scheduling optimization, payroll calculations, SAP financial posting, full mobile offline mode, and enterprise BI replacement.

## Pilot Outcomes
- Supervisors can configure the pilot line, machines, rated speeds, products, and reason codes.
- Operators can clock into a shift, select active work orders, record production, downtime, rejects, and remarks.
- Supervisors can compare planned production against actual production by shift, work order, line, and machine.
- OEE metrics are calculated consistently from captured events and displayed with drill-down loss analysis.
- Alerts identify long downtime, missing reason codes, low OEE, production shortfall, and high rejects.
- Reports provide shift OEE, downtime Pareto, quality loss, production variance, and work order performance.

## Core Entities
| Entity | Description | Source / Owner |
|---|---|---|
| OEE Plant | Manufacturing site participating in OEE pilot | Platform Core |
| OEE Line | Production line or operating unit measured for OEE | MES / OEE |
| OEE Machine | Machine, station, or bottleneck asset measured under a line | OEE / Maintenance |
| Machine Rate | Standard cycle time, ideal run rate, or units per hour by product | OEE / MES |
| Shift Instance | Dated shift window used for OEE measurement | HRMS |
| Operator Clocking | Operator shift start, break, resume, and end events | HRMS / OEE |
| Work Order Run | OEE execution window linked to a MES work order and operation | MES / OEE |
| Production Count | Planned, good, reject, rework, and total count by run | MES / OEE |
| Downtime Event | Stop event with duration, reason, owner, and comment | OEE |
| Downtime Reason | Configurable reason tree for planned and unplanned downtime | OEE |
| Quality Loss Event | Reject, scrap, rework, or defect quantity tied to reason | Quality / OEE |
| OEE Snapshot | Calculated availability, performance, quality, and OEE result | OEE |
| OEE Alert | Rule-triggered operational alert for supervisor action | OEE / Work Management |

## Machine And Line Setup
- Support plant, area, line, machine, and bottleneck-machine assignment for pilot assets.
- Configure machine status: active, inactive, under maintenance, or excluded from OEE.
- Configure machine capability by product, operation, unit of measure, ideal cycle time, and rated speed.
- Identify line-level calculation mode: bottleneck machine, aggregate machine, or manually reported line counts.
- Support planned downtime categories such as breaks, changeover, preventive maintenance, sanitation, trials, and no plan.
- Require effective dates for rates and reason-code changes so historical OEE remains explainable.

## Shift Clocking
- Import shift definitions, planned shift windows, break windows, assigned crew, and supervisor from HRMS.
- Allow operators to clock in, start break, resume, and clock out from the OEE operator view.
- Validate operator eligibility against HRMS employee status, plant assignment, and skill or role requirements.
- Detect late clock-in, early clock-out, missing clock-out, and shift overlap exceptions.
- Calculate net available shift time as scheduled shift time minus planned non-production windows.
- Preserve manual supervisor adjustments with reason, comment, user, and audit event.

## Planned Vs Actual Production
- Pull released MES work orders, operations, product, planned quantity, due date, routing step, and target machine or line.
- Allow operators or supervisors to start a work order run for a machine or line during a shift.
- Track actual good quantity, reject quantity, rework quantity, scrap quantity, and total produced quantity.
- Compare actual production to planned production at work order, shift, line, machine, product, and supervisor levels.
- Support partial completion and carry-forward work orders across shifts.
- Prevent double-counting when multiple machines contribute to one line-level work order run.

## Downtime Reasons
- Provide a hierarchical downtime reason tree with category, reason, subreason, ownership group, planned/unplanned flag, and active status.
- Capture downtime start, downtime end, duration, machine, work order run, operator, reason, and comment.
- Allow quick-stop capture for short events and supervisor classification for unassigned downtime.
- Require a reason for downtime above the configured threshold.
- Mark downtime as planned or unplanned for availability calculation.
- Support reason-code governance: create, update, deactivate, and audit.

## Quality Loss
- Capture reject, scrap, and rework quantities against work order run, product, operation, machine, and shift.
- Classify quality loss by defect or reject reason with optional linkage to Quality inspection plans.
- Separate startup scrap, process scrap, reworkable defects, and final rejects for reporting.
- Feed accepted good quantity back to MES work order progress.
- Support supervisor correction of quality entries with audit trail.
- Exclude rework from good count until accepted by the configured MES or Quality rule.

## OEE Calculation Rules
| Metric | Formula | Notes |
|---|---|---|
| Planned Production Time | Shift scheduled time - planned non-production time | Uses HRMS shift and OEE planned downtime setup |
| Run Time | Planned production time - unplanned downtime | Uses downtime events assigned to measured asset |
| Availability | Run time / planned production time | 0 when planned production time is 0 |
| Ideal Output | Run time * ideal rate | Rate comes from machine/product/operation setup |
| Performance | Actual total count / ideal output | Cap display at configured threshold while storing raw result |
| Quality | Good count / actual total count | 0 when total count is 0 |
| OEE | Availability * Performance * Quality | Stored as decimal and displayed as percentage |

## Calculation Requirements
- Recalculate OEE whenever shift clocking, downtime, production count, quality loss, work order run, or machine rate changes.
- Store calculation inputs with each OEE snapshot for auditability.
- Support real-time shift-to-date calculations and final locked shift calculations.
- Calculate at machine, line, shift, work order, product, and plant summary levels.
- Flag incomplete calculations when required inputs are missing, such as no active rate or unclassified downtime.
- Provide sample-data validation for known OEE scenarios before pilot release.

## Operator View
1. Shift Clock: clock in, break, resume, clock out, and see assigned shift.
2. Work Queue: view released MES work orders assigned to the line or machine.
3. Run Control: start, pause, resume, change over, and complete work order run.
4. Production Entry: enter good, reject, rework, scrap, and remarks.
5. Downtime Capture: start/stop downtime and select reason from guided reason tree.
6. Quality Loss Capture: record reject reason, quantity, and optional defect note.
7. Shift Status: see planned quantity, actual quantity, downtime minutes, and current OEE.

## Supervisor View
1. Live OEE Board: line and machine OEE, availability, performance, quality, status, and active work order.
2. Shift Review: reconcile clocking, planned time, downtime, counts, rejects, and calculation warnings.
3. Downtime Classification: assign missing reasons, merge duplicate stops, and correct durations.
4. Production Variance: compare planned vs actual by work order, product, line, and shift.
5. Quality Loss Review: inspect top reject reasons and approve corrections.
6. Alert Center: acknowledge, comment, assign, or convert alerts into improvement tickets.
7. Shift Lock: finalize OEE after required checks pass.

## Alerts
- Long unplanned downtime exceeds configured duration.
- Downtime event missing reason after threshold.
- Shift OEE below target.
- Availability, performance, or quality below target.
- Actual production below planned run-rate trajectory.
- Reject or scrap rate exceeds configured threshold.
- Operator missing clock-in or clock-out.
- Active work order run has no production count update after configured interval.
- Machine running without linked MES work order.

## Reports
- Shift OEE Report by plant, line, machine, shift, product, and supervisor.
- Downtime Pareto by reason, machine, line, duration, count, and owner.
- Planned vs Actual Production Report by work order, product, operation, and shift.
- Quality Loss Report by defect/reject reason, product, operation, machine, and shift.
- Machine Utilization Report with planned time, run time, downtime, and idle time.
- Work Order Performance Report with rate variance, yield, and completion progress.
- Alert History Report with acknowledgement, resolution status, owner, and aging.

## API Groups
- /api/oee/setup/lines
- /api/oee/setup/machines
- /api/oee/setup/machine-rates
- /api/oee/setup/downtime-reasons
- /api/oee/shifts/current
- /api/oee/clocking
- /api/oee/work-order-runs
- /api/oee/production-counts
- /api/oee/downtime-events
- /api/oee/quality-loss-events
- /api/oee/calculations
- /api/oee/alerts
- /api/oee/reports
- /api/oee/supervisor/shift-review

## Integration Contracts
### MES Work Orders
- Consume released work orders, routing operation, product, planned quantity, unit of measure, target line or machine, and work order status.
- Push production progress, good quantity, reject quantity, rework quantity, scrap quantity, run start, run stop, and completion signals.
- Respect MES work order status transitions so OEE cannot run closed, held, or unreleased work orders.
- Link each OEE run, downtime event, and quality loss event to work order and operation when applicable.

### HRMS Shifts
- Consume shift calendar, shift instance, crew assignment, supervisor assignment, employee identity, employee status, and role or skill eligibility.
- Use HRMS break windows and planned attendance to calculate planned production time.
- Return OEE clocking exceptions for HRMS attendance reconciliation when enabled.
- Do not perform payroll calculations in OEE.

## Permissions
- oee.setup.view
- oee.setup.manage
- oee.operator.clock
- oee.operator.run_work_order
- oee.operator.record_production
- oee.operator.record_downtime
- oee.operator.record_quality_loss
- oee.supervisor.view_live_board
- oee.supervisor.classify_downtime
- oee.supervisor.correct_entries
- oee.supervisor.lock_shift
- oee.alert.acknowledge
- oee.report.view
- oee.report.export

## Required Audit Events
- oee.line.created
- oee.machine.created
- oee.machine_rate.updated
- oee.downtime_reason.updated
- oee.operator.clocked_in
- oee.operator.clocked_out
- oee.work_order_run.started
- oee.work_order_run.completed
- oee.production_count.recorded
- oee.production_count.corrected
- oee.downtime.started
- oee.downtime.ended
- oee.downtime.classified
- oee.quality_loss.recorded
- oee.quality_loss.corrected
- oee.shift_oee.calculated
- oee.shift.locked
- oee.alert.raised
- oee.alert.acknowledged
- oee.report.exported

## Sprint Work Plan
### Week 1: Setup And Contracts
- Finalize pilot asset hierarchy, machine rates, downtime reason tree, quality loss reasons, and OEE targets.
- Define MES work order and HRMS shift payloads with field ownership and error handling.
- Build setup screens and API contracts for lines, machines, rates, and reason codes.
- Create controlled sample data for calculation validation.

### Week 2: Capture And Calculation
- Build operator shift clocking, work order run, production count, downtime, and quality loss workflows.
- Implement OEE calculation service with machine, line, shift, work order, and product rollups.
- Add recalculation triggers and incomplete-data warnings.
- Validate formulas against controlled scenarios for availability, performance, quality, and OEE.

### Week 3: Supervisor Operations
- Build live OEE board, shift review, downtime classification, production variance, and quality loss review.
- Add alert rules, acknowledgement, comments, and ticket handoff-ready payloads.
- Add shift lock workflow with validation checklist and audit trail.
- Complete reports and export-ready datasets.

### Week 4: Pilot Hardening
- Run end-to-end pilot scripts across normal run, downtime-heavy shift, quality-loss shift, short shift, and carried work order scenarios.
- Fix data reconciliation gaps between OEE, MES work orders, and HRMS shifts.
- Confirm permissions, audit events, and supervisor corrections.
- Prepare pilot playbook, training checklist, and go-live readiness sign-off.

## Acceptance Tests
- Machine and line setup supports active pilot assets, rates, and reason-code governance.
- HRMS shift import creates dated shift windows with planned breaks and assigned crew.
- Operator clocking captures start, break, resume, and end events with exception detection.
- Released MES work orders can be selected and run from the operator view.
- Planned vs actual production is accurate for partial and completed work orders.
- Downtime events reduce availability only when unplanned and inside planned production time.
- Quality loss reduces quality according to good count and total count rules.
- Availability, performance, quality, and OEE match controlled sample calculations.
- Supervisor can classify downtime, correct entries, and lock a shift with audit trail.
- Alerts trigger for downtime, missing reasons, low OEE, production shortfall, and high rejects.
- Reports match underlying event data and support shift, line, machine, product, and work order filters.
- OEE updates MES work order progress without allowing closed, held, or unreleased work orders.

## Definition Of Done
- Pilot line, machine, rate, downtime reason, quality reason, and target setup is complete.
- Operator and supervisor views are usable for one full shift without spreadsheet backup.
- OEE calculations are verified with controlled data and real pilot dry-run data.
- MES work order and HRMS shift integrations pass happy-path and exception-path tests.
- Alerts and reports support daily production review.
- Permissions and audit events cover critical setup, capture, correction, lock, alert, and export actions.
- Shift lock produces a final OEE record that can be defended from source events.
- Pilot readiness is signed off by OEE, MES, HRMS, Operations, and Quality owners.
