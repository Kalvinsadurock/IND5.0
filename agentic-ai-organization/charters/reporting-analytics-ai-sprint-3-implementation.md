# Reporting, Analytics, and AI Sprint 3 Implementation Plan

## Mission
Deliver the Sprint 3 Reporting, Analytics, and AI foundation for IND5.0 so tenant admins, plant managers, supervisors, quality leaders, warehouse leads, HRMS coordinators, and implementation consultants can inspect operational pilot performance through governed dashboards, traceable reports, export-ready datasets, and controlled AI assistance.

Reporting, Analytics, and AI should not become a second source of truth. Sprint 3 must consume operational records from Platform Core, MES work orders, OEE, Quality, Inventory, HRMS, ERP/SAP integration, and Configuration Studio, then provide consistent KPI definitions, traceability views, anomaly signals, natural-language reporting, and audit-ready exports.

## Sprint 3 Scope
Included:
- Operational dashboard shell for tenant, plant, line, work center, work order, shift, material, quality, inventory, and workforce views.
- Standard KPI catalog with definitions, formulas, dimensions, data owners, refresh behavior, and caveats.
- Traceability reports for work order, material lot, quality event, OEE event, workforce assignment, inventory movement, and audit event linkage.
- OEE reports for shift OEE, availability, performance, quality, downtime Pareto, production variance, and machine utilization.
- Quality reports for inspections, defects, nonconformance, deviations, CAPA, complaints, certificates, holds, rework, and scrap.
- Inventory reports for stock position, movement history, lot status, shortages, reservations, aging, cycle-count exceptions, and ERP reconciliation readiness.
- HRMS workforce reports for shift attendance, crew assignment, qualification coverage, training readiness, labor allocation, and clocking exceptions.
- AI assistant use cases for report discovery, KPI explanation, dashboard summarization, anomaly explanation, action suggestions, and natural-language report generation.
- Anomaly detection MVP for OEE loss spikes, quality defect trends, inventory variances, late work orders, workforce coverage gaps, and unusual export or access patterns.
- Data governance controls for data dictionary, metric ownership, lineage, freshness, auditability, export policy, access control, and tenant isolation.
- Export needs for CSV, XLSX-ready tabular payloads, PDF-ready report snapshots, API report datasets, scheduled export definitions, and audit events.

Excluded:
- Full enterprise BI replacement.
- Custom drag-and-drop report builder beyond predefined configurable filters and saved views.
- Predictive optimization or autonomous work-order decisions.
- LLM write-back to operational records.
- Unreviewed AI actions against MES, Quality, Inventory, HRMS, or ERP.
- Cross-tenant benchmarking using customer data.
- External data warehouse implementation unless provided by Platform Core architecture.

## Pilot Outcomes
- Plant leadership can open an operational dashboard and see daily status for work orders, OEE, quality, inventory, workforce, alerts, and blockers.
- Supervisors can drill from KPI tiles into source-linked reports that explain the underlying records.
- Implementation consultants can validate that KPI definitions match the pilot playbook before go-live.
- Quality, OEE, Inventory, and HRMS reports use shared dimensions and do not disagree on tenant, plant, line, shift, work order, lot, product, operator, or time period.
- Users can export governed datasets with permission checks, audit events, filters, timestamp, actor, and report version.
- AI assistant can answer controlled reporting questions from approved report datasets and clearly cite the report, filter, and freshness window used.
- Anomaly detection can flag obvious operational outliers for review without automatically changing source data.
- Tenant isolation is verified for dashboard queries, report APIs, AI retrieval, anomaly jobs, and export files.

## Core Entities
| Entity | Description | Source / Owner |
|---|---|---|
| Report Catalog Item | Governed dashboard, report, dataset, or AI-queryable view with owner and permission requirements | Reporting |
| KPI Definition | Metric name, formula, dimensions, owner, data sources, refresh rule, target, and caveat text | Reporting / Domain Owner |
| Dashboard View | Role-specific dashboard layout with tiles, charts, filters, drilldowns, and saved filter state | Reporting |
| Report Dataset | Tenant-scoped queryable dataset assembled from operational source records | Reporting |
| Report Run | Execution record for a report with filters, user, timestamp, row count, freshness, and export status | Reporting |
| Traceability Link | Relationship between work order, lot, operation, quality record, OEE event, inventory movement, workforce event, and audit event | Reporting / Source Domain |
| Insight Annotation | Human or AI-generated explanation attached to a KPI, anomaly, report run, or dashboard snapshot | Reporting / AI |
| Anomaly Signal | Detected operational outlier with scope, score, reason, source records, status, and reviewer | AI / Reporting |
| Natural-Language Query | User question, resolved intent, dataset used, filters, generated answer, and citations | AI |
| Export Job | Governed export request with format, filters, actor, status, file metadata, and retention policy | Reporting |
| Data Dictionary Entry | Business definition for field, metric, dimension, source, sensitivity, and lineage | Data Governance |
| Report Audit Event | Immutable trace for report access, export, AI query, anomaly review, and dataset refresh | Platform Core / Reporting |

## Dashboard Scope
### Operational Command Dashboard
- Show work orders by status, priority, plant, line, work center, owner, due date, and workflow state.
- Show current shift OEE, availability, performance, quality, downtime minutes, reject rate, production shortfall, and unclassified loss.
- Show open quality blockers, failed inspections, active holds, nonconformances, CAPA aging, certificates due, and complaint SLA risk.
- Show inventory stockouts, constrained materials, lots on quality hold, cycle-count exceptions, movement exceptions, and ERP sync issues.
- Show workforce coverage by shift, planned crew, actual clock-in, missing clock-out, qualification gaps, and supervisor assignment.
- Provide drilldowns from every tile to the source report with the same tenant, plant, time, product, line, shift, and work order filters.

### Supervisor Shift Dashboard
- Show shift-to-date OEE, active work orders, planned vs actual quantity, downtime Pareto, quality loss, and unresolved alerts.
- Show operators assigned, clocking status, qualification warnings, and handover notes.
- Highlight missing source data such as no active machine rate, unclassified downtime, missing inspection result, or unconfirmed count.
- Provide shift lock readiness indicators from OEE, Quality, Inventory, HRMS, and MES where available.

### Quality Leadership Dashboard
- Show inspection queue, failed inspections, defects by severity, nonconformance status, material holds, CAPA aging, complaint aging, and certificate readiness.
- Trend defects by product, operation, work center, machine, supplier, customer, and lot.
- Compare OEE quality loss with Quality-approved defect and disposition records.
- Show audit and signature readiness indicators for regulated approval points.

### Inventory And Warehouse Dashboard
- Show on-hand stock, available stock, reserved stock, quarantined stock, lot status, aging inventory, reorder risks, and movement exceptions.
- Highlight inventory impact from quality holds, scrap decisions, rework, work-order consumption, and ERP lot status changes.
- Provide shortage and excess views by material, plant, warehouse, line, work center, work order, and due date.

### HRMS Workforce Dashboard
- Show planned vs actual attendance by shift, crew, supervisor, role, skill, and work center.
- Show missing clock-in/out, overtime risk, coverage gaps, qualification readiness, expiring certifications, and training blockers.
- Link workforce availability to work-order assignments, OEE operator events, and quality inspector approval eligibility.

## KPI Definitions
Each KPI must have a catalog entry with:
- Business definition and formula.
- Source system and source fields.
- Grain: tenant, plant, area, line, work center, machine, shift, work order, product, lot, operator, inspector, or day.
- Refresh behavior: real-time, shift-to-date, hourly, daily, or on report run.
- Owner and approving domain.
- Required filters and default time window.
- Sensitivity classification and export eligibility.
- Known exclusions and incomplete-data warnings.

### Operational KPIs
| KPI | Definition | Primary Source |
|---|---|---|
| Work Orders Open | Count of active work orders not closed or cancelled | MES Pilot |
| Work Orders Late | Open work orders with due date before report time | MES Pilot |
| Production Plan Attainment | Actual good quantity divided by planned quantity for selected period | MES / OEE |
| Workflow Cycle Time | Time from work order release to close, grouped by workflow version and state path | MES / Configuration Studio |
| Operational Blockers | Count of active quality holds, missing inspections, material shortages, workforce gaps, and critical alerts | Reporting Rollup |

### OEE KPIs
| KPI | Definition | Primary Source |
|---|---|---|
| Availability | Run time divided by planned production time | OEE |
| Performance | Actual total count divided by ideal output | OEE |
| Quality Rate | Good count divided by total count | OEE / Quality |
| OEE | Availability multiplied by performance and quality | OEE |
| Unplanned Downtime Minutes | Sum of unplanned downtime inside planned production time | OEE |
| Downtime Pareto Percent | Downtime reason duration divided by total downtime duration | OEE |
| Production Variance | Actual quantity minus planned quantity by work order, product, shift, and line | MES / OEE |

### Quality KPIs
| KPI | Definition | Primary Source |
|---|---|---|
| First Pass Yield | Passed inspections or accepted units divided by total inspected units | Quality |
| Defect Rate | Defect quantity divided by inspected or produced quantity, based on report context | Quality / OEE |
| Open Nonconformances | Count of nonconformance records not closed | Quality |
| CAPA Aging | Days open by CAPA lifecycle state and owner | Quality |
| Complaint SLA Risk | Complaints due within threshold or past due | Quality |
| Hold Impact Quantity | Quantity under quality hold by lot, product, work order, and disposition status | Quality / Inventory |

### Inventory KPIs
| KPI | Definition | Primary Source |
|---|---|---|
| On-Hand Quantity | Quantity physically recorded by item, lot, warehouse, and location | Inventory / ERP |
| Available Quantity | On-hand minus reserved, held, quarantined, or blocked quantity | Inventory / Quality |
| Stockout Risk | Materials projected below minimum or required work-order quantity | Inventory / MES |
| Inventory Aging | Quantity grouped by receipt age, lot age, expiry, and movement inactivity | Inventory / ERP |
| Cycle-Count Variance | Counted quantity minus system quantity by item, lot, and location | Inventory |
| ERP Reconciliation Exceptions | Inventory records whose ERP sync status, lot status, or movement confirmation is inconsistent | Inventory / ERP |

### HRMS Workforce KPIs
| KPI | Definition | Primary Source |
|---|---|---|
| Attendance Coverage | Actual clocked-in employees divided by planned crew for a shift | HRMS |
| Qualification Coverage | Required qualified assignments filled divided by required qualified assignments | HRMS / Quality / OEE |
| Clocking Exceptions | Late, early, missing, duplicate, or overlapping clock events | HRMS / OEE |
| Labor Allocation Hours | Clocked or assigned hours by work order, line, work center, and role | HRMS / MES |
| Certification Expiry Risk | Employees with required certification expiring within configured window | HRMS |

## Traceability Reports
### Work Order Traceability Report
- Link work order header, custom fields, workflow history, operation events, OEE runs, production counts, quality inspections, defects, material lots, inventory movements, workforce assignments, and audit events.
- Show chronological event timeline with actor, timestamp, source module, event type, and record link.
- Support filters by tenant, plant, work order, product, operation, line, work center, shift, status, and date range.
- Flag missing links such as production count without work order, quality loss without defect classification, or inventory movement without lot.

### Material Lot Traceability Report
- Link source material lot, supplier lot, receipt, inventory status, movements, consumption, produced lots, quality holds, inspections, nonconformance, rework, scrap, shipment reference, and ERP status.
- Support forward trace from source lot to output work orders and backward trace from output lot to consumed materials.
- Identify lots impacted by quality holds, deviations, CAPA, complaints, or expired certificates.

### Quality Event Traceability Report
- Link inspection result, defect, deviation, nonconformance, disposition, CAPA, complaint, certificate, material hold, OEE quality loss, inventory status, and audit events.
- Show affected scope: work order, operation, lot, product, machine, line, customer, supplier, and quantity.
- Support regulated-readiness evidence export with record versions, approvals, and audit history.

### OEE Loss Traceability Report
- Link downtime event, reason code, machine, line, shift, work order run, operator, production count, quality loss, alert, supervisor correction, and final OEE snapshot.
- Explain availability, performance, quality, and OEE calculation inputs for any shift, line, machine, or work order.
- Highlight incomplete calculation inputs and post-lock corrections.

### Workforce Traceability Report
- Link shift definition, crew assignment, clocking events, operator work-order activity, inspector approval activity, qualification status, training readiness, and OEE/Quality outcomes.
- Preserve HR-sensitive field rules and avoid exposing payroll-only data in operational reporting.

## Standard Reports
### OEE Reports
- Shift OEE Report by plant, line, machine, shift, product, supervisor, and work order.
- OEE Trend Report by day, week, shift, product, machine, line, and target.
- Downtime Pareto Report by reason, subreason, duration, count, owner, machine, line, and work order.
- Production Variance Report by planned quantity, good quantity, reject quantity, rework quantity, scrap quantity, and rate variance.
- Machine Utilization Report with planned time, run time, idle time, planned downtime, unplanned downtime, and maintenance overlap.
- OEE Calculation Audit Report showing formula inputs, source records, recalculation history, incomplete flags, and lock status.

### Quality Reports
- Inspection Execution Report by plan, product, operation, work center, lot, inspector, pass/fail, and due status.
- Defect Pareto Report by defect type, severity, quantity, product, operation, machine, supplier, customer, and source.
- Nonconformance Aging Report by category, owner, severity, affected quantity, lifecycle state, and due date.
- Deviation And Approval Report by affected scope, risk, expiry, approver, and compensating control.
- CAPA Effectiveness Report by root cause, action owner, due date, completion, verification, and recurrence.
- Customer Complaint Report by customer, product, shipment, lot, severity, SLA, investigation status, and closure.
- Certificate Readiness Report by lot, shipment, supplier, product, expiry, approval status, and missing evidence.

### Inventory Reports
- Stock Position Report by item, lot, warehouse, location, status, available quantity, reserved quantity, held quantity, and expiry.
- Inventory Movement Report by receipt, issue, transfer, adjustment, consumption, scrap, rework, quarantine, and release.
- Lot Status Report by quality status, ERP status, hold reason, disposition, and release readiness.
- Shortage And Reservation Report by work order, material, line, due date, required quantity, available quantity, and shortage quantity.
- Inventory Aging Report by item, lot, receipt date, last movement date, expiry, and slow-moving category.
- Cycle Count Exception Report by expected quantity, counted quantity, variance, reason, reviewer, and approval status.
- ERP Reconciliation Report by item, lot, movement ID, sync status, failure reason, and retry readiness.

### HRMS Workforce Reports
- Shift Attendance Report by planned crew, actual attendance, clock-in/out status, break status, supervisor, and exception reason.
- Workforce Coverage Report by role, skill, qualification, line, work center, shift, and open gap.
- Operator Activity Report by work order, machine, line, shift, production entry, downtime entry, and quality loss entry.
- Inspector Qualification Report by required certification, current status, expiry date, inspection approvals, and restricted activity.
- Training Readiness Report by role, training requirement, completion status, expiry, and affected pilot process.
- Labor Allocation Report by work order, line, operation, employee, role, and hours.

### Governance And Audit Reports
- Report Access Audit by user, tenant, report, filters, row count, timestamp, and permission result.
- Export Audit by user, report, format, filters, file retention, timestamp, and recipient where applicable.
- Data Freshness Report by dataset, last refresh, source watermark, row count, failure, and stale indicator.
- Metric Dictionary Report by KPI, owner, formula, source, dimensions, sensitivity, and approval status.
- Tenant Isolation Verification Report for test evidence across dashboards, reports, AI retrieval, anomaly jobs, and exports.

## AI Assistant Use Cases
### Report Discovery
- Answer which report or dashboard should be used for a user question.
- Suggest relevant filters, dimensions, date windows, and drilldowns.
- Explain report limitations and freshness before presenting results.

### KPI Explanation
- Explain KPI definitions in plain language using approved KPI catalog entries.
- Show formula, source records, grain, refresh window, and caveats.
- Provide domain owner and approval status for each KPI.

### Dashboard Summarization
- Summarize the current operational dashboard for a selected tenant, plant, shift, or work order.
- Highlight what changed since the previous shift or prior day.
- Cite dashboard tiles and report datasets used for the summary.

### Natural-Language Reporting
- Convert controlled user questions into approved report queries.
- Support questions such as "show downtime by reason for yesterday's night shift" or "which lots are blocked by quality holds for work orders due this week."
- Return tabular results, chart suggestions, and report links when the resolved query is within the governed dataset catalog.
- Refuse or redirect questions that request unauthorized, cross-tenant, payroll-sensitive, or unsupported source data.

### Anomaly Explanation
- Explain why an anomaly was raised, including baseline, threshold, affected scope, candidate source records, and recommended reviewer.
- Distinguish anomaly from confirmed defect, nonconformance, shortage, or workforce issue.
- Allow authorized users to mark anomaly as new, investigating, accepted, dismissed, or linked to an operational record.

### Action Suggestions
- Suggest next review actions such as classify downtime, review inspection failure, check lot hold, reconcile inventory movement, or validate workforce coverage.
- Keep all actions as recommendations in Sprint 3.
- Require the user to navigate to the source module for any operational write.

## Anomaly Detection MVP
### Signal Types
- OEE loss spike: downtime, low availability, low performance, low quality, or OEE below configured baseline.
- Quality trend: defect rate increase, repeated defect type, repeated nonconformance category, CAPA recurrence, or complaint pattern.
- Inventory variance: cycle-count variance, unusual adjustment, stockout risk, expired lot movement, or ERP reconciliation failure.
- Workforce gap: planned crew not filled, required qualification missing, repeated late clock-in, or inspector approval by expiring qualification.
- Work-order risk: late work order, excessive state dwell time, repeated transition rejection, missing required custom field, or blocked workflow.
- Governance risk: unusual export volume, repeated denied report access, stale dataset, or AI query against restricted data.

### Detection Requirements
- Use tenant-scoped historical baselines only.
- Support simple rules and statistical thresholds before advanced models.
- Store source records, baseline window, threshold, score, created timestamp, and reviewer status.
- Avoid automated write-back to MES, OEE, Quality, Inventory, HRMS, or ERP.
- Provide false-positive feedback capture for tuning.
- Emit audit events for anomaly creation, status change, dismissal, and link to source record.

## Natural-Language Reporting Guardrails
- Resolve user intent only against approved report catalog items and governed datasets.
- Apply the current user's tenant, role, plant scope, and report permissions before query execution.
- Never retrieve another tenant's records for answer generation or examples.
- Cite report name, filters, timestamp, freshness, and row count summary.
- Mark answers as incomplete when source data is stale, missing, or outside the report catalog.
- Block free-form SQL generation for end users.
- Avoid exposing sensitive HRMS fields, payroll-only data, personally sensitive notes, or unrestricted audit details.
- Log prompt, resolved intent, dataset IDs, filters, permissions, answer metadata, and export requests according to AI audit policy.

## Data Governance
### Data Dictionary
- Maintain dictionary entries for every KPI, report field, dashboard tile, AI-queryable dataset, and exportable column.
- Include business name, technical source, owner, domain, formula, data type, sensitivity, allowed dimensions, and retention rule.
- Distinguish operational source fields from derived reporting fields.

### Lineage And Freshness
- Capture source module, source table or API group, source event watermark, last refresh time, record count, and transformation version for each dataset.
- Show stale, partial, failed, and complete freshness states in report metadata.
- Support drilldown from KPI to source record references where permissions allow.

### Metric Governance
- Assign metric owner and approving domain for every KPI.
- Require versioning for KPI formula changes.
- Preserve old KPI definitions for historical report runs.
- Flag reports when comparing periods calculated under different metric versions.

### Sensitive Data Handling
- Classify fields as public operational, internal operational, quality-sensitive, HR-sensitive, regulated evidence, tenant admin, or restricted audit.
- Mask or remove sensitive fields from exports unless permission and business purpose are present.
- Prevent AI assistant from summarizing restricted fields for unauthorized users.

### Auditability
- Every report run, dashboard access, AI query, anomaly review, dataset refresh, saved view, schedule change, and export must be auditable.
- Audit entries should include tenant, actor, report, dataset, filters, format, timestamp, permission outcome, row count, and request ID.

## Tenant Isolation And Security
- All dashboard, report, AI, anomaly, and export queries must require tenant scope.
- Tenant scope must be enforced server-side and cannot rely only on UI filters.
- Plant, area, line, work center, role, permission, and record-level constraints must be applied before returning report data.
- Saved views, scheduled exports, AI query history, and anomaly signals must be tenant-scoped.
- Export files must include tenant-bound metadata and retention controls.
- Cross-tenant operational analytics are out of scope for Sprint 3.
- Test evidence must include attempts to access another tenant's dashboard, report dataset, export file, anomaly, and AI answer context.

## Export Needs
### Formats
- CSV for tabular operational data.
- XLSX-ready dataset payloads for multi-sheet operational reports where the frontend or export worker can render the workbook.
- PDF-ready snapshot payloads for dashboard and regulated evidence packets.
- JSON API response for internal integrations and automated QA validation.

### Export Controls
- Require explicit report export permission.
- Apply the same tenant, plant, role, and row-level filters used for on-screen reports.
- Include report name, filters, timestamp, actor, tenant, row count, metric version, freshness, and sensitivity label in export metadata.
- Support export status: requested, running, completed, failed, expired, and revoked.
- Emit audit event for every export request, completion, failure, download, and deletion.
- Retain exports only for the configured retention window.
- Block exports that exceed configured row limits unless an elevated permission is present.

### Scheduled Exports
- Support saved export definitions for authorized users if Sprint 3 capacity allows.
- Schedule definition must include report, filters, format, frequency, recipient scope, sensitivity, retention, and owner.
- Scheduled exports must not send restricted HRMS, audit, or regulated evidence data outside approved recipients.

## Integration Contracts
### Platform Core
- Consume tenant, company, plant, area, line, work center, user, role, permission, and audit events.
- Use Platform Core as the authority for tenant isolation, actor identity, RBAC, and audit persistence.
- Publish reporting audit events for dashboard access, report run, export, AI query, and anomaly review.

### MES Work Orders
- Consume work order header, status, workflow state, custom fields, plant, line, work center, product, due date, owner, and workflow history.
- Provide work-order status, lateness, cycle time, transition history, and traceability reports.
- Do not mutate work order records from Reporting or AI in Sprint 3.

### OEE
- Consume OEE snapshots, shift records, machine rates, production counts, downtime events, quality loss events, alerts, corrections, and shift lock status.
- Provide OEE dashboards, loss reports, KPI explanations, anomaly detection, and traceability to source events.

### Quality
- Consume inspection plans, inspection instances, results, defects, deviations, nonconformances, holds, dispositions, CAPA, certificates, complaints, approvals, and audit references.
- Provide quality dashboards, quality trend reports, regulated evidence views, and AI explanations within permission limits.

### Inventory And ERP/SAP
- Consume material master references, item, lot, warehouse, location, stock status, movements, reservations, holds, scrap, rework, expiry, and ERP sync status.
- Provide inventory position, aging, movement, shortage, lot status, and reconciliation reports.
- Keep ERP financial posting and valuation outside Reporting in Sprint 3.

### HRMS Workforce
- Consume shift definitions, planned crew, clocking events, employee identity, role, skill, qualification, training readiness, certification status, and supervisor assignment.
- Provide workforce coverage and attendance reports with HR-sensitive field controls.
- Do not expose payroll-only data or unrestricted personal details.

### Configuration Studio
- Consume custom field definitions, workflow definitions, workflow versions, workflow state labels, transition labels, and report-facing metadata.
- Use configuration metadata to label work-order reports and workflow reports without hard-coding industry-specific fields.

## Screens
1. Operational Command Center
   - Cross-domain dashboard with work order, OEE, quality, inventory, workforce, anomaly, and blocker tiles.

2. KPI Catalog
   - Searchable KPI definitions, formulas, owners, source fields, metric versions, dimensions, targets, and caveats.

3. Report Catalog
   - Governed reports grouped by OEE, Quality, Inventory, HRMS, Work Orders, Traceability, Audit, and Governance.

4. Report Runner
   - Filters, report preview, freshness metadata, drilldown links, saved views, export action, and access warnings.

5. Traceability Explorer
   - Work order, lot, quality event, OEE event, workforce event, and audit timeline with record links.

6. AI Reporting Assistant
   - Natural-language question input, resolved report intent, cited answer, table output, chart suggestion, and guardrail messages.

7. Anomaly Review Queue
   - Open signals, severity, score, affected scope, source records, explanation, status, owner, and disposition.

8. Export Center
   - Export job history, status, download metadata, retention, revocation, and audit trail.

9. Data Governance Console
   - Data dictionary, dataset freshness, lineage, sensitivity, metric ownership, and tenant isolation test evidence.

## API Contract Needs
| API Group | Methods | Purpose |
|---|---|---|
| /api/reporting/catalog | GET, POST, PATCH | Governed dashboard, report, dataset, and AI-queryable catalog metadata. |
| /api/reporting/kpis | GET, POST, PATCH | KPI definitions, formulas, owners, versions, dimensions, and caveats. |
| /api/reporting/dashboards/operational | GET | Operational command dashboard data with tenant, plant, shift, and role filters. |
| /api/reporting/reports/:reportCode/run | POST | Execute governed report with filters, freshness metadata, and audit event. |
| /api/reporting/reports/:reportCode/schema | GET | Return report fields, dimensions, filters, sensitivity, and export eligibility. |
| /api/reporting/traceability/work-orders/:id | GET | Work order traceability timeline and linked records. |
| /api/reporting/traceability/lots/:id | GET | Material lot forward and backward traceability. |
| /api/reporting/traceability/quality-events/:id | GET | Quality event traceability and evidence links. |
| /api/reporting/oee/* | GET | OEE standard report datasets and drilldowns. |
| /api/reporting/quality/* | GET | Quality standard report datasets and drilldowns. |
| /api/reporting/inventory/* | GET | Inventory standard report datasets and drilldowns. |
| /api/reporting/hrms/* | GET | Workforce standard report datasets and drilldowns. |
| /api/reporting/ai/query | POST | Resolve natural-language report question against governed datasets. |
| /api/reporting/anomalies | GET, POST, PATCH | Signal list, detection output intake, review status, and source links. |
| /api/reporting/exports | GET, POST | Export job request and job history. |
| /api/reporting/exports/:id/download | GET | Permission-checked export download or signed handoff URL. |
| /api/reporting/governance/dictionary | GET, POST, PATCH | Data dictionary entries, sensitivity, owners, and lineage metadata. |
| /api/reporting/governance/freshness | GET | Dataset freshness, source watermark, and refresh failure status. |

Report run response should include:
- report_run_id
- report_code
- tenant_id
- applied_filters
- columns
- rows or paginated result reference
- row_count
- freshness_status
- source_watermarks
- metric_versions
- sensitivity_label
- export_eligible
- warnings
- audit_event_id

AI query response should include:
- natural_language_query_id
- resolved_intent
- report_code or dataset_ids
- applied_filters
- permission_decision
- answer
- citations
- freshness_status
- row_count_summary
- limitations
- audit_event_id

## Permissions
- reporting.dashboard.view
- reporting.kpi_catalog.view
- reporting.kpi_catalog.manage
- reporting.report_catalog.view
- reporting.report_catalog.manage
- reporting.report.run
- reporting.report.save_view
- reporting.report.export
- reporting.traceability.view
- reporting.oee.view
- reporting.quality.view
- reporting.inventory.view
- reporting.hrms.view
- reporting.audit.view
- reporting.ai.query
- reporting.ai.view_history
- reporting.anomaly.view
- reporting.anomaly.review
- reporting.export.manage
- reporting.governance.view
- reporting.governance.manage
- reporting.scheduled_export.manage

## Required Audit Events
- reporting.dashboard.viewed
- reporting.kpi.created
- reporting.kpi.updated
- reporting.kpi.versioned
- reporting.report_catalog.created
- reporting.report_catalog.updated
- reporting.report.run
- reporting.report.saved_view_created
- reporting.report.saved_view_updated
- reporting.report.export_requested
- reporting.report.export_completed
- reporting.report.export_failed
- reporting.report.export_downloaded
- reporting.traceability.viewed
- reporting.ai.query_submitted
- reporting.ai.query_answered
- reporting.ai.query_denied
- reporting.anomaly.created
- reporting.anomaly.reviewed
- reporting.anomaly.dismissed
- reporting.anomaly.linked
- reporting.dataset.refreshed
- reporting.dataset.refresh_failed
- reporting.dictionary.updated
- reporting.governance.sensitivity_changed
- reporting.permission.denied

## Implementation Backlog
### Workstream 1: KPI And Report Governance
- Define report catalog, KPI catalog, data dictionary, sensitivity labels, metric owner rules, and report metadata.
- Align KPI definitions with OEE, Quality, Inventory, HRMS, MES, ERP/SAP, and Platform Core owners.
- Create metric versioning rules and report-run metadata requirements.
- Document tenant isolation, plant scope, role scope, export eligibility, and audit requirements for every report.

### Workstream 2: Operational Dashboards
- Build operational command dashboard dataset contract across work orders, OEE, quality, inventory, workforce, and anomalies.
- Define supervisor shift dashboard and domain dashboard tiles with common filters.
- Add drilldown behavior from each dashboard tile to governed report runs.
- Add incomplete-data warnings for stale datasets, missing source records, and unclassified operational events.

### Workstream 3: Standard Reports
- Build OEE report datasets for shift OEE, downtime Pareto, production variance, utilization, and calculation audit.
- Build Quality report datasets for inspections, defects, NC, deviations, CAPA, complaints, certificates, and holds.
- Build Inventory report datasets for stock position, movements, lot status, shortages, aging, cycle counts, and ERP reconciliation.
- Build HRMS workforce report datasets for attendance, coverage, qualification, operator activity, inspector readiness, training, and labor allocation.
- Build traceability reports for work orders, material lots, quality events, OEE losses, and workforce assignments.

### Workstream 4: AI Assistant And Natural-Language Reporting
- Define approved AI intents for report discovery, KPI explanation, dashboard summarization, natural-language reporting, anomaly explanation, and action suggestions.
- Implement intent resolution against report catalog metadata rather than unrestricted database access.
- Add citations, freshness disclosure, permission checks, and guardrail responses.
- Store AI query audit metadata and support review of AI answer history by authorized users.

### Workstream 5: Anomaly Detection
- Define baseline and threshold rules for OEE, Quality, Inventory, HRMS, Work Orders, and Governance signals.
- Build anomaly signal data contract with scope, score, reason, source links, reviewer, and status.
- Build anomaly review queue and feedback loop for accepted, dismissed, investigating, or linked signals.
- Validate anomaly generation with controlled pilot scenarios and avoid automated operational write-back.

### Workstream 6: Exports, Security, And Audit
- Build export job contract for CSV, XLSX-ready payloads, PDF-ready snapshots, and JSON report datasets.
- Enforce report export permissions, row limits, sensitivity labels, retention, revocation, and download audit events.
- Apply tenant, plant, role, and record-scope filters before report execution and export generation.
- Add audit events for dashboard access, report runs, AI queries, anomaly reviews, data refreshes, and exports.
- Produce tenant isolation test evidence for dashboards, reports, AI retrieval, anomalies, and exports.

## Sprint Work Plan
### Week 1: Governance And Contracts
- Finalize KPI catalog, report catalog, data dictionary, sensitivity labels, and metric ownership.
- Align source fields and report dimensions with OEE, Quality, Inventory, HRMS, MES, ERP/SAP, and Platform Core agents.
- Define API response envelopes for report runs, AI queries, anomaly signals, and export jobs.
- Establish acceptance test scenarios for tenant isolation, report permissions, and export auditability.

### Week 2: Dashboards And Standard Reports
- Implement operational command dashboard contract and supervisor shift dashboard contract.
- Complete OEE, Quality, Inventory, and HRMS report definitions with filters, dimensions, and freshness metadata.
- Add traceability report contracts for work orders, lots, quality events, OEE losses, and workforce assignments.
- Validate report totals against controlled source-domain sample data.

### Week 3: AI And Anomaly MVP
- Implement approved natural-language reporting intents and KPI explanation flows.
- Add dashboard summarization and anomaly explanation using report-run citations.
- Build anomaly signal rules for OEE loss, quality trend, inventory variance, workforce gap, work-order risk, and governance risk.
- Validate guardrails for unauthorized, cross-tenant, restricted HRMS, and unsupported questions.

### Week 4: Export And Pilot Hardening
- Complete export center, export metadata, retention, revocation, and audit events.
- Run end-to-end pilot scripts for dashboard drilldown, traceability report, AI report question, anomaly review, and export download.
- Verify tenant isolation across dashboard APIs, report APIs, AI retrieval, anomaly queue, saved views, and export files.
- Prepare reporting playbook, KPI dictionary, and pilot readiness sign-off.

## Acceptance Criteria
### Dashboards And KPIs
- Operational command dashboard shows work order, OEE, quality, inventory, workforce, anomaly, and blocker status for the selected tenant and plant.
- Every dashboard tile has an approved KPI or report definition with owner, formula, source, freshness, and drilldown.
- KPI catalog includes definitions for operational, OEE, quality, inventory, and HRMS workforce metrics.
- Report results disclose freshness, source watermarks, metric versions, filters, and incomplete-data warnings.

### Traceability And Standard Reports
- Work order traceability links workflow, custom fields, OEE, quality, inventory, workforce, and audit events where source records exist.
- Material lot traceability supports backward and forward trace across inventory, quality, work orders, and ERP status.
- OEE reports explain calculation inputs and match OEE source snapshots for controlled scenarios.
- Quality reports reconcile defects, inspections, NC, holds, CAPA, complaints, certificates, rework, and scrap.
- Inventory reports show stock, movements, lot status, shortages, aging, cycle-count exceptions, and ERP reconciliation status.
- HRMS workforce reports show attendance, coverage, qualification, operator activity, inspector readiness, and training readiness without exposing payroll-only data.

### AI And Anomalies
- AI assistant resolves reporting questions only against approved report catalog items and governed datasets.
- AI answers cite report name, filters, freshness, row count summary, and limitations.
- AI refuses or redirects unauthorized, cross-tenant, restricted HRMS, unrestricted SQL, and unsupported questions.
- Anomaly detection creates reviewable signals for OEE, Quality, Inventory, HRMS, Work Orders, and Governance scenarios.
- Anomaly review supports status updates, dismissal reasons, source links, and audit events without operational write-back.

### Governance, Tenant Isolation, And Exports
- Tenant scope is enforced server-side for dashboards, reports, traceability, AI retrieval, anomalies, saved views, and exports.
- Report export requires permission, applies the same filters as screen reports, includes metadata, and emits audit events.
- Sensitive fields are masked or excluded according to data dictionary and permission rules.
- Dataset freshness, lineage, row count, and refresh failure status are visible to authorized users.
- Tenant isolation test evidence covers positive and negative access cases for reports, AI, anomalies, and export downloads.

## Sprint 3 Definition Of Done
- Implementation-ready data model, API contracts, dashboards, reports, AI guardrails, anomaly detection, export controls, permissions, audit events, and acceptance criteria are documented.
- Plan covers operational dashboards, KPI definitions, traceability reports, OEE reports, quality reports, inventory reports, HRMS workforce reports, AI assistant use cases, anomaly detection, natural-language reporting, data governance, tenant isolation, and export needs.
- Domain dependencies on Platform Core, MES, OEE, Quality, Inventory, HRMS, ERP/SAP, and Configuration Studio are explicit.
- Reporting remains a governed consumer of operational data and does not become a competing source of truth.
- AI assistant is constrained to approved reporting datasets with citation, freshness, permission, and audit requirements.
- Export behavior is governed, auditable, sensitivity-aware, tenant-scoped, and retention-controlled.
- No code changes are required by this planning artifact.
