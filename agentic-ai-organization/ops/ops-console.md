# Agentic Product Company Ops Console

## Live Command Centers

- Notion Command Center: https://app.notion.com/p/38ed941eddf481c6a15ce39fad23922c
- Figma FigJam Organization Map: https://www.figma.com/board/HgqNXbaEUIOEkCzoLf7mc6

## Notion Databases

- AI Agent Teams: https://app.notion.com/p/8eec02147145488dbc6942bbc7df7c91
- Industrial Platform Backlog: https://app.notion.com/p/da24013948fe4a8a95ac7a3cbaf3e48d
- Architecture Decisions: https://app.notion.com/p/b57e09a6f6884539a202c2ced14a99bd

## GitHub Status

Repository detected from local git remote: Kalvinsadurock/MES

GitHub issue creation failed with 404 from the connector. Likely causes:
- The GitHub app is not installed on this repository.
- The authenticated GitHub account cannot see the repository.
- Issues are disabled for the repository.
- The remote repository name or owner has changed.

Until fixed, Notion is the working backlog system.

## Sprint 1 Active Teams

1. Industrial Platform Command Center
2. Platform Core Team
3. Configuration Studio Team
4. HRMS and Workforce Team
5. ERP and Inventory Team

## Sprint 1 Backlog

- CORE-001 Define tenant and company model
- CORE-002 Define plant, department, line hierarchy
- CORE-003 Build role and permission matrix
- CORE-004 Implement audit event model
- CONFIG-001 Define configurable custom field engine
- CONFIG-002 Define configurable workflow state engine
- HRMS-001 Create employee master foundation
- ERP-001 Define material master foundation

## How To Run The Agent Organization In Codex

### 1. Command Center Review
Use agentic-ai-organization/prompts/command-center-agent.md and ask:

Create Sprint 1 execution plan for Platform Core and Configuration Studio. Resolve data ownership, architecture risks, and release gates.

### 2. Platform Core Developer Agent
Use agentic-ai-organization/prompts/developer-agent.md and assign:

Build tenant, plant, role, permission, and audit model foundation. Own server/shared schema and backend API routes only. Do not build MES-specific workflows.

### 3. Configuration Studio Agent
Use agentic-ai-organization/prompts/module-team-agent.md and assign:

Design configurable custom field and workflow state engine for all modules. Produce schema, APIs, UI requirements, and QA scenarios.

### 4. QA Agent
Use agentic-ai-organization/prompts/qa-agent.md and assign:

Validate Platform Core foundation for tenant isolation, role access, audit events, and configuration rules.

## Build Rule

Do not let any module team build isolated screens until Platform Core identity, access, audit, and configuration primitives are approved.
