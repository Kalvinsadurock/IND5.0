# Process-Driven Inventory Schema

## Overview
This document explains the redesigned inventory schema that enforces a **process-centric MES architecture**.

## Key Changes from Previous Design

### What Changed
1. **Removed**: Generic `material_master` table (was not process-specific)
2. **Removed**: `material_process_intent` (tried to add process context post-creation)
3. **Removed**: `process_execution` and `material_usage` (old material tracking)
4. **Added**: `kit_inventory` table with REQUIRED `process_id` foreign key
5. **Added**: `resin_lot_inventory` table for shared resin tracking
6. **Added**: `resin_consumption` table for audit trail

### Why This Matters
- **Kits are process-specific**: One physical kit belongs to ONE process. This is enforced at the database level (NOT just the UI)
- **Resin is shared**: One resin lot can be used across multiple processes. A count tracks availability
- **No post-hoc bindings**: You can't create a kit and then decide which process it's for later. Process ID is REQUIRED at creation

## New Tables

### kit_inventory
**Purpose**: Tracks individual material and glass kits that are bound to specific processes

**Columns**:
```
id: INTEGER PRIMARY KEY
kit_code: TEXT UNIQUE NOT NULL          -- Format: KIT-{PROCESS_CODE}-{YYYYMMDD}-{SEQ}
process_id: INTEGER NOT NULL FK         -- REQUIRED: Which process this kit belongs to
kit_type: TEXT NOT NULL                 -- 'KIT' (material) or 'GLASS'
status: TEXT NOT NULL                   -- 'AVAILABLE' or 'CONSUMED'
photo_url: TEXT NOT NULL                -- Stored in Supabase: kit-photos/{kit_id}.jpg
created_by: TEXT NOT NULL               -- User ID of kit creator
created_at: TIMESTAMP NOT NULL
consumed_by: TEXT                       -- User ID who consumed it (if status = CONSUMED)
consumed_at: TIMESTAMP                  -- When it was consumed
process_instance_id: INTEGER            -- Optional: Which manufacturing run used it
```

**Key Constraints**:
- `process_id` is NOT NULL and has FK constraint to `processes(id)`
- This means: **A kit MUST belong to exactly one process, period**
- `kit_code` is unique (no duplicate codes)

**Example Data**:
```
id=1, kit_code='KIT-SBSF-20260112-001', process_id=5, kit_type='KIT', status='AVAILABLE', ...
id=2, kit_code='KIT-SBSF-20260112-002', process_id=5, kit_type='KIT', status='CONSUMED', ...
id=3, kit_code='GLASS-SBSF-20260112-001', process_id=5, kit_type='GLASS', status='AVAILABLE', ...
```

### resin_lot_inventory
**Purpose**: Tracks shared resin lots. One resin lot can be consumed by multiple processes.

**Columns**:
```
id: INTEGER PRIMARY KEY
resin_code: TEXT UNIQUE NOT NULL        -- Format: RESIN-{YYYYMMDD}-{SEQ}
available_count: INTEGER NOT NULL       -- How many units remaining (starts at 1)
photo_url: TEXT NOT NULL                -- Stored in Supabase: resin-photos/{id}.jpg
created_by: TEXT NOT NULL               -- User ID of resin creator
created_at: TIMESTAMP NOT NULL
```

**Key Constraints**:
- NO `process_id` (resin is NOT tied to a specific process)
- `available_count` tracks quantity (each consume decrements by 1)
- `resin_code` is unique

**Example Data**:
```
id=1, resin_code='RESIN-20260112-001', available_count=1, created_by='alice', ...
id=2, resin_code='RESIN-20260112-002', available_count=3, created_by='bob', ...
(Process 5 consumed 1 unit from lot 2, so available_count was decremented)
```

### resin_consumption (Audit Trail)
**Purpose**: Logs every consumption of resin for traceability and auditing

**Columns**:
```
id: INTEGER PRIMARY KEY
resin_lot_id: INTEGER NOT NULL FK       -- Which resin lot was consumed
process_id: INTEGER NOT NULL FK         -- Which process consumed it
process_instance_id: INTEGER            -- Optional: Which manufacturing run
consumed_by: TEXT NOT NULL              -- User ID who consumed it
consumed_at: TIMESTAMP NOT NULL         -- When it was consumed
```

**Key Constraints**:
- `resin_lot_id` has FK to `resin_lot_inventory(id)`
- `process_id` has FK to `processes(id)`
- This is append-only (never delete, only insert for audit trail)

**Example Data**:
```
id=1, resin_lot_id=2, process_id=5, consumed_by='charlie', consumed_at='2026-01-12T10:30Z'
id=2, resin_lot_id=2, process_id=7, consumed_by='diana', consumed_at='2026-01-12T10:45Z'
(Resin lot 2 consumed once by process 5, once by process 7)
```

## Database Relations

### kit_inventory Relation
```typescript
const kitInventoryRelations = relations(kit_inventory, ({ one }) => ({
  process: one(processes, {
    fields: [kit_inventory.process_id],
    references: [processes.id],
  }),
}));
```

### resin_lot_inventory Relation
```typescript
const resinLotInventoryRelations = relations(resin_lot_inventory, ({ many }) => ({
  consumptions: many(resin_consumption),
}));
```

### resin_consumption Relation
```typescript
const resinConsumptionRelations = relations(resin_consumption, ({ one }) => ({
  resin: one(resin_lot_inventory, {
    fields: [resin_consumption.resin_lot_id],
    references: [resin_lot_inventory.id],
  }),
  process: one(processes, {
    fields: [resin_consumption.process_id],
    references: [processes.id],
  }),
}));
```

## TypeScript Types

### Kit Inventory
```typescript
export type KitInventory = typeof kit_inventory.$inferSelect;
export type InsertKitInventory = typeof kit_inventory.$inferInsert;
```

### Resin Lot Inventory
```typescript
export type ResinLotInventory = typeof resin_lot_inventory.$inferSelect;
export type InsertResinLotInventory = typeof resin_lot_inventory.$inferInsert;
```

### Resin Consumption
```typescript
export type ResinConsumption = typeof resin_consumption.$inferSelect;
export type InsertResinConsumption = typeof resin_consumption.$inferInsert;
```

## Comparison: Old vs New Design

| Concept | Old Design | New Design |
|---------|-----------|-----------|
| **Kits** | `material_master` (generic, process optional) | `kit_inventory` (process_id REQUIRED) |
| **Process Binding** | Added post-hoc via `material_process_intent` | Bound at creation, enforced by FK |
| **Resin Tracking** | Treated as generic material, marked unavailable | Separate table, count-based, shared |
| **Consumption** | `material_usage` table | `resin_consumption` table (for resin only) |
| **Kit Status** | Boolean `available` field | Explicit enum: AVAILABLE or CONSUMED |
| **Resin Availability** | Boolean or manual update | Integer count decremented on each use |
| **Audit Trail** | Implicit via `material_usage` | Explicit via `resin_consumption` |

## ID Generation Rules

### Kit Code Format
```
KIT-{PROCESS_CODE}-{YYYYMMDD}-{SEQ}
```

**Examples**:
- `KIT-SBSF-20260112-001` → Spar Boom SF process, created Jan 12, first kit
- `KIT-MOLD-20260112-005` → Moulding process, created Jan 12, fifth kit
- `GLASS-SBSF-20260112-001` → Spar Boom SF process, glass kit, created Jan 12

**How it works**:
1. Query the `processes` table to get the `code` field (e.g., "SBSF")
2. Get today's date in YYYYMMDD format
3. Count existing kits for THIS process TODAY to get sequence number
4. Zero-pad sequence to 3 digits (001, 002, 003, ...)
5. Concatenate: `KIT-` + code + `-` + date + `-` + seq

### Resin Code Format
```
RESIN-{YYYYMMDD}-{SEQ}
```

**Examples**:
- `RESIN-20260112-001` → Created Jan 12, first resin lot
- `RESIN-20260112-002` → Created Jan 12, second resin lot

**How it works**:
1. Get today's date in YYYYMMDD format
2. Count existing resin lots TODAY (across all processes, since resin is shared)
3. Zero-pad sequence to 3 digits
4. Concatenate: `RESIN-` + date + `-` + seq

## Storage Configuration

### Supabase Storage Buckets

**Kit Photos Bucket**: `kit-photos`
- **Path format**: `kit-photos/{kit_id}.jpg`
- **Access**: Public read, authenticated write
- **Used by**: Kit creation endpoint

**Resin Photos Bucket**: `resin-photos` (optional, not yet implemented)
- **Path format**: `resin-photos/{resin_id}.jpg`
- **Access**: Public read, authenticated write
- **Used by**: Resin creation endpoint

## Migration Notes

**For existing data**:
- Old `material_master` records are still in the database but deprecated
- New endpoints use `kit_inventory` and `resin_lot_inventory` exclusively
- Recommend creating a migration script to move old data to new tables (or archive)

**For new development**:
- Always use the new process-driven endpoints
- NEVER create kits without a process_id
- NEVER use the old material management endpoints

## Queries & Examples

### Query 1: Get all available kits for a process
```sql
SELECT * FROM kit_inventory
WHERE process_id = 5 AND status = 'AVAILABLE'
ORDER BY created_at DESC;
```

### Query 2: Get all available resin
```sql
SELECT * FROM resin_lot_inventory
WHERE available_count > 0
ORDER BY created_at DESC;
```

### Query 3: Get consumption history for a resin lot
```sql
SELECT rc.*, p.name as process_name
FROM resin_consumption rc
JOIN processes p ON rc.process_id = p.id
WHERE rc.resin_lot_id = 2
ORDER BY rc.consumed_at DESC;
```

### Query 4: Count available materials for a process
```sql
SELECT
  SUM(CASE WHEN kit_type = 'KIT' AND status = 'AVAILABLE' THEN 1 ELSE 0 END) as material_kits,
  SUM(CASE WHEN kit_type = 'GLASS' AND status = 'AVAILABLE' THEN 1 ELSE 0 END) as glass_kits,
  (SELECT SUM(available_count) FROM resin_lot_inventory) as resin_units
FROM kit_inventory
WHERE process_id = 5;
```

## Summary

The new process-driven inventory schema ensures:
1. ✅ **Kits are always process-specific** (enforced at database level)
2. ✅ **Resin is truly shared** (no process binding, count-based)
3. ✅ **No ambiguous state** (explicit status, count fields)
4. ✅ **Full audit trail** (all consumption logged)
5. ✅ **Manufacturing traceability** (process_instance_id links to actual runs)
