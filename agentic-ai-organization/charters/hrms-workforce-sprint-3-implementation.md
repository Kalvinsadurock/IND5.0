# HRMS and Workforce Sprint 3 Implementation Plan

## Mission
Deliver the Sprint 3 workforce foundation needed for global manufacturing operations with 100 to 10,000 employees per tenant: team management, onboarding readiness, role assignment, skills and certifications, contractor controls, and shift readiness for MES/OEE execution.

The implementation must let supervisors answer one operational question before each shift starts: who is available, authorized, qualified, and assigned to run each line, work center, inspection, or restricted operation?

## Sprint 3 Scope
Included:
- Team and supervisor management across company, plant, department, line, and work-center scopes.
- Employee onboarding checklist state and production-readiness gates.
- Employee-to-user and employee-to-role assignment through Platform Core RBAC.
- Skill, certification, training, safety induction, and machine/process authorization records.
- Contractor workforce lifecycle with agency, access windows, induction, and expiry controls.
- Shift readiness planning, crew validation, gaps, exceptions, and MES/OEE eligibility contracts.
- HRMS screens, APIs, data model extensions, audit events, and acceptance criteria.

Excluded:
- Payroll calculation, statutory filing, and final payroll posting.
- Advanced timekeeping devices, biometric hardware, or access-control hardware integration.
- Full learning management content authoring.
- Automated labor optimization or AI rostering.
- Employee self-service mobile app beyond read-only readiness status.

## Global 100-10000 Employee Use Cases
| Scale | Use Case | Sprint 3 Capability |
|---|---|---|
| 100-300 employees | Single plant with supervisors assigning operators to one or two lines. | Simple team roster, employee profile, skill/certification status, shift readiness checklist. |
| 300-1,500 employees | Multi-line plant with production, quality, maintenance, and contractors. | Department/team hierarchy, contractor expiry, restricted operation eligibility, role-scoped supervisor views. |
| 1,500-5,000 employees | Multi-plant regional operator with shared skills and local certifications. | Tenant-level skill catalog, plant-scoped certifications, bulk imports, readiness dashboards by plant and shift. |
| 5,000-10,000 employees | Global manufacturer with several legal entities, plants, languages, and compliance regimes. | Strong tenant/company/plant scoping, paginated APIs, exportable audit records, integration-safe eligibility APIs. |

## Personas
- HR Admin: maintains employee and contractor master data, onboarding templates, lifecycle states, documents, and agency details.
- Plant HR Partner: tracks readiness, induction, training, and joining compliance for a specific plant.
- Production Supervisor: builds teams, assigns employees to shifts, sees gaps, and resolves readiness exceptions.
- Quality Manager: confirms inspector qualification and certification validity before approval steps.
- Safety Officer: owns safety induction, restricted area access, and medical fitness requirements.
- Platform Admin: maps users, roles, permissions, and scopes through Platform Core RBAC.
- MES/OEE Services: validate employee eligibility and shift crew context before execution and OEE reporting.

## Core Business Rules
- Employee ID is unique within a tenant and cannot be reused for another person.
- Employee records are tenant-scoped and plant visibility is controlled by RBAC scope.
- Employees cannot be marked shift-ready until required onboarding items are complete.
- Contractors require agency, contract period, plant/site access scope, and automatic access expiry.
- Safety induction must be valid for shop-floor readiness where configured.
- Expired certification removes eligibility for linked operation, machine, inspection, or approval activity.
- Deactivated, suspended, terminated, or expired contractor workers lose access immediately.
- A person cannot be double-booked into overlapping shifts where the tenant enables conflict prevention.
- Shift readiness must handle shifts crossing midnight and shift calendars in the plant timezone.
- MES execution must call HRMS eligibility before restricted operations and quality approvals.

## Data Model Needs
| Entity | Purpose | Key Fields |
|---|---|---|
| employee_profiles | HRMS person and employment master. | tenant_id, employee_code, legal_name, preferred_name, employee_type, status, company_id, primary_plant_id, department_id, supervisor_employee_id, auth_user_id, joining_date, exit_date. |
| employment_lifecycle_events | Status history and reason trail. | employee_id, previous_status, new_status, reason_code, effective_at, recorded_by_user_id. |
| teams | Supervisor-owned or functional teams. | tenant_id, plant_id, department_id, line_id, work_center_id, name, team_type, supervisor_employee_id, active. |
| team_memberships | Employee membership in teams. | team_id, employee_id, membership_role, start_date, end_date, is_primary. |
| onboarding_templates | Configurable onboarding checklist definitions. | tenant_id, employee_type, plant_id, name, version, active. |
| onboarding_items | Checklist item definitions. | template_id, item_code, item_name, owner_role, required_for_shift_ready, due_offset_days. |
| employee_onboarding_items | Employee-specific checklist status. | employee_id, item_id, status, completed_at, completed_by_user_id, evidence_file_id. |
| skill_catalog | Tenant or plant skill master. | tenant_id, skill_code, name, category, description, active. |
| employee_skills | Queryable employee skill assignments. | employee_id, skill_id, proficiency_level, verified_by_user_id, verified_at, valid_from, valid_to. |
| certification_types | Certification/authorization definitions. | tenant_id, code, name, issuer_type, renewal_required, default_validity_days. |
| employee_certifications | Certification evidence and expiry. | employee_id, certification_type_id, issue_date, expiry_date, issuer, status, evidence_file_id. |
| operation_authorizations | Links skill/certification needs to operations. | tenant_id, plant_id, process_step_id, machine_id, work_center_id, required_skill_id, required_certification_type_id, min_proficiency_level. |
| contractor_profiles | Contractor-specific controls. | employee_id, agency_name, agency_contact, contract_start, contract_end, purchase_order_ref, access_expires_at. |
| shift_calendars | Plant shift definitions. | tenant_id, plant_id, shift_code, name, start_time, end_time, timezone, crosses_midnight, active. |
| shift_assignments | Planned employee shift crew. | tenant_id, plant_id, shift_calendar_id, shift_date, team_id, employee_id, assignment_role, line_id, work_center_id, status. |
| shift_readiness_checks | Readiness result snapshot. | shift_assignment_id, readiness_status, checked_at, blocking_reasons, warning_reasons. |
| attendance_events | Clock or manual attendance basis. | employee_id, plant_id, source, event_type, event_time, shift_assignment_id, recorded_by_user_id. |
| labor_activity_links | Labor time linked to MES/OEE work. | employee_id, shift_assignment_id, work_order_id, operation_id, oee_shift_run_id, start_time, end_time, labor_role. |

Modeling notes:
- Prefer relational employee_skills and shift_assignments/shift_crew records over JSON arrays so readiness, reporting, and eligibility can be indexed.
- All HRMS tables must include tenant isolation fields directly or through an immutable parent relation.
- High-volume APIs must support pagination, filtering by plant/department/shift/status, and indexed search by employee code/name.
- Sensitive HR fields must be separated from operational readiness fields so MES/OEE can validate eligibility without seeing private HR data.

## API Contract Needs
| API Group | Methods | Purpose |
|---|---|---|
| /api/hrms/employees | GET, POST, PATCH | Employee master search, create, lifecycle update, and operational profile. |
| /api/hrms/employees/:id/onboarding | GET, PATCH | Checklist status, completion evidence, and readiness blockers. |
| /api/hrms/employees/:id/roles | GET, POST, DELETE | Bridge employee profile to Platform Core user role assignments. |
| /api/hrms/teams | GET, POST, PATCH | Team creation, supervisor assignment, and org-scope filters. |
| /api/hrms/teams/:id/members | GET, POST, DELETE | Team membership management and primary team selection. |
| /api/hrms/skills | GET, POST, PATCH | Skill catalog management. |
| /api/hrms/employees/:id/skills | GET, POST, PATCH, DELETE | Employee skill matrix assignment and verification. |
| /api/hrms/certification-types | GET, POST, PATCH | Certification master setup and renewal rules. |
| /api/hrms/employees/:id/certifications | GET, POST, PATCH | Certification evidence, status, and expiry tracking. |
| /api/hrms/contractors | GET, POST, PATCH | Contractor profile, agency, access window, and lifecycle state. |
| /api/hrms/shifts/calendars | GET, POST, PATCH | Plant shift calendars and shift crossing-midnight settings. |
| /api/hrms/shifts/assignments | GET, POST, PATCH, DELETE | Planned crew assignments, conflicts, and status updates. |
| /api/hrms/shifts/readiness | POST | Bulk readiness validation for plant, date, shift, line, team, or work center. |
| /api/hrms/eligibility/check | POST | MES/OEE point-in-time eligibility check for employee, operation, machine, work center, shift, and approval type. |
| /api/hrms/readiness/export | GET | CSV/ERP integration export of shift readiness, attendance, and labor linkage. |

Eligibility check response should include:
- allowed: boolean
- employee_id and employee_code
- readiness_status: ready, warning, blocked, unknown
- blocking_reasons: onboarding_incomplete, inactive_employee, contractor_expired, safety_induction_expired, certification_expired, missing_skill, not_assigned_to_shift, outside_shift_window, rbac_denied
- warnings: expiring_certification, missing_attendance_event, overtime_risk, alternate_team_assignment
- valid_until for cached MES decisions

## Screens
1. Workforce Dashboard
   - Plant, department, line, shift, and employee-type filters.
   - Counts for total active employees, contractors, shift-ready employees, blocked employees, expiring certifications, and open onboarding items.

2. Employee Directory
   - Searchable/paginated employee list with employee code, name, type, department, plant, supervisor, lifecycle status, readiness status, and RBAC link status.
   - Bulk import/export entry points for large sites.

3. Employee Profile
   - Operational tabs for employment, organization, onboarding, roles, skills, certifications, contractor details, documents, and audit history.
   - Sensitive personal details visible only to HRMS permissions.

4. Team Management
   - Team list by plant/department/line/work center.
   - Supervisor assignment and member management with conflict warnings.

5. Onboarding Tracker
   - Checklist by employee or cohort.
   - Blocker view for required items that prevent shift readiness.

6. Skill Matrix
   - Grid by skill vs employee/team with proficiency, verifier, validity, and gaps.
   - Filter to show skills required by selected line, work center, or process step.

7. Certifications and Safety
   - Certification status board with expired, expiring soon, valid, revoked, and pending verification states.
   - Safety induction and medical fitness view where configured.

8. Contractor Management
   - Agency roster, contract windows, access expiry, site scope, safety induction, and inactive/expired contractor controls.

9. Shift Readiness Board
   - Shift calendar, planned crew, attendance status, role coverage, skill/certification blockers, and one-click revalidation.
   - Readiness summary by plant, line, work center, and supervisor.

10. Workforce Audit Log
   - HRMS changes, role assignments, onboarding completions, certification updates, contractor access changes, and eligibility decisions.

## Workflows
### Employee Onboarding To Shift Ready
1. HR Admin creates employee or imports a cohort.
2. System selects onboarding template from employee type, plant, and role.
3. Owners complete checklist items and upload evidence where required.
4. Platform Admin links employee to auth user and scoped RBAC role.
5. Supervisor assigns primary team and shift.
6. Safety Officer completes required safety induction.
7. HRMS readiness service validates onboarding, status, RBAC, shift assignment, safety, skills, and certifications.
8. Employee becomes shift-ready for eligible operations.

### Role Assignment
1. HRMS identifies employee profile and requested operational role.
2. Platform Core creates or updates user role assignment with tenant, company, plant, department, line, or work-center scope.
3. HRMS stores role assignment reference for profile visibility.
4. Audit events are emitted in both Platform Core and HRMS contexts.
5. Deactivation or contractor expiry revokes or suspends effective access.

### Skills And Certifications
1. HRMS Admin configures skill catalog and certification types.
2. Process/operation owners map required skills/certifications to operations, machines, quality approvals, and restricted work centers.
3. Supervisor or trainer assigns employee skill with proficiency and verification evidence.
4. Certification is uploaded with issue, expiry, issuer, and status.
5. Readiness and MES eligibility services block execution when requirements are missing or expired.

### Contractor Support
1. HR creates contractor profile linked to agency, contract, site scope, and end date.
2. Contractor receives onboarding checklist and safety induction requirements.
3. Platform Core role assignment is scoped to permitted plant/area/line and expires with contract access.
4. Shift assignment allows contractors only within active contract and valid induction windows.
5. Expiry job marks access blocked and raises readiness blockers for future assignments.

### Shift Readiness
1. Supervisor selects plant, date, shift, line, and team.
2. System loads planned shift assignments and expected role coverage.
3. HRMS validates employee status, onboarding, attendance, contractor dates, role scope, skills, certifications, and safety induction.
4. Board shows ready, warning, and blocked employees with reasons.
5. Supervisor replaces blocked employees or acknowledges warnings where allowed.
6. MES/OEE receives validated crew context for execution and shift reporting.

## Integrations
### Platform Core
- Consume tenant, company, plant, area, department, line, and work-center hierarchy.
- Use Platform Core user identity and scoped role assignment APIs.
- Emit audit events for employee lifecycle, role mapping, and access-affecting changes.
- Enforce tenant isolation and plant scope on every HRMS API.

### RBAC
- Required permission keys:
  - hrms.employee.view
  - hrms.employee.create
  - hrms.employee.update
  - hrms.employee.deactivate
  - hrms.team.manage
  - hrms.onboarding.manage
  - hrms.skill.manage
  - hrms.certification.manage
  - hrms.contractor.manage
  - hrms.shift.manage
  - hrms.shift.readiness.view
  - hrms.shift.readiness.override
  - hrms.eligibility.check
  - hrms.audit.view
- Default roles:
  - HR Admin: full HRMS administration in assigned company/plant scope.
  - Plant HR Partner: employee, onboarding, contractor, and certification maintenance for assigned plant.
  - Production Supervisor: team, shift assignment, and readiness view for assigned plant/line/team.
  - Safety Officer: safety induction and safety-related certification management.
  - Quality Manager: inspector qualification and quality certification visibility.
  - Operator: own profile and own readiness status only.

### MES
- MES must call /api/hrms/eligibility/check before:
  - starting restricted operations,
  - assigning operators to process steps,
  - quality approvals requiring certified inspectors,
  - machine/process authorization checks,
  - operator substitutions during active work.
- HRMS returns only operational eligibility fields, not private HR data.
- MES work order and operation IDs are stored on labor_activity_links for productivity reporting.

### OEE
- OEE shift runs consume shift calendar, planned crew, actual crew, labor roles, and readiness warnings.
- OEE dashboards can segment availability/performance impacts by manpower plan adherence, absenteeism, skill gaps, and contractor coverage.
- HRMS shift readiness provides the people-side context for shift OEE reports.

### ERP/SAP And Payroll Export
- Export employee code, company, plant, department, cost center, shift, attendance summary, overtime approvals, and labor activity references.
- Do not post payroll in Sprint 3; provide a stable export contract for ERP/payroll teams.

### Configuration Studio
- Employee and contractor profiles must support custom fields for industry-specific data such as medical fitness expiry, union/grade, agency code, permit type, or regulated training group.
- Onboarding templates and certification requirements should be future-ready for workflow-based approvals.

## Audit Events
- hrms.employee.created
- hrms.employee.updated
- hrms.employee.status_changed
- hrms.employee.deactivated
- hrms.team.created
- hrms.team.updated
- hrms.team.member_added
- hrms.team.member_removed
- hrms.onboarding.item_completed
- hrms.onboarding.item_reopened
- hrms.role.linked
- hrms.role.revoked
- hrms.skill.assigned
- hrms.skill.verified
- hrms.skill.removed
- hrms.certification.created
- hrms.certification.updated
- hrms.certification.expired
- hrms.contractor.created
- hrms.contractor.access_expired
- hrms.shift.assignment_created
- hrms.shift.assignment_removed
- hrms.shift.readiness_checked
- hrms.shift.readiness_override
- hrms.eligibility.allowed
- hrms.eligibility.blocked

## Implementation Backlog
### Workstream 1: Data And Contracts
- Define HRMS Sprint 3 tables and indexes for employee profile, teams, onboarding, skills, certifications, contractors, shifts, readiness, and labor links.
- Create API request/response contracts with tenant scope, pagination, filters, and validation errors.
- Add readiness reason code enum shared by HRMS, MES, OEE, and QA gates.
- Define migration from JSON skill arrays and crew arrays to relational skill and assignment tables as a later technical work item.

### Workstream 2: Workforce Administration
- Build employee directory and profile screens.
- Add team management and supervisor-team membership workflows.
- Add employee lifecycle controls with immediate access impact hooks.
- Add bulk import/export design for 1,500+ employee sites.

### Workstream 3: Onboarding, Roles, Skills, Certifications
- Build onboarding template and tracker flows.
- Implement Platform Core role link view and scoped RBAC assignment workflow.
- Build skill catalog, employee skill matrix, and certification tracking.
- Add expiry alerts and readiness blocker calculations.

### Workstream 4: Contractors
- Build contractor profile, agency management fields, contract windows, and site scope.
- Add automatic access expiry rules and readiness blockers.
- Add contractor-specific onboarding and safety induction views.

### Workstream 5: Shift Readiness
- Build shift calendar and planned assignment workflow.
- Implement readiness validation service and board.
- Add MES/OEE eligibility contract and shift context export.
- Add shift crossing-midnight and timezone validation.

### Workstream 6: Quality, Security, Scale
- Add permission checks, audit events, and tenant isolation tests for every API.
- Add list pagination and indexed filters for 10,000 employee tenants.
- Add readiness acceptance tests for blocked, warning, and ready states.
- Add privacy tests ensuring MES/OEE cannot access sensitive HR fields.

## Acceptance Criteria
### Employee And Team Management
- HR Admin can create, update, deactivate, and search employees within tenant and plant scope.
- Employee code uniqueness is enforced per tenant.
- Supervisor can view only assigned teams and plant/line-scoped employees.
- Team membership supports start/end dates and prevents duplicate active primary membership where configured.
- Deactivated employees disappear from assignment pickers and fail eligibility checks immediately.

### Onboarding And Role Assignment
- Onboarding checklist can mark items complete, pending, blocked, or not applicable.
- Required onboarding blockers prevent shift-ready status.
- Employee profile shows linked auth user and effective Platform Core roles/scopes.
- Role assignments are created through Platform Core/RBAC contracts, not duplicated as free text.
- Role revocation or employee deactivation is reflected in readiness and MES eligibility.

### Skills And Certifications
- Skill matrix can show skill coverage by team, line, work center, and shift.
- Certification records include issue date, expiry date, issuer, evidence, status, and verifier.
- Expired or revoked certifications block linked operations and approvals.
- Expiring certification warnings are visible before they become blockers.
- MES eligibility check returns deterministic blocker reason codes for missing skills and expired certifications.

### Contractor Support
- Contractor profiles require agency, contract start/end, site scope, and access expiry.
- Contractor access expires automatically at the configured time.
- Expired contractors cannot be assigned to future shifts and fail eligibility checks.
- Contractor safety induction requirements work the same way as employee safety requirements.
- Contractor records are clearly distinguishable in directory, team, and readiness screens.

### Shift Readiness
- Supervisor can plan crew by plant, date, shift, line, and work center.
- Readiness board validates onboarding, status, RBAC, shift assignment, attendance, safety, skills, certifications, and contractor expiry.
- Shift readiness handles cross-midnight shifts in plant timezone.
- Blocked employees show actionable reason codes and replacement workflow entry points.
- Readiness status can be exported and consumed by MES/OEE.

### Integrations
- Platform Core hierarchy and RBAC scopes are respected in all HRMS APIs.
- MES can call eligibility check and receive only operational eligibility data.
- OEE can consume planned crew, actual crew, readiness warnings, and labor activity links.
- ERP/payroll export contract includes attendance and labor references without performing payroll posting.
- Audit events are emitted for all access-affecting HRMS changes.

### Scale, Privacy, And Reliability
- Employee directory and shift readiness APIs support 10,000 employee tenants with pagination and indexed filters.
- Tenant isolation tests prevent cross-tenant employee, team, role, shift, and certification access.
- Sensitive HR data is hidden from supervisors, MES, OEE, and operator roles unless explicitly permitted.
- Bulk readiness validation returns partial failures with per-employee reason codes.
- Acceptance tests cover ready, warning, blocked, contractor-expired, certification-expired, onboarding-incomplete, and RBAC-denied paths.

## Sprint 3 Definition Of Done
- Implementation-ready data model, API contracts, screens, workflows, integrations, permissions, audit events, and acceptance criteria are documented.
- Plan covers 100 to 10,000 employee tenants and global multi-plant operations.
- Team management, onboarding, role assignment, skills/certifications, contractor support, and shift readiness are all represented.
- Platform Core, RBAC, MES, OEE, ERP/payroll export, and Configuration Studio dependencies are explicit.
- No code changes are required by this planning artifact.
