# MES Database Design Analysis - Comprehensive Refactoring Report

**Document Version:** 1.0  
**Analysis Date:** January 15, 2026  
**Current Stack:** Supabase PostgreSQL + Drizzle ORM  
**Purpose:** Detailed codebase analysis for MES database redesign  

---

## Table of Contents
1. [1. DATABASE & ORM](#1-database--orm)
2. [2. CURRENT TABLES / MODELS](#2-current-tables--models)
3. [3. MES CORE ENTITIES](#3-mes-core-entities)
4. [4. STATUS HANDLING](#4-status-handling)
5. [5. QUERY PATTERNS](#5-query-patterns)
6. [6. DATA REDUNDANCY & DESIGN ISSUES](#6-data-redundancy--design-issues)
7. [7. MIGRATION READINESS](#7-migration-readiness)
8. [8. ARCHITECTURE RECOMMENDATIONS](#8-architecture-recommendations)

---

## 1. DATABASE & ORM

### Database Selection
- **Type:** Supabase PostgreSQL (managed cloud database)
- **Location:** Supabase cloud infrastructure
- **Configuration File:** [drizzle.config.ts](drizzle.config.ts)
  ```typescript
  dialect: "postgresql"
  dbCredentials: { url: process.env.DATABASE_URL }
  ```

### ORM Selection
- **ORM:** Drizzle ORM (lightweight, type-safe SQL builder)
- **Version:** `^0.45.1` (from [package.json](package.json))
- **Database Driver:** `pg` (Node.js PostgreSQL client) v8.16.3

### Schema Definition
- **Location:** [shared/schema.ts](shared/schema.ts) (707 lines)
- **Tables Defined:** 21 core tables + 4 legacy tables
- **Type Safety:** Full TypeScript support via Drizzle
- **Database Connection:** [server/db.ts](server/db.ts)
  ```typescript
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  ```

### Migrations
- **Tool:** Drizzle Kit
- **Location:** [drizzle/](drizzle/)
- **Current Migrations:**
  - `0000_calm_rick_jones.sql` - Initial schema (471 lines)
  - `0001_add_auth_user_id.sql` - Supabase auth integration
  - Migration metadata in [drizzle/meta/](drizzle/meta/)

---

## 2. CURRENT TABLES / MODELS

### 2.1 CORE PRODUCTION TABLES

#### **processes**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | serial | PRIMARY KEY | Unique identifier |
| `processNumber` | integer | NOT NULL, UNIQUE | Business process ID (10, 20, 30...) |
| `code` | varchar(20) | NOT NULL | Short code (INCOMING, GLASS-CUT, SPARBOOM-SF) |
| `name` | varchar(100) | NOT NULL | Human-readable name |
| `category` | varchar(20) | NOT NULL, DEFAULT 'prefabricated' | Category: inventory\|prefabricated\|moulding\|finishing |
| `description` | text | - | Long-form description |
| `createdAt` | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes:**
- `processes_category_idx` on `category`

**Relations:**
- 1→M to `processSteps`
- 1→M to `parts`

**Example Values:**
```
processNumber: 10, code: "INCOMING", name: "Incoming", category: "inventory"
processNumber: 40, code: "SPARBOOM-SF", name: "Spar Boom - SF", category: "prefabricated"
processNumber: 210, code: "SHELL-SF", name: "Shell Suction Face", category: "moulding"
```

---

#### **processSteps**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | serial | PRIMARY KEY | Unique identifier |
| `processId` | integer | FK→processes.id | Parent process |
| `stepNumber` | varchar(20) | NOT NULL | Sequential ID (40.01, 40.02, etc.) |
| `name` | varchar(100) | NOT NULL | Step name |
| `sequence` | integer | NOT NULL | Execution order within process |
| `targetCycleTime` | integer | - | Expected duration in minutes |
| `isInspection` | boolean | DEFAULT false | Quality gate flag |
| `isStorage` | boolean | DEFAULT false | Storage/buffer step flag |
| `requiresMould` | boolean | DEFAULT false | Requires mould assignment |
| `isBatchable` | boolean | DEFAULT false | Supports batch processing |
| `createdAt` | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes:**
- `process_steps_process_id_idx` on `processId`

**Relations:**
- M→1 to `processes`
- 1→M to `controlCheckpoints`
- 1→M to `partStepInstances`
- 1→M to `supplyRequirements`

**Batch Precedent:** 35+ steps per process (40.01 → 40.35)

---

#### **parts**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | serial | PRIMARY KEY | Unique identifier |
| `partNumber` | varchar(50) | NOT NULL, UNIQUE | Business ID (40-2024-0001) |
| `processId` | integer | FK→processes.id | Entry process |
| `bladeType` | varchar(100) | - | Blade designation |
| `status` | varchar(20) | NOT NULL, DEFAULT 'in_progress' | **CRITICAL: in_progress\|completed\|blocked\|rework** |
| `priority` | varchar(20) | NOT NULL, DEFAULT 'normal' | normal\|high\|critical |
| `entryReason` | varchar(30) | DEFAULT 'normal' | Entry reason: normal\|rework\|trial\|external_operation\|resumed |
| `entryStepId` | integer | FK→processSteps.id | Where part enters process |
| `entryNotes` | text | - | Entry notes |
| `currentStepId` | integer | FK→processSteps.id | **CRITICAL: denormalized "current step"** |
| `currentMouldId` | integer | FK→moulds.id | Currently assigned mould |
| `currentBatchId` | integer | FK→batches.id | Currently assigned batch |
| `blockedReason` | text | - | Why part is blocked |
| `blockedAt` | timestamp | - | When blocking occurred |
| `createdAt` | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |
| `updatedAt` | timestamp | NOT NULL, DEFAULT now() | Last update timestamp |

**Indexes:**
- `parts_part_number_idx` on `partNumber`
- `parts_process_id_idx` on `processId`
- `parts_priority_idx` on `priority`
- `parts_status_idx` on `status`

**Relations:**
- M→1 to `processes`
- 1→M to `partStepInstances`
- 1→M to `reworkEvents`
- 1→M to `timelineEvents`
- M→1 to `processSteps` (current step)
- M→1 to `moulds` (current mould)
- M→1 to `batches` (current batch)

---

#### **partStepInstances** (★ CORE EXECUTION TABLE)
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | serial | PRIMARY KEY | Unique identifier |
| `partId` | integer | FK→parts.id | Parent part |
| `stepId` | integer | FK→processSteps.id | Executed step |
| `status` | varchar(20) | NOT NULL, DEFAULT 'planned' | **EXECUTION STATE: planned\|active\|paused\|waiting\|blocked\|breakdown\|rework\|completed** |
| `previousStatus` | varchar(20) | - | Previous status for audit |
| `priority` | varchar(20) | DEFAULT 'normal' | Step-level priority |
| `mouldId` | integer | FK→moulds.id | Assigned mould |
| `batchId` | integer | FK→batches.id | Assigned batch |
| `startedAt` | timestamp | - | Execution start time |
| `endedAt` | timestamp | - | Execution end time |
| `plannedStartAt` | timestamp | - | Planned start time |
| `elapsedMinutes` | integer | DEFAULT 0 | Total elapsed time |
| `waitingReason` | text | - | Why waiting |
| `blockedReason` | text | - | Why blocked |
| `breakdownReason` | text | - | Why breakdown |
| `pauseReason` | text | - | Why paused |
| `lastStateChangeAt` | timestamp | - | Last state transition |
| `isDeferred` | boolean | DEFAULT false | Part deferred to later step |
| `deferredReason` | text | - | Why deferred |
| `deferredOriginalTime` | timestamp | - | Original scheduled time |
| `qaApproved` | boolean | DEFAULT false | QA pass flag |
| `qaApprovedAt` | timestamp | - | QA approval timestamp |
| `qaApprovedBy` | integer | FK→employees.id | QA approver |
| `assignedEmployeeId` | integer | FK→employees.id | Assigned operator |
| `notes` | text | - | Execution notes |
| `createdAt` | timestamp | NOT NULL, DEFAULT now() | Creation timestamp |

**Indexes:**
- `step_instances_part_id_idx` on `partId`
- `step_instances_step_id_idx` on `stepId`
- `step_instances_status_idx` on `status`
- `step_instances_mould_id_idx` on `mouldId`

**Relations:**
- M→1 to `parts`
- M→1 to `processSteps`
- M→1 to `moulds`
- M→1 to `batches`
- 1→M to `checkpointResults`
- 1→M to `stateTransitions`
- 1→M to `shiftLogs`

**Critical Role:** Tracks individual step execution, state machine, checkpoints

---

### 2.2 QUALITY & CONTROL TABLES

#### **controlCheckpoints** (Control Plan Master Data)
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | serial | PRIMARY KEY | - |
| `stepId` | integer | FK→processSteps.id | Parent step |
| `characteristic` | varchar(200) | NOT NULL | Characteristic name |
| `specification` | text | - | Spec value/range |
| `tolerance` | varchar(100) | - | Tolerance band |
| `measurementMethod` | varchar(200) | - | How to measure |
| `frequency` | varchar(100) | - | Sampling frequency |
| `measuredBy` | varchar(50) | - | Role required (QA, Operator) |
| `sequence` | integer | NOT NULL | Order within step |
| `isGating` | boolean | DEFAULT true | Gating point (blocks step) |
| `createdAt` | timestamp | NOT NULL | - |

**Relations:** 1→M to `checkpointResults`

---

#### **checkpointResults** (Execution Measurements)
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | serial | PRIMARY KEY | - |
| `instanceId` | integer | FK→partStepInstances.id | Measured step instance |
| `checkpointId` | integer | FK→controlCheckpoints.id | Control checkpoint def |
| `status` | varchar(20) | DEFAULT 'pending' | pending\|measured\|confirmed |
| `qaResult` | varchar(20) | DEFAULT 'pending' | **QA GATE: pending\|pass\|conditional_pass\|fail** |
| `measuredValue` | text | - | Actual measured value |
| `measuredById` | integer | FK→employees.id | Who measured |
| `measuredAt` | timestamp | - | When measured |
| `qaConfirmedById` | integer | FK→employees.id | QA who confirmed |
| `qaConfirmedAt` | timestamp | - | When QA confirmed |
| `deviationNumber` | varchar(50) | - | NCR/deviation number |
| `deviationApprovedById` | integer | FK→employees.id | Who approved deviation |
| `deviationApprovedAt` | timestamp | - | When deviation approved |
| `isGatePassed` | boolean | DEFAULT false | **Gating result** |
| `notes` | text | - | - |
| `createdAt` | timestamp | NOT NULL | - |

**Indexes:**
- `checkpoint_results_instance_id_idx`
- `checkpoint_results_qa_result_idx`

---

### 2.3 EQUIPMENT & RESOURCE TABLES

#### **moulds**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | serial | PRIMARY KEY | - |
| `code` | varchar(20) | NOT NULL, UNIQUE | Mould ID (M1, M2, M3) |
| `name` | varchar(100) | NOT NULL | Human name |
| `status` | varchar(20) | DEFAULT 'available' | available\|in_use\|breakdown\|maintenance |
| `currentPartId` | integer | FK→parts.id | Currently processing part |
| `lastBreakdownAt` | timestamp | - | Last breakdown date |
| `totalDowntimeMinutes` | integer | DEFAULT 0 | Cumulative downtime |
| `createdAt` | timestamp | NOT NULL | - |

**Relations:** 1→M to `mouldEvents`, `batches`, `partStepInstances`

---

#### **mouldEvents** (Equipment History)
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | serial | PRIMARY KEY | - |
| `mouldId` | integer | FK→moulds.id | - |
| `eventType` | varchar(20) | NOT NULL | breakdown\|maintenance\|repair |
| `reason` | text | - | - |
| `startedAt` | timestamp | DEFAULT now() | - |
| `endedAt` | timestamp | - | - |
| `downtimeMinutes` | integer | - | - |
| `recordedById` | integer | FK→employees.id | - |
| `createdAt` | timestamp | NOT NULL | - |

---

### 2.4 BATCH PROCESSING TABLES

#### **batches** (Batch Master)
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | serial | PRIMARY KEY | - |
| `batchNumber` | varchar(50) | NOT NULL, UNIQUE | - |
| `operationType` | varchar(50) | NOT NULL | Operation type |
| `status` | varchar(20) | DEFAULT 'active' | active\|completed\|cancelled |
| `mouldId` | integer | FK→moulds.id | Associated mould |
| `stepId` | integer | FK→processSteps.id | Associated step |
| `startedAt` | timestamp | - | - |
| `endedAt` | timestamp | - | - |
| `notes` | text | - | - |
| `createdAt` | timestamp | NOT NULL | - |

**Relations:** 1→M to `batchParts`

---

#### **batchParts** (N:M Parts in Batch)
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | serial | PRIMARY KEY | - |
| `batchId` | integer | FK→batches.id | Parent batch |
| `partId` | integer | FK→parts.id | Part in batch |
| `addedAt` | timestamp | DEFAULT now() | - |

---

### 2.5 INVENTORY TABLES

#### **supplyLots** (Material Stock Master)
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | serial | PRIMARY KEY | - |
| `lotNumber` | varchar(50) | NOT NULL, UNIQUE | Lot ID |
| `materialType` | varchar(100) | NOT NULL | Material classification |
| `quantity` | decimal(10,2) | NOT NULL | Quantity available |
| `unit` | varchar(20) | NOT NULL | Unit (m2, kg, L, etc.) |
| `state` | varchar(20) | DEFAULT 'ready' | **ready\|usable\|qa_pending\|rejected** |
| `qaStatus` | varchar(20) | - | QA result |
| `rejectionReason` | text | - | If rejected |
| `curingEndTime` | timestamp | - | For resin/adhesive curing |
| `expiryDate` | timestamp | - | Material expiry |
| `receivedAt` | timestamp | DEFAULT now() | - |
| `createdAt` | timestamp | NOT NULL | - |

**Indexes:** `supply_lots_state_idx`

---

#### **supplyRequirements** (Step Requirements)
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | serial | PRIMARY KEY | - |
| `stepId` | integer | FK→processSteps.id | Required for this step |
| `materialType` | varchar(100) | NOT NULL | Material type needed |
| `quantityRequired` | decimal(10,2) | NOT NULL | Quantity needed |
| `unit` | varchar(20) | NOT NULL | Unit |
| `isMandatory` | boolean | DEFAULT true | Gate material |
| `createdAt` | timestamp | NOT NULL | - |

---

#### **kit_inventory** (Process-Driven Material Kits) ★ NEW
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | serial | PRIMARY KEY | - |
| `kit_code` | varchar(50) | NOT NULL, UNIQUE | Generated code (KIT-PROCESS-YYYYMMDD-SEQ) |
| `process_id` | integer | FK→processes.id | **Bound to specific process** |
| `kit_type` | varchar(20) | NOT NULL | KIT or GLASS |
| `status` | varchar(20) | DEFAULT 'AVAILABLE' | **AVAILABLE or CONSUMED** |
| `photo_url` | text | NOT NULL | Mandatory photo at creation |
| `created_by` | varchar(100) | NOT NULL | User who created kit |
| `created_at` | timestamp | DEFAULT now() | - |
| `consumed_by` | varchar(100) | - | User who consumed kit |
| `consumed_at` | timestamp | - | When consumed |
| `process_instance_id` | integer | - | Execution instance consuming kit |

**Purpose:** Process-bound inventory (kit-per-process model)

---

#### **resin_lot_inventory** (Shared Resin Pool) ★ NEW
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | serial | PRIMARY KEY | - |
| `resin_code` | varchar(50) | NOT NULL, UNIQUE | Generated code (RESIN-YYYYMMDD-SEQ) |
| `available_count` | integer | DEFAULT 1 | **Count-based consumption** |
| `photo_url` | text | NOT NULL | Mandatory photo |
| `created_by` | varchar(100) | NOT NULL | - |
| `created_at` | timestamp | DEFAULT now() | - |

**Purpose:** Shared resin inventory across all processes

---

#### **resin_consumption** (Resin Usage Log) ★ NEW
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | serial | PRIMARY KEY | - |
| `resin_lot_id` | integer | FK→resin_lot_inventory.id | Which resin batch |
| `process_id` | integer | FK→processes.id | Consumed by which process |
| `process_instance_id` | integer | - | Which execution instance |
| `consumed_by` | varchar(100) | NOT NULL | User |
| `consumed_at` | timestamp | DEFAULT now() | - |

**Purpose:** Audit trail for resin usage

---

### 2.6 EXECUTION & AUDIT TABLES

#### **stateTransitions** (State Machine Audit)
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | serial | PRIMARY KEY | - |
| `instanceId` | integer | FK→partStepInstances.id | Which step instance |
| `fromState` | varchar(20) | - | Previous state |
| `toState` | varchar(20) | NOT NULL | New state |
| `reason` | text | - | Transition reason |
| `triggeredById` | integer | FK→employees.id | Who triggered |
| `triggeredAt` | timestamp | DEFAULT now() | - |
| `isAutomatic` | boolean | DEFAULT false | System-triggered |

---

#### **shiftLogs** (Shift-Based Execution)
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | serial | PRIMARY KEY | - |
| `instanceId` | integer | FK→partStepInstances.id | - |
| `shiftCode` | varchar(20) | NOT NULL | A, B, C shift |
| `shiftDate` | timestamp | NOT NULL | - |
| `startTime` | timestamp | NOT NULL | - |
| `endTime` | timestamp | - | - |
| `crewMembers` | jsonb | - | **JSONB: array of employee IDs** |
| `elapsedMinutes` | integer | DEFAULT 0 | - |
| `handoverNotes` | text | - | - |
| `isOfflineEntry` | boolean | DEFAULT false | Manual entry flag |
| `offlineReason` | text | - | If offline |
| `recordedById` | integer | FK→employees.id | - |
| `createdAt` | timestamp | NOT NULL | - |

**JSONB Usage:** `crewMembers` stored as array of integers

---

#### **timelineEvents** (Part History)
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | serial | PRIMARY KEY | - |
| `partId` | integer | FK→parts.id | - |
| `eventType` | varchar(50) | NOT NULL | step_started, status_changed, etc. |
| `eventData` | jsonb | - | **JSONB: event-specific payload** |
| `instanceId` | integer | FK→partStepInstances.id | - |
| `stepId` | integer | FK→processSteps.id | - |
| `description` | text | - | - |
| `recordedById` | integer | FK→employees.id | - |
| `occurredAt` | timestamp | DEFAULT now() | - |
| `createdAt` | timestamp | NOT NULL | - |

**Indexes:**
- `timeline_events_part_id_idx`
- `timeline_events_occurred_at_idx`

---

### 2.7 EVIDENCE & ATTACHMENT TABLES

#### **evidenceFiles** (QA Evidence)
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | serial | PRIMARY KEY | - |
| `resultId` | integer | FK→checkpointResults.id | Associated measurement |
| `storageKey` | varchar(500) | NOT NULL | Cloud storage path |
| `fileName` | varchar(255) | NOT NULL | Original filename |
| `fileType` | varchar(50) | - | Extension (jpg, pdf, etc.) |
| `fileSize` | integer | - | Bytes |
| `capturedById` | integer | FK→employees.id | - |
| `capturedAt` | timestamp | DEFAULT now() | - |
| `createdAt` | timestamp | NOT NULL | - |

---

### 2.8 HUMAN RESOURCE TABLES

#### **employees**
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | serial | PRIMARY KEY | - |
| `employeeCode` | varchar(20) | NOT NULL, UNIQUE | Employee ID |
| `name` | varchar(100) | NOT NULL | - |
| `role` | varchar(50) | NOT NULL | Operator, QA Inspector, Supervisor |
| `department` | varchar(50) | - | Production, Quality, etc. |
| `skills` | jsonb | - | **JSONB: array of skill strings** |
| `email` | varchar(100) | - | - |
| `phone` | varchar(20) | - | - |
| `isActive` | boolean | DEFAULT true | - |
| `currentShift` | varchar(20) | - | A, B, C |
| `auth_user_id` | uuid | UNIQUE | **Link to Supabase auth.users.id** |
| `createdAt` | timestamp | NOT NULL | - |

**Indexes:**
- `employees_code_idx`
- `employees_auth_user_id_idx`

**JSONB Usage:** `skills` stored as array of strings

---

#### **employeeAssignments** (Step Assignment)
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | serial | PRIMARY KEY | - |
| `employeeId` | integer | FK→employees.id | - |
| `instanceId` | integer | FK→partStepInstances.id | - |
| `shiftLogId` | integer | FK→shiftLogs.id | - |
| `role` | varchar(50) | - | Role in assignment |
| `status` | varchar(20) | DEFAULT 'active' | - |
| `startedAt` | timestamp | DEFAULT now() | - |
| `endedAt` | timestamp | - | - |
| `createdAt` | timestamp | NOT NULL | - |

---

#### **employeeStatusHistory** (Status Audit)
| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| `id` | serial | PRIMARY KEY | - |
| `employeeId` | integer | FK→employees.id | - |
| `status` | varchar(20) | NOT NULL | Active, On-Leave, etc. |
| `reason` | text | - | - |
| `recordedAt` | timestamp | DEFAULT now() | - |

---

### 2.9 LEGACY TABLES (Deprecated)

#### **material_master** (LEGACY - Old Material System)
- Not used in current implementation
- Kept for backward compatibility
- **Status:** DEPRECATED

#### **material_process_intent** (LEGACY)
- Maps materials to processes
- **Status:** DEPRECATED

#### **process_execution** (LEGACY)
- Old execution tracking
- **Status:** DEPRECATED

#### **material_usage** (LEGACY)
- **Status:** DEPRECATED

#### **kits** (LEGACY - Old Kit System)
- Replaced by `kit_inventory`
- **Status:** DEPRECATED

#### **kitBalances** (LEGACY)
- **Status:** DEPRECATED

#### **kitConsumption** (LEGACY)
- **Status:** DEPRECATED

---

## 3. MES CORE ENTITIES

### 3.1 WHERE EACH ENTITY IS STORED

| Entity | Table(s) | Key Columns | File Location |
|--------|----------|-------------|----------------|
| **Users/Employees** | `employees` | `id`, `auth_user_id`, `employeeCode` | [shared/schema.ts:400](shared/schema.ts#L400) |
| **Processes (Master)** | `processes` | `id`, `processNumber`, `code` | [shared/schema.ts:220](shared/schema.ts#L220) |
| **Process Steps (Control Plan)** | `processSteps` | `id`, `processId`, `stepNumber` | [shared/schema.ts:235](shared/schema.ts#L235) |
| **Prefabricated Parts** | `parts` | `id`, `partNumber`, `processId` | [shared/schema.ts:262](shared/schema.ts#L262) |
| **Step Execution** | `partStepInstances` | `id`, `partId`, `stepId`, `status` | [shared/schema.ts:283](shared/schema.ts#L283) |
| **Status Tracking** | `partStepInstances.status`, `parts.status`, `checkpointResults.qaResult` | Various | See Status Handling section |
| **Inventory** | `kit_inventory`, `resin_lot_inventory`, `supplyLots` | Various | [shared/schema.ts:22-70](shared/schema.ts#L22-L70) |
| **Images/Attachments** | `evidenceFiles` | `storageKey`, `fileName` | [shared/schema.ts:368](shared/schema.ts#L368) |
| **Comments/Notes** | `partStepInstances.notes`, `timelineEvents.eventData` | Various | [shared/schema.ts:326-327](shared/schema.ts#L326-L327) |
| **Checkpoints/QA** | `controlCheckpoints`, `checkpointResults` | Various | [shared/schema.ts:248-365](shared/schema.ts#L248-L365) |

---

### 3.2 PROCESS DATA MODEL

```
Process (Master)
├── Process Steps (Sequence 1-35)
│   ├── Control Checkpoints (QA Gates)
│   │   └── Checkpoint Results (Execution Measurements)
│   │       └── Evidence Files (Photos/Documents)
│   ├── Supply Requirements (Material Gates)
│   └── ...
└── Parts (Prefabricated Blades)
    ├── Part Step Instances (Execution)
    │   ├── Status Transitions (Audit Trail)
    │   ├── Shift Logs (Shift-Based Tracking)
    │   └── Checkpoint Results (QA Confirmations)
    ├── Rework Events (Iteration History)
    └── Timeline Events (Full History)
```

---

## 4. STATUS HANDLING

### 4.1 WHERE STATUS IS STORED

**CRITICAL: Status is stored in MULTIPLE tables** ⚠️

#### Part-Level Status
- **Table:** `parts`
- **Column:** `status`
- **Values:** `in_progress`, `completed`, `blocked`, `rework`
- **Location:** [shared/schema.ts:270](shared/schema.ts#L270)

#### Step-Level Status
- **Table:** `partStepInstances`
- **Column:** `status`
- **Values:** `planned`, `active`, `paused`, `waiting`, `blocked`, `breakdown`, `rework`, `completed`
- **Location:** [shared/schema.ts:287](shared/schema.ts#L287)

#### QA Checkpoint Status
- **Table:** `checkpointResults`
- **Column:** `qaResult`
- **Values:** `pending`, `pass`, `conditional_pass`, `fail`
- **Location:** [shared/schema.ts:353](shared/schema.ts#L353)

#### Quality Gate Status
- **Table:** `checkpointResults`
- **Column:** `isGatePassed`
- **Values:** Boolean (true/false)
- **Location:** [shared/schema.ts:362](shared/schema.ts#L362)

#### Mould Status
- **Table:** `moulds`
- **Column:** `status`
- **Values:** `available`, `in_use`, `breakdown`, `maintenance`

#### Material/Supply Status
- **Table:** `supplyLots`
- **Column:** `state`
- **Values:** `ready`, `usable`, `qa_pending`, `rejected`

#### Kit Status (NEW)
- **Table:** `kit_inventory`
- **Column:** `status`
- **Values:** `AVAILABLE`, `CONSUMED`

#### Resin Status (NEW)
- **Table:** `resin_lot_inventory`
- **Column:** `available_count`
- **Type:** Integer (count-based)

---

### 4.2 DATA REDUNDANCY IN STATUS

**REDUNDANT STATUS INFORMATION DETECTED:**

1. **Part Status vs. Step Instance Status**
   - Part has `status` field (in_progress, completed, blocked, rework)
   - Each step instance has its own `status` field (planned, active, paused, etc.)
   - **Inconsistency Risk:** Part status "completed" doesn't guarantee all steps completed
   - **Example Code:** [server/index.ts:469-520](server/index.ts#L469-L520)

2. **Current Step Denormalization**
   - `parts.currentStepId` is manually maintained
   - Should be derived from `partStepInstances` with highest sequence
   - **Risk:** Can become stale if not updated atomically
   - **Location:** [shared/schema.ts:275](shared/schema.ts#L275)

3. **Blocked Status Duplication**
   - `parts.blockedReason` + `parts.blockedAt`
   - `partStepInstances.blockedReason` + `partStepInstances.lastStateChangeAt`
   - **Risk:** May diverge between part and step level

4. **QA Approval Status**
   - `partStepInstances.qaApproved` (boolean)
   - `checkpointResults.qaResult` (pending/pass/fail)
   - `checkpointResults.isGatePassed` (boolean)
   - **Risk:** Multiple gates with inconsistent semantics

---

### 4.3 "CURRENT STEP" CALCULATION

**How Current Step is Tracked:**

```typescript
// Option 1: Direct denormalized field
parts.currentStepId  // Manually maintained

// Option 2: Derived from max sequence
SELECT processSteps.* FROM processSteps
JOIN partStepInstances ON partStepInstances.stepId = processSteps.id
WHERE partStepInstances.partId = ? 
  AND partStepInstances.status != 'completed'
ORDER BY processSteps.sequence DESC
LIMIT 1
```

**Current Implementation:**
- Uses denormalized `parts.currentStepId`
- Updated in [server/index.ts:493](server/index.ts#L493):
  ```typescript
  await db.update(parts)
    .set({ currentStepId: parseInt(stepId), updatedAt: new Date() })
    .where(eq(parts.id, parseInt(partId)));
  ```

**Risk:** Manual updates can become stale during concurrent operations

---

### 4.4 VALID STATE TRANSITIONS

Defined in [shared/schema.ts:685-695](shared/schema.ts#L685-L695):

```typescript
validStateTransitions: Record<ExecutionState, ExecutionState[]> = {
  planned:   ["active", "waiting", "blocked"],
  active:    ["paused", "waiting", "blocked", "breakdown", "completed"],
  paused:    ["active", "waiting", "blocked"],
  waiting:   ["active", "blocked"],
  blocked:   ["active", "waiting"],
  breakdown: ["active", "waiting"],
  rework:    ["active", "completed"],
  completed: ["rework"],
};
```

**Enum Values:** [shared/schema.ts:4-6](shared/schema.ts#L4-L6)
```typescript
executionStates = ["planned", "active", "paused", "waiting", "blocked", "breakdown", "rework", "completed"]
```

---

## 5. QUERY PATTERNS

### 5.1 FIND PART BY PART NUMBER

**Frontend API (Supabase Client):** [src/app/lib/api.ts](src/app/lib/api.ts)
```typescript
partsApi.list(params?: { search?: string; status?: string; priority?: string; processId?: number }) {
  let query = supabase.from('parts').select('*, process_steps(*)');
  if (params?.search) query = query.ilike('part_number', `%${params.search}%`);
  return handleResponse(query);
}
```

**Backend API (Drizzle):** [server/index.ts:273-293](server/index.ts#L273-L293)
```typescript
app.get("/api/parts", async (req, res) => {
  const { search, status, priority, processId } = req.query;
  const conditions = [];
  if (search) conditions.push(like(parts.partNumber, `%${search}%`));
  if (status) conditions.push(eq(parts.status, status as string));
  if (priority) conditions.push(eq(parts.priority, priority as string));
  if (processId) conditions.push(eq(parts.processId, parseInt(processId as string)));
  
  const result = conditions.length > 0 ? ... : ...
  res.json(result);
});
```

**Indexes:** `parts_part_number_idx` on `partNumber`

---

### 5.2 FIND PARTS BY STATUS

**Active Parts Query:** [server/index.ts:1455-1475](server/index.ts#L1455-L1475)
```typescript
app.get("/api/parts/active", async (req, res) => {
  const result = await db.select({
    part: parts,
    process: processes,
    currentStep: processSteps,
    mould: moulds,
  }).from(parts)
    .leftJoin(processes, eq(parts.processId, processes.id))
    .leftJoin(processSteps, eq(parts.currentStepId, processSteps.id))
    .leftJoin(moulds, eq(parts.currentMouldId, moulds.id))
    .where(eq(parts.status, "in_progress"))
    .orderBy(
      sql`CASE WHEN ${parts.priority} = 'critical' THEN 1 WHEN ${parts.priority} = 'high' THEN 2 ELSE 3 END`,
      desc(parts.updatedAt)
    );
  res.json(result);
});
```

**Key Observations:**
- Uses LEFT JOINs for process, currentStep, mould
- Orders by priority (critical → high → normal), then updatedAt DESC
- All `in_progress` status parts only

**Indexes:**
- `parts_status_idx` on `status`
- `parts_priority_idx` on `priority`

---

### 5.3 DASHBOARD QUERIES

**Key Dashboards:**

1. **Status Summary by Process**
   - Count parts grouped by status per process
   - UI: [src/app/components/ProcessTab.tsx](src/app/components/ProcessTab.tsx#L389)

2. **Active Parts Overview**
   - Real-time working items
   - Query: `/api/parts/active`

3. **Process Flow View**
   - All steps for a part with statuses
   - Component: [src/app/components/ProcessFlowView.tsx](src/app/components/ProcessFlowView.tsx)

4. **Bottleneck Analysis**
   - Referenced as `production_bottlenecks` view in [src/app/lib/api.ts:68](src/app/lib/api.ts#L68)
   - **NOTE:** View definition not found in provided code

---

### 5.4 INVENTORY QUERIES

**Supply Lot Queries:** [src/app/lib/api.ts:60-65](src/app/lib/api.ts#L60-L65)
```typescript
supplyApi.list(params?: { state?: string }) {
  let query = supabase.from('supply_lots').select('*');
  if (params?.state) query = query.eq('state', params.state);
  return handleResponse(query);
}
```

**States Queried:**
- `ready` - Awaiting curing/prep
- `usable` - Ready for consumption
- `qa_pending` - Awaiting QA approval
- `rejected` - Rejected material

**Kit Inventory (NEW):**
- By process: `kit_inventory` filtered by `process_id`
- Status: `AVAILABLE` or `CONSUMED`

**Resin Inventory (NEW):**
- Shared pool: `resin_lot_inventory.available_count` (integer)
- Consumed via: `resin_consumption` log

---

### 5.5 STEP INSTANCE QUERIES

**Get Step History for Part:** [server/index.ts:1043-1070](server/index.ts#L1043-L1070)
```typescript
app.get("/api/parts/:partId/steps/history", async (req, res) => {
  const partId = parseInt(req.params.partId);
  const instances = await db
    .select()
    .from(partStepInstances)
    .leftJoin(processSteps, eq(partStepInstances.stepId, processSteps.id))
    .where(eq(partStepInstances.partId, partId))
    .orderBy(processSteps.sequence);
  // ...
});
```

**Get Checkpoint Results:** [server/index.ts:1073-1110](server/index.ts#L1073-L1110)
```typescript
app.get("/api/parts/:partId/steps/:stepId/checkpoint-results", async (req, res) => {
  const instances = await db
    .select()
    .from(checkpointResults)
    .where(and(
      eq(checkpointResults.instanceId, stepInstance.id),
      eq(checkpointResults.checkpointId, checkpoint.id),
    ));
});
```

---

## 6. DATA REDUNDANCY & DESIGN ISSUES

### 6.1 IDENTIFIED REDUNDANCIES

| Issue | Location | Severity | Details |
|-------|----------|----------|---------|
| **Part Status vs. Step Status** | `parts.status` vs `partStepInstances.status` | HIGH | Dual status fields create inconsistency risks |
| **Current Step Denormalization** | `parts.currentStepId` | MEDIUM | Manual updates can lag behind actual execution |
| **Blocked Status Duplication** | `parts.blockedReason` + `partStepInstances.blockedReason` | MEDIUM | Two sources of truth for blocking |
| **QA Gate Duplication** | `qaApproved` (bool) vs `isGatePassed` (bool) vs `qaResult` (enum) | HIGH | Three representations of QA status |
| **Planned Start vs. Actual Start** | `partStepInstances.plannedStartAt` vs `startedAt` | LOW | Expected vs. actual timing |

---

### 6.2 NOQL-LIKE PATTERNS IN SQL

**JSONB Field Usage:**

1. **Employee Skills** [shared/schema.ts:410](shared/schema.ts#L410)
   ```typescript
   skills: jsonb("skills").$type<string[]>()
   ```
   - Stored as array of strings
   - Cannot be indexed or queried without operators
   - **Risk:** Skill-based assignment queries are inefficient

2. **Shift Crew Members** [shared/schema.ts:327](shared/schema.ts#L327)
   ```typescript
   crewMembers: jsonb("crew_members").$type<number[]>()
   ```
   - Array of employee IDs
   - Makes crew analysis difficult
   - **Better Design:** Separate `shift_crew` join table

3. **Timeline Event Data** [shared/schema.ts:333](shared/schema.ts#L333)
   ```typescript
   eventData: jsonb("event_data")
   ```
   - Arbitrary event payloads
   - Flexible but unstructured
   - **Use Case:** Event sourcing pattern

---

### 6.3 MISSING FOREIGN KEY RELATIONSHIPS

**Weak or Missing Relations:**

| Relationship | Current State | Issue | Location |
|---|---|---|---|
| **Kit to Step Instance** | `kit_inventory.process_instance_id` | Integer, not FK | [shared/schema.ts:36](shared/schema.ts#L36) |
| **Resin to Step Instance** | `resin_consumption.process_instance_id` | Integer, not FK | [shared/schema.ts:54](shared/schema.ts#L54) |
| **Timeline Event Type** | `eventType` is varchar | No enum table | [shared/schema.ts:332](shared/schema.ts#L332) |
| **Process Categories** | `category` is varchar | Enum in code, not DB | [shared/schema.ts:219](shared/schema.ts#L219) |

---

### 6.4 DENORMALIZATION RISKS

**Actively Maintained Denormalized Fields:**

1. **`parts.currentStepId`**
   - Updated in: [server/index.ts:493](server/index.ts#L493)
   - Query Source: Should derive from max(processSteps.sequence) where status != 'completed'
   - **Risk Level:** MEDIUM

2. **`parts.currentMouldId`**
   - Updated manually
   - Should derive from partStepInstances where mouldId != null
   - **Risk Level:** LOW (single mould at a time)

3. **`parts.currentBatchId`**
   - Updated manually
   - Should derive from partStepInstances where batchId != null
   - **Risk Level:** LOW (single batch at a time)

4. **`parts.status`**
   - Duplicates overall status of all step instances
   - Should be: CASE WHEN all steps completed THEN 'completed' ELSE 'in_progress' ...
   - **Risk Level:** HIGH

---

## 7. MIGRATION READINESS

### 7.1 TABLE CRITICALITY MATRIX

| Table | Criticality | Risk Level | Production Data | Recommendations |
|-------|-------------|-----------|-----------------|------------------|
| `processes` | CRITICAL | LOW | YES (Master Data) | Stable, can refactor safely |
| `processSteps` | CRITICAL | LOW | YES (Master Data) | Stable, add JSONB for payload |
| `parts` | CRITICAL | HIGH | YES (Active) | Consolidate status fields |
| `partStepInstances` | CRITICAL | HIGH | YES (Active) | Redesign for PLM audit trail |
| `checkpointResults` | CRITICAL | HIGH | YES (Audit) | Add structured QA payload |
| `employees` | CRITICAL | LOW | YES (Master Data) | Refactor skill from JSONB to table |
| `controlCheckpoints` | CRITICAL | LOW | YES (Master Data) | Stable |
| `supplyLots` | CRITICAL | MEDIUM | YES (Inventory) | Stable |
| `moulds` | CRITICAL | MEDIUM | YES (Resource) | Stable |
| `kit_inventory` | HIGH | LOW | YES (NEW) | New, fully refactorable |
| `resin_lot_inventory` | HIGH | LOW | YES (NEW) | New, fully refactorable |
| `batchParts` | MEDIUM | LOW | MAYBE | Stable join table |
| `stateTransitions` | MEDIUM | LOW | YES (Audit) | Stable, can enhance |
| `timelineEvents` | MEDIUM | LOW | YES (Audit) | Stable, can restructure |
| `evidenceFiles` | MEDIUM | MEDIUM | YES (Attachments) | Stable |
| `shiftLogs` | MEDIUM | MEDIUM | MAYBE | Stable |
| `material_master` | LOW | N/A | NO (LEGACY) | **DELETE** |
| `material_process_intent` | LOW | N/A | NO (LEGACY) | **DELETE** |
| `process_execution` | LOW | N/A | NO (LEGACY) | **DELETE** |
| `material_usage` | LOW | N/A | NO (LEGACY) | **DELETE** |
| `kits` | LOW | N/A | NO (LEGACY) | **DELETE** |
| `kitBalances` | LOW | N/A | NO (LEGACY) | **DELETE** |
| `kitConsumption` | LOW | N/A | NO (LEGACY) | **DELETE** |

---

### 7.2 HARD-CODED ASSUMPTIONS IN CODEBASE

**Frontend Assumptions:**

1. **Part Status Values** [src/app/components/OperationsTab.tsx](src/app/components/OperationsTab.tsx)
   ```typescript
   type BladeStatus = 'in_progress' | 'hold' | 'rework' | 'waiting' | 'blocked';
   ```
   - Hardcoded status types
   - **Change Risk:** UI will break if status values change

2. **Process Categories** [src/app/App.tsx:47](src/app/App.tsx#L47)
   ```typescript
   case 'inventory': ...
   ```
   - Hardcoded category names
   - **Change Risk:** Navigation logic depends on exact strings

3. **Priority Levels** [server/index.ts:1461](server/index.ts#L1461)
   ```typescript
   CASE WHEN ${parts.priority} = 'critical' THEN 1 WHEN ${parts.priority} = 'high' THEN 2
   ```
   - Hardcoded priority ordering
   - **Change Risk:** Sorting will break if priorities change

**Backend Assumptions:**

4. **Step Status Enum** [server/index.ts:258-270](server/index.ts#L258-L270)
   ```typescript
   validStateTransitions: Record<ExecutionState, ExecutionState[]>
   ```
   - Hardcoded state machine
   - **Change Risk:** Cannot add new states without code change

5. **Entry Reason Enum** [shared/schema.ts:8-9](shared/schema.ts#L8-L9)
   ```typescript
   entryReasons = ["normal", "rework", "trial", "external_operation", "resumed"]
   ```
   - Hardcoded in schema
   - **Change Risk:** Cannot add reasons without migration

6. **QA Result Enum** [shared/schema.ts:12-13](shared/schema.ts#L12-L13)
   ```typescript
   qualityResults = ["pending", "pass", "conditional_pass", "fail"]
   ```
   - Hardcoded in schema
   - **Change Risk:** Limited flexibility for conditional logic

---

### 7.3 DATA MIGRATION STRATEGY

**Phase 1: Preparation**
- [ ] Backup current production database
- [ ] Create staging environment with copy of production data
- [ ] Document all current status values in use
- [ ] Identify parts in "active" status (may be incomplete migration)

**Phase 2: Schema Refactoring**
- [ ] Create new optimized tables alongside existing
- [ ] Add JSONB payload columns to `partStepInstances`
- [ ] Create `employee_skills` junction table
- [ ] Create `shift_crew` junction table
- [ ] Add UUID columns for PLM integration

**Phase 3: Data Migration**
- [ ] Copy master data (processes, steps, employees)
- [ ] Transform parts and step instances
- [ ] Consolidate status fields
- [ ] Migrate checkpoint results with new structure

**Phase 4: Cutover**
- [ ] Update API layer to use new schema
- [ ] Update frontend for new data structure
- [ ] Parallel run old and new systems
- [ ] Validate audit trail completeness

**Phase 5: Cleanup**
- [ ] Drop legacy tables
- [ ] Remove old API endpoints
- [ ] Archive old audit logs if needed

---

### 7.4 BACKWARD COMPATIBILITY CONCERNS

**Breaking Changes if Refactored:**

1. **Part Status Consolidation**
   - Current: `parts.status` + `partStepInstances.status` (dual)
   - Proposed: Single source of truth
   - **Impact:** All queries need rewriting
   - **Mitigation:** Create database view matching old schema

2. **Current Step Calculation**
   - Current: Denormalized `parts.currentStepId`
   - Proposed: Computed field or view
   - **Impact:** Clients using direct field access
   - **Mitigation:** Generate field on query response

3. **Checkpoint Status**
   - Current: `qaApproved` (bool) + `qaResult` (enum) + `isGatePassed` (bool)
   - Proposed: Single `qa_status` enum
   - **Impact:** QA logic needs rewrite
   - **Mitigation:** Create view with virtual columns

---

## 8. ARCHITECTURE RECOMMENDATIONS

### 8.1 PROPOSED SCHEMA IMPROVEMENTS

#### For Execution & Traceability

**Enhanced `partStepInstances` Table:**

Add JSONB payload columns:
```sql
ALTER TABLE part_step_instances ADD COLUMN step_payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE part_step_instances ADD COLUMN execution_context JSONB DEFAULT '{}'::jsonb;
```

**Purpose:**
- `step_payload`: Step-specific parameters (mould configs, temperatures, times)
- `execution_context`: Runtime execution details (operator decisions, exceptions)

#### For QA & Quality

**Consolidate `checkpointResults`:**

```sql
-- Replace multiple status fields with single enum
ALTER TABLE checkpoint_results DROP COLUMN qa_approved;
ALTER TABLE checkpoint_results DROP COLUMN qa_result;
ALTER TABLE checkpoint_results 
  ADD COLUMN qa_status VARCHAR(20) DEFAULT 'pending' 
  CHECK (qa_status IN ('pending', 'pass', 'conditional_pass', 'fail'));

-- Store QA context as JSONB
ALTER TABLE checkpoint_results 
  ADD COLUMN qa_context JSONB DEFAULT '{}'::jsonb;
```

#### For Inventory

**Create `part_inventory_link` table:**

```sql
CREATE TABLE part_inventory_link (
  id SERIAL PRIMARY KEY,
  part_id INTEGER NOT NULL REFERENCES parts(id),
  kit_id INTEGER REFERENCES kit_inventory(id),
  resin_id INTEGER REFERENCES resin_lot_inventory(id),
  supply_lot_id INTEGER REFERENCES supply_lots(id),
  consumed_at TIMESTAMP DEFAULT now(),
  consumed_by VARCHAR(100),
  INDEX ON part_id
);
```

**Purpose:** Explicit traceability of which materials went into which parts

#### For Employees & Skills

**Create `employee_skill` junction table:**

```sql
CREATE TABLE employee_skill (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  skill VARCHAR(100) NOT NULL,
  proficiency VARCHAR(20) DEFAULT 'competent',
  certified_date TIMESTAMP,
  expires_at TIMESTAMP,
  UNIQUE(employee_id, skill)
);

-- Drop JSONB column
ALTER TABLE employees DROP COLUMN skills;
```

**Purpose:** Queryable skill records, support certifications

#### For Shift Management

**Create `shift_crew` junction table:**

```sql
CREATE TABLE shift_crew (
  id SERIAL PRIMARY KEY,
  shift_log_id INTEGER NOT NULL REFERENCES shift_logs(id),
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  role VARCHAR(50),
  INDEX ON shift_log_id
);

-- Drop JSONB column
ALTER TABLE shift_logs DROP COLUMN crew_members;
```

**Purpose:** Query crew by shift, reporting on utilization

---

### 8.2 SQL BACKBONE DESIGN

**Principles:**

1. **Normalized for Execution**
   - One table per entity type
   - Foreign keys enforce referential integrity
   - Indexes on foreign keys for joins

2. **Immutable Audit Trail**
   - `stateTransitions` table never deleted
   - `timelineEvents` append-only
   - All changes logged with timestamps

3. **Audit-Safe Status**
   - Status changes recorded in `stateTransitions`
   - Previous status always stored
   - Reason and actor recorded

---

### 8.3 JSONB FOR DYNAMIC MES PAYLOADS

**Recommended JSONB Usage:**

| Table | Column | Purpose | Example |
|-------|--------|---------|---------|
| `partStepInstances` | `step_payload` | Step-specific config | `{"temperature": 85, "humidity": 45, "curing_time_hours": 8}` |
| `partStepInstances` | `execution_context` | Runtime decisions | `{"operator_notes": "...", "equipment_state": {...}, "exceptions": [...]}` |
| `checkpointResults` | `qa_context` | QA decision data | `{"methodology": "c-scan", "deviation_approved": true, "ncr_number": "NCR-2024-001"}` |
| `timelineEvents` | `eventData` | Event-specific data | `{"from_step": 3, "to_step": 2, "reason": "rework"}` |
| `employees` | `metadata` | Custom employee data | `{"hire_date": "2024-01-01", "experience_years": 5}` |

**Guidelines:**

✅ **USE JSONB FOR:**
- Dynamic, infrequently-changing attributes
- Event payloads with variable structure
- Performance-uncritical data
- Configuration parameters

❌ **DON'T USE JSONB FOR:**
- Frequently queried fields (use regular columns + index)
- Critical business logic (use relational structure)
- Data that needs referential integrity
- Fields that require transactions across rows

---

### 8.4 PLM-ALIGNED AUDIT STRUCTURE

**Recommended Audit Fields:**

Add to critical tables:

```sql
ALTER TABLE parts 
  ADD COLUMN plm_id UUID,
  ADD COLUMN plm_revision VARCHAR(50),
  ADD COLUMN plm_sync_at TIMESTAMP;

ALTER TABLE processes 
  ADD COLUMN plm_id UUID,
  ADD COLUMN plm_revision VARCHAR(50),
  ADD COLUMN plm_effective_date DATE;

ALTER TABLE checkpointResults 
  ADD COLUMN change_record_id VARCHAR(100),
  ADD COLUMN approved_by_plm VARCHAR(100),
  ADD COLUMN baseline_id VARCHAR(100);
```

**Purpose:**
- Link manufacturing to PLM (Product Lifecycle Management)
- Track revisions and effective dates
- Support change records and approvals
- Enable traceability to engineering baselines

---

### 8.5 IMPLEMENTATION ROADMAP

**Phase 1: Foundation (Week 1-2)**
- [ ] Design new schema with JSONB columns
- [ ] Create migration scripts
- [ ] Set up staging environment
- [ ] Data validation tests

**Phase 2: Refactoring (Week 3-4)**
- [ ] Consolidate status fields
- [ ] Create junction tables for JSONB → relational
- [ ] Update ORM schema
- [ ] Write data migration logic

**Phase 3: Integration (Week 5-6)**
- [ ] Update API layer
- [ ] Update frontend queries
- [ ] Implement dual-write for parallel testing
- [ ] Validation and reconciliation

**Phase 4: Cutover (Week 7)**
- [ ] Final data sync
- [ ] Switch API to new schema
- [ ] Smoke tests
- [ ] Rollback plan ready

**Phase 5: Cleanup (Week 8)**
- [ ] Delete legacy tables
- [ ] Archive old migrations
- [ ] Performance tuning
- [ ] Documentation updates

---

## 9. EXECUTION SUMMARY

### Critical Insights

1. **Dual Status Fields Create Risk**
   - `parts.status` vs. `partStepInstances.status` both maintained
   - Risk of divergence under concurrent load
   - **Action:** Consolidate to single source of truth

2. **Denormalization Needs Monitoring**
   - `currentStepId` manually updated
   - Can lag behind actual execution
   - **Action:** Consider computed/materialized view

3. **JSONB for Flexibility**
   - Already used for skills, crew, events
   - Good fit for step payloads and QA context
   - **Action:** Expand strategically with proper indexing

4. **Legacy Tables Need Cleanup**
   - 7 deprecated tables still in schema
   - Block refactoring and add confusion
   - **Action:** Remove in Phase 1

5. **PLM Integration Ready**
   - UUID support for Supabase auth exists
   - Add PLM tracking fields
   - **Action:** Design PLM linking strategy

---

## 10. FILE REFERENCE INDEX

| Category | File | Key Lines | Purpose |
|----------|------|-----------|---------|
| **Schema** | [shared/schema.ts](shared/schema.ts) | All | Complete schema definition |
| **Migrations** | [drizzle/0000_calm_rick_jones.sql](drizzle/0000_calm_rick_jones.sql) | All | Initial schema DDL |
| **Auth** | [drizzle/0001_add_auth_user_id.sql](drizzle/0001_add_auth_user_id.sql) | All | Supabase auth integration |
| **Configuration** | [drizzle.config.ts](drizzle.config.ts) | All | Drizzle Kit config |
| **Database Layer** | [server/db.ts](server/db.ts) | All | DB initialization |
| **API Endpoints** | [server/index.ts](server/index.ts) | 273-1500+ | REST API implementation |
| **Client API** | [src/app/lib/api.ts](src/app/lib/api.ts) | All | Supabase client calls |
| **Seeding** | [server/seed.ts](server/seed.ts) | All | Data population |
| **Dashboard** | [src/app/components/DashboardView.tsx](src/app/components/DashboardView.tsx) | All | Main dashboard |
| **Process Flow** | [src/app/components/ProcessFlowView.tsx](src/app/components/ProcessFlowView.tsx) | All | Process visualization |
| **Inventory** | [src/app/components/ProcessTab.tsx](src/app/components/ProcessTab.tsx) | All | Inventory/kit management |

---

**Document Complete**  
**Next Phase:** Database Redesign Implementation  
**Status:** Ready for Refactoring Roadmap  

