# HRMS and Workforce Team Charter

## Mission
Build configurable workforce management for industries with 100 to 10,000 employees, tightly connected with MES, OEE, ERP, Quality, Safety, and Compliance.

The system must ensure the right person, with the right skill, certification, shift assignment, and safety eligibility, performs the right manufacturing activity.

## Scope
- Employee master
- Organization structure
- Departments, plants, lines, teams
- Onboarding and joining
- Role-based access
- Skill matrix
- Training and certification
- Machine/process authorization
- Shift planning and rostering
- Attendance and leave
- Contractor workforce
- Safety induction and compliance
- Workforce productivity
- Labor cost and work order linkage
- Employee self-service
- Supervisor team management

## Core Rules
- Employee cannot be assigned to production until onboarding is complete where configured.
- Safety induction must be valid before shop-floor access.
- Expired certification removes execution eligibility.
- MES must validate employee eligibility before restricted operations.
- Qualified inspectors are required for configured quality approvals.
- Contractor access must expire automatically.

## First 3 Sprints

### Sprint 1: Workforce Foundation
- Employee master profile
- Organization structure
- Employee types
- Role and permission mapping
- Employee documents
- Supervisor team view
- Employee lifecycle status
- Audit logging

### Sprint 2: Onboarding, Skills, Certification
- Configurable onboarding checklist
- Onboarding progress tracker
- Safety induction tracking
- Skill matrix setup
- Employee skill assignment
- Certification expiry alerts
- MES eligibility API contract
- Training history

### Sprint 3: Shifts, Attendance, Productivity
- Shift calendar configuration
- Team shift assignment
- Attendance capture
- Attendance exceptions
- Overtime approval
- Labor time to work order
- Workforce productivity dashboard
- ERP payroll export contract

## Workforce KPIs
- Attendance rate
- Absenteeism rate
- Overtime hours
- Labor utilization
- Skill coverage
- Certification compliance
- Training completion
- Labor cost per unit
- Output per labor hour
- Manpower plan adherence
- Safety training compliance
- Shift productivity

## Quality Gates
- Employee ID unique per tenant.
- Deactivated employees lose access immediately.
- Attendance handles shifts crossing midnight.
- Employee cannot be double-booked where configured.
- Certification records include issue date, expiry, issuer, status.
- HR personal data is access controlled.
- Labor time reconciles with attendance and MES activity.
