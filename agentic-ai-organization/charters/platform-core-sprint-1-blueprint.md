# Platform Core Sprint 1 Implementation Blueprint

## Mission
Build the foundational platform core for a configurable industrial platform that supports multiple companies, plants, departments, lines, roles, permissions, and audit trails.

## Sprint 1 Scope
Included: tenant/company setup, plant hierarchy, organization structure, user and role foundation, permission model, audit event model, admin UI shell, API contracts, database table design, acceptance tests.

Excluded: full HRMS employee lifecycle, MES execution, ERP transactions, OEE calculation, SAP posting, payroll, advanced workflow builder, advanced form builder.

## Core Objects
| Object | Description | Owner |
|---|---|---|
| Tenant | Customer company/account using the platform | Platform Core |
| Company | Legal/business entity under a tenant | Platform Core / ERP alignment |
| Plant | Manufacturing site/factory | Platform Core |
| Area | Physical or logical zone inside a plant | Platform Core |
| Department | Functional department | Platform Core |
| Line | Production line or operating unit | Platform Core |
| Work Center | Station, cell, or machine group | Platform Core |
| User | System login identity | Platform Core |
| Role | Named access group | Platform Core |
| Permission | Action-level access rule | Platform Core |
| User Role Assignment | User-role-scope mapping | Platform Core |
| Audit Event | Immutable record of important actions | Platform Core |

## Database Tables
- tenants
- companies
- plants
- areas
- departments
- lines
- work_centers
- users
- roles
- permissions
- role_permissions
- user_role_assignments
- audit_events

## API Groups
- /api/platform/tenants/current
- /api/platform/companies
- /api/platform/plants
- /api/platform/areas
- /api/platform/departments
- /api/platform/lines
- /api/platform/work-centers
- /api/platform/users
- /api/platform/roles
- /api/platform/permissions
- /api/platform/audit-events

## UI Screens
1. Platform Setup Dashboard
2. Company Settings
3. Plant Hierarchy Builder
4. User Management
5. Role and Permission Manager
6. Audit Log Viewer

## Critical Permission Codes
- platform.tenant.read
- platform.tenant.update
- platform.company.create
- platform.company.update
- platform.plant.create
- platform.plant.update
- platform.area.create
- platform.department.create
- platform.line.create
- platform.work_center.create
- platform.user.read
- platform.user.invite
- platform.user.update
- platform.user.assign_role
- platform.user.revoke_role
- platform.role.create
- platform.role.update
- platform.role.configure
- platform.permission.read
- platform.audit.read
- platform.audit.export

## Required Audit Events
- tenant.updated
- company.created
- company.updated
- plant.created
- plant.updated
- area.created
- department.created
- line.created
- work_center.created
- user.invited
- user.activated
- user.suspended
- user.deactivated
- role.created
- role.updated
- role.permission_added
- role.permission_removed
- user.role_assigned
- user.role_revoked
- auth.login_success
- auth.login_failed
- permission.denied
- audit.exported

## Sprint 1 Definition Of Done
- Tenant/company structure is implemented.
- Plant hierarchy supports plant, area, department, line, and work center.
- Users can be invited, activated, suspended, and deactivated.
- Roles and permissions can be configured.
- User role assignments support tenant and plant-level scope.
- Critical actions generate immutable audit events.
- API routes enforce tenant isolation and permission checks.
- Admin UI supports setup of company, plant hierarchy, users, roles, and audit viewing.
- Acceptance tests pass.
