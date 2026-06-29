# DevOps, Security, and Release Sprint 3 Implementation Plan

Date: 2026-06-29
Repository: Kalvinsadurock/IND5.0
Owner: DevOps, Security, and Release Agent
Sprint Goal: Prepare the Sprint 3 operational pilot for controlled deployment, secure multi-tenant validation, repeatable database promotion, and auditable release approval.

## Scope

This plan owns the operational controls around Sprint 3 delivery. It does not own product feature implementation, UI design, or module code changes. The DevOps, Security, and Release Agent coordinates the release path across GitHub, Vercel, Supabase, environment management, secrets, tenant isolation, RBAC, audit logs, backup/restore, observability, release gates, incident response, and agentic development governance.

Sprint 3 converts the Sprint 1 and Sprint 2 platform foundation into an operational pilot. Release readiness is therefore measured by whether the tenant admin, implementation consultant, and plant manager flows can be deployed safely, validated repeatedly, and rolled back without damaging tenant data.

## Outcomes

| Outcome | Requirement |
|---|---|
| Controlled source flow | All Sprint 3 work lands through reviewed GitHub branches and pull requests with clear ownership. |
| Reproducible deployment | Vercel deployment is linked to the correct project, environment, branch, and release candidate. |
| Safe database promotion | Supabase schema changes are reviewed, backed up, applied to the intended project, and verified before release. |
| Secret hygiene | Secrets are never committed, are scoped by environment, and are rotated when exposure is suspected. |
| Tenant isolation assurance | Release cannot pass if tenant data, permissions, or workflow records leak across tenant boundaries. |
| Security review | RBAC, audit trail, incident response, and least-privilege checks are explicit release gates. |
| Operational visibility | Build, deployment, database, application, audit, and incident signals are observable after release. |
| Governed agentic delivery | Parallel agents work through file ownership, handoff notes, and release-manager approval instead of overwriting each other. |

## User Stories Supported

| Story | Priority | DevOps, Security, and Release Responsibility |
|---|---:|---|
| S3-001 Editable Plant Hierarchy Tree | P0 | Gate tenant-scoped hierarchy writes, audit events, and rollback impact. |
| S3-002 Role-Permission Matrix | P0 | Gate RBAC enforcement, privilege escalation controls, and audit evidence. |
| S3-003 Admin Invite Acceptance | P0 | Gate invite token safety, environment secrets, and authentication configuration. |
| S3-004 Industry Template Preview Before Creation | P1 | Verify preview has no unintended database writes before confirmation. |
| S3-005 Work-Order Editor Using Custom Fields | P0 | Gate tenant-scoped object data and custom-field persistence. |
| S3-006 Work-Order List and Detail Pilot View | P1 | Gate cross-tenant read isolation and permission-filtered API access. |
| S3-007 Workflow Designer MVP | P0 | Gate workflow migration safety, versioning/audit evidence, and rollback notes. |
| S3-008 Workflow Transition Execution | P1 | Gate permission enforcement, workflow history, and audit event completeness. |
| S3-009 Pilot Readiness Checklist | P2 | Gate release-readiness evidence and post-release monitoring. |

## Source Control and GitHub Workflow

### Branching

- Use short-lived feature branches for each module team and release-control change.
- Prefix Codex-created branches with `codex/` unless a human release manager chooses a different naming convention.
- Keep this agent's ownership limited to release, security, DevOps, governance, and operational documents unless explicitly assigned implementation work.
- Do not rewrite shared history or revert changes from other agents during Sprint 3 parallel work.

### Pull Request Rules

Every Sprint 3 pull request should include:

- linked Sprint 3 story or operational gate
- owning agent/team
- changed modules and files
- database impact summary
- environment variable impact summary
- security impact summary
- test evidence
- rollback notes
- release notes draft

Release-blocking pull request labels:

- `security-review-required`
- `migration-review-required`
- `env-change-required`
- `tenant-isolation-risk`
- `rbac-risk`
- `audit-risk`
- `release-blocker`

### Required Reviews

| Change Type | Required Reviewer |
|---|---|
| Schema, migration, Supabase config | DevOps/Security/Release plus data owner |
| Tenant isolation, RBAC, invite, auth | Security Architect Agent |
| Audit event model or critical action logging | Security Architect Agent plus QA Governance Agent |
| Vercel build/deployment config | Release Train Manager |
| Cross-module API contract | Chief Platform Architect plus affected module owner |

## Vercel Deployment Plan

### Project Setup

Current infrastructure notes show Vercel is connected, but the visible project is `edennova-platform-original`. Sprint 3 should not assume this is the correct deployment target for MES2/IND5.0. Before release candidate deployment:

1. Confirm the dedicated Vercel project for MES2/IND5.0.
2. Confirm the GitHub repository and production branch linked to that project.
3. Confirm preview deployments are enabled for pull requests.
4. Confirm production deployments require explicit release-manager promotion.

### Environments

| Environment | Purpose | Deployment Source |
|---|---|---|
| Preview | Pull request validation and reviewer walkthroughs | PR branch |
| Staging | Release candidate validation against staging Supabase | release candidate branch/tag |
| Production | Controlled pilot environment | approved release tag or protected branch |

### Build and Deployment Gates

- `npm run build` must pass for every release candidate.
- Preview deployment must load core navigation, Platform Core, Configuration Studio, onboarding, work-order, workflow, and audit views.
- Staging deployment must use staging-only environment variables.
- Production deployment must be promoted only after release gates pass.
- Release notes and rollback notes must be attached before promotion.

## Supabase Migration Plan

### Project Safety

Infrastructure notes list multiple Supabase projects and recommend a dedicated development database/project for the combined platform. Sprint 3 database work must identify the exact target before any migration command runs.

Required project separation:

- development project for active agent work
- staging project for release candidate validation
- production or pilot project for approved release only

### Migration Review Checklist

Before applying a schema change:

- Confirm the migration target project ID and environment.
- Confirm whether the change is additive, destructive, or data-transforming.
- Confirm tenant-scoped columns are present on all tenant-owned records.
- Confirm unique constraints are scoped to tenant or owning parent where appropriate.
- Confirm foreign keys or application guards prevent orphaned hierarchy, RBAC, custom-field, workflow, and work-order records.
- Confirm existing Sprint 1/Sprint 2 demo data remains readable.
- Confirm rollback or forward-fix instructions exist.

### Migration Execution

1. Back up the target database or capture a restorable snapshot.
2. Apply migrations to development first.
3. Re-run onboarding idempotency checks.
4. Apply migrations to staging.
5. Run Sprint 3 QA gates on staging.
6. Approve production/pilot migration only after release sign-off.
7. Record migration result, timestamp, target project, and verifier in release notes.

### Rollback Standard

Every migration that changes platform, configuration, workflow, RBAC, audit, or work-order data must include one of:

- a reversible down migration
- a forward-fix plan with validation queries
- a documented reason rollback is not safe, plus restore-from-backup instructions

## Environment Management

### Environment Variable Inventory

Maintain a versioned inventory of required environment variables without storing secret values. The inventory should include:

- variable name
- owning service
- required environments
- sensitivity level
- rotation owner
- last reviewed date
- consumers in the app

Expected categories:

- database connection
- Supabase URL and service keys
- authentication/session secrets
- invite token signing or expiry configuration
- Vercel deployment settings
- logging/observability sinks
- email or notification provider settings

### Separation Rules

- Development, staging, and production values must not be shared.
- Service-role keys must never be exposed to browser code.
- Public client keys must be clearly marked as public and least-privilege.
- Secrets must not appear in `.env.example`, docs, screenshots, pull request comments, logs, or build output.
- Local `.env` files remain local and must not be committed.

## Secrets Management

### Required Controls

- Store Vercel production secrets in Vercel environment variables.
- Store local developer secrets only in local ignored files.
- Rotate any secret that appears in committed files, logs, issue comments, screenshots, or agent transcripts.
- Limit Supabase service-role key access to server-side runtime and release operators.
- Use separate keys per environment where the provider supports it.

### Secret Exposure Response

If a secret may be exposed:

1. Stop using the exposed value.
2. Rotate it in the provider console.
3. Update Vercel and local secure stores.
4. Redeploy affected environments.
5. Review logs for suspicious use.
6. Document the exposure, rotation time, and affected services.

## Tenant Isolation Security

Tenant isolation is a release-blocking gate. Every tenant-owned read and write must resolve tenant ownership server-side. UI filtering alone is not sufficient.

### Isolation Checks

- All platform hierarchy records are scoped by tenant and parent ownership.
- Roles, permissions, and assignments cannot be read or mutated across tenants.
- Configurable object types, custom fields, workflow definitions, states, transitions, instances, and history cannot leak across tenants.
- Work-order list/detail APIs never return another tenant's records.
- Audit log queries filter by tenant and authorized scope.
- Admin invite acceptance validates token, tenant, email, expiry, and single-use state.

### Negative Test Requirements

For each release candidate, QA/Security should attempt:

- reading tenant B data with tenant A context
- updating tenant B hierarchy from tenant A context
- assigning tenant B permissions from tenant A context
- transitioning tenant B workflow/work order from tenant A context
- querying audit events outside the actor's tenant scope

Any successful cross-tenant access fails the release.

## RBAC Enforcement

### Enforcement Standard

- Every protected UI action must have matching API authorization.
- API authorization is the source of truth.
- Permission checks must use current role-permission assignments, not hardcoded role names.
- Tenant Admin safeguards must prevent removing the last administrative path for a tenant.
- Plant Manager and Operator access must be constrained by assigned scope.

### Sprint 3 Permission Domains

Required permission coverage:

- platform hierarchy read/create/update/deactivate
- platform role-permission read/update
- platform audit read
- configuration custom-field read/update
- configuration workflow design/publish
- MES work-order read/create/update/transition
- onboarding/admin invite read/accept/reissue where applicable

### Release Evidence

For release approval, capture:

- RBAC matrix before/after permission changes
- successful authorized action
- blocked unauthorized action
- audit event for permission change
- proof that UI and API behavior agree

## Audit Logs

### Audit Standard

Critical actions must write server-side audit events to `platform_audit_events` or the shared audit sink selected by Platform Core. The event should include:

- tenant ID
- actor ID or service actor
- module
- event type
- target entity type and ID
- timestamp
- request/correlation ID when available
- before and after snapshots for mutations
- outcome: success, failure, denied, or blocked

### Required Sprint 3 Events

- hierarchy node created, updated, deactivated, reactivated, or blocked
- role permission added or removed
- role assignment changed
- admin invite accepted, expired, rejected, or reused attempt blocked
- industry template preview opened
- work order created, updated, or transitioned
- custom-field values changed
- workflow designer saved
- workflow activation passed or blocked
- permission denied
- release deployment and migration events where operationally feasible

### Audit Gate

Release fails if critical Sprint 3 writes succeed without audit evidence, or if audit logs expose another tenant's private data.

## Backup and Restore

### Backup Requirements

- Capture a restorable database backup before staging and production/pilot migrations.
- Confirm backup timestamp, project ID, and retention window.
- Store release artifacts and migration notes with the backup reference.
- Include application deployment version, Git commit, and migration identifier in the release record.

### Restore Drill

Before production pilot release, perform a staging restore drill:

1. Restore staging backup to an isolated validation database or branch.
2. Confirm tenant, hierarchy, role, permission, audit, configuration, workflow, and work-order records are readable.
3. Confirm onboarding can still be retried idempotently.
4. Document restore duration and known manual steps.

### Recovery Objectives

For Sprint 3 pilot:

- Recovery Point Objective: last pre-release backup or provider-supported point-in-time recovery.
- Recovery Time Objective: documented manual recovery path within the pilot operating window.

## Observability

### Signals to Capture

| Signal | Purpose |
|---|---|
| Vercel build and deploy status | Detect failed release candidate and production promotion. |
| Application startup errors | Confirm deployment is runnable. |
| API error rates | Detect authorization, validation, and database regressions. |
| Database migration results | Confirm schema promotion succeeded. |
| Audit event volume | Detect missing audit writes after critical flows. |
| Permission denied events | Detect misconfigured RBAC or suspicious access. |
| Invite acceptance failures | Detect onboarding/auth problems. |
| Cross-tenant access attempts | Detect isolation attacks or test failures. |

### Minimum Dashboards

- release health dashboard: build, deploy, current version, last migration
- application health dashboard: request errors, startup errors, slow endpoints
- security dashboard: permission denied events, invite failures, cross-tenant access attempts
- audit coverage dashboard: critical action counts by module and tenant

### Alerting

Page or notify the release owner for:

- production deployment failure
- database migration failure
- repeated 500 errors on Sprint 3 APIs
- suspected cross-tenant access
- privilege escalation attempt
- audit write failures
- admin invite abuse pattern

## Release Gates

### Gate 1: Source and Review

Pass criteria:

- All Sprint 3 implementation changes are in reviewed pull requests.
- Ownership conflicts are resolved.
- No unrelated reversions are present.
- Release notes and rollback notes are complete.

### Gate 2: Build and Deployment

Pass criteria:

- `npm run build` passes.
- Vercel preview and staging deployments start successfully.
- Sprint 3 screens load without fatal errors.
- Environment variables are complete and environment-specific.

### Gate 3: Database and Migration

Pass criteria:

- Migration target is confirmed.
- Backup exists.
- Migrations apply cleanly to staging.
- Existing Sprint 1/Sprint 2 data remains readable.
- Onboarding idempotency still passes.

### Gate 4: Tenant Isolation and RBAC

Pass criteria:

- Negative cross-tenant tests fail safely.
- UI and API authorization agree.
- No role can grant or retain unauthorized administrative access.
- Tenant Admin lockout prevention works.

### Gate 5: Audit and Compliance

Pass criteria:

- Critical writes create audit events.
- Audit event details are sufficient for review.
- Audit log views are tenant-scoped.
- Permission-denied events are captured.

### Gate 6: Operational Readiness

Pass criteria:

- Observability checks are active.
- Backup/restore notes are complete.
- Incident response owner is assigned.
- Production promotion is explicitly approved.

## Incident Response

### Severity Levels

| Severity | Definition | Response |
|---|---|---|
| Sev 1 | Tenant data leak, privilege escalation, destructive data corruption, production unavailable | Stop release or roll back, notify command center, begin incident record immediately. |
| Sev 2 | Broken P0 pilot path, failed migration with recoverable data, audit missing for critical writes | Hold release, assign owner, fix or forward-fix before approval. |
| Sev 3 | Non-critical screen issue, degraded observability, documentation gap | Track in release notes or backlog if pilot safety is not affected. |

### Response Runbook

1. Triage impact: affected environment, tenants, users, data, and release version.
2. Freeze risky deploys and migrations.
3. Preserve logs, audit records, build IDs, commit SHAs, and migration output.
4. Decide rollback, forward fix, or feature disablement.
5. Communicate status to Command Center and affected module agents.
6. Verify recovery through smoke, RBAC, tenant isolation, and audit checks.
7. Document root cause and prevention work.

### Security Incident Triggers

- cross-tenant read or write succeeds
- unauthorized role-permission update succeeds
- service-role key exposed to browser/runtime logs
- audit events missing for critical successful writes
- invite token reuse or bypass succeeds
- production database migration applies to wrong project

## Agentic Development Governance

### File Ownership

- Agents must edit only assigned files unless the Command Center expands ownership.
- Shared files require explicit coordination before modification.
- Documentation agents must not alter code while implementation agents are working unless requested.
- Do not revert or overwrite edits from other agents.

### Handoff Rules

Every handoff should state:

- files changed
- files intentionally not touched
- assumptions
- unresolved blockers
- tests or checks run
- risks requiring release-owner attention

### Parallel Work Controls

- Use branch and pull request descriptions as the durable coordination record.
- Keep operational docs in `agentic-ai-organization/*`.
- Keep implementation changes scoped to module ownership.
- Escalate conflicts in schema, auth, audit, or shared APIs to the Chief Platform Architect and Release Train Manager.

### Agent Release Conduct

Agents must not:

- commit secrets
- edit production environment values without release approval
- run migrations against an unconfirmed Supabase project
- bypass failing release gates
- hide known defects by suppressing tests or TypeScript errors globally
- claim release readiness without evidence

## Sprint 3 Release Checklist

| Area | Checklist Item | Owner | Status |
|---|---|---|---|
| GitHub | PR workflow, labels, and review ownership documented | DevOps/Security/Release | Planned |
| Vercel | Dedicated MES2/IND5.0 project confirmed | Release Train Manager | Planned |
| Vercel | Preview, staging, and production env separation confirmed | DevOps/Security/Release | Planned |
| Supabase | Development, staging, and production/pilot projects confirmed | DevOps/Security/Release | Planned |
| Supabase | Backup captured before staging and production/pilot migration | DevOps/Security/Release | Planned |
| Environment | Required variable inventory completed without secret values | DevOps/Security/Release | Planned |
| Secrets | Service-role and runtime secret access reviewed | Security Architect Agent | Planned |
| Security | Tenant isolation negative tests completed | QA Governance Agent | Planned |
| Security | RBAC matrix enforcement verified through UI and API | QA Governance Agent | Planned |
| Audit | Critical Sprint 3 events verified in audit log | Security Architect Agent | Planned |
| Backup | Staging restore drill completed | DevOps/Security/Release | Planned |
| Observability | Release, app health, security, and audit signals monitored | DevOps/Security/Release | Planned |
| Release | Release notes, rollback notes, and incident owner assigned | Release Train Manager | Planned |
| Governance | Agent handoff evidence captured for release candidate | Command Center | Planned |

## Release Decision Policy

### Pass

- All release gates pass.
- Vercel staging deployment is validated.
- Supabase staging migration is validated.
- Tenant isolation and RBAC negative tests pass.
- Critical audit events are present.
- Backup and restore evidence exists.
- Release Train Manager approves production/pilot promotion.

### Conditional Pass

- Functional Sprint 3 gates pass.
- Remaining issues are documented Sev 3 items.
- No unresolved tenant isolation, RBAC, secret, migration, audit, backup, or production deployment risk remains.
- Command Center accepts the residual risk for a controlled pilot.

### Fail

- Build or deployment fails.
- Migration target cannot be confirmed.
- Backup is missing before a risky migration.
- Cross-tenant access succeeds.
- Unauthorized RBAC action succeeds.
- Critical audit events are missing.
- Secrets are exposed and not rotated.
- Production/pilot release lacks rollback or incident-response ownership.

## Open Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Dedicated Vercel project for MES2/IND5.0 is not yet confirmed | Release could deploy to the wrong application | Confirm project before staging or production deployment. |
| Dedicated Supabase development/staging/pilot project separation is not yet confirmed | Migration could touch the wrong data | Require explicit project ID confirmation before migration. |
| GitHub connector previously reported repository access issues | PR automation and issue tracking may be incomplete | Confirm repository full name and GitHub app permissions. |
| Full TypeScript gate has known legacy blockers | Release signal could be noisy | Use `npm run build` plus file-level TypeScript isolation until legacy buckets are resolved. |
| Parallel agents may edit shared schema or API files | Conflicts or duplicated patterns | Require architecture/release review for shared files and migration changes. |

## Done Criteria

The DevOps, Security, and Release plan is done for Sprint 3 when:

- the release path is documented from branch to production/pilot promotion
- environment and secret controls are defined
- Supabase migration, backup, and restore controls are defined
- tenant isolation, RBAC, and audit release gates are explicit
- observability and incident response responsibilities are assigned
- agentic governance rules protect parallel work
- release decision policy is clear enough for the Command Center to approve or block the Sprint 3 pilot
