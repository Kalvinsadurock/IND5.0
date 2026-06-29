# Live Agent Roster

Date: 2026-06-29
Repository: Kalvinsadurock/IND5.0

## Purpose

This file tracks the real Codex sub-agents used to build the IND5.0 product organization. It separates live execution from planning documents, so the product owner can see which module teams are actively producing work.

## Completed Planning Agents

| Agent | Scope | Deliverable |
| --- | --- | --- |
| Product Owner Agent | Sprint 3 operational pilot backlog | `agentic-ai-organization/roadmap/sprint-3-product-backlog.md` |
| Solution Architecture Agent | Sprint 3 operational pilot architecture | `agentic-ai-organization/architecture/sprint-3-operational-pilot-architecture.md` |
| QA Agent | Sprint 3 QA gates | `agentic-ai-organization/qa/sprint-3-qa-gates.md` |
| Configuration Studio Agent | Workflow designer and template preview implementation plan | `agentic-ai-organization/charters/configuration-studio-sprint-3-implementation.md` |
| HRMS and Workforce Agent | Team management and workforce onboarding implementation plan | `agentic-ai-organization/charters/hrms-workforce-sprint-3-implementation.md` |
| OEE Agent | OEE operational pilot implementation plan | `agentic-ai-organization/charters/oee-sprint-3-implementation.md` |

## Active Wave

| Agent | Scope | Ownership |
| --- | --- | --- |
| Platform Core Developer Agent | Plant hierarchy editing APIs and component | `server/domains/platform/routes.ts`, `src/app/components/PlantHierarchyManager.tsx` |
| MES Developer Agent | Configurable work-order MVP | `shared/schema.ts`, `server/domains/mes/work-order-routes.ts`, `src/app/components/WorkOrderStudio.tsx` |
| ERP/SAP Integration Agent | ERP and SAP-compatible integration implementation plan | `agentic-ai-organization/charters/erp-sap-sprint-3-implementation.md` |
| Quality and Compliance Agent | Quality and compliance implementation plan | `agentic-ai-organization/charters/quality-compliance-sprint-3-implementation.md` |
| Inventory and Warehouse Agent | Inventory and warehouse implementation plan | `agentic-ai-organization/charters/inventory-warehouse-sprint-3-implementation.md` |
| Maintenance and Asset Agent | Maintenance and asset implementation plan | `agentic-ai-organization/charters/maintenance-asset-sprint-3-implementation.md` |

## Queued Next Wave

These agents should start after the active wave finishes or capacity opens:

- Work Management and Ticketing Agent
- Reporting, Analytics, and AI Agent
- DevOps, Security, and Release Agent

## Operating Rule

Code-writing agents must own disjoint files. If two module teams need the same shared file, one agent produces a plan first and the main integrator applies the combined change after review.
