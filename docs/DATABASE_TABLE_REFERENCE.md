# MES Database - Table-by-Table Specification

**Complete reference guide for all 28 tables in the MES schema**

---

## SUMMARY TABLE

| Table Name | Type | Active | Records | Risk | Primary Key | Key FK | Indexes |
|---|---|---|---|---|---|---|---|
| processes | Master | ✅ | ~35 | LOW | id | - | category |
| processSteps | Master | ✅ | ~1200 | LOW | id | process_id | process_id |
| controlCheckpoints | Master | ✅ | ~3500 | LOW | id | step_id | step_id |
| parts | Core | ✅ | ~5000+ | 🔴HIGH | id | process_id | status, priority, process_id, part_number |
| partStepInstances | Core | ✅ | ~50K+ | 🔴HIGH | id | part_id, step_id | part_id, step_id, status, mould_id |
| checkpointResults | Core | ✅ | ~100K+ | 🔴HIGH | id | instance_id, checkpoint_id | instance_id, qa_result |
| employees | Master | ✅ | ~50 | LOW | id | - | code, auth_user_id |
| supplyLots | Inventory | ✅ | ~50 | MEDIUM | id | - | state |
| supplyRequirements | Master | ✅ | ~1200 | LOW | id | step_id | step_id |
| kit_inventory | Inventory | ✅ | ~500+ | LOW | id | process_id | process_id, status, kit_type |
| resin_lot_inventory | Inventory | ✅ | ~100+ | LOW | id | - | - |
| resin_consumption | Audit | ✅ | ~1000+ | LOW | id | resin_lot_id, process_id | resin_lot_id, process_id |
| moulds | Resource | ✅ | ~10 | MEDIUM | id | - | - |
| mouldEvents | Audit | ✅ | ~100+ | LOW | id | mould_id | mould_id |
| batches | Resource | ✅ | ~100+ | MEDIUM | id | mould_id, step_id | - |
| batchParts | Link | ✅ | ~500+ | LOW | id | batch_id, part_id | batch_id, part_id |
| stateTransitions | Audit | ✅ | ~50K+ | LOW | id | instance_id | instance_id |
| shiftLogs | Audit | ✅ | ~1000+ | MEDIUM | id | instance_id | instance_id, shift_date |
| timelineEvents | Audit | ✅ | ~100K+ | LOW | id | part_id | part_id, occurred_at |
| evidenceFiles | Media | ✅ | ~10K+ | MEDIUM | id | result_id | result_id |
| employeeAssignments | Link | ✅ | ~5000+ | LOW | id | employee_id, instance_id | employee_id, instance_id |
| employeeStatusHistory | Audit | ✅ | ~500+ | LOW | id | employee_id | employee_id |
| material_master | Legacy | ❌ | - | DELETE | id | - | type, available |
| material_process_intent | Legacy | ❌ | - | DELETE | id | material_id, process_id | - |
| process_execution | Legacy | ❌ | - | DELETE | id | process_id | process_id |
| material_usage | Legacy | ❌ | - | DELETE | id | execution_id, material_id | execution_id, material_id |
| kits | Legacy | ❌ | - | DELETE | id | - | - |
| kitBalances | Legacy | ❌ | - | DELETE | id | kit_id | - |
| kitConsumption | Legacy | ❌ | - | DELETE | id | kit_id, instance_id | - |

---

## MASTER DATA TABLES

### 📋 processes

**Purpose:** Define manufacturing processes (workflows)

| Column | Type | Constraints | Nullable | Default | Index | FK |
|--------|------|-------------|----------|---------|-------|-----|
| `id` | serial | PRIMARY KEY | NO | - | ✓ | - |
| `processNumber` | integer | UNIQUE, NOT NULL | NO | - | - | - |
| `code` | varchar(20) | NOT NULL | NO | - | - | - |
| `name` | varchar(100) | NOT NULL | NO | - | - | - |
| `category` | varchar(20) | NOT NULL | NO | prefabricated | ✓ | - |
| `description` | text | - | YES | - | - | - |
| `createdAt` | timestamp | NOT NULL | NO | now() | - | - |

**Relationships:**
- 1→M to `processSteps`
- 1→M to `parts`
- 1→M to `kit_inventory`
- 1→M to `resin_consumption`

**Enums:**
- `category`: `inventory` | `prefabricated` | `moulding` | `finishing`

**Example Data:**
```
processNumber=10, code=INCOMING, name="Incoming"
processNumber=40, code=SPARBOOM-SF, name="Spar Boom - SF"
processNumber=210, code=SHELL-SF, name="Shell Suction Face"
```

**Notes:**
- Master data, rarely changes
- ~35 processes defined for blade manufacturing
- Safe to refactor

---

### 📋 processSteps

**Purpose:** Define sequential steps within a process

| Column | Type | Constraints | Nullable | Default | Index | FK |
|--------|------|-------------|----------|---------|-------|-----|
| `id` | serial | PRIMARY KEY | NO | - | ✓ | - |
| `processId` | integer | NOT NULL | NO | - | ✓ | processes.id |
| `stepNumber` | varchar(20) | NOT NULL | NO | - | - | - |
| `name` | varchar(100) | NOT NULL | NO | - | - | - |
| `sequence` | integer | NOT NULL | NO | - | - | - |
| `targetCycleTime` | integer | - | YES | - | - | - |
| `isInspection` | boolean | NOT NULL | NO | false | - | - |
| `isStorage` | boolean | NOT NULL | NO | false | - | - |
| `requiresMould` | boolean | NOT NULL | NO | false | - | - |
| `isBatchable` | boolean | NOT NULL | NO | false | - | - |
| `createdAt` | timestamp | NOT NULL | NO | now() | - | - |

**Relationships:**
- M→1 to `processes`
- 1→M to `controlCheckpoints`
- 1→M to `partStepInstances`
- 1→M to `supplyRequirements`
- 1→M to `batches`

**Example Data:**
```
processId=1, stepNumber=40.01, name="Resin Infusion", sequence=1, targetCycleTime=480
processId=1, stepNumber=40.02, name="Curing", sequence=2, targetCycleTime=1440, isStorage=true
```

**Notes:**
- Master data for control plans
- ~1200+ steps across all 35 processes
- Step numbers format: `PROCESS_NUMBER.STEP_SEQUENCE` (e.g., 40.01, 40.02)
- Safe to add JSONB payload column

---

### 📋 controlCheckpoints

**Purpose:** Quality checkpoints and gating criteria for steps

| Column | Type | Constraints | Nullable | Default | Index | FK |
|--------|------|-------------|----------|---------|-------|-----|
| `id` | serial | PRIMARY KEY | NO | - | ✓ | - |
| `stepId` | integer | NOT NULL | NO | - | ✓ | processSteps.id |
| `characteristic` | varchar(200) | NOT NULL | NO | - | - | - |
| `specification` | text | - | YES | - | - | - |
| `tolerance` | varchar(100) | - | YES | - | - | - |
| `measurementMethod` | varchar(200) | - | YES | - | - | - |
| `frequency` | varchar(100) | - | YES | - | - | - |
| `measuredBy` | varchar(50) | - | YES | - | - | - |
| `sequence` | integer | NOT NULL | NO | - | - | - |
| `isGating` | boolean | NOT NULL | NO | true | - | - |
| `createdAt` | timestamp | NOT NULL | NO | now() | - | - |

**Relationships:**
- M→1 to `processSteps`
- 1→M to `checkpointResults`

**Example Data:**
```
stepId=101, characteristic="Surface Finish", specification="Ra < 1.6µm", tolerance="±0.2", measuredBy="QA", isGating=true
stepId=101, characteristic="Dimensional", specification="Length 1000±5mm", tolerance="±5", measuredBy="Operator", isGating=false
```

**Notes:**
- ~3500+ checkpoints across all steps
- Gating checkpoints block step completion
- Non-gating are informational only
- measuredBy indicates who must perform check (QA, Operator, etc.)

---

### 📋 employees

**Purpose:** Employee master data

| Column | Type | Constraints | Nullable | Default | Index | FK |
|--------|------|-------------|----------|---------|-------|-----|
| `id` | serial | PRIMARY KEY | NO | - | ✓ | - |
| `employeeCode` | varchar(20) | UNIQUE, NOT NULL | NO | - | ✓ | - |
| `name` | varchar(100) | NOT NULL | NO | - | - | - |
| `role` | varchar(50) | NOT NULL | NO | - | - | - |
| `department` | varchar(50) | - | YES | - | - | - |
| `skills` | jsonb | - | YES | - | - | - |
| `email` | varchar(100) | - | YES | - | - | - |
| `phone` | varchar(20) | - | YES | - | - | - |
| `isActive` | boolean | NOT NULL | NO | true | - | - |
| `currentShift` | varchar(20) | - | YES | - | - | - |
| `auth_user_id` | uuid | UNIQUE | YES | - | ✓ | - |
| `createdAt` | timestamp | NOT NULL | NO | now() | - | - |

**Relationships:**
- 1→M to `employeeAssignments`
- 1→M to `employeeStatusHistory`
- 1→M to `partStepInstances` (assignedEmployee)
- 1→M to `mouldEvents` (recordedBy)
- 1→M to `shiftLogs` (recordedBy)
- 1→M to `stateTransitions` (triggeredBy)
- 1→M to `timelineEvents` (recordedBy)

**JSONB Structure (skills):**
```json
["Layer build up", "De-bulking", "C-Scan"]
```

**Example Data:**
```
employeeCode=EMP001, name="Rajesh Kumar", role="Operator", skills=["Layer build up", "De-bulking"], auth_user_id=UUID
employeeCode=EMP003, name="Amit Patel", role="QA Inspector", skills=["C-Scan", "Final Inspection"]
```

**Notes:**
- ~50 employees
- ⚠️ `skills` JSONB should be refactored to junction table
- `auth_user_id` links to Supabase auth.users.id (NEW)
- Support for Supabase authentication

---

### 📋 supplyRequirements

**Purpose:** Material/supply requirements for steps

| Column | Type | Constraints | Nullable | Default | Index | FK |
|--------|------|-------------|----------|---------|-------|-----|
| `id` | serial | PRIMARY KEY | NO | - | ✓ | - |
| `stepId` | integer | NOT NULL | NO | - | ✓ | processSteps.id |
| `materialType` | varchar(100) | NOT NULL | NO | - | - | - |
| `quantityRequired` | decimal(10,2) | NOT NULL | NO | - | - | - |
| `unit` | varchar(20) | NOT NULL | NO | - | - | - |
| `isMandatory` | boolean | NOT NULL | NO | true | - | - |
| `createdAt` | timestamp | NOT NULL | NO | now() | - | - |

**Relationships:**
- M→1 to `processSteps`

**Example Data:**
```
stepId=101, materialType="Carbon Fiber Prepreg", quantityRequired=50.00, unit="m2", isMandatory=true
stepId=101, materialType="Structural Adhesive", quantityRequired=2.50, unit="kg", isMandatory=true
```

**Notes:**
- ~1200+ requirements
- `isMandatory=true` gates step start
- `isMandatory=false` is optional/informational

---

## CORE EXECUTION TABLES

### 🎯 parts

**Purpose:** Prefabricated blade instances being manufactured

| Column | Type | Constraints | Nullable | Default | Index | FK |
|--------|------|-------------|----------|---------|-------|-----|
| `id` | serial | PRIMARY KEY | NO | - | ✓ | - |
| `partNumber` | varchar(50) | UNIQUE, NOT NULL | NO | - | ✓ | - |
| `processId` | integer | NOT NULL | NO | - | ✓ | processes.id |
| `bladeType` | varchar(100) | - | YES | - | - | - |
| `status` | varchar(20) | NOT NULL | NO | in_progress | ✓ | - |
| `priority` | varchar(20) | NOT NULL | NO | normal | ✓ | - |
| `entryReason` | varchar(30) | - | YES | normal | - | - |
| `entryStepId` | integer | - | YES | - | - | processSteps.id |
| `entryNotes` | text | - | YES | - | - | - |
| `currentStepId` | integer | - | YES | - | - | processSteps.id |
| `currentMouldId` | integer | - | YES | - | - | moulds.id |
| `currentBatchId` | integer | - | YES | - | - | batches.id |
| `blockedReason` | text | - | YES | - | - | - |
| `blockedAt` | timestamp | - | YES | - | - | - |
| `createdAt` | timestamp | NOT NULL | NO | now() | - | - |
| `updatedAt` | timestamp | NOT NULL | NO | now() | - | - |

**Relationships:**
- M→1 to `processes`
- 1→M to `partStepInstances`
- 1→M to `reworkEvents`
- 1→M to `timelineEvents`
- M→1 to `processSteps` (currentStep)
- M→1 to `moulds` (currentMould)
- M→1 to `batches` (currentBatch)

**Enums:**
- `status`: `in_progress` | `completed` | `blocked` | `rework`
- `priority`: `normal` | `high` | `critical`
- `entryReason`: `normal` | `rework` | `trial` | `external_operation` | `resumed`

**Example Data:**
```
partNumber=40-2024-0001, processId=1, bladeType="Spar Boom SF", status="in_progress", priority="high", currentStepId=5
```

**⚠️ ISSUES:**
- `status` duplicates overall status of step instances
- `currentStepId` manually maintained (denormalized)
- `blockedReason` duplicated with `partStepInstances.blockedReason`

**Notes:**
- ~5000+ parts in system (active and completed)
- Part number format: `{PROCESS_NUMBER}-{YEAR}-{SEQUENCE}` (e.g., 40-2024-0001)
- HIGH RISK table - production data, status redundancy

---

### 🎯 partStepInstances

**Purpose:** Execution record for each part at each step

| Column | Type | Constraints | Nullable | Default | Index | FK |
|--------|------|-------------|----------|---------|-------|-----|
| `id` | serial | PRIMARY KEY | NO | - | ✓ | - |
| `partId` | integer | NOT NULL | NO | - | ✓ | parts.id |
| `stepId` | integer | NOT NULL | NO | - | ✓ | processSteps.id |
| `status` | varchar(20) | NOT NULL | NO | planned | ✓ | - |
| `previousStatus` | varchar(20) | - | YES | - | - | - |
| `priority` | varchar(20) | - | YES | normal | - | - |
| `mouldId` | integer | - | YES | - | ✓ | moulds.id |
| `batchId` | integer | - | YES | - | - | batches.id |
| `startedAt` | timestamp | - | YES | - | - | - |
| `endedAt` | timestamp | - | YES | - | - | - |
| `plannedStartAt` | timestamp | - | YES | - | - | - |
| `elapsedMinutes` | integer | NOT NULL | NO | 0 | - | - |
| `waitingReason` | text | - | YES | - | - | - |
| `blockedReason` | text | - | YES | - | - | - |
| `breakdownReason` | text | - | YES | - | - | - |
| `pauseReason` | text | - | YES | - | - | - |
| `lastStateChangeAt` | timestamp | - | YES | - | - | - |
| `isDeferred` | boolean | NOT NULL | NO | false | - | - |
| `deferredReason` | text | - | YES | - | - | - |
| `deferredOriginalTime` | timestamp | - | YES | - | - | - |
| `qaApproved` | boolean | NOT NULL | NO | false | - | - |
| `qaApprovedAt` | timestamp | - | YES | - | - | - |
| `qaApprovedBy` | integer | - | YES | - | - | employees.id |
| `assignedEmployeeId` | integer | - | YES | - | - | employees.id |
| `notes` | text | - | YES | - | - | - |
| `createdAt` | timestamp | NOT NULL | NO | now() | - | - |

**Relationships:**
- M→1 to `parts`
- M→1 to `processSteps`
- M→1 to `moulds`
- M→1 to `batches`
- 1→M to `checkpointResults`
- 1→M to `employeeAssignments`
- 1→M to `stateTransitions`
- 1→M to `shiftLogs`
- 1→M to `timelineEvents`

**Enums:**
- `status`: `planned` | `active` | `paused` | `waiting` | `blocked` | `breakdown` | `rework` | `completed`

**Example Data:**
```
partId=1, stepId=5, status="active", startedAt=2024-01-15T09:00:00Z, assignedEmployeeId=1, mouldId=1
partId=1, stepId=5, status="blocked", blockedReason="Material shortage", blockedAt=2024-01-15T10:30:00Z
```

**⚠️ ISSUES:**
- Dual status with `parts.status`
- `blockedReason` duplicated with `parts.blockedReason`
- `qaApproved` duplicates checkpoint-level QA results

**Notes:**
- ~50K+ instances (5000 parts × 8 steps average)
- ★ CORE execution table - HIGH RISK
- State transitions recorded in separate table
- Ready for JSONB payload enhancement

---

### 🎯 checkpointResults

**Purpose:** QA checkpoint measurements and approvals

| Column | Type | Constraints | Nullable | Default | Index | FK |
|--------|------|-------------|----------|---------|-------|-----|
| `id` | serial | PRIMARY KEY | NO | - | ✓ | - |
| `instanceId` | integer | NOT NULL | NO | - | ✓ | partStepInstances.id |
| `checkpointId` | integer | NOT NULL | NO | - | ✓ | controlCheckpoints.id |
| `status` | varchar(20) | NOT NULL | NO | pending | - | - |
| `qaResult` | varchar(20) | - | YES | pending | ✓ | - |
| `measuredValue` | text | - | YES | - | - | - |
| `measuredById` | integer | - | YES | - | - | employees.id |
| `measuredAt` | timestamp | - | YES | - | - | - |
| `qaConfirmedById` | integer | - | YES | - | - | employees.id |
| `qaConfirmedAt` | timestamp | - | YES | - | - | - |
| `deviationNumber` | varchar(50) | - | YES | - | - | - |
| `deviationApprovedById` | integer | - | YES | - | - | employees.id |
| `deviationApprovedAt` | timestamp | - | YES | - | - | - |
| `isGatePassed` | boolean | NOT NULL | NO | false | - | - |
| `notes` | text | - | YES | - | - | - |
| `createdAt` | timestamp | NOT NULL | NO | now() | - | - |

**Relationships:**
- M→1 to `partStepInstances`
- M→1 to `controlCheckpoints`
- 1→M to `evidenceFiles`
- M→1 to `employees` (multiple references)

**Enums:**
- `status`: `pending` | `measured` | `confirmed`
- `qaResult`: `pending` | `pass` | `conditional_pass` | `fail`

**Example Data:**
```
instanceId=101, checkpointId=5, qaResult="pass", measuredValue="1.45µm", measuredById=3, measuredAt=2024-01-15T09:30:00Z, isGatePassed=true
instanceId=101, checkpointId=5, qaResult="conditional_pass", deviationNumber="NCR-2024-001", deviationApprovedBy=4, isGatePassed=true
```

**⚠️ ISSUES:**
- Three QA status fields: `qaResult` + `qaApproved` (partStepInstances) + `isGatePassed`
- Unclear semantics of each field
- Deviation workflow fragmented

**Notes:**
- ~100K+ results (50K instances × 2 checkpoints average)
- Gating checkpoints block step completion
- Non-gating are historical/informational
- HIGH RISK audit table

---

## INVENTORY TABLES

### 📦 kit_inventory (NEW)

**Purpose:** Process-bound material kits for prefabrication

| Column | Type | Constraints | Nullable | Default | Index | FK |
|--------|------|-------------|----------|---------|-------|-----|
| `id` | serial | PRIMARY KEY | NO | - | ✓ | - |
| `kit_code` | varchar(50) | UNIQUE, NOT NULL | NO | - | - | - |
| `process_id` | integer | NOT NULL | NO | - | ✓ | processes.id |
| `kit_type` | varchar(20) | NOT NULL | NO | - | ✓ | - |
| `status` | varchar(20) | NOT NULL | NO | AVAILABLE | ✓ | - |
| `photo_url` | text | NOT NULL | NO | - | - | - |
| `created_by` | varchar(100) | NOT NULL | NO | - | - | - |
| `created_at` | timestamp | NOT NULL | NO | now() | - | - |
| `consumed_by` | varchar(100) | - | YES | - | - | - |
| `consumed_at` | timestamp | - | YES | - | - | - |
| `process_instance_id` | integer | - | YES | - | - | - |

**Relationships:**
- M→1 to `processes`

**Enums:**
- `kit_type`: `KIT` | `GLASS`
- `status`: `AVAILABLE` | `CONSUMED`

**Example Data:**
```
kit_code="KIT-SBSF-20260112-001", process_id=1, kit_type="KIT", status="AVAILABLE", photo_url="s3://bucket/kit_001.jpg"
kit_code="KIT-SBSF-20260112-002", process_id=1, kit_type="GLASS", status="CONSUMED", consumed_by="Rajesh", consumed_at=2024-01-15T10:00:00Z
```

**Notes:**
- NEW table for process-driven inventory
- Kit code generated: `KIT-{PROCESS_CODE}-{YYYYMMDD}-{SEQ}`
- Mandatory photo at creation
- Process-bound (one kit per process category)
- LOW RISK - new table, fully refactorable

---

### 📦 resin_lot_inventory (NEW)

**Purpose:** Shared resin pool across all processes

| Column | Type | Constraints | Nullable | Default | Index | FK |
|--------|------|-------------|----------|---------|-------|-----|
| `id` | serial | PRIMARY KEY | NO | - | ✓ | - |
| `resin_code` | varchar(50) | UNIQUE, NOT NULL | NO | - | - | - |
| `available_count` | integer | NOT NULL | NO | 1 | ✓ | - |
| `photo_url` | text | NOT NULL | NO | - | - | - |
| `created_by` | varchar(100) | NOT NULL | NO | - | - | - |
| `created_at` | timestamp | NOT NULL | NO | now() | - | - |

**Relationships:**
- 1→M to `resin_consumption`

**Example Data:**
```
resin_code="RESIN-20260112-001", available_count=10, photo_url="s3://bucket/resin_001.jpg", created_by="Supervisor"
```

**Notes:**
- NEW table for shared resin inventory
- Resin code generated: `RESIN-{YYYYMMDD}-{SEQ}`
- Count-based consumption (integer decrements)
- Shared across all processes (not process-bound)
- LOW RISK - new table, fully refactorable

---

### 📦 resin_consumption (NEW)

**Purpose:** Audit trail for resin usage

| Column | Type | Constraints | Nullable | Default | Index | FK |
|--------|------|-------------|----------|---------|-------|-----|
| `id` | serial | PRIMARY KEY | NO | - | ✓ | - |
| `resin_lot_id` | integer | NOT NULL | NO | - | ✓ | resin_lot_inventory.id |
| `process_id` | integer | NOT NULL | NO | - | ✓ | processes.id |
| `process_instance_id` | integer | - | YES | - | - | - |
| `consumed_by` | varchar(100) | NOT NULL | NO | - | - | - |
| `consumed_at` | timestamp | NOT NULL | NO | now() | - | - |

**Relationships:**
- M→1 to `resin_lot_inventory`
- M→1 to `processes`

**Example Data:**
```
resin_lot_id=1, process_id=1, consumed_by="Rajesh", consumed_at=2024-01-15T10:00:00Z
```

**Notes:**
- NEW table for consumption tracking
- ⚠️ `process_instance_id` is integer (should be FK or NULL)
- Enables resin traceability
- LOW RISK - new table

---

### 📦 supplyLots

**Purpose:** Material stock and inventory

| Column | Type | Constraints | Nullable | Default | Index | FK |
|--------|------|-------------|----------|---------|-------|-----|
| `id` | serial | PRIMARY KEY | NO | - | ✓ | - |
| `lotNumber` | varchar(50) | UNIQUE, NOT NULL | NO | - | - | - |
| `materialType` | varchar(100) | NOT NULL | NO | - | - | - |
| `quantity` | decimal(10,2) | NOT NULL | NO | - | - | - |
| `unit` | varchar(20) | NOT NULL | NO | - | - | - |
| `state` | varchar(20) | NOT NULL | NO | ready | ✓ | - |
| `qaStatus` | varchar(20) | - | YES | - | - | - |
| `rejectionReason` | text | - | YES | - | - | - |
| `curingEndTime` | timestamp | - | YES | - | - | - |
| `expiryDate` | timestamp | - | YES | - | - | - |
| `receivedAt` | timestamp | NOT NULL | NO | now() | - | - |
| `createdAt` | timestamp | NOT NULL | NO | now() | - | - |

**Relationships:**
- 1→M to `supplyRequirements`

**Enums:**
- `state`: `ready` | `usable` | `qa_pending` | `rejected`

**Example Data:**
```
lotNumber="CF-2024-001", materialType="Carbon Fiber Prepreg", quantity=500.00, unit="m2", state="usable", expiryDate=2025-01-15
lotNumber="ADH-2024-001", materialType="Structural Adhesive", quantity=50.00, unit="kg", state="ready", curingEndTime=2024-01-16T18:00:00Z
```

**Notes:**
- ~50 active lots
- States flow: `ready` → `usable` (or `qa_pending` → `usable` or `rejected`)
- Used for supply gate checking before step start
- MEDIUM RISK - has active inventory

---

## RESOURCE TABLES

### 🔧 moulds

**Purpose:** Equipment/mould master data

| Column | Type | Constraints | Nullable | Default | Index | FK |
|--------|------|-------------|----------|---------|-------|-----|
| `id` | serial | PRIMARY KEY | NO | - | ✓ | - |
| `code` | varchar(20) | UNIQUE, NOT NULL | NO | - | - | - |
| `name` | varchar(100) | NOT NULL | NO | - | - | - |
| `status` | varchar(20) | NOT NULL | NO | available | - | - |
| `currentPartId` | integer | - | YES | - | - | parts.id |
| `lastBreakdownAt` | timestamp | - | YES | - | - | - |
| `totalDowntimeMinutes` | integer | NOT NULL | NO | 0 | - | - |
| `createdAt` | timestamp | NOT NULL | NO | now() | - | - |

**Relationships:**
- 1→M to `mouldEvents`
- 1→M to `batches`
- 1→M to `partStepInstances`

**Enums:**
- `status`: `available` | `in_use` | `breakdown` | `maintenance`

**Example Data:**
```
code="M1", name="Mould 1 - Primary Shell", status="available", totalDowntimeMinutes=240
code="M2", name="Mould 2 - Secondary Shell", status="breakdown", lastBreakdownAt=2024-01-15T14:00:00Z
```

**Notes:**
- ~10 moulds
- MEDIUM RISK - active equipment
- `currentPartId` for quick lookup of what's in mould

---

### 🔧 mouldEvents

**Purpose:** Equipment breakdown and maintenance history

| Column | Type | Constraints | Nullable | Default | Index | FK |
|--------|------|-------------|----------|---------|-------|-----|
| `id` | serial | PRIMARY KEY | NO | - | ✓ | - |
| `mouldId` | integer | NOT NULL | NO | - | ✓ | moulds.id |
| `eventType` | varchar(20) | NOT NULL | NO | - | - | - |
| `reason` | text | - | YES | - | - | - |
| `startedAt` | timestamp | NOT NULL | NO | now() | - | - |
| `endedAt` | timestamp | - | YES | - | - | - |
| `downtimeMinutes` | integer | - | YES | - | - | - |
| `recordedById` | integer | - | YES | - | - | employees.id |
| `createdAt` | timestamp | NOT NULL | NO | now() | - | - |

**Relationships:**
- M→1 to `moulds`
- M→1 to `employees`

**Enums:**
- `eventType`: `breakdown` | `maintenance` | `repair`

**Example Data:**
```
mouldId=1, eventType="breakdown", reason="Crack in mould surface", startedAt=2024-01-15T14:00:00Z, endedAt=2024-01-15T16:30:00Z, downtimeMinutes=150
```

**Notes:**
- ~100+ events
- Enables OEE tracking
- LOW RISK audit table

---

### 🔧 batches

**Purpose:** Batch processing records

| Column | Type | Constraints | Nullable | Default | Index | FK |
|--------|------|-------------|----------|---------|-------|-----|
| `id` | serial | PRIMARY KEY | NO | - | ✓ | - |
| `batchNumber` | varchar(50) | UNIQUE, NOT NULL | NO | - | - | - |
| `operationType` | varchar(50) | NOT NULL | NO | - | - | - |
| `status` | varchar(20) | NOT NULL | NO | active | - | - |
| `mouldId` | integer | - | YES | - | - | moulds.id |
| `stepId` | integer | - | YES | - | - | processSteps.id |
| `startedAt` | timestamp | - | YES | - | - | - |
| `endedAt` | timestamp | - | YES | - | - | - |
| `notes` | text | - | YES | - | - | - |
| `createdAt` | timestamp | NOT NULL | NO | now() | - | - |

**Relationships:**
- M→1 to `moulds`
- M→1 to `processSteps`
- 1→M to `batchParts`

**Enums:**
- `status`: `active` | `completed` | `cancelled`

**Example Data:**
```
batchNumber="BATCH-2024-0001", operationType="Moulding", status="active", mouldId=1, stepId=15, startedAt=2024-01-15T09:00:00Z
```

**Notes:**
- ~100+ batches
- Links multiple parts for batch operations
- MEDIUM RISK - may have active batches

---

### 🔧 batchParts

**Purpose:** N:M relationship between batches and parts

| Column | Type | Constraints | Nullable | Default | Index | FK |
|--------|------|-------------|----------|---------|-------|-----|
| `id` | serial | PRIMARY KEY | NO | - | ✓ | - |
| `batchId` | integer | NOT NULL | NO | - | ✓ | batches.id |
| `partId` | integer | NOT NULL | NO | - | ✓ | parts.id |
| `addedAt` | timestamp | NOT NULL | NO | now() | - | - |

**Relationships:**
- M→1 to `batches`
- M→1 to `parts`

**Example Data:**
```
batchId=1, partId=10, addedAt=2024-01-15T09:00:00Z
batchId=1, partId=11, addedAt=2024-01-15T09:00:00Z
```

**Notes:**
- ~500+ records
- Simple join table
- LOW RISK

---

## AUDIT & HISTORY TABLES

### 📊 stateTransitions

**Purpose:** Audit trail of execution state changes

| Column | Type | Constraints | Nullable | Default | Index | FK |
|--------|------|-------------|----------|---------|-------|-----|
| `id` | serial | PRIMARY KEY | NO | - | ✓ | - |
| `instanceId` | integer | NOT NULL | NO | - | ✓ | partStepInstances.id |
| `fromState` | varchar(20) | - | YES | - | - | - |
| `toState` | varchar(20) | NOT NULL | NO | - | - | - |
| `reason` | text | - | YES | - | - | - |
| `triggeredById` | integer | - | YES | - | - | employees.id |
| `triggeredAt` | timestamp | NOT NULL | NO | now() | - | - |
| `isAutomatic` | boolean | NOT NULL | NO | false | - | - |

**Relationships:**
- M→1 to `partStepInstances`
- M→1 to `employees`

**Example Data:**
```
instanceId=101, fromState="planned", toState="active", reason="Step started", triggeredById=3, triggeredAt=2024-01-15T09:00:00Z
instanceId=101, fromState="active", toState="paused", reason="Equipment breakdown", triggeredById=1, triggeredAt=2024-01-15T10:30:00Z, isAutomatic=false
```

**Notes:**
- ~50K+ transitions (50K instances × 1-2 transitions average)
- Immutable audit trail
- Shows complete state machine history
- LOW RISK - append-only

---

### 📊 shiftLogs

**Purpose:** Shift-based execution tracking

| Column | Type | Constraints | Nullable | Default | Index | FK |
|--------|------|-------------|----------|---------|-------|-----|
| `id` | serial | PRIMARY KEY | NO | - | ✓ | - |
| `instanceId` | integer | NOT NULL | NO | - | ✓ | partStepInstances.id |
| `shiftCode` | varchar(20) | NOT NULL | NO | - | - | - |
| `shiftDate` | timestamp | NOT NULL | NO | - | ✓ | - |
| `startTime` | timestamp | NOT NULL | NO | - | - | - |
| `endTime` | timestamp | - | YES | - | - | - |
| `crewMembers` | jsonb | - | YES | - | - | - |
| `elapsedMinutes` | integer | NOT NULL | NO | 0 | - | - |
| `handoverNotes` | text | - | YES | - | - | - |
| `isOfflineEntry` | boolean | NOT NULL | NO | false | - | - |
| `offlineReason` | text | - | YES | - | - | - |
| `recordedById` | integer | - | YES | - | - | employees.id |
| `createdAt` | timestamp | NOT NULL | NO | now() | - | - |

**Relationships:**
- M→1 to `partStepInstances`
- 1→M to `employeeAssignments`
- M→1 to `employees`

**JSONB Structure (crewMembers):**
```json
[1, 3, 5]  // Array of employee IDs
```

**Enums:**
- `shiftCode`: `A` | `B` | `C`

**Example Data:**
```
instanceId=101, shiftCode="A", shiftDate=2024-01-15, startTime=2024-01-15T06:00:00Z, endTime=2024-01-15T14:00:00Z, crewMembers=[1,3], elapsedMinutes=480
```

**⚠️ ISSUES:**
- `crewMembers` JSONB should be refactored to junction table
- Cannot efficiently query by crew member

**Notes:**
- ~1000+ shift logs
- MEDIUM RISK - has active data
- ⚠️ Refactor crewMembers to `shift_crew` junction table

---

### 📊 timelineEvents

**Purpose:** Complete history of all events for a part

| Column | Type | Constraints | Nullable | Default | Index | FK |
|--------|------|-------------|----------|---------|-------|-----|
| `id` | serial | PRIMARY KEY | NO | - | ✓ | - |
| `partId` | integer | NOT NULL | NO | - | ✓ | parts.id |
| `eventType` | varchar(50) | NOT NULL | NO | - | - | - |
| `eventData` | jsonb | - | YES | - | - | - |
| `instanceId` | integer | - | YES | - | - | partStepInstances.id |
| `stepId` | integer | - | YES | - | - | processSteps.id |
| `description` | text | - | YES | - | - | - |
| `recordedById` | integer | - | YES | - | - | employees.id |
| `occurredAt` | timestamp | NOT NULL | NO | now() | ✓ | - |
| `createdAt` | timestamp | NOT NULL | NO | now() | - | - |

**Relationships:**
- M→1 to `parts`
- M→1 to `partStepInstances`
- M→1 to `processSteps`
- M→1 to `employees`

**JSONB Structure (eventData):**
```json
{
  "from_step": 3,
  "to_step": 2,
  "reason": "Quality failure",
  "defects": ["crack", "warping"]
}
```

**Example Data:**
```
partId=1, eventType="step_started", eventData={"stepId": 5, "operator": "Rajesh"}, instanceId=101, occurredAt=2024-01-15T09:00:00Z
partId=1, eventType="rework_initiated", eventData={"from_step": 5, "to_step": 3, "reason": "Dimension out of spec"}, occurredAt=2024-01-15T11:00:00Z
```

**Notes:**
- ~100K+ events
- Append-only event log
- Flexible JSONB structure for different event types
- LOW RISK - immutable history

---

### 📊 employeeStatusHistory

**Purpose:** Employee availability/status history

| Column | Type | Constraints | Nullable | Default | Index | FK |
|--------|------|-------------|----------|---------|-------|-----|
| `id` | serial | PRIMARY KEY | NO | - | ✓ | - |
| `employeeId` | integer | NOT NULL | NO | - | ✓ | employees.id |
| `status` | varchar(20) | NOT NULL | NO | - | - | - |
| `reason` | text | - | YES | - | - | - |
| `recordedAt` | timestamp | NOT NULL | NO | now() | - | - |

**Relationships:**
- M→1 to `employees`

**Example Data:**
```
employeeId=1, status="on_leave", reason="Annual leave", recordedAt=2024-01-15T08:00:00Z
employeeId=1, status="active", reason="Returned from leave", recordedAt=2024-01-22T08:00:00Z
```

**Notes:**
- ~500+ records
- LOW RISK - audit only

---

## ATTACHMENT TABLES

### 📸 evidenceFiles

**Purpose:** QA evidence (photos, documents) storage

| Column | Type | Constraints | Nullable | Default | Index | FK |
|--------|------|-------------|----------|---------|-------|-----|
| `id` | serial | PRIMARY KEY | NO | - | ✓ | - |
| `resultId` | integer | NOT NULL | NO | - | ✓ | checkpointResults.id |
| `storageKey` | varchar(500) | NOT NULL | NO | - | - | - |
| `fileName` | varchar(255) | NOT NULL | NO | - | - | - |
| `fileType` | varchar(50) | - | YES | - | - | - |
| `fileSize` | integer | - | YES | - | - | - |
| `capturedById` | integer | - | YES | - | - | employees.id |
| `capturedAt` | timestamp | NOT NULL | NO | now() | - | - |
| `createdAt` | timestamp | NOT NULL | NO | now() | - | - |

**Relationships:**
- M→1 to `checkpointResults`
- M→1 to `employees`

**Example Data:**
```
resultId=501, storageKey="s3://evidence-bucket/part-001-checkpoint-5-20240115.jpg", fileName="part-001-checkpoint-5.jpg", fileType="jpg", fileSize=2048000, capturedById=3, capturedAt=2024-01-15T09:30:00Z
```

**Notes:**
- ~10K+ files
- Storage in cloud (S3, Supabase Storage)
- storageKey points to cloud object
- MEDIUM RISK - has active attachments

---

## LINKING TABLES

### 👥 employeeAssignments

**Purpose:** Link employees to step executions

| Column | Type | Constraints | Nullable | Default | Index | FK |
|--------|------|-------------|----------|---------|-------|-----|
| `id` | serial | PRIMARY KEY | NO | - | ✓ | - |
| `employeeId` | integer | NOT NULL | NO | - | ✓ | employees.id |
| `instanceId` | integer | - | YES | - | ✓ | partStepInstances.id |
| `shiftLogId` | integer | - | YES | - | - | shiftLogs.id |
| `role` | varchar(50) | - | YES | - | - | - |
| `status` | varchar(20) | NOT NULL | NO | active | - | - |
| `startedAt` | timestamp | NOT NULL | NO | now() | - | - |
| `endedAt` | timestamp | - | YES | - | - | - |
| `createdAt` | timestamp | NOT NULL | NO | now() | - | - |

**Relationships:**
- M→1 to `employees`
- M→1 to `partStepInstances`
- M→1 to `shiftLogs`

**Example Data:**
```
employeeId=1, instanceId=101, role="Operator", status="active", startedAt=2024-01-15T09:00:00Z, endedAt=2024-01-15T17:00:00Z
```

**Notes:**
- ~5000+ assignments
- Links employee to specific step execution
- LOW RISK - simple linking

---

## LEGACY TABLES (DEPRECATED)

### ❌ material_master
**Status:** DEPRECATED - Old material system
- Not used in current implementation
- Replaced by `supplyLots`

### ❌ material_process_intent
**Status:** DEPRECATED - Old process linking
- Not used in current implementation

### ❌ process_execution
**Status:** DEPRECATED - Old execution tracking
- Not used in current implementation
- Replaced by `partStepInstances`

### ❌ material_usage
**Status:** DEPRECATED - Old consumption tracking
- Not used in current implementation
- Replaced by `resin_consumption`

### ❌ kits
**Status:** DEPRECATED - Old kit system
- Not used in current implementation
- Replaced by `kit_inventory`

### ❌ kitBalances
**Status:** DEPRECATED - Old balance tracking
- Not used in current implementation

### ❌ kitConsumption
**Status:** DEPRECATED - Old consumption tracking
- Not used in current implementation
- Replaced by `kit_inventory.status` tracking

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| **Total Tables** | 28 |
| **Active Tables** | 21 |
| **Legacy Tables** | 7 |
| **Master Data Tables** | 4 |
| **Execution Tables** | 4 |
| **Inventory Tables** | 5 |
| **Equipment Tables** | 2 |
| **Audit Tables** | 4 |
| **Media Tables** | 1 |
| **Linking Tables** | 3 |
| **Estimated Row Counts** | 200K+ |
| **Indexes** | 28 |
| **Foreign Keys** | 50+ |
| **JSONB Columns** | 5 (should refactor 3) |
| **Denormalized Fields** | 3 (should monitor) |

---

**Document Complete**  
**Version:** 1.0  
**Last Updated:** 2026-01-15

