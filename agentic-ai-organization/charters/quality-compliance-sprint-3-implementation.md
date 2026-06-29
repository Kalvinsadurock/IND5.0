# Quality and Compliance Sprint 3 Implementation Plan

## Mission
Deliver the Sprint 3 Quality and Compliance foundation for IND5.0 so plants can define inspection requirements, record defects and nonconformances, control rework and scrap, execute CAPA, preserve audit evidence, and prepare regulated approvals without breaking MES execution flow.

The implementation must let quality teams answer one operational question during every work order: is the material, operation, equipment output, and disposition decision conforming, traceable, approved, and ready for the next step?

## Sprint 3 Scope
Included:
- Inspection plan setup for incoming, in-process, final, first-article, line-clearance, and certificate-driven checks.
- Inspection execution tied to MES work orders, operations, samples, equipment, operators, inspectors, and ERP material lots.
- Defect, deviation, nonconformance, rework, scrap, and disposition workflows.
- CAPA lifecycle from issue intake through root cause, action plan, verification, and closure.
- Audit trail coverage for quality records, corrections, approvals, exports, and lifecycle changes.
- E-signature readiness for regulated approval points without requiring full production Part 11 validation in Sprint 3.
- Certificate and document readiness for material, process, calibration, and customer-facing quality evidence.
- Customer complaint intake, investigation, linkage to nonconformance/CAPA, and closure tracking.
- Integration contracts with MES work orders, ERP material lots, OEE quality loss, HRMS inspector qualifications, Platform Core RBAC, and Configuration Studio.

Excluded:
- Laboratory instrument automation and LIMS replacement.
- Statistical process control beyond basic inspection result capture and threshold warnings.
- Full electronic batch record release.
- Final regulatory validation package execution.
- Supplier quality portal and customer portal self-service.
- Automated financial postings for scrap, rework cost, or warranty claims.

## Pilot Outcomes
- Quality engineers can configure reusable inspection plans by product, material, operation, work center, supplier, customer, and lot context.
- Operators and inspectors can execute required inspections from active MES work orders with clear pass, fail, hold, and disposition decisions.
- Defects and deviations can be recorded with reason codes, severity, containment, evidence, and traceable source events.
- Nonconformances can quarantine affected material lots, work order output, or serialized units until disposition is complete.
- Rework and scrap decisions feed MES work order progress, ERP lot status, and OEE quality loss without double-counting.
- CAPA provides disciplined investigation, action ownership, effectiveness checks, and closure evidence.
- Audit trail and e-signature-ready approval points are identified for inspection release, disposition, CAPA closure, and certificate approval.
- Customer complaints can be linked to lots, shipments, defects, nonconformances, and CAPA records.

## Core Entities
| Entity | Description | Source / Owner |
|---|---|---|
| Quality Plan | Reusable inspection plan definition with trigger, scope, checks, sampling, and approval rules | Quality |
| Inspection Characteristic | Measured, visual, document, or checklist requirement within a plan | Quality |
| Sampling Rule | Frequency, sample size, AQL-like rule, first-piece rule, or lot-based sample method | Quality |
| Inspection Instance | Executable inspection created for a work order, operation, lot, receipt, shipment, or complaint | Quality / MES |
| Inspection Result | Captured value, status, evidence, inspector, timestamp, and disposition contribution | Quality |
| Defect Record | Specific observed quality issue with type, severity, quantity, location, and evidence | Quality / OEE |
| Deviation | Approved temporary departure from normal process, specification, or routing requirement | Quality / Engineering |
| Nonconformance | Controlled quality case for nonconforming product, material, process, document, or customer issue | Quality |
| Material Hold | Quarantine or release restriction applied to ERP material lot, MES output, or serialized unit | Quality / ERP |
| Disposition Decision | Use-as-is, rework, repair, scrap, return-to-supplier, downgrade, release, or reject decision | Quality |
| Rework Order Link | Link from nonconformance disposition to MES rework operation or work order | Quality / MES |
| Scrap Record | Quantity, reason, cost category, lot, work order, and approval evidence for scrapped material | Quality / ERP / OEE |
| CAPA Case | Corrective and preventive action lifecycle linked to root cause and effectiveness checks | Quality |
| Certificate Record | Certificate of analysis, conformance, calibration, inspection, or customer-specific evidence | Quality / ERP |
| Customer Complaint | External issue intake linked to customer, shipment, lot, product, defect, NC, and CAPA | Quality / CRM / ERP |
| Quality Audit Event | Immutable trace of quality data changes, approvals, signatures, exports, and lifecycle changes | Platform Core |

## Inspection Plan Requirements
- Support plan triggers for MES work order release, operation start, operation complete, material receipt, lot release, final inspection, shipment release, customer complaint, and manual ad hoc inspection.
- Scope plans by tenant, plant, product, product family, material, ERP lot type, supplier, customer, work center, operation, routing step, and effective date.
- Define inspection characteristics with type: numeric, pass/fail, checklist, visual defect, document verification, photo evidence, certificate verification, or free-text observation.
- Support specification limits, target values, tolerance bands, units of measure, required evidence, required comments, and mandatory failure reason codes.
- Define sampling rules by lot, batch, work order quantity, time interval, first article, startup, changeover, operator, machine, and skip-lot policy.
- Allow versioning with effective dates so historical inspection records remain tied to the plan version used at execution time.
- Require plan validation before activation: active characteristics, units, limits, sample rule, trigger, owner, and approval requirements.

## Inspection Execution
- Generate inspection instances automatically from MES work order and ERP lot events where configured.
- Allow manual creation for ad hoc quality checks, deviations, customer complaints, and containment activities.
- Present operators only the inspection steps they are allowed to perform; certified inspectors complete gated checks and approvals.
- Capture measured values, pass/fail status, defect quantity, attachments, photos, comments, instrument reference, inspector, and timestamp.
- Support partial inspection save, final submission, supervisor review, and quality approval.
- Block or warn MES work order progression when required inspection results are missing, failed, expired, or awaiting approval.
- Apply material hold automatically when a failed inspection is configured as hold-requiring.
- Preserve correction history for any edited inspection result with before value, after value, reason, user, timestamp, and audit event.

## Defects And Deviations
- Record defects from inspection execution, MES operator capture, OEE quality loss entry, customer complaints, or manual quality intake.
- Classify defect by product, operation, work center, machine, defect type, defect location, severity, suspected cause, quantity, and containment status.
- Distinguish isolated defects from systemic deviations and nonconformance cases.
- Support deviation request, risk assessment, temporary approval, expiration date, affected work orders, affected lots, and required compensating controls.
- Require deviation approval before allowing a work order or lot to proceed under an exception.
- Link deviations to inspection plan waivers, work instruction exceptions, engineering changes, and customer approvals where relevant.
- Show active deviations on MES work order execution so operators know approved temporary conditions.

## Nonconformance And Disposition
- Create nonconformance records from failed inspections, defects, deviations, ERP lot holds, customer complaints, or manual quality initiation.
- Assign nonconformance category: product, process, material, supplier, equipment, documentation, customer, or safety/regulatory.
- Capture affected scope: work order, operation, ERP material lot, serialized unit, machine, line, shipment, customer, supplier, and quantity.
- Apply material hold or quarantine status immediately for affected lots and output where the severity requires containment.
- Support containment tasks for identify, segregate, label, block movement, notify owner, and verify containment complete.
- Allow disposition decisions: release, use-as-is, rework, repair, scrap, return-to-supplier, downgrade, sort, re-inspect, or escalate to CAPA.
- Require approval by configured role for high-severity, customer-impacting, regulated, or cost-impacting dispositions.
- Push approved disposition outcomes to MES work order execution, ERP material lot status, and OEE quality loss using controlled integration contracts.

## Rework And Scrap
- Link rework disposition to a MES rework operation, rework route, child work order, or corrective task.
- Track rework quantity, source lot, destination lot, operation, assigned work center, reason, expected completion, and inspection requirements after rework.
- Prevent reworked quantity from being counted as conforming good output until the required inspection or approval rule passes.
- Capture scrap quantity, scrap reason, lot, work order, operation, machine, defect source, approval status, and cost category.
- Support partial scrap, partial rework, and split disposition against one nonconformance.
- Feed scrap and reworkable defect counts to OEE quality loss with the same defect taxonomy used by Quality.
- Provide ERP handoff-ready payloads for inventory status, lot disposition, and scrap/rework accounting without performing final financial posting in Sprint 3.

## CAPA
- Create CAPA cases from repeated defects, high-severity nonconformance, audit findings, customer complaints, supplier issues, or manual quality review.
- Support lifecycle: intake, triage, investigation, root cause, action plan, implementation, verification, effectiveness check, closure, and reopened.
- Capture risk, severity, recurrence, affected products, affected lots, affected operations, containment actions, and regulatory/customer notification flags.
- Support root-cause methods such as 5 Why, fishbone categories, cause codes, and contributing factor notes.
- Assign corrective actions and preventive actions with owners, due dates, evidence, dependencies, and completion approval.
- Require verification of implementation before closure and effectiveness review after the configured observation period.
- Link CAPA to related nonconformances, deviations, defects, complaints, audit findings, inspection plans, and training needs.

## Audit Trail And E-Signature Readiness
- Record immutable audit events for quality plan activation, inspection result submission, result correction, failed inspection, material hold, disposition, CAPA lifecycle, complaint closure, certificate approval, and data export.
- Store before and after values for critical record edits, with reason for change required on regulated or approved records.
- Identify e-signature-ready approval points with meaning of signature, signer identity, signer role, timestamp, record hash or version, and review statement.
- Prepare signature prompts for inspection approval, deviation approval, nonconformance disposition, lot release, CAPA closure, certificate approval, and complaint closure.
- Enforce dual-approval or independent-review rules where the plan or disposition policy requires them.
- Use Platform Core identity, RBAC, and audit storage as the system of record for user identity and permission evidence.
- Keep Sprint 3 implementation ready for validation by avoiding shared login assumptions, editable audit history, and unversioned approvals.

## Certificates And Documents
- Support certificate records for certificate of analysis, certificate of conformance, calibration certificate, inspection certificate, material test report, and customer-specific quality packet.
- Link certificates to ERP material lot, supplier lot, MES work order, product, shipment, equipment, customer, and inspection instance.
- Validate certificate status before lot release or shipment release where configured.
- Track certificate source: uploaded document, generated from inspection data, supplier-provided, equipment calibration, or customer-required template.
- Capture certificate approval, revision, expiry, signer, attachment, and distribution status.
- Allow certificate requirements to be configured in inspection plans and customer-specific release rules.
- Provide export-ready certificate packet metadata for ERP/shipping/customer service handoff.

## Customer Complaints
- Capture complaint source, customer, product, shipment, ERP lot, serial number, defect description, severity, received date, due date, attachments, and reported quantity.
- Link complaint to related defects, nonconformance, CAPA, replacement shipment, credit request reference, and customer notification status.
- Support investigation workflow with containment, sample retrieval, lot traceability, root cause, response drafting, and closure approval.
- Require customer-impacting complaints to evaluate whether additional lots, shipments, or open work orders need containment.
- Track response SLA, owner, status, corrective action, and effectiveness follow-up.
- Feed confirmed complaint defects into quality trend reporting and CAPA recurrence analysis.

## Integrations
### MES Work Orders
- Consume work order, operation, routing step, product, planned quantity, actual quantity, line, work center, machine, operator, status, and completion events.
- Create inspection instances at release, operation start, first-piece, operation complete, final inspection, rework completion, and closeout based on plan triggers.
- Return quality gates to MES: inspection required, inspection pending, passed, failed, hold, deviation approved, disposition required, and release approved.
- Block or warn work order status transitions when required quality gates are not satisfied.
- Link defects, deviations, NC records, rework, scrap, and final release to work order and operation.
- Push rework instructions and quality hold/release status back to MES execution views.

### ERP Material Lots
- Consume ERP material master, lot/batch number, supplier lot, receipt, inventory status, warehouse/location, expiry, and shipment references.
- Apply or request lot status changes: quarantine, quality hold, restricted use, released, rejected, scrap, return-to-supplier, and customer hold.
- Preserve lot genealogy links between source material, produced lots, rework lots, split lots, and shipped lots.
- Send disposition-ready payloads for approved release, scrap, return-to-supplier, and rework outcomes.
- Do not perform final inventory valuation, accounting, or customer credit posting in Quality during Sprint 3.

### OEE Quality Loss
- Consume OEE quality loss events for reject, scrap, rework, and defect quantities tied to work order, machine, line, shift, and reason.
- Provide validated defect taxonomy, severity, and disposition outcome back to OEE for quality loss reporting.
- Prevent double-counting by using shared event IDs when OEE quality loss creates a Quality defect or nonconformance.
- Reconcile OEE quality count with MES good/reject/rework/scrap quantities and Quality disposition results.
- Feed confirmed quality loss categories into OEE dashboards for yield, defect Pareto, and shift review.

### HRMS Workforce
- Validate inspector qualification, certification, training, and authorization before restricted inspections and approvals.
- Consume employee identity, role, shift assignment, skill, certification, and readiness status.
- Return quality approval activity references for workforce training and qualification evidence where required.

### Platform Core And RBAC
- Use Platform Core tenant, company, plant, area, line, work center, user identity, permission, and audit services.
- Enforce plant-scoped and role-scoped access for quality records, lots, work orders, and approvals.
- Reuse shared attachment/document storage policies where available.

### Configuration Studio
- Allow inspection plans, defect codes, disposition policies, CAPA categories, and signature requirements to become configurable without code changes.
- Reuse workflow configuration patterns for nonconformance, deviation, CAPA, and complaint lifecycle states where feasible.

## Screens
1. Quality Dashboard
   - Open inspections, failed inspections, active holds, open nonconformances, CAPA aging, customer complaints, and release blockers.

2. Inspection Plan Studio
   - Plan list, version history, triggers, characteristics, sampling rules, scope, approval rules, and activation validation.

3. Inspection Work Queue
   - Inspector and operator queue by plant, work order, operation, lot, due status, severity, and required qualification.

4. Inspection Execution
   - Guided characteristic capture with limits, samples, evidence, comments, pass/fail status, defect creation, and submission.

5. Defect And Deviation Log
   - Searchable defects and deviations with severity, source, affected scope, containment, approval status, and expiry.

6. Nonconformance Workspace
   - Case summary, affected scope, material hold, containment tasks, investigation, disposition, rework/scrap, approvals, and linked records.

7. CAPA Board
   - CAPA pipeline by lifecycle state, owner, due date, risk, root cause, action completion, verification, and effectiveness review.

8. Certificate Center
   - Certificate requirements, uploads, generated certificates, approvals, expiry, lot/shipment linkage, and export packets.

9. Customer Complaint Workspace
   - Complaint intake, investigation, lot traceability, linked NC/CAPA, customer response, SLA, and closure approval.

10. Quality Audit Trail
   - Filtered audit events by record, work order, lot, user, event type, date, approval, signature, and export.

## API Contract Needs
| API Group | Methods | Purpose |
|---|---|---|
| /api/quality/inspection-plans | GET, POST, PATCH | Plan setup, versioning, activation, and scope filters. |
| /api/quality/inspection-plans/:id/characteristics | GET, POST, PATCH | Inspection characteristic management. |
| /api/quality/inspection-plans/:id/validate | POST | Activation validation and readiness warnings. |
| /api/quality/inspections | GET, POST | Inspection queue, ad hoc creation, and triggered inspection instances. |
| /api/quality/inspections/:id/results | GET, POST, PATCH | Result capture, correction, evidence, and submission. |
| /api/quality/defects | GET, POST, PATCH | Defect capture, classification, status, and linkage. |
| /api/quality/deviations | GET, POST, PATCH | Temporary exception request, approval, expiry, and linked scope. |
| /api/quality/nonconformances | GET, POST, PATCH | NC lifecycle, containment, affected scope, and disposition. |
| /api/quality/nonconformances/:id/disposition | POST | Release, rework, scrap, RTS, sort, downgrade, and approval handoff. |
| /api/quality/capa | GET, POST, PATCH | CAPA lifecycle, root cause, actions, verification, and closure. |
| /api/quality/certificates | GET, POST, PATCH | Certificate records, approvals, expiry, and attachment metadata. |
| /api/quality/complaints | GET, POST, PATCH | Customer complaint intake, investigation, linkage, and closure. |
| /api/quality/gates/check | POST | MES work order and ERP lot quality gate decision. |
| /api/quality/lots/:lotId/status | GET, PATCH | Quality view of lot hold, release, quarantine, and disposition status. |
| /api/quality/reports | GET | Inspection, defect, NC, CAPA, complaint, certificate, and audit reports. |

Quality gate response should include:
- allowed: boolean
- gate_status: not_required, pending, passed, failed, hold, deviation_required, deviation_approved, disposition_required, release_approved
- blocking_records: inspection IDs, NC IDs, deviation IDs, hold IDs, missing certificate IDs
- warnings: expiring certificate, pending CAPA recurrence, unresolved low-severity defect, inspector qualification warning
- valid_until for cached MES or ERP decisions

## Permissions
- quality.dashboard.view
- quality.inspection_plan.view
- quality.inspection_plan.manage
- quality.inspection.execute
- quality.inspection.approve
- quality.result.correct
- quality.defect.create
- quality.defect.manage
- quality.deviation.request
- quality.deviation.approve
- quality.nonconformance.create
- quality.nonconformance.manage
- quality.disposition.approve
- quality.rework.authorize
- quality.scrap.authorize
- quality.capa.create
- quality.capa.manage
- quality.capa.close
- quality.certificate.manage
- quality.certificate.approve
- quality.complaint.manage
- quality.audit.view
- quality.report.export
- quality.signature.apply

## Required Audit Events
- quality.inspection_plan.created
- quality.inspection_plan.updated
- quality.inspection_plan.activated
- quality.inspection.created
- quality.inspection.result_recorded
- quality.inspection.result_corrected
- quality.inspection.submitted
- quality.inspection.approved
- quality.inspection.failed
- quality.defect.created
- quality.defect.updated
- quality.deviation.requested
- quality.deviation.approved
- quality.deviation.expired
- quality.nonconformance.created
- quality.nonconformance.scope_updated
- quality.material_hold.applied
- quality.material_hold.released
- quality.disposition.proposed
- quality.disposition.approved
- quality.rework.authorized
- quality.scrap.approved
- quality.capa.created
- quality.capa.root_cause_recorded
- quality.capa.action_completed
- quality.capa.effectiveness_verified
- quality.capa.closed
- quality.certificate.created
- quality.certificate.approved
- quality.customer_complaint.created
- quality.customer_complaint.closed
- quality.signature.applied
- quality.report.exported

## Implementation Backlog
### Workstream 1: Quality Master Data And Plans
- Define inspection plan, characteristic, sampling, defect code, disposition policy, and certificate requirement data contracts.
- Build Inspection Plan Studio with versioning, trigger configuration, scope filters, and activation validation.
- Seed baseline defect types, deviation reasons, NC categories, disposition types, CAPA categories, and certificate types for the pilot.
- Align defect and quality loss reason codes with OEE to prevent taxonomy drift.

### Workstream 2: Inspection Execution And Gates
- Build inspection generation from MES work order and ERP lot triggers.
- Build inspection queue and execution screens for operators and inspectors.
- Implement result capture, evidence attachment, pass/fail evaluation, and failed-result defect creation.
- Implement quality gate check service for MES work order transitions and ERP lot release decisions.

### Workstream 3: Defects, Deviations, And Nonconformance
- Build defect and deviation capture with affected scope, severity, containment, and approval state.
- Build nonconformance workspace with material hold, containment tasks, investigation, and disposition.
- Implement rework and scrap decision contracts to MES, ERP lot status, and OEE quality loss.
- Add split disposition support for partial release, partial rework, and partial scrap.

### Workstream 4: CAPA And Complaints
- Build CAPA lifecycle with root cause, actions, verification, effectiveness, and closure approval.
- Build customer complaint intake, lot traceability, investigation, response tracking, and closure.
- Add recurrence detection inputs from defects, NC, complaints, and OEE quality loss trends.
- Link CAPA outcomes back to inspection plans, training needs, work instructions, and preventive actions.

### Workstream 5: Compliance Evidence
- Add audit event emission for every quality lifecycle and approval event.
- Add e-signature-ready metadata and approval prompts for regulated decision points.
- Build certificate center with certificate linkage, approval, expiry, and export packet readiness.
- Add audit and report views for inspections, defects, NC, CAPA, complaints, certificates, and signatures.

### Workstream 6: Integration, Security, And Scale
- Validate Platform Core RBAC, plant scope, tenant isolation, and record-level permission boundaries.
- Validate HRMS inspector qualification checks for restricted inspections and approvals.
- Build pagination, filters, and indexed search for high-volume inspections, defects, lots, NC, and complaints.
- Add acceptance tests for MES, ERP lot, OEE, HRMS, and audit trail integration paths.

## Acceptance Criteria
### Inspection Plans And Execution
- Quality engineer can create, version, validate, activate, and retire inspection plans without losing historical traceability.
- Inspection plans can trigger from MES work order, operation, final inspection, ERP lot, shipment, complaint, and manual events.
- Inspection execution captures required characteristics, samples, limits, evidence, comments, status, and inspector identity.
- Failed inspection results can create defects, holds, and nonconformance records according to configured rules.
- MES work order progression receives deterministic gate responses for pending, failed, held, approved, and release-ready states.

### Defects, Deviations, And Nonconformance
- Defects can be linked to inspection, work order, operation, machine, ERP lot, OEE event, customer complaint, and quantity.
- Deviation approval supports affected scope, risk, expiration, compensating controls, and audit trail.
- Nonconformance records capture affected scope, containment, material hold, investigation, disposition, and approval.
- Material hold and release status can be communicated to ERP material lots and MES execution.
- Split disposition supports release, rework, scrap, return-to-supplier, sort, or downgrade for different quantities.

### Rework, Scrap, And OEE
- Rework disposition can create or link to MES rework operations and require post-rework inspection before good count.
- Scrap records capture quantity, reason, approval, work order, operation, lot, and cost category.
- OEE quality loss events can create or link to Quality defects without double-counting.
- Quality disposition results reconcile with MES good/reject/rework/scrap counts and ERP lot status.
- OEE quality dashboards can use Quality-approved defect categories and disposition outcomes.

### CAPA, Certificates, And Complaints
- CAPA supports intake, triage, root cause, action plan, implementation, verification, effectiveness, closure, and reopen.
- Customer complaints can link to shipments, ERP lots, work orders, defects, NC records, and CAPA cases.
- Certificate records can be linked to lots, suppliers, products, work orders, shipments, equipment, and inspections.
- Lot or shipment release can check required certificates and block missing, expired, or unapproved certificates.
- Complaint closure and CAPA closure require configured approvals and preserve evidence.

### Audit, Signature Readiness, And Security
- Critical quality changes emit audit events with user, timestamp, record, before/after values, reason, and source.
- E-signature-ready approval points include signer identity, meaning, role, timestamp, record version, and approval statement.
- Permission checks protect quality plans, inspection approvals, disposition, CAPA closure, certificate approval, and exports.
- Tenant and plant scope prevent cross-tenant and unauthorized plant access to quality records.
- Result correction on submitted or approved records requires reason, permission, and audit trail.

## Sprint 3 Definition Of Done
- Implementation-ready data model, API contracts, screens, workflows, integrations, permissions, audit events, and acceptance criteria are documented.
- Plan covers inspection plans, defects, deviations, rework/scrap, CAPA, audit trail, e-signature readiness, certificates, nonconformance, and customer complaints.
- MES work order, ERP material lot, OEE quality loss, HRMS qualification, Platform Core RBAC, and Configuration Studio dependencies are explicit.
- Quality gates can determine whether work orders, operations, material lots, and shipments may proceed.
- Audit trail and e-signature-ready approval points are sufficient for a regulated-readiness review.
- No code changes are required by this planning artifact.
