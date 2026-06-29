# MES and OEE Team Charter

## Mission
Build configurable MES and OEE modules that support discrete, batch, continuous, and hybrid manufacturing.

MES captures production truth. OEE converts production and machine events into performance insight.

## MES Scope
- Process definition and routing
- Work orders and production execution
- Digital traveler and traceability
- Operator workflows
- Material consumption
- Holds, deviations, rework, scrap
- Production reporting

## OEE Scope
- Shift and machine configuration
- Runtime, downtime, speed loss, good count, reject count
- Availability, Performance, Quality, OEE
- Downtime reason trees
- Shift, line, machine, product, and plant dashboards
- Improvement tickets from major losses

## Key Dependencies

| Dependency | Provider |
|---|---|
| Employee eligibility, skills, shifts | HRMS |
| Materials, lots, stock, BOM | ERP and Inventory |
| Inspection plans, defects, rework rules | Quality |
| Machine status and PM windows | Maintenance |
| Production orders and costing structures | ERP/SAP |
| Tickets and corrective actions | Work Management |

## First 3 Sprints

### Sprint 1: Foundation
- Plant, area, line, machine, workstation master
- Product, part, BOM, routing baseline
- Configurable process step model
- Work order model
- Shift calendar and OEE asset hierarchy
- Downtime and reject reason masters

### Sprint 2: Execution and Event Capture
- Release work order to production
- Start, pause, resume, complete operation
- Capture operator, machine, time, material, checklist data
- Raise hold/deviation
- Capture manual machine run/stop, good count, reject count, downtime
- Basic OEE calculation service

### Sprint 3: Dashboards and Reports
- Live work order dashboard
- Digital traveler and traceability view
- Defect/rework/scrap linkage
- Real-time OEE dashboard
- Downtime Pareto
- Shift OEE report
- Ticket creation from production or OEE event

## Quality Gates
- OEE formula verified with controlled sample data.
- Work order status transitions validated.
- Audit events captured for critical actions.
- Operator permissions and HRMS eligibility checked.
- Material consumption and quality linkage tested.
