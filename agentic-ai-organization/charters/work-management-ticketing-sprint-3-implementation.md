# Work Management and Ticketing Sprint 3 Implementation Plan

Date: 2026-06-29
Repository: Kalvinsadurock/IND5.0
Owner: Work Management and Ticketing Agent
Sprint Goal: Deliver the operational work board and ticketing foundation that coordinates production engineering, product management, quality, maintenance, HRMS, SAP integration, and plant leadership work across the IND5.0 pilot.

## Mission

Build a shared work-management layer for plant execution teams so cross-functional issues do not disappear into chat, spreadsheets, or disconnected status meetings.

Sprint 3 should let production engineers, product managers, supervisors, maintenance planners, quality owners, HRMS owners, and integration owners answer six questions from one workspace:

1. What work is open, blocked, overdue, or waiting for approval?
2. Who owns the next action and who is accountable for closure?
3. Which MES work order, quality defect, maintenance request, employee responsibility, asset, material, or integration event does the work affect?
4. What SLA applies, when will it breach, and who must be notified or escalated?
5. Which approvals are required before the work can move forward?
6. What changed, who changed it, and what evidence, comments, and attachments support the decision?

## Sprint 3 Scope

Included:
- Sprint boards for production engineers and product managers with backlog, active work, blocked work, approvals, escalations, and done states.
- Ticket intake, triage, categorization, prioritization, assignment, reassignment, escalation, approval, closure, and reopening.
- Task breakdown inside tickets with owners, due dates, dependencies, checklist items, and completion evidence.
- Links from tickets to MES work orders, OEE alerts, quality defects, maintenance work requests, maintenance work orders, HRMS responsibilities, inventory exceptions, SAP posting errors, and configuration changes.
- Attachment and comment support for screenshots, operator notes, inspection photos, documents, logs, certificates, and approval evidence.
- Notifications for assignment, mention, due-soon, SLA warning, SLA breach, approval request, escalation, status change, and closure.
- SLA policy model by ticket type, severity, plant, customer impact, production impact, and approval state.
- Audit trail for all important ticket, task, comment, attachment, assignment, SLA, approval, and link changes.
- Role and responsibility mapping through Platform Core RBAC and HRMS employee records.
- Acceptance criteria, reporting, and integration contracts for the pilot.

Excluded:
- Full external ITSM replacement, customer support portal, or vendor-facing service desk.
- Advanced portfolio planning, cost capitalization, or engineering change control beyond ticket/task coordination.
- AI auto-triage, sentiment scoring, or predictive SLA management.
- Offline mobile ticketing beyond responsive browser support.
- Payroll, performance review, disciplinary action, or confidential HR case management.

## Pilot Outcomes

- Production engineers can manage plant improvement, downtime follow-up, process issues, integration exceptions, and engineering support work on a sprint board.
- Product managers can manage roadmap feedback, pilot gaps, acceptance blockers, approval decisions, and cross-module dependencies on a sprint board.
- Tickets can be created manually or generated from OEE alerts, quality defects, maintenance requests, SAP posting failures, inventory exceptions, and MES work-order blockers.
- Every ticket has a clear owner, accountable team, severity, priority, status, due date, SLA target, linked business object, and next action.
- Escalations are visible before SLA breach and can route to supervisor, plant manager, quality manager, maintenance planner, HRMS owner, or product manager.
- Approval gates support controlled decisions such as defect disposition, maintenance deferral, SAP posting recovery, production exception, and configuration change.
- Comments and attachments preserve operational context without requiring users to search outside the ticket.
- Audit history supports regulated-readiness review, including who assigned, approved, escalated, commented, attached, linked, resolved, reopened, or changed SLA data.

## Personas

| Persona | Primary Needs |
|---|---|
| Production Engineer | Board for operational blockers, process improvements, OEE losses, MES work-order issues, engineering actions, and plant support tasks. |
| Product Manager | Board for pilot backlog, feature gaps, acceptance blockers, customer feedback, release readiness, and cross-team decisions. |
| Plant Supervisor | Quick ticket creation from production issues, visibility into owner and ETA, escalation when downtime or work-order flow is at risk. |
| Quality Manager | Defect-linked tickets, CAPA-style tasks, approval routing, attachment evidence, and regulated audit trail. |
| Maintenance Planner | Maintenance request handoff, technician follow-up tasks, PM deferral approvals, and asset/work-order links. |
| HRMS Owner | Responsibility mapping, role-based assignment pools, employee availability context, and ownership changes. |
| SAP Integration Owner | Posting error tickets with payload references, retry status, approval gates, and reconciliation comments. |
| Platform Admin | RBAC, tenant scoping, board setup, notification routing, SLA templates, and audit access. |

## Core Concepts

| Concept | Description | Owner |
|---|---|---|
| Work Board | Kanban or sprint board for a team, plant, module, product area, or escalation queue. | Work Management |
| Ticket | Trackable issue, task, escalation, defect action, maintenance follow-up, or integration recovery item. | Work Management |
| Ticket Type | Classification such as production issue, engineering task, quality action, maintenance request, HRMS responsibility, integration error, product backlog item, approval, or escalation. | Work Management / Configuration Studio |
| Task | Sub-action under a ticket with assignee, due date, status, and optional dependency. | Work Management |
| Assignment | Current owner, accountable team, watcher list, and escalation owner. | Work Management / HRMS |
| Approval | Controlled decision required before status transition, closure, deferral, or recovery action. | Work Management / Platform Core |
| SLA Policy | Response and resolution target by severity, type, plant, impact, and calendar. | Work Management |
| Linked Object | MES work order, quality defect, maintenance request, HRMS responsibility, OEE alert, inventory exception, SAP event, or configuration record attached to a ticket. | Source Module |
| Activity Timeline | Comments, state changes, assignments, approvals, notifications, attachments, and audit events in chronological order. | Work Management |

## Sprint Boards

### Production Engineering Board

- Default columns: Intake, Triage, Ready, In Progress, Waiting, Approval Required, Escalated, Resolved, Closed.
- Swimlanes: production blocker, OEE loss, MES work-order issue, quality action, maintenance dependency, material/inventory dependency, SAP/integration exception, improvement task.
- Card fields: ticket number, title, severity, priority, affected plant, line, work center, linked work order, linked asset, linked defect, owner, SLA due time, blockers, and latest comment.
- Filters: plant, line, work center, asset, product, work order, shift, severity, status, owner, team, SLA state, approval state, and linked object type.
- Board policies:
  - Production-stopping tickets cannot move from Triage without severity, owner, affected object, SLA policy, and next action.
  - Tickets linked to active MES work orders show work-order status and hold/blocker state.
  - Escalated tickets remain visible in the board until resolved or deliberately de-escalated with reason.
  - Resolved tickets require closure evidence or resolution comment before Closed.

### Product Management Board

- Default columns: Backlog, Needs Discovery, Ready, In Build, In Review, Pilot Validation, Approval Required, Accepted, Deferred.
- Swimlanes: pilot blocker, customer feedback, module dependency, configuration gap, reporting gap, compliance gap, product decision, release readiness.
- Card fields: title, outcome, priority, product area, owning team, stakeholder, linked tickets, linked work orders or defects where applicable, acceptance owner, target sprint, and decision state.
- Board policies:
  - Product backlog tickets require problem statement, expected outcome, impacted persona, and acceptance criteria before Ready.
  - Pilot blockers require severity, affected tenant/plant, product owner, and target resolution date.
  - Deferred items require reason, review date, and approving product manager.

## Ticket Lifecycle

Standard statuses:
- New: created but not triaged.
- Triage: validating type, severity, owner, impact, and links.
- Ready: accepted and ready for work.
- In Progress: owner is actively working.
- Waiting: blocked by dependency, requester input, parts, approval, external system, or scheduled window.
- Approval Required: action or closure needs approval.
- Escalated: SLA, severity, or business impact requires management visibility.
- Resolved: fix or action is complete and awaiting confirmation.
- Closed: accepted and locked for normal editing.
- Reopened: closed or resolved ticket returned to active work with reason.
- Cancelled: no longer needed, duplicate, invalid, or out of scope.

Lifecycle rules:
- A ticket must have tenant, type, title, requester, severity, priority, owner or assignment queue, status, and source before it can leave New.
- A production-impacting ticket must include plant and affected area, line, work center, asset, work order, or defect link where known.
- Owner changes require reason when the ticket is production-stopping, approval-related, or SLA-breached.
- Closure requires resolution code, resolution summary, closure owner, closed time, and unresolved-risk flag.
- Reopening requires reason, reopened-by user, reopened time, and new owner or queue.
- Cancelled tickets remain searchable and auditable; they are not deleted.

## Ticket Types

| Type | Purpose | Required Links |
|---|---|---|
| Production Issue | Shop-floor blocker, abnormal condition, execution issue, or supervisor request. | Plant and at least one of line, work center, MES work order, OEE alert, asset, or material. |
| Engineering Task | Process improvement, line support, corrective engineering action, tooling issue, or standard work update. | Plant, line/work center, optional work order, asset, defect, or document. |
| Product Backlog Item | Product manager owned pilot gap, roadmap feedback, acceptance issue, or feature decision. | Product area, persona, acceptance owner, optional source ticket. |
| Quality Action | Quality defect follow-up, containment, disposition support, CAPA-style task, or inspection blocker. | Quality defect, inspection, lot, work order, or material. |
| Maintenance Follow-Up | Maintenance request, breakdown action, PM deferral, asset return-to-service task, or calibration dependency. | Maintenance request/work order and asset. |
| HRMS Responsibility | Workforce assignment, training/certification responsibility, role mapping, onboarding blocker, or shift-readiness action. | Employee, team, role, shift, skill, or certification record. |
| Integration Exception | SAP posting failure, mapping gap, retry decision, reconciliation issue, or external payload recovery. | Integration event, payload reference, source module object. |
| Approval Request | Explicit decision ticket for exception, deferral, release, posting, closure, or configuration change. | Approval subject and approver role. |
| Escalation | Management attention item generated manually or from SLA/severity rules. | Parent ticket or source event. |

## Data Model Needs

| Entity | Purpose | Key Fields |
|---|---|---|
| work_boards | Team, module, product, or plant board definition. | tenant_id, board_code, name, board_type, owner_team_id, plant_id, module_key, active. |
| board_columns | Ordered status columns for each board. | board_id, status_code, display_name, sequence, wip_limit, is_terminal. |
| board_swimlanes | Optional board grouping rules. | board_id, lane_code, name, filter_type, filter_value, sequence. |
| tickets | Core ticket record. | tenant_id, ticket_number, title, description, type, severity, priority, status, source, requester_user_id, owner_user_id, owner_employee_id, owner_team_id, plant_id, due_at, first_response_due_at, resolution_due_at, sla_policy_id, sla_state. |
| ticket_tasks | Subtasks and checklist items. | ticket_id, title, description, status, assignee_user_id, assignee_employee_id, due_at, dependency_task_id, completed_at. |
| ticket_assignments | Assignment and reassignment history. | ticket_id, from_user_id, to_user_id, from_team_id, to_team_id, reason, assigned_by_user_id, assigned_at. |
| ticket_links | Typed links to source business objects. | ticket_id, linked_object_type, linked_object_id, linked_object_number, module_key, relationship_type, display_label, active. |
| ticket_comments | Threaded discussion and operational notes. | ticket_id, parent_comment_id, author_user_id, comment_body, visibility, created_at, edited_at. |
| ticket_attachments | Evidence and file metadata. | ticket_id, comment_id, file_id, file_name, file_type, file_size, uploaded_by_user_id, uploaded_at, evidence_type. |
| ticket_watchers | Users and teams notified on important changes. | ticket_id, watcher_user_id, watcher_team_id, reason, added_by_user_id. |
| sla_policies | Response and resolution targets. | tenant_id, policy_code, type, severity, priority, plant_id, production_impact, response_minutes, resolution_minutes, calendar_id, escalation_policy_id, active. |
| sla_events | SLA clock history and breaches. | ticket_id, event_type, previous_due_at, new_due_at, reason, triggered_at, triggered_by_user_id. |
| escalation_policies | Escalation path definitions. | tenant_id, policy_code, name, trigger_type, warning_minutes_before_breach, level_1_role, level_2_role, level_3_role. |
| ticket_escalations | Escalation instances. | ticket_id, escalation_level, escalated_to_user_id, escalated_to_team_id, reason, escalated_at, acknowledged_at, resolved_at. |
| approval_requests | Approval gates associated with tickets. | ticket_id, approval_type, subject_type, subject_id, requested_by_user_id, approver_role, approver_user_id, status, requested_at, decided_at, decision_reason. |
| ticket_audit_events | Immutable ticket audit trail. | tenant_id, ticket_id, event_type, actor_user_id, occurred_at, before_snapshot, after_snapshot, reason, source_ip. |
| notification_events | Notification queue and delivery trace. | tenant_id, ticket_id, recipient_user_id, channel, notification_type, status, sent_at, read_at. |

Modeling notes:
- Tickets are tenant-scoped and may optionally be plant-scoped; cross-plant visibility must always flow through RBAC.
- Store linked objects in a normalized link table so one ticket can connect a work order, defect, asset, OEE event, and integration payload without duplicating module data.
- Comments and attachments are operational evidence and must inherit ticket visibility rules.
- Audit events should be append-only and queryable by ticket, actor, object link, date range, and event type.
- SLA clocks must preserve pause/resume history when tickets wait on requester, approval, external system, planned maintenance window, or product decision.

## API Contract Needs

| API Group | Methods | Purpose |
|---|---|---|
| /api/work-management/boards | GET, POST, PATCH | Board configuration, board list, and board ownership. |
| /api/work-management/boards/:id/cards | GET | Board card query with filters, swimlanes, WIP counts, and SLA indicators. |
| /api/work-management/tickets | GET, POST | Ticket search, creation, and generated ticket intake. |
| /api/work-management/tickets/:id | GET, PATCH | Ticket detail, metadata update, and controlled field edits. |
| /api/work-management/tickets/:id/status | POST | Status transition with lifecycle validation and audit reason. |
| /api/work-management/tickets/:id/tasks | GET, POST, PATCH | Task breakdown and completion tracking. |
| /api/work-management/tickets/:id/assign | POST | Owner, team, queue, and reassignment handling. |
| /api/work-management/tickets/:id/escalate | POST | Manual escalation and acknowledgement. |
| /api/work-management/tickets/:id/approvals | GET, POST | Approval request creation and status view. |
| /api/work-management/approvals/:id/decision | POST | Approve, reject, request changes, or delegate. |
| /api/work-management/tickets/:id/links | GET, POST, DELETE | Link management for MES work orders, quality defects, maintenance requests, HRMS records, and integration events. |
| /api/work-management/tickets/:id/comments | GET, POST, PATCH | Comments, mentions, and internal notes. |
| /api/work-management/tickets/:id/attachments | GET, POST, DELETE | Evidence upload, metadata, and attachment removal controls. |
| /api/work-management/sla-policies | GET, POST, PATCH | SLA template setup and activation. |
| /api/work-management/notifications/preferences | GET, PATCH | User notification channel and digest preferences. |
| /api/work-management/reports | GET | Aging, SLA, workload, escalation, approval, and closure reports. |
| /api/work-management/intake | POST | Module-to-ticket creation endpoint for OEE, MES, Quality, Maintenance, Inventory, ERP/SAP, and HRMS. |

## Assignment and HRMS Responsibilities

- Resolve assignable users through Platform Core RBAC and HRMS employee profiles.
- Support assignment to user, employee, team, role queue, or plant responsibility group.
- HRMS remains the owner of employee status, supervisor relationship, shift readiness, skills, certifications, and role responsibilities.
- Work Management stores ticket ownership snapshots but must not duplicate private HR fields.
- Assignment rules can route by plant, line, department, module, severity, ticket type, product area, shift, and responsibility matrix.
- Inactive, terminated, suspended, or expired contractor employees cannot receive new ticket assignments.
- If an owner becomes inactive, tickets move to the configured reassignment queue and notify the supervisor or team lead.
- Certification-sensitive actions such as quality approval, maintenance safety approval, and restricted operation decisions must call HRMS eligibility where configured.

## Escalation

- Escalation can be manual, SLA-warning-based, SLA-breach-based, severity-based, blocked-duration-based, or approval-delay-based.
- Production-stopping tickets escalate to plant supervisor first, then plant manager, then product/operations leadership according to policy.
- Quality-critical tickets escalate to quality manager when defect containment, disposition, or release approval is delayed.
- Maintenance-critical tickets escalate to maintenance planner or maintenance manager when an asset blocks production or PM deferral is overdue.
- SAP/integration tickets escalate to integration owner when posting retry, mapping correction, or approval remains unresolved.
- HRMS responsibility tickets escalate to HRMS owner or supervisor when role, certification, onboarding, or shift-readiness action blocks operations.
- Every escalation requires reason, level, target, timestamp, acknowledgement, and resolution trail.

## Approvals

Approval use cases:
- Defect disposition, deviation acceptance, quality release, rework approval, or scrap-related action.
- Critical maintenance deferral, return-to-service exception, lockout release confirmation, or calibration exception.
- SAP posting retry, reversal, manual posting, or blocked mapping override.
- Production exception such as continuing work with a known issue, work-order hold release, or late closure.
- Product manager approval for pilot blocker deferral, acceptance sign-off, or scope tradeoff.
- Configuration change approval for workflow, custom field, SLA, board, or responsibility matrix changes.

Approval rules:
- Approval request includes subject, requested decision, business reason, risk, evidence, approver role, due time, and linked ticket.
- Approvers must be authorized by RBAC and, where required, validated against HRMS responsibility or certification.
- Approval decisions are approve, reject, request changes, delegate, or cancel.
- Approval Required status pauses or changes SLA only when the SLA policy explicitly allows approval wait time.
- Approval decisions create audit events and appear in the ticket timeline.
- Rejected approvals return the ticket to In Progress or Waiting with required follow-up action.

## Integration Contracts

### MES Work Orders

- Tickets can link to MES work order, operation, routing step, line, work center, product, lot, and current workflow state.
- MES can create tickets for work-order blockers, missing data, failed transition, material readiness issue, quality hold, or execution exception.
- Ticket detail should show work-order number, status, due date, quantity, line/work center, current operation, and hold state.
- Closing a production-impacting ticket can optionally notify MES that a blocker was resolved; MES remains the owner of work-order state.

### Quality Defects

- Quality can create tickets from defects, inspections, deviations, nonconformance, CAPA follow-up, supplier quality issue, or customer complaint.
- Ticket must preserve defect number, severity, product, lot, work order, inspection point, containment state, and disposition status.
- Approval tickets can support quality disposition and release decisions without replacing Quality as the system of record.
- Attachments can include inspection photos, certificates, lab reports, containment evidence, and signed decision records.

### Maintenance Work Requests

- Maintenance can create tickets from work requests, breakdowns, PM follow-ups, calibration issues, safety lockout tasks, and return-to-service blockers.
- Ticket must link to asset, maintenance request, maintenance work order, line/work center, downtime event, and affected MES work order where available.
- Production engineering can track process-impacting maintenance issues without changing maintenance work-order ownership.
- Deferral approvals and escalation states should be visible to both Work Management and Maintenance.

### HRMS Responsibilities

- HRMS can create tickets for onboarding blockers, missing role assignment, expired certification, training action, shift-readiness issue, contractor expiry, or supervisor reassignment.
- Ticket links should include employee, team, role, skill, certification, shift assignment, or responsibility matrix item.
- Work Management uses HRMS owner and eligibility APIs for assignment validation and responsibility routing.
- HRMS remains the owner of employee lifecycle and workforce readiness data.

### Other Module Handoffs

- OEE alerts can become improvement, downtime follow-up, or escalation tickets with machine, line, shift, operator, work order, and loss reason.
- Inventory exceptions can become shortage, kitting, reservation, expiry, lot hold, or cycle-count variance tickets.
- ERP/SAP integration can create posting failure, mapping exception, reconciliation, retry, or manual approval tickets with payload reference and recovery action.
- Configuration Studio can create setup, workflow, custom field, SLA, board, and permission-change tickets.

## Attachments and Comments

- Supported attachment categories: screenshot, operator photo, inspection evidence, certificate, work instruction, log file, payload sample, spreadsheet, drawing, document, and approval evidence.
- Attachments inherit ticket visibility and must store uploader, upload time, file metadata, checksum, evidence type, and optional linked comment.
- Attachment deletion is restricted after approval, closure, audit export, or regulated evidence marking; use superseded status instead where required.
- Comments support plain text, mentions, internal notes, linked object references, and attachment context.
- Mentions notify users or teams according to preferences and RBAC visibility.
- Edited comments preserve edit history for audit-sensitive tickets.
- System comments are generated for status transitions, assignments, escalations, approvals, SLA changes, link changes, and closure.

## Notifications

Notification triggers:
- Ticket assigned, reassigned, unassigned, mentioned, watched, escalated, reopened, resolved, closed, or cancelled.
- SLA warning, SLA breach, due date change, overdue task, blocked-duration threshold, or approval overdue.
- Approval requested, delegated, approved, rejected, cancelled, or returned for changes.
- Linked MES work order, quality defect, maintenance request, HRMS responsibility, or integration event changes state where subscribed.

Channels:
- In-app notification center for all actionable events.
- Email digest for non-urgent updates and immediate email for critical escalation where enabled.
- Future-ready hooks for Teams/Slack/webhook delivery without implementing external connectors in Sprint 3.

Notification rules:
- Do not send private HR-sensitive data in notification body; link back to authorized views.
- Collapse noisy updates into digest for watched tickets unless severity or SLA policy requires immediate delivery.
- Record delivery status, read status, and notification preference used.

## SLAs

SLA dimensions:
- Ticket type, severity, priority, production impact, plant, shift calendar, customer impact, source module, and approval state.
- Response target measures time to first meaningful owner response.
- Resolution target measures time to Resolved or Closed according to policy.
- Escalation warning can trigger before response or resolution breach.

Recommended pilot defaults:

| Severity | Example | Response Target | Resolution Target |
|---|---|---:|---:|
| Critical | Production stopped, safety risk, regulatory release blocker, SAP posting blocks shipment. | 15 minutes | 4 hours |
| High | Line degraded, work order blocked, major defect action, critical asset issue. | 30 minutes | 1 business day |
| Medium | Non-blocking issue, improvement task, training action, mapping cleanup. | 4 business hours | 3 business days |
| Low | Backlog item, documentation update, minor enhancement, deferred follow-up. | 1 business day | 10 business days |

SLA rules:
- SLA clock starts at ticket creation unless configured to start after triage.
- SLA can pause only for approved Waiting reasons: requester input, approval pending, external system, planned maintenance window, product decision, or scheduled downtime.
- Production-stopping tickets should not pause for normal backlog waiting.
- SLA breach creates audit event, notification, and escalation instance.
- SLA recalculation must preserve historical due dates and reasons.

## Audit Trail

Audit events required:
- Ticket created, imported, generated, updated, transitioned, resolved, closed, reopened, cancelled, or deleted-by-policy.
- Field changes to type, severity, priority, owner, team, plant, due date, SLA policy, linked object, approval state, and escalation state.
- Task created, assigned, completed, reopened, cancelled, or due date changed.
- Comment created, edited, deleted-by-policy, or visibility changed.
- Attachment uploaded, superseded, removed-by-policy, or marked as approval evidence.
- Approval requested, delegated, approved, rejected, returned, or cancelled.
- SLA started, paused, resumed, recalculated, warned, breached, or reset.
- Notification generated, sent, failed, read, or suppressed.
- Board configuration changed, column changed, WIP limit changed, or routing rule changed.

Audit rules:
- Audit events are append-only.
- Audit views must be filterable by ticket, linked object, actor, event type, date range, plant, and module.
- Audit export should include before/after values for controlled fields.
- Sensitive data must be masked in audit exports based on RBAC.
- Closed tickets retain complete audit history even if source module object is later archived.

## Screens

1. Work Management Home
   - Counts for open, overdue, escalated, approval-required, production-impacting, and SLA-at-risk tickets.
   - Quick links to Production Engineering Board, Product Management Board, My Work, Approvals, and Escalations.

2. Production Engineering Board
   - Kanban board with plant, line, work center, asset, work order, severity, owner, and SLA filters.
   - Cards show linked production context and escalation markers.

3. Product Management Board
   - Board for pilot backlog, acceptance blockers, product decisions, and release readiness.
   - Cards show target sprint, product area, acceptance owner, and linked operational evidence.

4. Ticket List
   - Searchable table with ticket number, title, type, status, severity, priority, owner, plant, linked object, SLA state, due date, and updated time.
   - Saved filters for My Tickets, My Team, Production Blockers, Waiting Approval, Overdue, Escalated, and Recently Closed.

5. Ticket Detail
   - Header with title, status, severity, priority, owner, SLA, due date, source, and linked object summary.
   - Tabs or sections for Overview, Tasks, Links, Comments, Attachments, Approvals, SLA, Notifications, and Audit Trail.

6. My Work
   - Personal queue for assigned tickets, assigned tasks, approvals, mentions, due-soon work, and escalations.

7. Approval Queue
   - Pending approval requests with subject, risk, evidence, requester, due time, and decision actions.

8. Escalation Center
   - Active escalations by level, age, SLA breach state, owner, source module, and required management action.

9. SLA Administration
   - SLA policy templates, calendars, severity mapping, pause reasons, warning thresholds, and escalation paths.

10. Board Administration
   - Board columns, swimlanes, WIP limits, routing rules, default filters, and team ownership.

## Reports and Metrics

- Open ticket aging by plant, team, owner, type, severity, and source module.
- SLA response and resolution compliance by ticket type, board, plant, and owner team.
- Escalation volume, escalation age, acknowledgement time, and resolution time.
- Approval queue aging by approver, approval type, and module.
- Production-impacting ticket count by MES work order, line, work center, asset, product, and shift.
- Quality action aging by defect type, severity, containment status, and disposition state.
- Maintenance follow-up aging by asset, maintenance request, work order, and downtime impact.
- HRMS responsibility aging by employee, team, certification, role, and supervisor.
- Product backlog throughput, accepted pilot blockers, deferred decisions, and recurring product gaps.
- Reopen rate, duplicate rate, cancelled rate, owner workload, WIP limit breaches, and stale ticket count.

## Security and Permissions

- Tenant isolation is mandatory for every board, ticket, comment, attachment, audit event, SLA policy, and notification.
- Board visibility is controlled by RBAC and plant/team scope.
- Users may only see linked object details if they have permission to that source module object.
- HRMS-linked tickets must hide confidential employee fields unless the user has HRMS permission.
- Attachment download follows ticket visibility plus file classification rules.
- Approval decisions require explicit permission and cannot be performed by unauthorized watchers.
- System-generated tickets should identify source service and preserve source payload reference without exposing secrets.

## Week-by-Week Plan

### Week 1: Foundation and Board Contracts

- Define ticket, board, task, link, comment, attachment, SLA, escalation, approval, notification, and audit data contracts.
- Configure default Production Engineering and Product Management board states and card fields.
- Define ticket types, severity model, priority model, lifecycle transitions, and closure rules.
- Align linked object contracts with MES work orders, Quality defects, Maintenance requests, HRMS responsibilities, OEE alerts, Inventory exceptions, and ERP/SAP events.
- Define RBAC permissions for view, create, assign, transition, approve, escalate, attach, comment, configure board, configure SLA, and view audit.

### Week 2: Ticket Workflow and Assignment

- Implement ticket intake, triage, assignment, reassignment, task breakdown, comments, attachments, watchers, and linked object handling.
- Implement HRMS-aware assignment validation and inactive-owner reassignment behavior.
- Build Production Engineering Board, Product Management Board, Ticket List, Ticket Detail, and My Work views.
- Add generated ticket intake endpoint for module handoffs.
- Add audit events for create, update, status transition, assignment, link, task, comment, and attachment actions.

### Week 3: Escalations, Approvals, SLAs, and Notifications

- Implement SLA policy evaluation, first-response tracking, resolution tracking, warnings, breaches, pause/resume reasons, and recalculation audit.
- Implement escalation policies, manual escalation, automatic SLA escalation, acknowledgement, and resolution.
- Implement approval request lifecycle, approver validation, decision capture, and ticket transition effects.
- Implement notification center events for assignments, mentions, due dates, approvals, SLA warnings, breaches, escalations, and closures.
- Add reports for SLA compliance, aging, escalation, approval queue, and workload.

### Week 4: Cross-Module Pilot Hardening

- Validate MES work-order blocker ticket creation and linked work-order visibility.
- Validate Quality defect action and approval ticket flows with attachments and audit history.
- Validate Maintenance request and work-order follow-up ticket flows with asset and downtime links.
- Validate HRMS responsibility ticket flows for employee/role/certification blockers without exposing private HR data.
- Validate ERP/SAP posting failure ticket flow with payload reference and approval/retry status.
- Run pilot scripts for production blocker, product backlog item, defect action, maintenance escalation, HRMS responsibility, and SLA breach scenarios.

## Acceptance Criteria

- Production Engineering Board displays tickets by lifecycle column with filters for plant, line, work center, work order, asset, type, severity, owner, SLA state, and escalation state.
- Product Management Board displays backlog, pilot blockers, product decisions, acceptance work, and deferred items with product owner and acceptance context.
- A user can create a ticket manually with required fields, assign it, add tasks, link a MES work order, comment, attach evidence, and transition it through closure.
- Source modules can create tickets through the intake contract with source object links and initial severity/owner routing.
- Tickets can link to MES work orders, quality defects, maintenance work requests/work orders, HRMS responsibilities, OEE alerts, Inventory exceptions, and ERP/SAP events.
- HRMS inactive or unauthorized users cannot receive new assignment where assignment validation is enabled.
- Escalation can be triggered manually and automatically from SLA warning or breach policy.
- Approval requests can be created, decided, audited, and reflected in ticket status.
- Attachments and comments are visible in the ticket timeline and respect ticket permissions.
- Notifications are generated for assignments, mentions, due-soon, SLA breach, approval request, escalation, and closure.
- SLA response and resolution clocks produce warning, breach, pause, resume, and recalculation audit events.
- Audit trail records controlled field changes, comments, attachments, links, assignments, approvals, escalations, notifications, SLA events, closure, and reopening.
- Reports show ticket aging, SLA compliance, escalation aging, approval backlog, workload, and source-module breakdown.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Ticketing becomes a duplicate system of record for MES, Quality, Maintenance, or HRMS. | Data conflicts and user confusion. | Store links and snapshots only; source modules retain ownership of operational objects. |
| Too many notifications reduce trust. | Users ignore important alerts. | Use severity-aware immediate notifications and digest lower-priority watcher activity. |
| SLA pauses are abused. | Metrics become meaningless. | Restrict pause reasons, require reason, audit every pause/resume, and report paused duration. |
| HRMS-linked tickets expose sensitive data. | Privacy and compliance issues. | Store minimal operational references and enforce source-module permissions. |
| Approval logic diverges from Configuration Studio workflows. | Inconsistent transition rules. | Treat Sprint 3 approvals as reusable work-management gates that can later plug into configurable workflows. |
| Cross-module links break when source objects change. | Poor traceability. | Store object type, ID, display number, module, and relationship; handle archived sources gracefully. |

## Dependencies

- Platform Core: tenant isolation, RBAC, user/team roles, audit identity, notification preferences.
- Configuration Studio: ticket object type, configurable fields, workflow definitions, status labels, approval transition readiness.
- MES: work-order IDs, status, operations, holds, workflow history, and blocker events.
- OEE: alerts, downtime events, production loss context, and improvement ticket handoff.
- Quality: defect IDs, inspection records, disposition status, containment state, and approval context.
- Maintenance: asset IDs, maintenance requests, work orders, PM deferrals, calibration, and downtime impact.
- HRMS: employee profiles, active/inactive status, responsibilities, supervisors, skills, certifications, and shift readiness.
- Inventory: material shortages, kit status, lot/serial exceptions, and cycle count variance context.
- ERP/SAP: integration events, payload references, posting state, retry/reversal approval state, and reconciliation outcomes.

## Definition of Done

- The implementation plan is accepted by module owners for MES, OEE, Quality, Maintenance, HRMS, Inventory, ERP/SAP, Platform Core, and Configuration Studio.
- Board, ticket, task, assignment, escalation, approval, SLA, attachment, comment, notification, and audit contracts are documented and ready for implementation.
- Cross-module handoff payloads are defined for generated tickets.
- Pilot workflows cover production engineering and product management boards.
- Acceptance criteria are testable without relying on undocumented behavior.
