# Live Agent Roster

Date: 2026-06-29
Repository: Kalvinsadurock/IND5.0

## Purpose

This file tracks the real Codex sub-agents used to build the IND5.0 product organization. It separates live execution from planning documents, so the product owner can see which module teams are actively producing work.

## Completed Agents

| Agent | Scope | Deliverable |
| --- | --- | --- |
| Product Owner Agent | Sprint 3 operational pilot backlog | `agentic-ai-organization/roadmap/sprint-3-product-backlog.md` |
| Solution Architecture Agent | Sprint 3 operational pilot architecture | `agentic-ai-organization/architecture/sprint-3-operational-pilot-architecture.md` |
| QA Agent | Sprint 3 QA gates | `agentic-ai-organization/qa/sprint-3-qa-gates.md` |
| Platform Core Developer Agent | Plant hierarchy editing APIs and component | `server/domains/platform/routes.ts`, `src/app/components/PlantHierarchyManager.tsx` |
| MES Developer Agent | Configurable work-order MVP | `shared/schema.ts`, `server/domains/mes/work-order-routes.ts`, `src/app/components/WorkOrderStudio.tsx` |
| Configuration Studio Agent | Workflow designer and template preview implementation plan | `agentic-ai-organization/charters/configuration-studio-sprint-3-implementation.md` |
| HRMS and Workforce Agent | Team management and workforce onboarding implementation plan | `agentic-ai-organization/charters/hrms-workforce-sprint-3-implementation.md` |
| OEE Agent | OEE operational pilot implementation plan | `agentic-ai-organization/charters/oee-sprint-3-implementation.md` |
| ERP/SAP Integration Agent | ERP and SAP-compatible integration implementation plan | `agentic-ai-organization/charters/erp-sap-sprint-3-implementation.md` |
| Quality and Compliance Agent | Quality and compliance implementation plan | `agentic-ai-organization/charters/quality-compliance-sprint-3-implementation.md` |
| Inventory and Warehouse Agent | Inventory and warehouse implementation plan | `agentic-ai-organization/charters/inventory-warehouse-sprint-3-implementation.md` |
| Maintenance and Asset Agent | Maintenance and asset implementation plan | `agentic-ai-organization/charters/maintenance-asset-sprint-3-implementation.md` |
| Work Management and Ticketing Agent | Work management and sprint-board implementation plan | `agentic-ai-organization/charters/work-management-ticketing-sprint-3-implementation.md` |
| DevOps, Security, and Release Agent | DevOps, security, and release implementation plan | `agentic-ai-organization/charters/devops-security-release-sprint-3-implementation.md` |
| Reporting, Analytics, and AI Agent | Reporting, analytics, and AI implementation plan | `agentic-ai-organization/charters/reporting-analytics-ai-sprint-3-implementation.md` |

## Active Wave

No module agents are currently active.

## Codespace Integration Notes

The shared Codespace architecture note is now partially integrated into MES2. These referenced assets are present:

- `RolePermissionMatrix.tsx`
- `InviteAcceptance.tsx`
- `PilotReadinessChecklist.tsx`
- `SapIntegrationModule.tsx`
- `WorkforceManager.tsx`
- `server/domains/execution/oee-routes.ts`

The note also references `server/middleware/auth.ts`, but MES2 currently uses `server/auth.ts` as the active auth helper location.

## Operating Rule

Code-writing agents must own disjoint files. If two module teams need the same shared file, one agent produces a plan first and the main integrator applies the combined change after review.
