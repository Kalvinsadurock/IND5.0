# Configuration Studio Sprint 1 Implementation Blueprint

## Mission
Build the first version of Configuration Studio so industry owners can customize the platform without code.

## Sprint 1 Scope
Included: custom field definitions, custom field values, workflow definitions, workflow states, workflow transitions, transition rules, basic approval transition support, configuration permissions, audit events, admin UI screens, API contracts, database table design, acceptance tests.

Excluded: drag-and-drop workflow designer, complex rule expression builder, external integration triggers, versioned workflow publishing, advanced form layout builder, conditional visibility, AI recommendations.

## Core Entities
- ConfigurableObjectType
- CustomFieldDefinition
- CustomFieldOption
- CustomFieldValue
- WorkflowDefinition
- WorkflowState
- WorkflowTransition
- WorkflowTransitionRule
- WorkflowInstance
- WorkflowHistory
- ConfigurationAuditEvent

## Initial Configurable Object Types
| Object Type | Owner | Examples |
|---|---|---|
| employee | HRMS | Blood group, contractor agency, medical fitness expiry |
| work_order | MES | Customer priority, curing batch, special instruction |
| material | ERP/Inventory | Shelf life class, storage condition, allergen flag |
| machine | Maintenance/OEE | Criticality, calibration class, energy meter ID |
| quality_defect | Quality | Defect severity, root cause category |
| ticket | Work Management | Escalation type, customer impact |

## Supported Field Types
text, textarea, number, decimal, boolean, date, datetime, select, multi_select, radio, checkbox_group, file, user_reference, object_reference, computed_readonly.

## Database Tables
- configurable_object_types
- custom_field_definitions
- custom_field_options
- custom_field_values
- workflow_definitions
- workflow_states
- workflow_transitions
- workflow_instances
- workflow_history
- configuration_audit_events

## API Groups
- /api/configuration/object-types
- /api/configuration/custom-fields
- /api/configuration/custom-field-values
- /api/configuration/workflows
- /api/configuration/workflow-states
- /api/configuration/workflow-transitions
- /api/configuration/workflow-instances

## UI Screens
1. Configuration Studio Home
2. Object Configuration Screen
3. Custom Field Builder
4. Workflow Builder
5. Workflow Runtime Preview
6. Configuration Audit Screen

## Permission Keys
- configuration.view
- configuration.custom_fields.view
- configuration.custom_fields.create
- configuration.custom_fields.update
- configuration.custom_fields.deactivate
- configuration.workflow.view
- configuration.workflow.create
- configuration.workflow.update
- configuration.workflow.activate
- configuration.workflow.deactivate
- configuration.audit.view
- workflow.instance.view
- workflow.instance.transition
- custom_field.values.view
- custom_field.values.update

## Required Audit Events
- custom_field.created
- custom_field.updated
- custom_field.activated
- custom_field.deactivated
- custom_field.option_added
- custom_field.option_updated
- custom_field.option_removed
- custom_field.value_updated
- workflow.created
- workflow.updated
- workflow.activated
- workflow.deactivated
- workflow.state_created
- workflow.state_updated
- workflow.state_deleted
- workflow.transition_created
- workflow.transition_updated
- workflow.transition_deleted
- workflow.transition_executed
- workflow.transition_blocked

## Sprint 1 Definition Of Done
- Custom field definitions can be created, edited, activated, and deactivated.
- Custom field options can be managed.
- Custom field values can be saved and validated.
- Workflow definitions can be created with states and transitions.
- Workflow activation validates rules.
- Runtime workflow instances can be created and transitioned.
- Permission checks protect configuration and runtime actions.
- Audit events are captured.
- Configuration Studio UI supports basic field and workflow setup.
- Acceptance tests pass.
