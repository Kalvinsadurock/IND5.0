# Data Ownership Model

| Data Object | Owning Team | Consumers |
|---|---|---|
| Tenant, plant, roles, permissions | Platform Core | All modules |
| Industry templates, custom fields, configurable forms | Configuration Studio | All modules |
| Employee, skill, certification, shift, attendance | HRMS and Workforce | MES, OEE, Quality, Maintenance, ERP |
| Product, part, material, SKU | ERP and Inventory | MES, Quality, OEE, SAP Integration |
| BOM | ERP and Inventory | MES, Procurement, Costing, SAP Integration |
| Routing and process flow | MES | ERP, Quality, OEE, Reporting |
| Work order, operation, traveler | MES | ERP, OEE, Quality, Reporting |
| Inventory lot, batch, serial, stock, warehouse | ERP and Inventory | MES, Quality, SAP Integration |
| Quality plan, checkpoint, defect, NCR, CAPA | Quality and Compliance | MES, ERP, Reporting |
| Machine, work center, tool, mould, calibration | Maintenance and Asset | MES, OEE, Quality, ERP |
| Downtime, runtime, good count, reject count | OEE | MES, Maintenance, Reporting, HRMS |
| SAP mapping, sync status, posting log | SAP Integration | ERP, MES, Finance, Work Management |
| Ticket, task, sprint board item | Work Management | All modules |
| Reports, dashboards, KPIs | Reporting, Analytics, and AI | All modules |
| Audit log | Platform Core | Security, Compliance, All modules |

## Rule
Other modules may consume or reference canonical objects, but they must not create competing master records.
