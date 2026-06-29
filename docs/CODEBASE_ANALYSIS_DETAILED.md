# 📊 MES Application - Comprehensive Codebase Analysis
## Current State Assessment for ISA-95 Database Refactoring

**Date:** January 15, 2026
**Status:** Ready for migration
**Database:** Supabase PostgreSQL (via Drizzle ORM)

---

## 1️⃣ DATABASE & ORM STACK

### Database Layer
- **Type:** Supabase PostgreSQL
- **Connection:** Via `node-postgres` (pg) driver
- **Configuration:** `drizzle.config.ts` (PostgreSQL dialect)
- **URL:** From `DATABASE_URL` environment variable

### ORM Layer
- **Framework:** Drizzle ORM v0.45.1+
- **Schema Location:** `/workspaces/MES/shared/schema.ts` (707 lines)
- **Connection Manager:** `/workspaces/MES/server/db.ts`
- **Pattern:** Relational API with schema-based table definitions

### Connection Setup
```typescript
// server/db.ts
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
```

---

## 2️⃣ CURRENT TABLES & MODELS (28 Tables Total)

### **CORE EXECUTION TABLES** (ISA-95 Work Execution)

#### `parts` (Work Orders)
| Column | Type | Key | Constraint | Index |
|--------|------|-----|-----------|-------|
| id | serial | PK | UNIQUE | ✓ |
| partNumber | varchar(50) | - | UNIQUE | ✓ |
| processId | integer | FK→processes | NOT NULL | ✓ |
| status | varchar(20) | - | DEFAULT 'in_progress' | ✓ |
| currentStepId | integer | FK→processSteps | NULLABLE | ✓ |
| priority | varchar(20) | - | DEFAULT 'normal' | ✓ |
| entryReason | varchar(30) | - | DEFAULT 'normal' | - |
| entryStepId | integer | FK→processSteps | NULLABLE | - |
| currentMouldId | integer | FK→moulds | NULLABLE | - |
| currentBatchId | integer | FK→batches | NULLABLE | - |
| blockedReason | text | - | NULLABLE | - |
| blockedAt | timestamp | - | NULLABLE | - |
| bladeType | varchar(100) | - | NULLABLE | - |
| createdAt | timestamp | - | DEFAULT NOW() | - |
| updatedAt | timestamp | - | DEFAULT NOW() | - |

**⚠️ DESIGN ISSUES:**
- `status` field duplicated in `partStepInstances.status`
- `currentStepId` manually maintained (denormalized)
- No field for entry/exit reasons beyond entryReason
- Missing audit trail for status changes
- Blocking info separate from status (blockedReason, blockedAt)

#### `partStepInstances` (Work Execution Instances)
| Column | Type | Key | Constraint | Index |
|--------|------|-----|-----------|-------|
| id | serial | PK | UNIQUE | ✓ |
| partId | integer | FK→parts | NOT NULL | ✓ |
| stepId | integer | FK→processSteps | NOT NULL | ✓ |
| status | varchar(20) | - | DEFAULT 'planned' | ✓ |
| previousStatus | varchar(20) | - | NULLABLE | - |
| qaApproved | boolean | - | DEFAULT false | - |
| qaApprovedAt | timestamp | - | NULLABLE | - |
| qaApprovedBy | integer | FK→employees | NULLABLE | - |
| mouldId | integer | FK→moulds | NULLABLE | - |
| batchId | integer | FK→batches | NULLABLE | - |
| startedAt | timestamp | - | NULLABLE | - |
| endedAt | timestamp | - | NULLABLE | - |
| plannedStartAt | timestamp | - | NULLABLE | - |
| elapsedMinutes | integer | - | DEFAULT 0 | - |
| waitingReason | text | - | NULLABLE | - |
| blockedReason | text | - | NULLABLE | - |
| breakdownReason | text | - | NULLABLE | - |
| pauseReason | text | - | NULLABLE | - |
| lastStateChangeAt | timestamp | - | NULLABLE | - |
| isDeferred | boolean | - | DEFAULT false | - |
| deferredReason | text | - | NULLABLE | - |
| assignedEmployeeId | integer | FK→employees | NULLABLE | - |
| notes | text | - | NULLABLE | - |
| createdAt | timestamp | - | DEFAULT NOW() | - |

**⚠️ DESIGN ISSUES:**
- `status` field duplicates `parts.status` (dual source of truth)
- Multiple reason fields (waitingReason, blockedReason, breakdownReason, pauseReason) instead of generic reason + status
- `qaApproved` boolean insufficient for QA gating logic
- No separate QA state field
- No structured payload for step-specific parameters
- `elapsedMinutes` manually maintained instead of calculated
- `previousStatus` tracked but not used for audit trail

---

### **PROCESS DEFINITION TABLES**

#### `processes`
- **PK:** id (serial)
- **Columns:** processNumber, code, name, category, description, createdAt
- **Indexes:** category
- **FK:** 1→many `processSteps`, 1→many `parts`

#### `processSteps`
- **PK:** id (serial)
- **Columns:** processId, stepNumber, name, sequence, targetCycleTime, isInspection, isStorage, requiresMould, isBatchable, createdAt
- **Indexes:** processId
- **FK:** many→one `processes`
- **Relations:** 1→many `controlCheckpoints`, 1→many `partStepInstances`

#### `controlCheckpoints` (Control Plan)
- **PK:** id (serial)
- **Columns:** stepId, characteristic, specification, tolerance, measurementMethod, frequency, measuredBy, sequence, isGating, createdAt
- **Indexes:** stepId
- **FK:** many→one `processSteps`
- **Relations:** 1→many `checkpointResults`

---

### **QUALITY & CHECKPOINT TABLES**

#### `checkpointResults` (QA Results)
| Column | Type | Issue |
|--------|------|-------|
| id | serial | PK |
| instanceId | integer | FK→partStepInstances |
| checkpointId | integer | FK→controlCheckpoints |
| status | varchar(20) | DEFAULT 'pending' |
| qaResult | varchar(20) | DEFAULT 'pending' (enum-like) |
| measuredValue | text | NULLABLE |
| measuredById | integer | FK→employees |
| measuredAt | timestamp | NULLABLE |
| qaConfirmedById | integer | FK→employees |
| qaConfirmedAt | timestamp | NULLABLE |
| deviationNumber | varchar(50) | NULLABLE |
| isGatePassed | boolean | DEFAULT false |
| notes | text | NULLABLE |
| createdAt | timestamp | DEFAULT NOW() |

**⚠️ DESIGN ISSUES:**
- **Triple status fields:** `status` + `qaResult` + `isGatePassed` (3 sources of truth)
- No single consolidated QA state enum
- `qaResult` values: pending, pass, conditional_pass, fail (unstructured string)
- Gate pass logic split between `isGatePassed` boolean and `qaResult` string
- Deviation approval tracked but no conditional_pass workflow

---

### **INVENTORY TABLES**

#### `kit_inventory` (Process-specific kits)
- **PK:** id (serial)
- **Columns:** kit_code, process_id, kit_type, status (AVAILABLE/CONSUMED), photo_url, process_instance_id
- **Indexes:** process_id, status, kit_type
- **Issue:** Tight coupling to process_instance_id (should be step_instance)

#### `resin_lot_inventory` (Shared resin lots)
- **PK:** id (serial)
- **Columns:** resin_code, available_count, photo_url, created_by, created_at
- **Indexes:** available_count
- **Issue:** Manual available_count tracking (not from consumption log)

#### `resin_consumption` (Usage tracking)
- **PK:** id (serial)
- **Columns:** resin_lot_id, process_id, process_instance_id, consumed_by, consumed_at
- **Indexes:** resin_lot_id, process_id
- **Issue:** Refers to process_instance_id but should refer to part_step_instances

#### `supplyLots` (Material staging)
- **PK:** id (serial)
- **Columns:** lotNumber, materialType, quantity, unit, state, qaStatus, expiryDate, receivedAt, createdAt
- **Indexes:** state
- **Issue:** Inventory lifecycle tracked but not linked to parts/steps consumption

#### `supplyRequirements` (Control Plan - material)
- **PK:** id (serial)
- **Columns:** stepId, materialType, quantityRequired, unit, isMandatory, createdAt
- **Indexes:** stepId

---

### **MOULD & BATCH MANAGEMENT**

#### `moulds`
- **PK:** id (serial)
- **Columns:** code, name, status (available/maintenance/breakdown), currentPartId, lastBreakdownAt, totalDowntimeMinutes
- **Indexes:** status
- **Relations:** 1→many `mouldEvents`, 1→many `batches`, 1→many `partStepInstances`

#### `mouldEvents`
- **PK:** id (serial)
- **Columns:** mouldId, eventType, reason, startedAt, endedAt, downtimeMinutes, recordedById, createdAt
- **Issue:** Event type unstructured (breakdown, maintenance, etc.)

#### `batches`
- **PK:** id (serial)
- **Columns:** batchNumber, operationType, status (active/completed), mouldId, stepId, startedAt, endedAt, notes
- **Issue:** Tight coupling to mould (some processes don't use moulds)

#### `batchParts`
- **PK:** id (serial)
- **Columns:** batchId, partId, addedAt
- **Junction:** parts→batches

---

### **EMPLOYEE & ASSIGNMENT TABLES**

#### `employees`
| Column | Type | Index | Issue |
|--------|------|-------|-------|
| id | serial | PK | ✓ |
| employeeCode | varchar(20) | UNIQUE, ✓ | ✓ |
| name | varchar(100) | - | ✓ |
| role | varchar(50) | - | ✓ |
| department | varchar(50) | - | ✓ |
| skills | jsonb | - | ⚠️ JSONB array (unqueryable) |
| email | varchar(100) | - | ✓ |
| phone | varchar(20) | - | ✓ |
| isActive | boolean | - | ✓ |
| currentShift | varchar(20) | - | ✓ |
| auth_user_id | uuid | UNIQUE, ✓ | ✓ Supabase auth link |
| createdAt | timestamp | - | DEFAULT NOW() |

**⚠️ DESIGN ISSUES:**
- `skills` stored as JSONB array (["skill1", "skill2"]) - unqueryable, should be junction table
- `currentShift` denormalized (should derive from shiftLogs)

#### `employeeAssignments`
- **PK:** id (serial)
- **Columns:** employeeId, instanceId, shiftLogId, role, status (active/completed), startedAt, endedAt
- **Indexes:** employeeId, instanceId
- **Issue:** Can reference both instance and shiftLog (weak constraint)

#### `employeeStatusHistory`
- **PK:** id (serial)
- **Columns:** employeeId, status, reason, recordedAt
- **Issue:** Status type unstructured

---

### **AUDIT & TIMELINE TABLES**

#### `stateTransitions`
- **PK:** id (serial)
- **Columns:** instanceId, fromState, toState, reason, triggeredById, triggeredAt, isAutomatic
- **Indexes:** instanceId
- **Purpose:** Audit trail for step execution states
- **Issue:** Not capturing all state transitions (manual status updates bypass this)

#### `shiftLogs`
- **PK:** id (serial)
- **Columns:** instanceId, shiftCode, shiftDate, startTime, endTime, crewMembers (JSONB), elapsedMinutes, handoverNotes, recordedById
- **Indexes:** instanceId, shiftDate
- **Issue:** `crewMembers` stored as JSONB array of IDs - should use employeeAssignments table

#### `reworkEvents`
- **PK:** id (serial)
- **Columns:** partId, fromStepId, toStepId, reason, status (active/completed), defectDescription, initiatedAt, completedAt
- **Indexes:** partId
- **Purpose:** Track rework execution
- **Issue:** Status field not aligned with execution states

#### `timelineEvents`
- **PK:** id (serial)
- **Columns:** partId, eventType, eventData (JSONB), instanceId, stepId, description, recordedById, occurredAt
- **Indexes:** partId, occurredAt
- **Purpose:** Unstructured event log
- **Issue:** eventType and eventData not standardized

---

### **EVIDENCE & ATTACHMENTS**

#### `evidenceFiles`
- **PK:** id (serial)
- **Columns:** resultId, storageKey, fileName, fileType, fileSize, capturedById, capturedAt
- **Indexes:** resultId
- **Purpose:** Links QA checkpoint evidence to results
- **Storage:** Supabase Storage bucket references

---

### **LEGACY/DEPRECATED TABLES**

#### `material_master` (OLD - unused)
- **Status:** Kept for backward compatibility
- **Reason:** Pre-dated kit_inventory approach

#### `material_process_intent` (OLD)
- **Status:** Unused

#### `process_execution` (OLD)
- **Status:** Unused (use partStepInstances instead)

#### `material_usage` (OLD)
- **Status:** Unused (use resin_consumption instead)

#### `kits` (OLD)
- **Status:** Replaced by kit_inventory

#### `kitBalances` (OLD)
- **Status:** Replaced by kit_inventory.status tracking

#### `kitConsumption` (OLD)
- **Status:** Partially replaced by resin_consumption

---

## 3️⃣ MES CORE ENTITIES - CURRENT IMPLEMENTATION

### ✅ Users (Employees)
- **Table:** `employees`
- **Auth:** Supabase + auth_user_id field linking to auth.users
- **Login:** `/api/auth/login` (employeeCode + password)
- **Current Issue:** Roles are hardcoded strings, no role permission matrix

### ✅ Processes (Process Master)
- **Table:** `processes`
- **Fields:** processNumber, code, name, category (inventory/prefabricated/moulding/finishing)
- **Current Issue:** Category is hardcoded enum, no versioning/revision tracking

### ✅ Process Steps (Control Plan / Sub-steps)
- **Table:** `processSteps`
- **Fields:** stepNumber, name, sequence, targetCycleTime, isInspection, isStorage, requiresMould, isBatchable
- **Related:** `controlCheckpoints` (1→many for QA characteristics)
- **Current Issue:** Step parameters not stored (temperature, humidity, mix ratios, etc.)

### ✅ Prefabricated Parts (Work Orders)
- **Table:** `parts`
- **Fields:** partNumber, processId, bladeType, status, priority, entryReason
- **Current Issue:** Status duplicated in partStepInstances, currentStepId denormalized

### ✅ Step Execution / Status Tracking
- **Table:** `partStepInstances`
- **Fields:** status, startedAt, endedAt, assignedEmployeeId, notes
- **Related:** `stateTransitions` (audit trail)
- **Current Issue:** Status field subject to race conditions with parts.status

### ✅ Inventory (Material Traceability)
- **Tables:** `kit_inventory`, `resin_lot_inventory`, `resin_consumption`, `supplyLots`
- **Current Issue:** No consolidated inventory consumption table (parts→steps→supplies)

### ✅ Images, Comments, Checkpoints
- **Images:** `evidenceFiles` (linked to checkpointResults)
- **Comments:** Stored in `notes` fields (text columns, unstructured)
- **Checkpoints:** `controlCheckpoints` (definition), `checkpointResults` (execution)
- **Current Issue:** No separate comment thread system

---

## 4️⃣ STATUS HANDLING ANALYSIS

### ❌ DUAL STATUS FIELD PROBLEM (CRITICAL)

**Part Status (parts table):**
```typescript
status: varchar(20) // VALUES: in_progress, completed, blocked, rework
```

**Step Status (partStepInstances table):**
```typescript
status: varchar(20) // VALUES: planned, active, paused, waiting, blocked, breakdown, completed, rework
```

**Issues:**
1. **Inconsistent enums** - parts has 4 values, steps have 8 values
2. **Race conditions** - parts.status and partStepInstances.status can diverge
3. **No single source of truth** - which is authoritative?
4. **Manual synchronization required** - when part completes, update parts.status AND partStepInstances.status
5. **Multiple meanings** - "blocked" means different things at part vs step level

### ❌ DENORMALIZED CURRENT STEP

```typescript
// parts table
currentStepId: integer // FK→processSteps

// Query pattern - manually maintained
parts WHERE currentStepId = X
```

**Issues:**
1. Manually maintained field (admin burden)
2. Can drift from actual current step in partStepInstances
3. No historical tracking of step progression

### ❌ QA STATUS FRAGMENTATION

**Three separate fields in checkpointResults:**
```typescript
status: varchar(20) // pending, in_review, completed
qaResult: varchar(20) // pending, pass, conditional_pass, fail
isGatePassed: boolean // true/false
```

**Issues:**
1. Three sources of truth for single QA decision
2. Gate pass logic split:
   - `isGatePassed = true` means gate passed
   - `qaResult = 'conditional_pass'` means conditional with deviation
   - But which overrides?
3. No workflow for deviation approval

### Current Query Pattern - Status Based
```typescript
// BAD: Status-based filtering
const activeParts = await db.select()
  .from(parts)
  .where(eq(parts.status, 'in_progress')); // Can be stale!

// BETTER: Join with step instances
const activeParts = await db.select()
  .from(parts)
  .innerJoin(partStepInstances, ...)
  .where(eq(partStepInstances.status, 'active')); // Source of truth

// BEST (After refactoring): Use views
const activeParts = await db.select()
  .from(partExecutionSummary)
  .where(eq(partExecutionSummary.overallState, 'active')); // Derived
```

---

## 5️⃣ QUERY PATTERNS - CURRENT API

### Dashboard Queries (server/index.ts, lines 273+)

**1. Find all active parts**
```typescript
const parts = await db.select()
  .from(parts)
  .where(eq(parts.status, 'in_progress')); // ⚠️ Can be stale
```

**2. Find part by part number**
```typescript
const [part] = await db.select()
  .from(parts)
  .where(eq(parts.partNumber, 'P-001'));
```

**3. Find parts by status**
```typescript
const completedParts = await db.select()
  .from(parts)
  .where(eq(parts.status, 'completed'));
```

**4. Dashboard - Part timeline**
```typescript
const timeline = await db.select()
  .from(partStepInstances)
  .innerJoin(processSteps, ...)
  .where(eq(partStepInstances.partId, partId))
  .orderBy(processSteps.sequence); // Manual sequence ordering
```

**5. Inventory queries**
```typescript
const consumed = await db.select()
  .from(resin_consumption)
  .where(eq(resin_consumption.process_id, processId));
```

**6. QA dashboard**
```typescript
const qaResults = await db.select()
  .from(checkpointResults)
  .where(eq(checkpointResults.instanceId, instanceId));
  // ⚠️ Must check .status + .qaResult + .isGatePassed separately
```

---

## 6️⃣ DATA REDUNDANCY & DESIGN ISSUES

### **HIGH PRIORITY ISSUES**

| Issue | Location | Severity | Impact |
|-------|----------|----------|--------|
| **Dual status fields** | parts.status + partStepInstances.status | 🔴 CRITICAL | Race conditions, stale data, sync bugs |
| **Denormalized currentStepId** | parts.currentStepId | 🔴 CRITICAL | Manual maintenance, drift risk |
| **QA status fragmentation** | checkpointResults (3 fields) | 🔴 CRITICAL | Gating logic split, ambiguous state |
| **JSONB unstructured data** | employees.skills, shiftLogs.crewMembers | 🟠 HIGH | Unqueryable, duplicated in junction tables anyway |
| **No consolidated inventory** | 4 separate tables | 🟠 HIGH | No single traceability path (part→step→supply) |
| **Manual elapsed time** | partStepInstances.elapsedMinutes | 🟠 HIGH | Manual calculation, prone to errors |
| **Unstructured reasons** | waitingReason, blockedReason, pauseReason, ... | 🟟 MEDIUM | No enum, hard to report on |
| **Missing audit trail** | No PLM object tracking | 🟟 MEDIUM | Can't integrate with Teamcenter/3DEX |

### **JSONB Anti-patterns**

1. **employees.skills**
   - **Current:** `JSONB array of strings`
   - **Problem:** Unqueryable (`WHERE skills @> '"welding"'` possible but ugly)
   - **Better:** Junction table `employeeSkills(employeeId, skill)`

2. **shiftLogs.crewMembers**
   - **Current:** `JSONB array of employee IDs`
   - **Problem:** Manual parsing in application code
   - **Better:** Use `employeeAssignments` table (already exists!)

3. **timelineEvents.eventData**
   - **Current:** `JSONB with unstructured event details`
   - **Problem:** No schema validation, hard to query
   - **Better:** Specific event types with dedicated columns or tables

### **Weak Foreign Keys**

1. **employeeAssignments** references BOTH instanceId AND shiftLogId
   - Should be one or the other with proper constraint

2. **resin_consumption** references both process_id and process_instance_id
   - Ambiguous which is authoritative

3. **batch coupling** - Batches tied to moulds but some processes don't use moulds
   - Should be optional or process-type specific

---

## 7️⃣ MIGRATION READINESS ASSESSMENT

### **SAFE TO REFACTOR (Low Risk)**

✅ `processes` - Stable, no frequent changes
✅ `processSteps` - Can add columns, legacy queries still work
✅ `controlCheckpoints` - Can add JSONB payload field
✅ `evidenceFiles` - No breaking changes needed
✅ `employees` - Can replace JSONB with relational tables

### **REQUIRES CAREFUL HANDLING (Medium Risk)**

⚠️ `parts` - Status field used in many queries
- Queries must be rewritten to use views instead
- Need dual-write period (old + new)

⚠️ `partStepInstances` - Central to execution logic
- Many queries depend on status field
- State transition logic must be reviewed
- Need migration for execution_state consolidation

⚠️ `checkpointResults` - QA logic depends on 3-field status
- Gateway logic must be rewritten
- Conditional pass workflow must be updated

### **CRITICAL / RISKY (High Risk)**

🔴 `parts.status` + `partStepInstances.status`
- These MUST be consolidated before production deploy
- Requires coordinated code + database migration
- Risk of data loss if backfill incorrect

🔴 Inventory consumption chains
- resin_lot_inventory ↔ resin_consumption ↔ kit_inventory
- No unified traceability path
- Must create explicit links during migration

---

## 8️⃣ FRONT-END DEPENDENCIES (Hard-Coded Assumptions)

### Status References in React Components
```bash
grep -r "\.status" src/app/components/ --include="*.tsx"
# Expected: 15-20 references to parts.status and step.status
```

### Query Patterns in Components
```bash
grep -r "currentStepId" src/app/components/ --include="*.tsx"
# Expected: 5-10 references to current step rendering
```

### Dashboard Widgets
- **ProcessFlowView.tsx** - Renders step sequence, likely reads parts.currentStepId
- **DashboardView.tsx** - Shows active parts, filters by parts.status
- **ProcessTab.tsx** - Displays step timeline, may assume manual sequence ordering

---

## 📋 MIGRATION EXECUTION READINESS

### Pre-Migration Checklist
- [x] Database schema analyzed
- [x] Status field duplication identified
- [x] View structure designed
- [x] Migration SQL created (8-phase)
- [x] Drizzle schema refactored
- [x] API query rewrites prepared
- [x] Component updates identified

### Files Ready for Migration
- ✅ `/workspaces/MES/drizzle/2026_mes_execution_refactor.sql` - Complete migration
- ✅ `/workspaces/MES/shared/schema_refactored.ts` - New Drizzle schema
- ✅ `/workspaces/MES/server/api_dashboard_refactored.ts` - View-based API queries
- ✅ `/workspaces/MES/GITHUB_COPILOT_AGENT_MASTER_PROMPT.md` - Execution guide

### Next Steps
1. **Execute migration phases 1-6** on staging database
2. **Validate view results** before phase 7
3. **Deploy updated Drizzle schema**
4. **Rewrite dashboard APIs** to use views
5. **Update React components** with new types
6. **Implement PLM sync** service
7. **Create pull request** with all changes

---

**Status: READY FOR AUTONOMOUS EXECUTION via GitHub Copilot Coding Agent**

See: `GITHUB_COPILOT_AGENT_MASTER_PROMPT.md` for complete implementation roadmap.
