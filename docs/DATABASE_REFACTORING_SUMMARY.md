# MES Database Refactoring - Quick Reference & Visual Summary

## One-Page Overview

### Current Stack
- **Database:** Supabase PostgreSQL
- **ORM:** Drizzle ORM v0.45.1
- **Tables:** 21 active + 7 deprecated
- **Schema File:** `shared/schema.ts` (707 lines)

---

## Entity Relationship Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PROCESS HIERARCHY                              │
└─────────────────────────────────────────────────────────────────────┘
                            PROCESSES (Master Data)
                                    ↓ 1→M
                            PROCESS_STEPS (35+ per process)
              ┌─────────────────────┼─────────────────────┐
              ↓                     ↓                     ↓
        CONTROL_         SUPPLY_            BATCHES
        CHECKPOINTS      REQUIREMENTS           ↓
              ↓                     ↓          M (parts)
        CHECKPOINT_          ⚠️ GATE: Required
        RESULTS              before step start
              ↓
        EVIDENCE_FILES
        (Photos/Documents)


┌─────────────────────────────────────────────────────────────────────┐
│                    PART EXECUTION FLOW                              │
└─────────────────────────────────────────────────────────────────────┘
                    PARTS (Prefabricated Blades)
                           ↓ 1→M
                PART_STEP_INSTANCES (Execution Records)
            ┌───────────────┬───────────────┬───────────────┐
            ↓               ↓               ↓               ↓
    STATE_TRANSITIONS  SHIFT_LOGS    CHECKPOINT_    EQUIPMENT
    (Audit Trail)   (Shift-Based)    RESULTS      (Moulds)
                        ↓
                    CREW_MEMBERS
                    (Shift Staff)


┌─────────────────────────────────────────────────────────────────────┐
│                   INVENTORY & RESOURCES                             │
└─────────────────────────────────────────────────────────────────────┘
    KIT_INVENTORY ────► (Process-bound, one per process)
         ↓
    [Create Kit] → [AVAILABLE] → [Consumed by part] → [CONSUMED]

    RESIN_LOT_INVENTORY ────► (Shared across all processes)
         ↓ count-based
    [available_count] ───► [Decremented on consumption]

    SUPPLY_LOTS ────► (Materials: Carbon Fiber, Adhesive, etc.)
         ↓ state: ready|usable|qa_pending|rejected
    [Inventory Check] ─► [Used if available] ─► [Log consumption]


┌─────────────────────────────────────────────────────────────────────┐
│                     QUALITY & AUDIT                                 │
└─────────────────────────────────────────────────────────────────────┘
    CHECKPOINT_RESULTS
         ├─ status: pending|measured|confirmed
         ├─ qa_result: pending|pass|conditional_pass|fail ⚠️
         ├─ is_gate_passed: true|false
         └─ deviation_approved: NCR tracking

    TIMELINE_EVENTS (Append-only history)
         ├─ eventType: step_started, status_changed, etc.
         ├─ eventData: JSONB payload (dynamic structure)
         └─ occurred_at: timestamp


┌─────────────────────────────────────────────────────────────────────┐
│                   HUMAN RESOURCES                                   │
└─────────────────────────────────────────────────────────────────────┘
    EMPLOYEES (Master Data)
         ├─ auth_user_id: UUID (Supabase link)
         ├─ skills: JSONB array ⚠️ (should be junction table)
         ├─ role: Operator, QA Inspector, Supervisor
         ├─ current_shift: A, B, C
         └─ is_active: true|false

    EMPLOYEE_ASSIGNMENTS
         └─ Links employees to step instances

    EMPLOYEE_STATUS_HISTORY (Audit)
```

---

## Status Fields Summary

### Three Levels of Status

```
┌──────────────────┬──────────────────┬─────────────────┐
│   PART LEVEL     │   STEP LEVEL     │   QA LEVEL      │
├──────────────────┼──────────────────┼─────────────────┤
│ in_progress      │ planned          │ pending         │
│ completed        │ active ⚠️ DUAL   │ pass            │
│ blocked          │ paused           │ conditional_pass│
│ rework           │ waiting          │ fail            │
│                  │ blocked ⚠️ DUAL  │                 │
│                  │ breakdown        │ isGatePassed:   │
│                  │ rework           │ true|false      │
│                  │ completed        │                 │
│                  │ (8 states total) │                 │
└──────────────────┴──────────────────┴─────────────────┘

⚠️ ISSUES:
- Part.status "completed" ≠ all steps completed
- Block status duplicated in parts + partStepInstances
- "current_step" is denormalized (manual updates)
- QA status split across 3 fields (qaResult + qaApproved + isGatePassed)
```

---

## Data Redundancy Map

```
CRITICAL REDUNDANCY (HIGH RISK):
┌─────────────────────────────────────────────────────┐
│ parts.status (in_progress|completed|blocked|rework)│
│ vs.                                                 │
│ partStepInstances.status (8 values)                │
│                                                     │
│ RISK: Can diverge under concurrent operations      │
│ EXAMPLE: Part says "completed" but step says       │
│          "active" → Data inconsistency             │
└─────────────────────────────────────────────────────┘

MEDIUM REDUNDANCY:
┌─────────────────────────────────────────────────────┐
│ parts.currentStepId (denormalized field)            │
│ vs.                                                 │
│ MAX(processSteps.sequence) FROM partStepInstances  │
│                                                     │
│ RISK: Manual updates can lag behind execution      │
│ EXAMPLE: currentStepId stays at step 3 even if    │
│          step 4 is now active                      │
└─────────────────────────────────────────────────────┘

JSONB AS NOSQL:
┌─────────────────────────────────────────────────────┐
│ employees.skills: JSONB array of strings            │
│ shiftLogs.crewMembers: JSONB array of employee IDs │
│ timelineEvents.eventData: JSONB arbitrary payload   │
│                                                     │
│ ISSUE: Cannot query or index these fields          │
│ SOLUTION: Create proper junction tables            │
└─────────────────────────────────────────────────────┘

QA STATUS SPLIT (HIGH COMPLEXITY):
┌─────────────────────────────────────────────────────┐
│ 1. checkpointResults.qaResult: pending|pass|...    │
│ 2. checkpointResults.qaApproved: true|false        │
│ 3. checkpointResults.isGatePassed: true|false      │
│ 4. parts.status: can be "completed" but QA pending │
│                                                     │
│ = 4 possible sources of QA truth                   │
└─────────────────────────────────────────────────────┘
```

---

## Critical Query Patterns

### Find Part by Number
```typescript
// Frontend
supabase.from('parts').select('*').ilike('part_number', `%ABC%`);

// Backend
db.select().from(parts).where(like(parts.partNumber, `%ABC%`));

// Index: parts_part_number_idx ✓
```

### Find Active Parts
```typescript
// Query
SELECT * FROM parts
JOIN processes ON parts.process_id = processes.id
JOIN processSteps ON parts.current_step_id = processSteps.id
WHERE parts.status = 'in_progress'
ORDER BY 
  CASE WHEN parts.priority = 'critical' THEN 1 
       WHEN parts.priority = 'high' THEN 2
       ELSE 3 END,
  parts.updated_at DESC;

// Indexes: 
// - parts_status_idx ✓
// - parts_priority_idx ✓
```

### Step Instance Timeline
```typescript
// Get all steps for a part in order
SELECT psi.*, ps.* FROM part_step_instances psi
JOIN processSteps ps ON psi.step_id = ps.id
WHERE psi.part_id = ?
ORDER BY ps.sequence;

// Indexes:
// - step_instances_part_id_idx ✓
// - process_steps_process_id_idx ✓
```

### Checkpoint Results for Step
```typescript
// Get all checkpoint measurements for a step execution
SELECT cr.*, cp.* FROM checkpoint_results cr
JOIN controlCheckpoints cp ON cr.checkpoint_id = cp.id
WHERE cr.instance_id = ?;

// Index: checkpoint_results_instance_id_idx ✓
```

### Inventory Availability
```typescript
// Find usable supply
SELECT * FROM supply_lots 
WHERE material_type = ? 
  AND state = 'usable' 
  AND quantity >= ?;

// Index: supply_lots_state_idx ✓
```

---

## Enum Values Reference

### Execution States (partStepInstances.status)
```
planned  →  active  →  paused
                  ↓
              waiting  →  blocked  →  breakdown  →  completed
                                                      ↑
                                                    rework ←─┘
```

### Entry Reasons (parts.entryReason)
- `normal` - Regular entry
- `rework` - Sent back for rework
- `trial` - Trial/test part
- `external_operation` - External processing
- `resumed` - Resumed from hold

### Quality Results (checkpointResults.qaResult)
- `pending` - Not yet measured
- `pass` - Passed inspection
- `conditional_pass` - Passed with deviation
- `fail` - Failed inspection

### Material States (supplyLots.state)
- `ready` - Awaiting curing/preparation
- `usable` - Ready for use
- `qa_pending` - Awaiting QA approval
- `rejected` - Failed QA

### Process Categories
- `inventory` - Incoming/prep processes
- `prefabricated` - Blade segment manufacturing
- `moulding` - Molding/lamination
- `finishing` - Final assembly and packaging

---

## Legacy Tables to DELETE

```
┌──────────────────────────────────────────────────────┐
│ ❌ DEPRECATED - Safe to Remove in Phase 1           │
├──────────────────────────────────────────────────────┤
│ 1. material_master (old material system)             │
│ 2. material_process_intent (old linking)             │
│ 3. process_execution (old execution tracking)        │
│ 4. material_usage (old consumption log)              │
│ 5. kits (legacy kit system)                          │
│ 6. kitBalances (legacy kit tracking)                 │
│ 7. kitConsumption (replaced by kit_inventory)        │
└──────────────────────────────────────────────────────┘
```

---

## Migration Readiness Checklist

### Safe to Refactor (LOW RISK)
- ✅ `processes` - Master data, rarely changes
- ✅ `processSteps` - Master data, rarely changes
- ✅ `controlCheckpoints` - Master data
- ✅ `employees` - Can add/refactor fields
- ✅ `kit_inventory` - New table, no legacy data

### Requires Careful Migration (MEDIUM RISK)
- ⚠️ `supplyLots` - Has active inventory
- ⚠️ `moulds` - Has equipment assignments
- ⚠️ `batches` - May have active batches

### HIGH RISK - Production Data Affected
- 🔴 `parts` - Active manufacturing parts
- 🔴 `partStepInstances` - Current execution
- 🔴 `checkpointResults` - QA audit trail
- 🔴 `stateTransitions` - Immutable history

---

## Hard-Coded Assumptions in Code

```
FRONTEND (src/app):
❌ BladeStatus type hardcoded in OperationsTab.tsx
❌ Process categories hardcoded in App.tsx (case 'inventory')
❌ Status values hardcoded in components

BACKEND (server/):
❌ validStateTransitions hardcoded
❌ entryReasons enum in schema
❌ qualityResults enum in schema
❌ Priority ordering logic hardcoded in queries

⚠️  ALL MUST BE UPDATED FOR SCHEMA CHANGES
```

---

## Proposed Improvements

### Short-term (Weeks 1-2)
```
✓ Add JSONB columns to partStepInstances:
  - step_payload (temperature, humidity, etc.)
  - execution_context (runtime decisions, exceptions)

✓ Create employee_skill junction table
  - Replace JSONB skills with queryable records
  - Support certifications and expiry

✓ Create shift_crew junction table
  - Replace JSONB crewMembers
  - Enable crew utilization reporting
```

### Medium-term (Weeks 3-4)
```
✓ Consolidate status fields
  - Single source of truth for QA status
  - Eliminate qaApproved|qaResult|isGatePassed confusion

✓ Create part_inventory_link table
  - Explicit traceability: which materials→which parts

✓ Add PLM integration fields
  - plm_id (UUID)
  - plm_revision (VARCHAR)
  - plm_sync_at (TIMESTAMP)
```

### Long-term (Weeks 5-8)
```
✓ Compute currentStepId instead of denormalizing
  - Use materialized view or trigger
  - Eliminate manual update lag

✓ Remove legacy tables
  - Clean up deprecated material_* tables

✓ Audit PLM linking
  - Test integration with PLM system
```

---

## File Navigation

| Need | File | Key Section |
|------|------|------------|
| Full schema | `shared/schema.ts` | All 707 lines |
| Migration DDL | `drizzle/0000_calm_rick_jones.sql` | CREATE TABLE statements |
| ORM queries | `server/index.ts` | Lines 273-1500+ |
| Client API | `src/app/lib/api.ts` | All endpoints |
| Seed data | `server/seed.ts` | Sample data generator |
| Dashboard UI | `src/app/components/DashboardView.tsx` | Main dashboard view |
| Process viz | `src/app/components/ProcessFlowView.tsx` | Process flow diagram |
| Inventory UI | `src/app/components/ProcessTab.tsx` | Inventory management |

---

## Key Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Total Tables | 21 active + 7 deprecated | 28 total |
| Schema Size | 707 lines | Medium |
| Active Indexes | 28 | Good coverage |
| JSONB Columns | 5 (skills, crew, events, etc.) | Should refactor |
| Denormalized Fields | 3 (currentStep, currentMould, currentBatch) | Monitor |
| State Transitions | 8 states | Complex but manageable |
| Processes Defined | 35 (numbered 10-350) | Large PLM |
| Steps per Process | 35+ average | Deep workflows |

---

## Risk Assessment

```
🔴 HIGH RISK
   • Status field redundancy (parts vs. steps)
   • QA status complexity (3 fields for 1 decision)
   • Legacy tables still in schema
   • Denormalized currentStepId

🟡 MEDIUM RISK
   • JSONB for non-queryable data
   • Hard-coded enums in code
   • Concurrent status update races
   • Equipment assignment tracking

🟢 LOW RISK
   • Master data stable (processes, steps)
   • Proper indexing in place
   • Good audit trail structure
   • Clear FK relationships
```

---

## Next Actions

1. **Review this analysis** with your team
2. **Create migration plan** based on readiness matrix
3. **Set up staging** environment with current data
4. **Design new schema** incorporating recommendations
5. **Build migration scripts** with validation
6. **Test in staging** before production cutover
7. **Plan rollback** in case of issues

---

**Document Version:** 1.0  
**Companion to:** DATABASE_ANALYSIS.md  
**Last Updated:** 2026-01-15  

