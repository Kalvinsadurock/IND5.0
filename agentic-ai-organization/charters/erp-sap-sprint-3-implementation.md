# ERP and SAP Integration Sprint 3 Implementation Plan

## Mission
Build the Sprint 3 integration foundation that lets IND5.0 operate in standalone ERP, SAP-compatible, and hybrid modes while keeping SAP-compatible finance and master-data boundaries clear.

## Sprint 3 Scope
Included: material master integration, BOM and routing import, purchase receipt posting, inventory valuation hooks, production order synchronization, goods issue and goods receipt flows, quality usage decision posting, HR/payroll boundary definition, API and event strategy, SAP field mapping, tenant-specific integration configuration, reconciliation, retry, audit, and support workflows.

Excluded: full SAP connector certification, payroll processing, financial statement generation, advanced warehouse optimization, complete cost rollup engine, supplier collaboration portal, and irreversible automatic finance posting without tenant approval rules.

## Operating Principles
- SAP remains the financial system of record when SAP mode is active.
- IND5.0 remains the manufacturing execution system of record for shop-floor execution, WIP events, quality execution, and OEE-linked production activity.
- Every inbound and outbound integration message must be idempotent, traceable, replayable, tenant-scoped, and auditable.
- Integration records must preserve internal ID, external system ID, source system, target system, payload hash, status, retry count, correlation ID, timestamps, and error details.
- Failed or blocked postings must create work-management tickets with clear owner, severity, payload reference, and recovery action.
- Tenant configuration must control object ownership, posting mode, approval gates, mapping values, and retry behavior.

## Core Workstreams

| Workstream | Primary Outcome | Owning Team | Partner Teams |
|---|---|---|---|
| Master Data Integration | SAP-compatible material, BOM, routing, vendor, and cost object mappings | ERP/SAP Integration | Platform Core, Configuration Studio |
| Procurement and Inventory Events | Purchase receipts, stock movements, valuation hooks, and inventory reconciliation | ERP/SAP Integration | Quality, Finance, Warehouse |
| Production Synchronization | Production order import, goods issue, confirmations, and goods receipt | ERP/SAP Integration | MES/OEE, Quality |
| Quality Integration | Quality inspection status and usage decision outbound posting | ERP/SAP Integration | Quality |
| Boundary and Controls | HR/payroll boundary, financial posting controls, segregation of duties | ERP/SAP Integration | HRMS, Platform Core |
| API and Event Foundation | REST APIs, event contracts, retry model, integration logs | ERP/SAP Integration | Platform Core |

## Material Master

### Objectives
- Support SAP-originated and IND5.0-originated material master records depending on tenant mode.
- Prevent duplicate material records across plants, storage locations, and external ERP systems.
- Capture manufacturing attributes required for MES, inventory, quality, costing, and procurement.

### Required Capabilities
- Material identity mapping: internal material ID, SAP material number, tenant code, plant code, source system, material type, and active status.
- UOM mapping and conversion with base UOM, issue UOM, purchase UOM, production UOM, and alternate UOM rules.
- Classification attributes for raw material, semi-finished goods, finished goods, consumable, packaging, tooling, and service items.
- Inventory attributes for batch management, serial management, shelf life, storage condition, valuation class, price control, lot size, and reorder rules.
- Quality attributes for inspection type, certificate requirement, incoming inspection trigger, in-process inspection trigger, and release/block policy.
- Tenant custom fields through Configuration Studio for industry-specific material data.

### Definition Of Done
- Material records can be imported, matched, updated, and deactivated without creating duplicates.
- UOM conversion is validated before inventory or production posting.
- Batch, serial, and quality flags drive downstream goods movement validation.
- Material changes are audit logged and visible in integration reconciliation.

## BOM And Routing

### Objectives
- Import SAP-compatible BOM and routing data for production planning and MES execution.
- Keep IND5.0 execution flexible while preserving external ERP references.

### Required Capabilities
- BOM header mapping: material, plant, usage, alternative BOM, validity dates, revision, and status.
- BOM component mapping: component material, quantity, UOM, scrap percentage, backflush flag, operation reference, and issue storage location.
- Routing header mapping: material, plant, routing group, group counter, validity dates, and status.
- Operation mapping: operation number, work center, control key, standard setup time, standard machine time, standard labor time, queue time, and move time.
- Work center cross-reference between SAP work center and IND5.0 plant, line, machine, or work center.
- Version activation rules so tenants can stage imported structures before shop-floor use.

### Definition Of Done
- Production orders can reference imported BOM and routing versions.
- Invalid components, missing work centers, inactive materials, and UOM conflicts are blocked before release.
- BOM and routing changes produce versioned audit records.

## Purchase Receipts

### Objectives
- Support GRN creation in IND5.0 and SAP-compatible receipt posting.
- Trigger incoming quality inspection when material and tenant rules require it.

### Required Capabilities
- Purchase order inbound reference with PO number, item, schedule line, supplier, material, quantity, plant, storage location, and expected delivery date.
- Receipt capture for received quantity, accepted quantity, rejected quantity, batch, serials, supplier lot, certificate, document date, and posting date.
- Three states: draft receipt, quality hold receipt, and posted receipt.
- Outbound SAP-compatible goods receipt event for PO receipt.
- Duplicate prevention using PO item, material, batch or serial, posting date, and external reference.
- Reversal support for receipt corrections with reason code and approval.

### Definition Of Done
- Purchase receipts create inventory only after required validation and quality state handling.
- SAP-compatible receipt events are idempotent and retryable.
- Receipt exceptions generate support tickets with payload references.

## Inventory Valuation Hooks

### Objectives
- Capture inventory movement facts needed by SAP or internal ERP costing without building full finance posting in Sprint 3.
- Allow tenants to choose valuation ownership by material type, plant, and operating mode.

### Required Capabilities
- Valuation hook events for goods receipt, goods issue, transfer, adjustment, scrap, rework, and finished goods receipt.
- Mapping to valuation class, movement type, cost center, profit center, GL account placeholder, order, WBS element where applicable, and currency.
- Posting policy flags: informational only, pending approval, auto-post to SAP-compatible target, or internal ERP ledger.
- Snapshot fields for quantity, UOM, standard cost, moving average cost, actual cost placeholder, batch, serial, and stock type.
- Reconciliation report comparing movement ledger, inventory balance, and external posting status.

### Definition Of Done
- Every inventory movement emits a valuation hook with complete mapping status.
- Missing GL, cost center, valuation class, or currency mapping blocks finance-bound posting.
- Reconciliation can identify unposted, failed, duplicate, and reversed valuation events.

## Production Order Sync

### Objectives
- Import production orders from SAP-compatible systems and synchronize execution status back from IND5.0.
- Support standalone production order creation when IND5.0 owns planning.

### Required Capabilities
- Production order inbound fields: order number, material, plant, order type, planned quantity, UOM, scheduled dates, BOM version, routing version, work center, reservation, batch, sales order reference, and priority.
- Status mapping for created, released, partially confirmed, technically completed, closed, cancelled, and blocked.
- Order release validation against material, BOM, routing, work center, inventory availability, and quality constraints.
- Confirmation outbound events for operation quantity, scrap, rework, labor time, machine time, downtime reference, and completion status.
- Change handling for quantity, schedule, component, and routing changes after release with tenant-configured approval rules.

### Definition Of Done
- Imported production orders can be released to MES only after all mapping checks pass.
- Execution status changes create outbound events with correlation to the source production order.
- Order updates are versioned and auditable.

## Goods Issue And Goods Receipt

### Goods Issue To Production
- Support reservation-based, order-based, manual, and backflush goods issue.
- Validate material, plant, storage location, batch, serial, stock type, unrestricted/blocked status, and available quantity.
- Emit SAP-compatible goods issue event with movement type, order, component, quantity, batch, serial, cost center, and posting date.
- Support reversal with original movement reference and reason code.

### Goods Receipt From Production
- Support finished goods and semi-finished goods receipt against production order.
- Capture produced quantity, scrap quantity, batch, serials, storage location, quality status, and posting date.
- Trigger quality hold or unrestricted stock based on inspection rules.
- Emit SAP-compatible goods receipt event linked to production order and confirmation.

### Definition Of Done
- Goods issue and goods receipt postings are idempotent and traceable from shop-floor action to external posting status.
- Negative stock is controlled by tenant and material policy.
- Backflush and manual issue modes are separately configurable.

## Quality Usage Decision

### Objectives
- Send quality release, block, reject, rework, and scrap decisions to SAP-compatible systems when external inventory status must be updated.

### Required Capabilities
- Usage decision event with inspection lot reference, material, batch, serial, plant, quantity, decision code, defect summary, stock disposition, and approver.
- Mapping from IND5.0 quality decision codes to SAP-compatible usage decision codes and stock types.
- Support partial decisions by quantity, batch split, serial split, or defect category.
- Hold outbound posting until required quality approval is complete.
- Reversal or correction workflow with audit reason and approval.

### Definition Of Done
- Quality decisions update inventory availability according to tenant policy.
- SAP-compatible usage decision events include stock disposition mapping.
- Blocked or unmapped decision codes create support tickets.

## HR And Payroll Boundary

### Boundary Rules
- HRMS owns employee profiles, employment status, shift assignment, skill matrix, attendance, and shop-floor labor identity.
- Payroll systems or SAP HCM/SuccessFactors remain payroll system of record when active.
- Sprint 3 must not calculate payroll, statutory deductions, payslips, tax, benefits, or payroll accounting.
- ERP/SAP integration may publish labor actuals for costing and production confirmation only.

### Allowed Integration Outputs
- Employee/labor reference ID, work center, production order, operation, labor duration, overtime indicator, shift, attendance reference, and approval status.
- Labor cost hook using configured rate category or cost center mapping, not final payroll amount.

### Definition Of Done
- Labor actuals are separated from payroll posting.
- Personally sensitive HR data is not included in SAP production confirmation payloads unless explicitly configured and permissioned.
- Tenant configuration documents whether employee IDs, anonymized labor IDs, or crew IDs are used outbound.

## API And Event Strategy

### API Groups
- /api/integrations/sap/materials
- /api/integrations/sap/boms
- /api/integrations/sap/routings
- /api/integrations/sap/purchase-orders
- /api/integrations/sap/purchase-receipts
- /api/integrations/sap/production-orders
- /api/integrations/sap/goods-issues
- /api/integrations/sap/goods-receipts
- /api/integrations/sap/quality-decisions
- /api/integrations/sap/valuation-events
- /api/integrations/sap/reconciliation
- /api/integrations/sap/configuration
- /api/integrations/sap/retries

### Event Contracts
- erp.material.upserted
- erp.bom.version_imported
- erp.routing.version_imported
- erp.purchase_order.imported
- erp.purchase_receipt.created
- erp.inventory.valuation_hook.created
- erp.production_order.imported
- erp.production_order.status_changed
- erp.goods_issue.post_requested
- erp.goods_receipt.post_requested
- quality.usage_decision.post_requested
- labor.actuals.cost_hook_created
- integration.sap.post_succeeded
- integration.sap.post_failed
- integration.sap.retry_scheduled
- integration.sap.reconciliation_exception_created

### Integration Runtime Rules
- Use correlation ID per business transaction and idempotency key per posting attempt.
- Store original payload, normalized payload, mapping result, validation result, and target response.
- Use exponential retry with tenant-defined max attempts and dead-letter state.
- Support manual replay only for permissioned users.
- Use outbox pattern for outbound events and inbox pattern for inbound messages.
- Keep all APIs tenant-scoped and permission-checked.

## SAP-Compatible Mapping

| IND5.0 Object | SAP-Compatible Object | Key Mapping Fields |
|---|---|---|
| Material | Material Master | MATNR, MTART, MEINS, MATKL, XCHPF, valuation class |
| Plant | Plant | WERKS |
| Storage Location | Storage Location | LGORT |
| Supplier | Vendor / Business Partner | LIFNR or BP number |
| Purchase Order | Purchase Order | EBELN, EBELP, schedule line |
| Purchase Receipt | Goods Receipt for PO | movement type, EBELN, EBELP, MENGE, BUDAT |
| BOM | BOM Header and Items | material, plant, usage, alternative, component, quantity |
| Routing | Routing and Operations | group, group counter, operation, work center, control key |
| Work Center | Work Center | ARBPL, plant, capacity category |
| Production Order | Production Order | AUFNR, order type, material, plant, quantity, dates |
| Goods Issue | Material Document | movement type, AUFNR, component, batch, serial |
| Goods Receipt | Material Document | movement type, AUFNR, material, batch, serial |
| Quality Usage Decision | Inspection Lot Usage Decision | inspection lot, UD code, stock posting, quantity |
| Labor Actual | Confirmation / Cost Hook | AUFNR, operation, work center, activity type, duration |
| Cost Center | Cost Center | KOSTL |
| GL Placeholder | GL Account Mapping | SAKNR |

### Initial Movement Type Mapping
| Business Event | Default SAP-Compatible Movement Type | Notes |
|---|---|---|
| PO goods receipt | 101 | Tenant can configure quality stock target. |
| PO receipt reversal | 102 | Requires original movement reference. |
| Goods issue to production | 261 | Reservation or order component based. |
| Goods issue reversal | 262 | Requires original issue reference. |
| Finished goods receipt from production | 101 | Linked to production order. |
| Production receipt reversal | 102 | Linked to production order receipt. |
| Inventory adjustment gain | 701 | Tenant-controlled approval required. |
| Inventory adjustment loss | 702 | Tenant-controlled approval required. |
| Scrap | 551 | Requires scrap reason and cost object. |

## Tenant Customization Needs

### Required Tenant Settings
- Operating mode: standalone ERP, SAP-compatible, or hybrid.
- Source of truth per object: material, supplier, customer, BOM, routing, PO, production order, inventory balance, cost center, and GL mapping.
- SAP connection profile: environment, endpoint type, authentication method, client, company code, plant scope, and timeout.
- Posting mode per event: disabled, draft only, manual approval, automatic, or external system owned.
- Mapping tables for plant, storage location, work center, material type, UOM, movement type, valuation class, cost center, GL account, quality decision code, and activity type.
- Retry policy: max attempts, retry interval, dead-letter owner, and escalation severity.
- Data privacy policy for employee, labor, supplier, and customer fields.
- Negative stock, backflush, batch split, serial split, partial receipt, and partial quality decision policies.
- Approval rules for finance-bound postings, reversals, order changes, and inventory adjustments.

### Configuration Studio Dependencies
- Custom fields for material, production order, receipt, goods movement, and quality decision objects.
- Workflow rules for posting approval, reversal approval, mapping exception handling, and dead-letter recovery.
- Tenant-specific validation rules without code changes.

## Data Model Additions

### Candidate Tables
- integration_connections
- integration_object_mappings
- integration_inbox_messages
- integration_outbox_events
- integration_posting_attempts
- integration_reconciliation_items
- sap_material_mappings
- sap_bom_mappings
- sap_routing_mappings
- sap_production_order_mappings
- sap_movement_type_mappings
- sap_quality_decision_mappings
- sap_cost_object_mappings
- inventory_valuation_hooks

### Required Record Fields
- tenant_id
- plant_id where applicable
- internal_object_type
- internal_object_id
- external_system
- external_object_type
- external_object_id
- source_system
- target_system
- correlation_id
- idempotency_key
- payload_version
- normalized_payload
- mapping_status
- validation_status
- posting_status
- retry_count
- last_error_code
- last_error_message
- created_by
- created_at
- updated_at

## Security And Controls

### Permission Keys
- erp.integration.view
- erp.integration.configure
- erp.integration.replay
- erp.integration.cancel
- erp.integration.reconcile
- erp.sap.mapping.view
- erp.sap.mapping.update
- erp.sap.posting.approve
- erp.sap.reversal.approve
- erp.valuation.view
- erp.valuation.approve

### Audit Events
- sap.connection_configured
- sap.mapping_created
- sap.mapping_updated
- sap.inbound_received
- sap.inbound_validated
- sap.outbound_queued
- sap.outbound_posted
- sap.outbound_failed
- sap.outbound_retried
- sap.outbound_replayed
- sap.outbound_cancelled
- sap.reconciliation_exception_created
- sap.reconciliation_exception_resolved
- erp.valuation_hook_created
- erp.finance_posting_approved
- erp.finance_posting_blocked

## Sprint 3 Delivery Plan

### Week 1: Mapping And Boundary Foundation
- Finalize object ownership matrix for standalone, SAP-compatible, and hybrid tenants.
- Define material, BOM, routing, PO, production order, goods movement, valuation, quality decision, and labor actual event schemas.
- Build mapping table design for plant, storage location, work center, UOM, movement type, quality code, cost center, GL, and valuation class.
- Define HR/payroll boundary and labor actual payload policy.

### Week 2: Inbound Master And Order Sync
- Implement material master import contract and validation rules.
- Implement BOM and routing import contract with version activation policy.
- Implement production order import contract and release validation.
- Add reconciliation views for inbound objects and mapping gaps.

### Week 3: Outbound Transaction Posting
- Implement purchase receipt, goods issue, goods receipt, quality usage decision, and valuation hook event contracts.
- Implement outbox posting lifecycle: queued, validating, blocked, posting, posted, failed, retrying, dead-lettered, cancelled.
- Add approval gates for reversal, inventory adjustment, and finance-bound postings.
- Create work-management ticket trigger for failed or blocked integration events.

### Week 4: Tenant Configuration And Acceptance
- Implement tenant integration settings and mapping maintenance screens or admin endpoints.
- Validate idempotency, retry, manual replay, and duplicate prevention.
- Produce SAP-compatible mapping examples and sample payloads.
- Complete reconciliation report and acceptance test scenarios.

## Acceptance Tests
- Import material master with alternate UOM and confirm no duplicate record is created.
- Reject material import when required valuation or UOM mapping is missing.
- Import BOM and routing, activate a version, and release a production order against it.
- Block production order release when work center mapping is missing.
- Receive a purchase order line, trigger quality hold, then post usage decision to unrestricted stock.
- Post goods issue to production and prevent duplicate issue on retry.
- Post finished goods receipt against production order and emit valuation hook.
- Reverse a goods movement with original reference and approval.
- Block finance-bound valuation event when GL or cost center mapping is missing.
- Publish labor actual cost hook without payroll calculation or sensitive payroll data.
- Retry failed SAP-compatible posting and move to dead-letter after configured attempts.
- Reconcile inventory movement ledger against outbound posting status.

## Sprint 3 Definition Of Done
- Material master, BOM, routing, PO, production order, goods movement, valuation hook, quality decision, and labor actual boundaries are documented and contract-ready.
- SAP-compatible mapping tables and movement type defaults are defined.
- Tenant customization needs are explicit and can be implemented without code changes per tenant.
- Integration runtime supports idempotency, retry, replay, dead-letter, audit, and reconciliation requirements.
- HR/payroll boundary is enforced in integration payload design.
- Acceptance tests cover core inbound, outbound, error, reversal, and reconciliation scenarios.
